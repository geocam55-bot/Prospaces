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
 *   portal_message:{orgId}:{id}      → { id, contactId, orgId, from, subject, body, createdAt, read, replies[] }
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
        enabled: true,
        enabledAt: new Date().toISOString(),
        enabledBy: user.id,
        email: contactEmail,
      });

      console.log(`[portal] Invite created for ${contactEmail} by ${profile.email}, code=${inviteCode}`);

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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      console.log(`[portal] Customer logged in: ${email}`);

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
  async function validateSession(c: any): Promise<{ contactId: string; orgId: string; email: string } | null> {
    const token = c.req.header('X-Portal-Token');
    if (!token) return null;

    const session = await kv.get(`portal_session:${token}`);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      await kv.del(`portal_session:${token}`);
      return null;
    }

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

      // Sort by date, newest first
      const sorted = (messages || []).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return c.json({ messages: sorted });
    } catch (err: any) {
      console.error('[portal] Messages error:', err);
      return c.json({ error: 'Failed to load messages: ' + err.message }, 500);
    }
  });

  // ── POST /portal/messages — Customer sends a message ──
  app.post(`${PREFIX}/messages`, async (c) => {
    try {
      const session = await validateSession(c);
      if (!session) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const { subject, message } = body;

      if (!subject || !message) {
        return c.json({ error: 'Subject and message are required' }, 400);
      }

      const msgBytes = new Uint8Array(8);
      crypto.getRandomValues(msgBytes);
      const msgId = hexEncode(msgBytes.buffer);
      const msgData = {
        id: msgId,
        contactId: session.contactId,
        orgId: session.orgId,
        from: 'customer',
        senderEmail: session.email,
        subject,
        body: message,
        createdAt: new Date().toISOString(),
        read: false,
        replies: [],
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

      return c.json({ portalUsers: accessLogs || [] });
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

      // Enrich with contact names if available
      const contactIds = [...new Set((allMessages || []).map((m: any) => m.contactId).filter(Boolean))];
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

      const enrichedMessages = (allMessages || []).map((msg: any) => ({
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

      await kv.set(key, msg);

      console.log(`[portal] Reply sent to message ${messageId} by ${profile.email}`);

      return c.json({ success: true, message: msg });
    } catch (err: any) {
      return c.json({ error: 'Failed to send reply: ' + err.message }, 500);
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