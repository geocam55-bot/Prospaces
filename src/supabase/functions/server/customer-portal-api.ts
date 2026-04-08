import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { extractUserToken } from './auth-helper.ts';

/**
 * Customer Portal API
 * 
 * KV key conventions:
 *   portal_user:{email_hash}         → { email, contactId, orgId, passwordHash, name, createdAt, lastLogin }
 *   portal_session:{token}           → { email, contactId, orgId, expiresAt }
 *   portal_invite:{code}             → { contactId, orgId, email, expiresAt, createdBy }
 *   portal_message:{orgId}:{contactId}:{id} → { id, contactId, orgId, from, subject, body, createdAt, updatedAt, retainedUntil, status, replies[], internalNotes[] }
 *   internal_chat:{orgId}:{id}       → { id, orgId, title, contextType, contextLabel, retainedUntil, status, messages[] }
 *   portal_access_log:{orgId}:{contactId} → { enabled, enabledAt, enabledBy }
 */

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return hexEncode(hashBuffer);
}

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return hexEncode(hashBuffer);
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hexEncode(bytes.buffer);
}

function generateInviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return hexEncode(bytes.buffer).toUpperCase();
}

const CHAT_RETENTION_DAYS = 30;
const CHAT_RETENTION_MS = CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function getConversationLastActivityAt(item: any): string {
  const timestamps = [item?.updatedAt, item?.createdAt, item?.resolvedAt];

  if (Array.isArray(item?.replies)) {
    timestamps.push(...item.replies.map((reply: any) => reply?.createdAt));
  }
  if (Array.isArray(item?.internalNotes)) {
    timestamps.push(...item.internalNotes.map((note: any) => note?.createdAt));
  }
  if (Array.isArray(item?.messages)) {
    timestamps.push(...item.messages.map((message: any) => message?.createdAt));
  }

  const validTimes = timestamps
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  return new Date(validTimes.length ? Math.max(...validTimes) : Date.now()).toISOString();
}

function isWithinChatRetention(item: any): boolean {
  const lastActivityAt = new Date(getConversationLastActivityAt(item)).getTime();
  return Date.now() - lastActivityAt <= CHAT_RETENTION_MS;
}

function withChatRetention(item: any) {
  const lastActivityAt = getConversationLastActivityAt(item);
  return {
    ...item,
    lastActivityAt,
    retainedUntil: new Date(new Date(lastActivityAt).getTime() + CHAT_RETENTION_MS).toISOString(),
  };
}

function canAccessInternalChat(chat: any, userId: string, email?: string): boolean {
  const participants = Array.isArray(chat?.participants) ? chat.participants : [];
  if (chat?.createdBy === userId) return true;
  if (participants.length === 0) return true;

  const normalizedEmail = (email || '').toLowerCase().trim();
  return participants.some((participant: any) => {
    if (participant?.kind === 'portal') return false;
    const participantEmail = (participant?.email || '').toLowerCase().trim();
    return participant?.id === userId || (!!normalizedEmail && participantEmail === normalizedEmail);
  });
}

export function customerPortalAPI(app: Hono) {
  const PREFIX = '/make-server-8405be07/portal';

  // ── POST /portal/invite — CRM user creates a portal invitation for a contact ──
  app.post(`${PREFIX}/invite`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const body = await c.req.json();
      const { contactId } = body;

      if (!contactId) return c.json({ error: 'contactId is required' }, 400);

      // Get the contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError || !contact) {
        return c.json({ error: 'Contact not found: ' + (contactError?.message || 'Not found') }, 404);
      }

      const contactEmail = contact.email;
      if (!contactEmail) {
        return c.json({ error: 'Contact has no email address' }, 400);
      }

      const orgId = profile.organization_id || contact.organization_id;
      const inviteCode = generateInviteCode();

      // Store the invite (expires in 7 days)
      await kv.set(`portal_invite:${inviteCode}`, {
        contactId,
        orgId,
        email: contactEmail,
        contactName: contact.name || contact.company || contactEmail,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      });

      // Mark portal access as enabled for this contact
      await kv.set(`portal_access_log:${orgId}:${contactId}`, {
        contactId,
        contactName: contact.name || contact.company || contactEmail,
        enabled: true,
        enabledAt: new Date().toISOString(),
        enabledBy: user.id,
        email: contactEmail,
      });

      console.log(`[portal] Invite created for ${contactEmail} by ${profile.email}, code=${inviteCode}`);

      // Track portal "Sent" metrics for creating an invite
      try {
        // Postgres
        const { data: pgCamps } = await supabase.from('campaigns').select('id, description, opened_count, clicked_count')
          .eq('organization_id', orgId).eq('type', 'portal').order('created_at', { ascending: false }).limit(1);
          
        if (pgCamps && pgCamps.length > 0) {
          const pgCamp = pgCamps[0];
          let meta: any = {};
          if (pgCamp.description && pgCamp.description.startsWith('{')) {
            try { meta = JSON.parse(pgCamp.description); } catch(e) {}
          }
          meta.sent_count = (meta.sent_count || 0) + 1;
          meta.audience_count = Math.max((meta.audience_count || 0), meta.sent_count);
          await supabase.from('campaigns').update({
            description: JSON.stringify(meta),
            opened_count: (pgCamp.opened_count || 0) + 1,
            clicked_count: (pgCamp.clicked_count || 0) + 1,
          }).eq('id', pgCamp.id);
        } else {
          // Create default if none exists
          const meta = {
            channel: 'Customer Portal',
            sent_count: 1,
            audience_count: 1
          };
          await supabase.from('campaigns').insert([{
            organization_id: orgId,
            name: 'Direct Portal Invites',
            type: 'portal',
            status: 'active',
            description: JSON.stringify(meta),
            created_at: new Date().toISOString()
          }]);
        }
        
        // KV
        const campaigns = await kv.getByPrefix(`campaign:${orgId}:`);
        let latestCamp = null;
        if (campaigns && campaigns.length > 0) {
          const portalCamps = campaigns.filter((c: any) => c.type === 'portal');
          if (portalCamps.length > 0) {
            portalCamps.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            latestCamp = portalCamps[0];
          }
        }
        
        if (latestCamp) {
          latestCamp.sent_count = (latestCamp.sent_count || 0) + 1;
          latestCamp.audience_count = Math.max((latestCamp.audience_count || 0), latestCamp.sent_count);
          latestCamp.updated_at = new Date().toISOString();
          await kv.set(`campaign:${orgId}:${latestCamp.id}`, latestCamp);
        } else {
          const newCampId = crypto.randomUUID();
          await kv.set(`campaign:${orgId}:${newCampId}`, {
            id: newCampId,
            organization_id: orgId,
            name: 'Direct Portal Invites',
            type: 'portal',
            channel: 'Customer Portal',
            status: 'active',
            audience_segment: 'all',
            sent_count: 1,
            audience_count: 1,
            created_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('[portal] failed to track campaign stats for invite creation', e);
      }

      return c.json({
        success: true,
        inviteCode,
        email: contactEmail,
        contactName: contact.name,
        appUrl: Deno.env.get('APP_URL') || '',
      });
    } catch (err: any) {
      console.error('[portal] Error creating invite:', err);
      return c.json({ error: 'Failed to create invite: ' + err.message }, 500);
    }
  });

  // ── POST /portal/register — Customer registers using invite code ──
  app.post(`${PREFIX}/register`, async (c) => {
    try {
      const body = await c.req.json();
      const { inviteCode, password } = body;

      if (!inviteCode || !password) {
        return c.json({ error: 'Invite code and password are required' }, 400);
      }

      if (password.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters' }, 400);
      }

      // Look up the invite
      const invite = await kv.get(`portal_invite:${inviteCode.toUpperCase()}`);
      if (!invite) {
        return c.json({ error: 'Invalid or expired invite code' }, 400);
      }

      if (new Date(invite.expiresAt) < new Date()) {
        await kv.del(`portal_invite:${inviteCode.toUpperCase()}`);
        return c.json({ error: 'Invite code has expired' }, 400);
      }

      const emailHash = await hashEmail(invite.email);

      // Check if already registered
      const existing = await kv.get(`portal_user:${emailHash}`);
      if (existing) {
        return c.json({ error: 'An account already exists for this email. Please log in instead.' }, 400);
      }

      // Create the portal user
      await kv.set(`portal_user:${emailHash}`, {
        email: invite.email.toLowerCase().trim(),
        contactId: invite.contactId,
        orgId: invite.orgId,
        passwordHash: await hashPassword(password),
        name: invite.contactName || invite.email,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      });

      // Clean up the invite
      await kv.del(`portal_invite:${inviteCode.toUpperCase()}`);

      // Create a session
      const sessionToken = generateToken();
      await kv.set(`portal_session:${sessionToken}`, {
        email: invite.email.toLowerCase().trim(),
        contactId: invite.contactId,
        orgId: invite.orgId,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

      console.log(`[portal] Customer registered: ${invite.email}`);

      return c.json({
        success: true,
        token: sessionToken,
        user: {
          email: invite.email,
          name: invite.contactName,
          contactId: invite.contactId,
        },
      });
    } catch (err: any) {
      console.error('[portal] Registration error:', err);
      return c.json({ error: 'Registration failed: ' + err.message }, 500);
    }
  });

  // ── POST /portal/login — Customer logs in ──
  app.post(`${PREFIX}/login`, async (c) => {
    try {
      const body = await c.req.json();
      const { email, password } = body;

      if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      const emailHash = await hashEmail(email);
      const portalUser = await kv.get(`portal_user:${emailHash}`);

      if (!portalUser) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      if (portalUser.passwordHash !== await hashPassword(password)) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }

      // Update last login
      portalUser.lastLogin = new Date().toISOString();
      await kv.set(`portal_user:${emailHash}`, portalUser);

      // Create session
      const sessionToken = generateToken();
      await kv.set(`portal_session:${sessionToken}`, {
        email: portalUser.email,
        contactId: portalUser.contactId,
        orgId: portalUser.orgId,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      console.log(`[portal] Customer logged in: ${email}`);
      
      // Track "Open" and "Click" events for the Customer Portal channel
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const orgId = portalUser.orgId;
        
        // Postgres
        const { data: pgCamps } = await supabase.from('campaigns').select('id, description')
          .eq('organization_id', orgId).eq('type', 'portal').order('created_at', { ascending: false }).limit(1);
          
        if (pgCamps && pgCamps.length > 0) {
          const pgCamp = pgCamps[0];
          let meta: any = {};
          if (pgCamp.description && pgCamp.description.startsWith('{')) {
            try { meta = JSON.parse(pgCamp.description); } catch(e) {}
          }
          meta.opened_count = (meta.opened_count || 0) + 1;
          meta.clicked_count = (meta.clicked_count || 0) + 1;
          await supabase.from('campaigns').update({ description: JSON.stringify(meta) }).eq('id', pgCamp.id);
        }
        
        // KV
        const campaigns = await kv.getByPrefix(`campaign:${orgId}:`);
        if (campaigns && campaigns.length > 0) {
          const portalCamps = campaigns.filter((c: any) => c.type === 'portal');
          if (portalCamps.length > 0) {
            portalCamps.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const latestCamp = portalCamps[0];
            latestCamp.opened_count = (latestCamp.opened_count || 0) + 1;
            latestCamp.clicked_count = (latestCamp.clicked_count || 0) + 1;
            latestCamp.updated_at = new Date().toISOString();
            await kv.set(`campaign:${orgId}:${latestCamp.id}`, latestCamp);
          }
        }
      } catch (e) {
        console.error('[portal] failed to track campaign stats for portal login', e);
      }

      return c.json({
        success: true,
        token: sessionToken,
        user: {
          email: portalUser.email,
          name: portalUser.name,
          contactId: portalUser.contactId,
        },
      });
    } catch (err: any) {
      console.error('[portal] Login error:', err);
      return c.json({ error: 'Login failed: ' + err.message }, 500);
    }
  });

  // ── POST /portal/logout — Destroy session ──
  app.post(`${PREFIX}/logout`, async (c) => {
    try {
      const token = c.req.header('X-Portal-Token');
      if (token) {
        await kv.del(`portal_session:${token}`);
      }
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: 'Logout failed: ' + err.message }, 500);
    }
  });

  // ── Helper: validate portal session ──
  async function validateSession(c: any): Promise<{ contactId: string; orgId: string; email: string; lastActiveAt?: string } | null> {
    const token = c.req.header('X-Portal-Token');
    if (!token) return null;

    const session = await kv.get(`portal_session:${token}`);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      await kv.del(`portal_session:${token}`);
      return null;
    }

    session.lastActiveAt = new Date().toISOString();
    await kv.set(`portal_session:${token}`, session);

    return session;
  }

  // ── GET /portal/dashboard — Customer dashboard data ──
  app.get(`${PREFIX}/dashboard`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get contact details
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', session.contactId)
        .single();

      // Get quotes for this contact
      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('contact_id', session.contactId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get bids for this contact
      // NOTE: The bids table uses opportunity_id (not contact_id) for contact reference.
      // Try opportunity_id first; silently fall back to empty if the query fails.
      let bids: any[] = [];
      try {
        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select('*')
          .eq('opportunity_id', session.contactId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!bidsError && bidsData) {
          bids = bidsData;
        } else if (bidsError) {
          console.warn('[portal] Bids query error (non-fatal):', bidsError.message);
        }
      } catch (bidsErr: any) {
        console.warn('[portal] Bids query failed (non-fatal):', bidsErr.message);
      }

      // Get appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('contact_id', session.contactId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      // Get portal messages
      const messages = await kv.getByPrefix(`portal_message:${session.orgId}:${session.contactId}:`);

      // Get organization info
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', session.orgId)
        .single();

      console.log(`[portal] Dashboard loaded for ${session.email}: ${quotes?.length || 0} quotes, ${bids?.length || 0} bids`);

      return c.json({
        contact: contact || null,
        quotes: quotes || [],
        bids: bids || [],
        appointments: appointments || [],
        messages: messages || [],
        organization: org || null,
        unreadMessages: (messages || []).filter((m: any) => m.customerUnread === true).length,
      });
    } catch (err: any) {
      console.error('[portal] Dashboard error:', err);
      return c.json({ error: 'Failed to load dashboard: ' + err.message }, 500);
    }
  });

  // ── GET /portal/quotes — All quotes for the customer ──
  app.get(`${PREFIX}/quotes`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('contact_id', session.contactId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[portal] Quotes query error:', error);
        return c.json({ error: 'Failed to load quotes' }, 500);
      }

      return c.json({ quotes: quotes || [] });
    } catch (err: any) {
      console.error('[portal] Quotes error:', err);
      return c.json({ error: 'Failed to load quotes: ' + err.message }, 500);
    }
  });

  // ── GET /portal/projects — Bids/deals for the customer ──
  app.get(`${PREFIX}/projects`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // NOTE: The bids table uses opportunity_id (not contact_id) for contact reference.
      const { data: bids, error } = await supabase
        .from('bids')
        .select('*')
        .eq('opportunity_id', session.contactId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[portal] Projects query error:', error);
        // Return empty instead of 500 — the column may not exist
        return c.json({ projects: [] });
      }

      return c.json({ projects: bids || [] });
    } catch (err: any) {
      console.error('[portal] Projects error:', err);
      return c.json({ error: 'Failed to load projects: ' + err.message }, 500);
    }
  });

  // ── GET /portal/documents — Documents shared with the customer ──
  app.get(`${PREFIX}/documents`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get documents linked to the contact
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('contact_id', session.contactId)
        .order('created_at', { ascending: false });

      if (error) {
        // documents table might not exist yet
        console.warn('[portal] Documents query error (table may not exist):', error.message);
        return c.json({ documents: [] });
      }

      return c.json({ documents: documents || [] });
    } catch (err: any) {
      console.error('[portal] Documents error:', err);
      return c.json({ error: 'Failed to load documents: ' + err.message }, 500);
    }
  });

  // ── GET /portal/messages — Messages for the customer ──
  app.get(`${PREFIX}/messages`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const messages = await kv.getByPrefix(`portal_message:${session.orgId}:${session.contactId}:`);
      const retainedMessages = (messages || []).filter(isWithinChatRetention).map(withChatRetention);

      // Sort by last activity, newest first
      const sorted = retainedMessages.sort((a: any, b: any) => {
        const aLatest = a.updatedAt || (a.replies?.length ? a.replies[a.replies.length - 1].createdAt : a.createdAt);
        const bLatest = b.updatedAt || (b.replies?.length ? b.replies[b.replies.length - 1].createdAt : b.createdAt);
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });

      // Never expose staff-only internal notes to the customer portal
      const publicMessages = sorted.map((msg: any) => ({
        ...msg,
        status: msg.status || 'open',
        internalNotes: undefined,
      }));

      return c.json({ messages: publicMessages });
    } catch (err: any) {
      console.error('[portal] Messages error:', err);
      return c.json({ error: 'Failed to load messages: ' + err.message }, 500);
    }
  });

  // ── POST /portal/messages — Customer sends a message or reply ──
  app.post(`${PREFIX}/messages`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { subject, message, messageId, contextType, contextLabel } = body;

      if (!message) {
        return c.json({ error: 'Message is required' }, 400);
      }

      const now = new Date().toISOString();

      if (messageId) {
        const existingKey = `portal_message:${session.orgId}:${session.contactId}:${messageId}`;
        const existing = await kv.get(existingKey);

        if (!existing) {
          return c.json({ error: 'Conversation not found' }, 404);
        }

        if (!existing.replies) existing.replies = [];
        existing.replies.push({
          from: 'customer',
          senderName: session.email,
          body: message,
          createdAt: now,
        });
        existing.read = false;
        existing.customerUnread = false;
        existing.status = 'open';
        existing.updatedAt = now;
        existing.retainedUntil = new Date(Date.now() + CHAT_RETENTION_MS).toISOString();

        await kv.set(existingKey, existing);
        console.log(`[portal] Reply sent by ${session.email} on thread ${messageId}`);
        return c.json({ success: true, message: existing });
      }

      if (!subject) {
        return c.json({ error: 'Subject is required' }, 400);
      }

      const msgBytes = new Uint8Array(8);
      crypto.getRandomValues(msgBytes);
      const msgId = hexEncode(msgBytes.buffer);
      const msgData = {
        id: msgId,
        type: 'customer',
        contactId: session.contactId,
        orgId: session.orgId,
        from: 'customer',
        senderEmail: session.email,
        subject,
        body: message,
        contextType: contextType || null,
        contextLabel: contextLabel || null,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        retainedUntil: new Date(Date.now() + CHAT_RETENTION_MS).toISOString(),
        read: false,
        replies: [],
        internalNotes: [],
      };

      await kv.set(`portal_message:${session.orgId}:${session.contactId}:${msgId}`, msgData);

      console.log(`[portal] Message sent by ${session.email}: ${subject}`);

      return c.json({ success: true, message: msgData });
    } catch (err: any) {
      console.error('[portal] Send message error:', err);
      return c.json({ error: 'Failed to send message: ' + err.message }, 500);
    }
  });

  // ── POST /portal/messages/:id/read — Mark message as read ──
  app.post(`${PREFIX}/messages/:id/read`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const msgId = c.req.param('id');
      const key = `portal_message:${session.orgId}:${session.contactId}:${msgId}`;
      const msg = await kv.get(key);
      
      if (msg) {
        msg.read = true;
        msg.customerUnread = false; // Customer has now seen the reply
        await kv.set(key, msg);
      }

      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: 'Failed to mark as read: ' + err.message }, 500);
    }
  });

  // ── PUT /portal/profile — Customer updates their contact info ──
  app.put(`${PREFIX}/profile`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const body = await c.req.json();
      const allowedFields = ['phone', 'address', 'company'];
      const updates: Record<string, any> = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return c.json({ error: 'No valid fields to update' }, 400);
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', session.contactId)
        .select()
        .single();

      if (error) {
        console.error('[portal] Profile update error:', error);
        return c.json({ error: 'Failed to update profile: ' + error.message }, 500);
      }

      console.log(`[portal] Profile updated by ${session.email}:`, Object.keys(updates));

      return c.json({ success: true, contact: data });
    } catch (err: any) {
      console.error('[portal] Profile update error:', err);
      return c.json({ error: 'Failed to update profile: ' + err.message }, 500);
    }
  });

  // ── POST /portal/quotes/:id/accept — Customer accepts a quote ──
  app.post(`${PREFIX}/quotes/:id/accept`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const quoteId = c.req.param('id');

      const { data, error } = await supabase
        .from('quotes')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .eq('contact_id', session.contactId)
        .select()
        .single();

      if (error) {
        return c.json({ error: 'Failed to accept quote: ' + error.message }, 500);
      }

      console.log(`[portal] Quote ${quoteId} accepted by ${session.email}`);

      // Create Task for the owner
      const ownerId = data.created_by || data.owner_id || data.project_manager_id;
      if (ownerId) {
        try {
          await supabase.from('tasks').insert([{
            title: `Quote Accepted: ${data.title || data.quote_number || quoteId}`,
            description: `Customer has accepted the quote via the portal. Follow up with them.`,
            status: 'pending',
            priority: 'high',
            assigned_to: ownerId,
            owner_id: ownerId,
            organization_id: data.organization_id || session.orgId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
        } catch (taskErr) {
          console.error('[portal] Failed to create task for quote acceptance:', taskErr);
        }
      }

      // Update Converted in Marketing (increment most recent portal campaign)
      try {
        const orgId = data.organization_id || session.orgId;
        const quoteValue = data.total || data.amount || data.value || 0;

        if (orgId) {
          // Update Postgres
          const { data: pgCamps } = await supabase.from('campaigns').select('id, description, converted_count, revenue').eq('organization_id', orgId).eq('type', 'portal').order('created_at', { ascending: false }).limit(1);
          if (pgCamps && pgCamps.length > 0) {
            const pgCamp = pgCamps[0];
            let meta: any = {};
            if (pgCamp.description && pgCamp.description.startsWith('{')) {
              try { meta = JSON.parse(pgCamp.description); } catch(e) {}
            }
            meta.converted_count = (meta.converted_count || 0) + 1;
            meta.revenue = (meta.revenue || 0) + Number(quoteValue);
            await supabase.from('campaigns').update({
              description: JSON.stringify(meta),
              converted_count: (pgCamp.converted_count || 0) + 1,
              revenue: (Number(pgCamp.revenue) || 0) + Number(quoteValue),
            }).eq('id', pgCamp.id);
            console.log(`[portal] Incremented converted_count for latest Postgres portal campaign ${pgCamp.id}`);
          }
          
          // Update KV backup
          const campaigns = await kv.getByPrefix(`campaign:${orgId}:`);
          if (campaigns && campaigns.length > 0) {
            const portalCamps = campaigns.filter((c: any) => c.type === 'portal');
            if (portalCamps.length > 0) {
              portalCamps.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              const latestCampaign = portalCamps[0];
              latestCampaign.converted_count = (latestCampaign.converted_count || 0) + 1;
              latestCampaign.revenue = (latestCampaign.revenue || 0) + Number(quoteValue);
              latestCampaign.updated_at = new Date().toISOString();
              await kv.set(`campaign:${orgId}:${latestCampaign.id}`, latestCampaign);
              console.log(`[portal] Incremented converted_count for KV campaign ${latestCampaign.id}`);
            }
          }
        }
      } catch (campErr) {
        console.error('[portal] Failed to update campaign conversions:', campErr);
      }

      return c.json({ success: true, quote: data });
    } catch (err: any) {
      return c.json({ error: 'Failed to accept quote: ' + err.message }, 500);
    }
  });

  // ── POST /portal/quotes/:id/reject — Customer rejects a quote ──
  app.post(`${PREFIX}/quotes/:id/reject`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const quoteId = c.req.param('id');

      const { data, error } = await supabase
        .from('quotes')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .eq('contact_id', session.contactId)
        .select()
        .single();

      if (error) {
        return c.json({ error: 'Failed to reject quote: ' + error.message }, 500);
      }

      console.log(`[portal] Quote ${quoteId} rejected by ${session.email}`);

      return c.json({ success: true, quote: data });
    } catch (err: any) {
      return c.json({ error: 'Failed to reject quote: ' + err.message }, 500);
    }
  });

  // ── GET /portal/portal-users — CRM admin: list all portal users for the org ──
  app.get(`${PREFIX}/portal-users`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const orgId = profile.organization_id;
      const accessLogs = await kv.getByPrefix(`portal_access_log:${orgId}:`);
      const portalUserRecords = (await kv.getByPrefix('portal_user:')) || [];
      const activeSessions = ((await kv.getByPrefix('portal_session:')) || []).filter((session: any) => {
        if (session.orgId !== orgId) return false;
        if (!session.expiresAt || new Date(session.expiresAt) < new Date()) return false;
        const lastActive = session.lastActiveAt || session.createdAt || session.expiresAt;
        return !!lastActive && (Date.now() - new Date(lastActive).getTime()) < 15 * 60 * 1000;
      });

      const emails = [...new Set((accessLogs || []).map((entry: any) => entry.email).filter(Boolean))];
      const contactIds = [...new Set((accessLogs || []).map((entry: any) => entry.contactId).filter(Boolean))];

      let contactsByEmail: Record<string, any> = {};
      let contactsById: Record<string, any> = {};

      if (emails.length > 0) {
        const { data: contactsByEmailData } = await supabase
          .from('contacts')
          .select('id, name, email, company')
          .in('email', emails);
        (contactsByEmailData || []).forEach((contact: any) => {
          contactsByEmail[contact.email] = contact;
          contactsById[contact.id] = contact;
        });
      }

      if (contactIds.length > 0) {
        const missingIds = contactIds.filter((id: string) => !contactsById[id]);
        if (missingIds.length > 0) {
          const { data: contactsByIdData } = await supabase
            .from('contacts')
            .select('id, name, email, company')
            .in('id', missingIds);
          (contactsByIdData || []).forEach((contact: any) => {
            contactsById[contact.id] = contact;
            if (contact.email) contactsByEmail[contact.email] = contact;
          });
        }
      }

      const portalUsers = (accessLogs || []).map((entry: any) => {
        const portalUser = portalUserRecords.find((record: any) => record.email === entry.email);
        const contact = (entry.contactId && contactsById[entry.contactId]) || (entry.email && contactsByEmail[entry.email]) || null;
        const online = activeSessions.some((session: any) => {
          return (entry.contactId && session.contactId === entry.contactId) || (entry.email && session.email === entry.email);
        });

        return {
          ...entry,
          contactId: entry.contactId || contact?.id || portalUser?.contactId || null,
          name: entry.contactName || contact?.name || portalUser?.name || entry.email || 'Portal User',
          company: contact?.company || '',
          email: entry.email || contact?.email || portalUser?.email || '',
          lastLogin: portalUser?.lastLogin || null,
          online,
        };
      });

      return c.json({ portalUsers });
    } catch (err: any) {
      return c.json({ error: 'Failed to list portal users: ' + err.message }, 500);
    }
  });

  // ── GET /portal/crm-messages — CRM user: list ALL portal messages for the org ──
  app.get(`${PREFIX}/crm-messages`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const orgId = profile.organization_id;
      if (!orgId) return c.json({ error: 'No organization found' }, 400);

      // Fetch all portal messages for this org using the KV prefix pattern:
      // portal_message:{orgId}:{contactId}:{msgId}
      const allMessages = await kv.getByPrefix(`portal_message:${orgId}:`);
      const retainedMessages = (allMessages || []).filter(isWithinChatRetention).map(withChatRetention);

      // Enrich with contact names if available
      const contactIds = [...new Set(retainedMessages.map((m: any) => m.contactId).filter(Boolean))];
      let contactMap: Record<string, any> = {};
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, email, company')
          .in('id', contactIds);
        if (contacts) {
          contacts.forEach((c: any) => { contactMap[c.id] = c; });
        }
      }

      const enrichedMessages = retainedMessages.map((msg: any) => ({
        ...msg,
        contactName: contactMap[msg.contactId]?.name || msg.senderEmail || 'Unknown',
        contactCompany: contactMap[msg.contactId]?.company || '',
        contactEmail: contactMap[msg.contactId]?.email || msg.senderEmail || '',
      }));

      // Sort newest first
      enrichedMessages.sort((a: any, b: any) => {
        const aLatest = a.replies?.length > 0 ? a.replies[a.replies.length - 1].createdAt : a.createdAt;
        const bLatest = b.replies?.length > 0 ? b.replies[b.replies.length - 1].createdAt : b.createdAt;
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });

      console.log(`[portal] CRM messages loaded for org ${orgId}: ${enrichedMessages.length} messages`);

      return c.json({ messages: enrichedMessages });
    } catch (err: any) {
      console.error('[portal] CRM messages error:', err);
      return c.json({ error: 'Failed to load portal messages: ' + err.message }, 500);
    }
  });

  // ── POST /portal/crm-message — CRM user starts a portal-visible thread for a customer ──
  app.post(`${PREFIX}/crm-message`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);
      if (!profile.organization_id) return c.json({ error: 'No organization found' }, 400);

      const body = await c.req.json();
      const { contactId, subject, message } = body;

      if (!contactId || !message) {
        return c.json({ error: 'contactId and message are required' }, 400);
      }

      const now = new Date().toISOString();
      const msgId = crypto.randomUUID();
      const msgData = {
        id: msgId,
        type: 'customer',
        contactId,
        orgId: profile.organization_id,
        from: 'team',
        senderEmail: profile.email,
        subject: subject?.trim() || `Message from ${profile.name || profile.email || 'Team'}`,
        body: message,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        retainedUntil: new Date(Date.now() + CHAT_RETENTION_MS).toISOString(),
        read: true,
        customerUnread: true,
        replies: [],
        internalNotes: [],
      };

      await kv.set(`portal_message:${profile.organization_id}:${contactId}:${msgId}`, msgData);
      return c.json({ success: true, message: msgData });
    } catch (err: any) {
      return c.json({ error: 'Failed to send CRM portal message: ' + err.message }, 500);
    }
  });

  // ── POST /portal/reply — CRM user replies to a portal message ──
  app.post(`${PREFIX}/reply`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const body = await c.req.json();
      const { messageId, contactId, reply } = body;

      if (!messageId || !contactId || !reply) {
        return c.json({ error: 'messageId, contactId, and reply are required' }, 400);
      }

      const orgId = profile.organization_id;
      const key = `portal_message:${orgId}:${contactId}:${messageId}`;
      const msg = await kv.get(key);

      if (!msg) {
        return c.json({ error: 'Message not found' }, 404);
      }

      if (!msg.replies) msg.replies = [];
      msg.replies.push({
        from: 'team',
        senderName: profile.name || profile.email,
        body: reply,
        createdAt: new Date().toISOString(),
      });
      msg.read = true;           // CRM side: mark as read (team has seen it)
      msg.customerUnread = true; // Customer side: flag new reply as unread for the customer
      msg.status = 'open';
      msg.updatedAt = new Date().toISOString();
      msg.retainedUntil = new Date(Date.now() + CHAT_RETENTION_MS).toISOString();

      await kv.set(key, msg);

      console.log(`[portal] Reply sent to message ${messageId} by ${profile.email}`);

      return c.json({ success: true, message: msg });
    } catch (err: any) {
      return c.json({ error: 'Failed to send reply: ' + err.message }, 500);
    }
  });

  // ── POST /portal/internal-note — CRM user adds a staff-only note to a customer thread ──
  app.post(`${PREFIX}/internal-note`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const body = await c.req.json();
      const { messageId, contactId, note } = body;

      if (!messageId || !contactId || !note) {
        return c.json({ error: 'messageId, contactId, and note are required' }, 400);
      }

      const orgId = profile.organization_id;
      const key = `portal_message:${orgId}:${contactId}:${messageId}`;
      const msg = await kv.get(key);

      if (!msg) {
        return c.json({ error: 'Message not found' }, 404);
      }

      if (!msg.internalNotes) msg.internalNotes = [];
      msg.internalNotes.push({
        id: crypto.randomUUID(),
        from: 'internal',
        senderName: profile.name || profile.email,
        body: note,
        createdAt: new Date().toISOString(),
      });
      msg.updatedAt = new Date().toISOString();
      msg.retainedUntil = new Date(Date.now() + CHAT_RETENTION_MS).toISOString();

      await kv.set(key, msg);
      return c.json({ success: true, message: msg });
    } catch (err: any) {
      return c.json({ error: 'Failed to save internal note: ' + err.message }, 500);
    }
  });

  // ── POST /portal/status — CRM user updates customer conversation status ──
  app.post(`${PREFIX}/status`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const body = await c.req.json();
      const { messageId, contactId, status } = body;

      if (!messageId || !contactId || !status) {
        return c.json({ error: 'messageId, contactId, and status are required' }, 400);
      }

      const normalizedStatus = status === 'resolved' ? 'resolved' : 'open';
      const orgId = profile.organization_id;
      const key = `portal_message:${orgId}:${contactId}:${messageId}`;
      const msg = await kv.get(key);

      if (!msg) {
        return c.json({ error: 'Message not found' }, 404);
      }

      msg.status = normalizedStatus;
      msg.updatedAt = new Date().toISOString();
      msg.resolvedAt = normalizedStatus === 'resolved' ? new Date().toISOString() : null;
      msg.retainedUntil = new Date(Date.now() + CHAT_RETENTION_MS).toISOString();

      await kv.set(key, msg);
      return c.json({ success: true, message: msg });
    } catch (err: any) {
      return c.json({ error: 'Failed to update status: ' + err.message }, 500);
    }
  });

  // ── GET /portal/internal-chats — CRM user: list internal staff-only chats ──
  app.get(`${PREFIX}/internal-chats`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return c.json({ chats: [] });

      const chats = await kv.getByPrefix(`internal_chat:${profile.organization_id}:`);
      const retainedChats = (chats || [])
        .filter(isWithinChatRetention)
        .filter((chat: any) => canAccessInternalChat(chat, user.id, profile.email))
        .map(withChatRetention);
      const sorted = retainedChats.sort((a: any, b: any) =>
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );

      return c.json({ chats: sorted, retentionDays: CHAT_RETENTION_DAYS });
    } catch (err: any) {
      return c.json({ error: 'Failed to load internal chats: ' + err.message }, 500);
    }
  });

  // ── POST /portal/internal-chats — CRM user creates a staff-only chat ──
  app.post(`${PREFIX}/internal-chats`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return c.json({ error: 'No organization found' }, 400);

      const body = await c.req.json();
      const { title, contextType, contextLabel, initialMessage, chatType, participants } = body;

      if (!title) {
        return c.json({ error: 'title is required' }, 400);
      }

      const normalizedParticipants = Array.isArray(participants)
        ? participants.map((participant: any) => ({
            id: participant?.id || null,
            name: participant?.name || participant?.email || 'Member',
            email: participant?.email || null,
            kind: participant?.kind === 'portal' ? 'portal' : 'staff',
          }))
        : [];

      const now = new Date().toISOString();
      const chatId = crypto.randomUUID();
      const chat = {
        id: chatId,
        orgId: profile.organization_id,
        title,
        chatType: chatType || (normalizedParticipants.length > 1 ? 'group' : normalizedParticipants.length === 1 ? 'direct' : 'general'),
        contextType: contextType || 'general',
        contextLabel: contextLabel || '',
        participants: normalizedParticipants,
        status: 'open',
        createdBy: user.id,
        createdByName: profile.name || profile.email,
        createdAt: now,
        updatedAt: now,
        retainedUntil: new Date(Date.now() + CHAT_RETENTION_MS).toISOString(),
        messages: initialMessage
          ? [{
              id: crypto.randomUUID(),
              senderId: user.id,
              senderName: profile.name || profile.email,
              body: initialMessage,
              createdAt: now,
            }]
          : [],
      };

      await kv.set(`internal_chat:${profile.organization_id}:${chatId}`, chat);
      return c.json({ success: true, chat });
    } catch (err: any) {
      return c.json({ error: 'Failed to create internal chat: ' + err.message }, 500);
    }
  });

  // ── POST /portal/internal-chats/:id/message — CRM user sends a staff-only chat message ──
  app.post(`${PREFIX}/internal-chats/:id/message`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return c.json({ error: 'No organization found' }, 400);

      const chatId = c.req.param('id');
      const body = await c.req.json();
      const { message } = body;

      if (!message) {
        return c.json({ error: 'message is required' }, 400);
      }

      const key = `internal_chat:${profile.organization_id}:${chatId}`;
      const chat = await kv.get(key);
      if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
      }
      if (!canAccessInternalChat(chat, user.id, profile.email)) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      if (!chat.messages) chat.messages = [];
      chat.messages.push({
        id: crypto.randomUUID(),
        senderId: user.id,
        senderName: profile.name || profile.email,
        body: message,
        createdAt: new Date().toISOString(),
      });
      chat.updatedAt = new Date().toISOString();
      chat.retainedUntil = new Date(Date.now() + CHAT_RETENTION_MS).toISOString();

      await kv.set(key, chat);
      return c.json({ success: true, chat });
    } catch (err: any) {
      return c.json({ error: 'Failed to send internal chat message: ' + err.message }, 500);
    }
  });

  // ── DELETE /portal/revoke/:contactId — CRM user revokes portal access ──
  app.delete(`${PREFIX}/revoke/:contactId`, async (c) => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const accessToken = extractUserToken(c);
      if (!accessToken) return c.json({ error: 'Missing Authorization' }, 401);

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return c.json({ error: 'Profile not found' }, 404);

      const contactId = c.req.param('contactId');
      const orgId = profile.organization_id;

      // Get the access log to find the user's email
      const accessLog = await kv.get(`portal_access_log:${orgId}:${contactId}`);
      if (accessLog?.email) {
        const emailHash = await hashEmail(accessLog.email);
        await kv.del(`portal_user:${emailHash}`);
      }

      // Update access log
      await kv.set(`portal_access_log:${orgId}:${contactId}`, {
        ...accessLog,
        enabled: false,
        disabledAt: new Date().toISOString(),
        disabledBy: user.id,
      });

      console.log(`[portal] Access revoked for contact ${contactId}`);

      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: 'Failed to revoke access: ' + err.message }, 500);
    }
  });
}