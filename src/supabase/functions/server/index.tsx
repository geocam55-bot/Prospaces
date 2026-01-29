import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper function to verify user authentication
async function verifyUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  return user;
}

// Helper function to get user metadata with robust fallback to profiles table
async function getUserData(userId: string) {
  try {
    let userData = await kv.get(`user:${userId}`);
    
    // Check if userData needs hydration (missing organizationId)
    if (!userData || !userData.organizationId) {
        // Fallback: fetch from profiles table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('organization_id, role, name, email')
            .eq('id', userId)
            .single();
            
        if (profile && !error) {
            userData = {
                ...(userData || {}),
                id: userId,
                organizationId: profile.organization_id,
                role: profile.role,
                name: profile.name,
                email: profile.email
            };
            // Cache it to avoid future DB lookups
            await kv.set(`user:${userId}`, userData);
            console.log('Hydrated user data from profiles table:', userId);
        }
    }
    
    return userData;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Helper function for SMTP email sending
async function sendEmailViaSMTP(account: any, to: string, subject: string, body: string, html: string) {
    if (!account.imap_host || !account.imap_username || !account.imap_password) {
      // If IMAP details are missing, check if we have explicit SMTP details (sometimes stored differently)
      // For now, assume if provider is 'generic', we might need these.
      // If it's a known provider like Gmail but fell back here, it implies OAuth failed, so we can't use SMTP without password.
      throw new Error('Email account not configured for SMTP (missing host/username/password)');
    }

    // Heuristic for SMTP settings based on IMAP settings
    const smtpPort = account.imap_port === 993 ? 465 : (account.imap_port === 143 ? 587 : 587);
    let smtpHost = account.imap_host;
    if (smtpHost.startsWith('imap.')) {
      smtpHost = smtpHost.replace('imap.', 'smtp.');
    } else if (smtpHost.includes('outlook.office365.com')) {
        smtpHost = 'smtp.office365.com';
    } else if (smtpHost.includes('gmail.com')) {
        smtpHost = 'smtp.gmail.com';
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
            username: account.imap_username,
            password: account.imap_password,
        },
      },
    });

    await client.send({
      from: account.email,
      to,
      subject,
      content: body,
      html,
    });

    await client.close();
    return { success: true };
}

// ============================================================================
// AUTH ROUTES
// ============================================================================

app.post('/make-server-8405be07/auth/signup', async (c) => {
  try {
    const { email, password, name, organizationId, role = 'standard_user' } = await c.req.json();

    // Validate that organizationId is provided
    if (!organizationId) {
      console.error('Signup error: Organization ID is required');
      return c.json({ 
        error: 'Organization ID is required. Please provide a valid organization ID during signup.' 
      }, 400);
    }

    // Verify organization exists
    const { data: orgCheck, error: orgError } = await supabase
      .from('organizations')
      .select('id, status')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgCheck) {
      console.error('Signup error: Organization not found:', organizationId);
      return c.json({ 
        error: `Organization with ID "${organizationId}" does not exist. Please create the organization first.` 
      }, 400);
    }

    if (orgCheck.status !== 'active') {
      console.error('Signup error: Organization is not active:', organizationId);
      return c.json({ 
        error: `Organization "${organizationId}" is not active. Please contact your administrator.` 
      }, 400);
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
      user_metadata: {
        name,
        role,
        organizationId,
      },
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store user data in KV store
    const userData = {
      id: data.user.id,
      email,
      name,
      role,
      organizationId,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    await kv.set(`user:${data.user.id}`, userData);
    await kv.set(`user:email:${email}`, data.user.id);

    return c.json({ user: userData }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return c.json({ error: error.message }, 401);
    }

    // Get user data from KV store or build from auth metadata
    let userData = await kv.get(`user:${data.user.id}`);
    
    if (!userData) {
      // Build userData from auth metadata
      const orgId = data.user.user_metadata?.organizationId;
      
      if (!orgId) {
        console.error('Sign in error: User has no organization ID:', data.user.email);
        return c.json({ 
          error: 'Your account is not associated with any organization. Please contact your administrator.' 
        }, 400);
      }
      
      userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email,
        role: data.user.user_metadata?.role || 'standard_user',
        organizationId: orgId,
      };
    }

    return c.json({
      session: data.session,
      user: userData,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return c.json({ error: 'Sign in failed: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/auth/signout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    return c.json({ error: 'Sign out failed: ' + error.message }, 500);
  }
});

app.get('/make-server-8405be07/auth/session', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ session: null, user: null });
    }

    let userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      // Build userData from auth metadata
      const orgId = user.user_metadata?.organizationId;
      
      if (!orgId) {
        console.warn('Session check: User has no organization ID:', user.email);
        // Return null to trigger re-authentication
        return c.json({ session: null, user: null });
      }
      
      userData = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'standard_user',
        organizationId: orgId,
      };
    }

    return c.json({
      session: { user },
      user: userData,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json({ error: 'Session check failed: ' + error.message }, 500);
  }
});

// ============================================================================
// CONTACTS ROUTES
// ============================================================================

app.get('/make-server-8405be07/contacts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const contacts = await kv.getByPrefix(`contact:${organizationId}:`);

    return c.json({ contacts: contacts || [] });
  } catch (error) {
    console.error('Get contacts error:', error);
    return c.json({ error: 'Failed to fetch contacts: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/contacts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const contactData = await c.req.json();
    const contactId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const contact = {
      id: contactId,
      ...contactData,
      ownerId: user.id,
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`contact:${organizationId}:${contactId}`, contact);

    return c.json({ contact }, 201);
  } catch (error) {
    console.error('Create contact error:', error);
    return c.json({ error: 'Failed to create contact: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/contacts/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const contactId = c.req.param('id');

    const existingContact = await kv.get(`contact:${organizationId}:${contactId}`);

    if (!existingContact) {
      return c.json({ error: 'Contact not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedContact = {
      ...existingContact,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`contact:${organizationId}:${contactId}`, updatedContact);

    return c.json({ contact: updatedContact });
  } catch (error) {
    console.error('Update contact error:', error);
    return c.json({ error: 'Failed to update contact: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/contacts/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const contactId = c.req.param('id');

    await kv.del(`contact:${organizationId}:${contactId}`);

    return c.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    return c.json({ error: 'Failed to delete contact: ' + error.message }, 500);
  }
});

// ============================================================================
// TASKS ROUTES
// ============================================================================

app.get('/make-server-8405be07/tasks', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const tasks = await kv.getByPrefix(`task:${organizationId}:`);

    return c.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Get tasks error:', error);
    return c.json({ error: 'Failed to fetch tasks: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/tasks', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const taskData = await c.req.json();
    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const task = {
      id: taskId,
      ...taskData,
      ownerId: user.id,
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`task:${organizationId}:${taskId}`, task);

    return c.json({ task }, 201);
  } catch (error) {
    console.error('Create task error:', error);
    return c.json({ error: 'Failed to create task: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/tasks/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const taskId = c.req.param('id');

    const existingTask = await kv.get(`task:${organizationId}:${taskId}`);

    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedTask = {
      ...existingTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`task:${organizationId}:${taskId}`, updatedTask);

    return c.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    return c.json({ error: 'Failed to update task: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/tasks/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const taskId = c.req.param('id');

    await kv.del(`task:${organizationId}:${taskId}`);

    return c.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return c.json({ error: 'Failed to delete task: ' + error.message }, 500);
  }
});

// ============================================================================
// APPOINTMENTS ROUTES
// ============================================================================

app.get('/make-server-8405be07/appointments', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const appointments = await kv.getByPrefix(`appointment:${organizationId}:`);

    return c.json({ appointments: appointments || [] });
  } catch (error) {
    console.error('Get appointments error:', error);
    return c.json({ error: 'Failed to fetch appointments: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/appointments', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const appointmentData = await c.req.json();
    const appointmentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const appointment = {
      id: appointmentId,
      ...appointmentData,
      ownerId: user.id,
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`appointment:${organizationId}:${appointmentId}`, appointment);

    return c.json({ appointment }, 201);
  } catch (error) {
    console.error('Create appointment error:', error);
    return c.json({ error: 'Failed to create appointment: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/appointments/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const appointmentId = c.req.param('id');

    await kv.del(`appointment:${organizationId}:${appointmentId}`);

    return c.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return c.json({ error: 'Failed to delete appointment: ' + error.message }, 500);
  }
});

// ============================================================================
// BIDS ROUTES
// ============================================================================

app.get('/make-server-8405be07/bids', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const bids = await kv.getByPrefix(`bid:${organizationId}:`);

    return c.json({ bids: bids || [] });
  } catch (error) {
    console.error('Get bids error:', error);
    return c.json({ error: 'Failed to fetch bids: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/bids', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const bidData = await c.req.json();
    const bidId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const bid = {
      id: bidId,
      ...bidData,
      // Stringify lineItems if it's an array for storage
      lineItems: Array.isArray(bidData.lineItems) ? JSON.stringify(bidData.lineItems) : bidData.lineItems,
      ownerId: user.id,
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`bid:${organizationId}:${bidId}`, bid);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Created quote/bid',
      module: 'bids',
      changes: `Created quote: ${bidData.title || bidData.quoteNumber}`,
    });

    return c.json({ bid }, 201);
  } catch (error) {
    console.error('Create bid error:', error);
    return c.json({ error: 'Failed to create bid: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/bids/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const bidId = c.req.param('id');

    const existingBid = await kv.get(`bid:${organizationId}:${bidId}`);

    if (!existingBid) {
      return c.json({ error: 'Bid not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedBid = {
      ...existingBid,
      ...updates,
      // Stringify lineItems if it's an array for storage
      lineItems: Array.isArray(updates.lineItems) ? JSON.stringify(updates.lineItems) : (updates.lineItems || existingBid.lineItems),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`bid:${organizationId}:${bidId}`, updatedBid);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Updated quote/bid',
      module: 'bids',
      changes: `Updated quote: ${updatedBid.title || updatedBid.quoteNumber}`,
    });

    return c.json({ bid: updatedBid });
  } catch (error) {
    console.error('Update bid error:', error);
    return c.json({ error: 'Failed to update bid: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/bids/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const bidId = c.req.param('id');

    await kv.del(`bid:${organizationId}:${bidId}`);

    return c.json({ message: 'Bid deleted successfully' });
  } catch (error) {
    console.error('Delete bid error:', error);
    return c.json({ error: 'Failed to delete bid: ' + error.message }, 500);
  }
});

// Get bids by opportunity ID
app.get('/make-server-8405be07/bids/opportunity/:opportunityId', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const opportunityId = c.req.param('opportunityId');

    // Get all bids and filter by opportunity ID
    const allBids = await kv.getByPrefix(`bid:${organizationId}:`);
    const bids = (allBids || []).filter((bid: any) => bid.opportunity_id === opportunityId);

    return c.json({ bids: bids || [] });
  } catch (error) {
    console.error('Get bids by opportunity error:', error);
    return c.json({ error: 'Failed to fetch bids: ' + error.message }, 500);
  }
});

// ============================================================================
// IMAGE UPLOAD ROUTES
// ============================================================================

// Upload image to Supabase Storage
app.post('/make-server-8405be07/upload-image', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Ensure the bucket exists
    const bucketName = 'make-8405be07-landing-pages';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      });
    }

    // Get the base64 image from request
    const { imageData, fileName } = await c.req.json();
    
    if (!imageData) {
      return c.json({ error: 'No image data provided' }, 400);
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique file name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const fileExt = fileName?.split('.').pop() || 'png';
    const uniqueFileName = `${organizationId}/${timestamp}-${randomStr}.${fileExt}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: 'Failed to upload image: ' + uploadError.message }, 500);
    }

    // Get signed URL (valid for 1 year)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(uniqueFileName, 31536000); // 1 year in seconds

    if (urlError) {
      console.error('URL generation error:', urlError);
      return c.json({ error: 'Failed to generate image URL: ' + urlError.message }, 500);
    }

    return c.json({ 
      url: urlData.signedUrl,
      path: uniqueFileName 
    }, 201);
  } catch (error) {
    console.error('Image upload error:', error);
    return c.json({ error: 'Failed to upload image: ' + error.message }, 500);
  }
});

// ============================================================================
// NOTES ROUTES
// ============================================================================

app.get('/make-server-8405be07/notes', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const notes = await kv.getByPrefix(`note:${organizationId}:`);

    return c.json({ notes: notes || [] });
  } catch (error) {
    console.error('Get notes error:', error);
    return c.json({ error: 'Failed to fetch notes: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/notes', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const noteData = await c.req.json();
    const noteId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const note = {
      id: noteId,
      ...noteData,
      ownerId: user.id,
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`note:${organizationId}:${noteId}`, note);

    return c.json({ note }, 201);
  } catch (error) {
    console.error('Create note error:', error);
    return c.json({ error: 'Failed to create note: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/notes/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const noteId = c.req.param('id');

    await kv.del(`note:${organizationId}:${noteId}`);

    return c.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    return c.json({ error: 'Failed to delete note: ' + error.message }, 500);
  }
});

// ============================================================================
// SECURITY & PERMISSIONS ROUTES
// ============================================================================

app.get('/make-server-8405be07/security/permissions', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;

    // Only super_admin and admin can view permissions
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Get permissions for the organization
    const permissions = await kv.getByPrefix(`permission:${organizationId}:`);

    return c.json({ permissions: permissions || [] });
  } catch (error) {
    console.error('Get permissions error:', error);
    return c.json({ error: 'Failed to fetch permissions: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/security/permissions', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;

    // Only super_admin and admin can update permissions
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const { permissions } = await c.req.json();

    // Save each permission
    const savePromises = permissions.map((perm: any) => {
      const key = `permission:${organizationId}:${perm.module}:${perm.role}`;
      return kv.set(key, {
        module: perm.module,
        role: perm.role,
        visible: perm.visible,
        add: perm.add,
        change: perm.change,
        delete: perm.delete,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      });
    });

    await Promise.all(savePromises);

    // Log the audit entry
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Updated security permissions',
      module: 'security',
      changes: `Updated ${permissions.length} permission entries`,
    });

    return c.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Update permissions error:', error);
    return c.json({ error: 'Failed to update permissions: ' + error.message }, 500);
  }
});

app.get('/make-server-8405be07/security/audit-logs', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;

    // Only super_admin and admin can view audit logs
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Get audit logs for the organization
    const logs = await kv.getByPrefix(`audit:${organizationId}:`);

    // Sort by timestamp descending (most recent first)
    const sortedLogs = (logs || []).sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return c.json({ logs: sortedLogs.slice(0, 100) }); // Return last 100 logs
  } catch (error) {
    console.error('Get audit logs error:', error);
    return c.json({ error: 'Failed to fetch audit logs: ' + error.message }, 500);
  }
});

// ============================================================================
// EMAIL INTEGRATION ROUTES
// ============================================================================

// Get all email accounts for user
app.get('/make-server-8405be07/email/accounts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('Email accounts - Auth header:', authHeader ? 'Present' : 'Missing');
    
    const user = await verifyUser(authHeader);
    console.log('Email accounts - User verified:', user ? user.id : 'No user');

    if (!user) {
      console.log('Email accounts - Returning 401 Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    console.log('Email accounts - User data:', userData ? 'Found' : 'Not found');
    
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    console.log('Email accounts - Organization ID:', organizationId);

    // Get all email accounts for this user
    const accountsKey = `email:accounts:${organizationId}:${user.id}`;
    console.log('Email accounts - Looking up key:', accountsKey);
    
    let accounts = [];
    
    try {
      const result = await kv.get(accountsKey);
      accounts = result || [];
      console.log('Email accounts - Found accounts:', accounts.length);
    } catch (kvError) {
      console.error('KV get error for email accounts:', kvError);
      // Return empty array if key doesn't exist
      accounts = [];
    }

    return c.json({ accounts });
  } catch (error) {
    console.error('Get email accounts error:', error);
    return c.json({ error: 'Failed to get email accounts: ' + error.message }, 500);
  }
});

// Add email account
app.post('/make-server-8405be07/email/accounts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const accountData = await c.req.json();

    const accountId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAccount = {
      id: accountId,
      ...accountData,
      userId: user.id,
      connected: true,
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Get existing accounts
    const accountsKey = `email:accounts:${organizationId}:${user.id}`;
    const accounts = await kv.get(accountsKey) || [];
    
    // Add new account
    accounts.push(newAccount);
    await kv.set(accountsKey, accounts);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Connected email account',
      module: 'email',
      changes: `Connected ${accountData.provider} account: ${accountData.email}`,
    });

    return c.json({ account: newAccount }, 201);
  } catch (error) {
    console.error('Add email account error:', error);
    return c.json({ error: 'Failed to add email account: ' + error.message }, 500);
  }
});

// Delete email account
app.delete('/make-server-8405be07/email/accounts/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const accountId = c.req.param('id');

    // Get existing accounts
    const accountsKey = `email:accounts:${organizationId}:${user.id}`;
    const accounts = await kv.get(accountsKey) || [];
    
    // Find and remove account
    const accountToDelete = accounts.find((a: any) => a.id === accountId);
    const updatedAccounts = accounts.filter((a: any) => a.id !== accountId);
    await kv.set(accountsKey, updatedAccounts);

    // Also delete all emails for this account
    const emailsKey = `email:emails:${organizationId}:${user.id}`;
    const emails = await kv.get(emailsKey) || [];
    const updatedEmails = emails.filter((e: any) => e.accountId !== accountId);
    await kv.set(emailsKey, updatedEmails);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Disconnected email account',
      module: 'email',
      changes: `Disconnected account: ${accountToDelete?.email || accountId}`,
    });

    return c.json({ message: 'Email account deleted successfully' });
  } catch (error) {
    console.error('Delete email account error:', error);
    return c.json({ error: 'Failed to delete email account: ' + error.message }, 500);
  }
});

// Get all emails
app.get('/make-server-8405be07/email/emails', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Get all emails for this user
    const emailsKey = `email:emails:${organizationId}:${user.id}`;
    let emails = [];
    
    try {
      const result = await kv.get(emailsKey);
      emails = result || [];
    } catch (kvError) {
      console.error('KV get error for emails:', kvError);
      // Return empty array if key doesn't exist
      emails = [];
    }

    return c.json({ emails });
  } catch (error) {
    console.error('Get emails error:', error);
    return c.json({ error: 'Failed to get emails: ' + error.message }, 500);
  }
});

// Send/Create email
app.post('/make-server-8405be07/email/emails', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const emailData = await c.req.json();

    const emailId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEmail = {
      id: emailId,
      ...emailData,
      userId: user.id,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Get existing emails
    const emailsKey = `email:emails:${organizationId}:${user.id}`;
    const emails = await kv.get(emailsKey) || [];
    
    // Add new email
    emails.push(newEmail);
    await kv.set(emailsKey, emails);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Sent email',
      module: 'email',
      changes: `Sent email to ${emailData.to}: ${emailData.subject}`,
    });

    return c.json({ email: newEmail }, 201);
  } catch (error) {
    console.error('Send email error:', error);
    return c.json({ error: 'Failed to send email: ' + error.message }, 500);
  }
});

// Update email (mark as read, star, move folder, etc.)
app.put('/make-server-8405be07/email/emails/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const emailId = c.req.param('id');
    const updates = await c.req.json();

    // Get existing emails
    const emailsKey = `email:emails:${organizationId}:${user.id}`;
    const emails = await kv.get(emailsKey) || [];
    
    // Find and update email
    const emailIndex = emails.findIndex((e: any) => e.id === emailId);
    if (emailIndex === -1) {
      return c.json({ error: 'Email not found' }, 404);
    }

    emails[emailIndex] = {
      ...emails[emailIndex],
      ...updates,
      id: emailId,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(emailsKey, emails);

    return c.json({ email: emails[emailIndex] });
  } catch (error) {
    console.error('Update email error:', error);
    return c.json({ error: 'Failed to update email: ' + error.message }, 500);
  }
});

// Delete email
app.delete('/make-server-8405be07/email/emails/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const emailId = c.req.param('id');

    // Get existing emails
    const emailsKey = `email:emails:${organizationId}:${user.id}`;
    const emails = await kv.get(emailsKey) || [];
    
    // Remove email
    const updatedEmails = emails.filter((e: any) => e.id !== emailId);
    await kv.set(emailsKey, updatedEmails);

    return c.json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Delete email error:', error);
    return c.json({ error: 'Failed to delete email: ' + error.message }, 500);
  }
});

// Sync email account
app.post('/make-server-8405be07/email/accounts/:id/sync', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const accountId = c.req.param('id');

    // Get existing accounts
    const accountsKey = `email:accounts:${organizationId}:${user.id}`;
    const accounts = await kv.get(accountsKey) || [];
    
    // Find and update account sync time
    const accountIndex = accounts.findIndex((a: any) => a.id === accountId);
    if (accountIndex === -1) {
      return c.json({ error: 'Account not found' }, 404);
    }

    accounts[accountIndex] = {
      ...accounts[accountIndex],
      lastSync: new Date().toISOString(),
    };

    await kv.set(accountsKey, accounts);

    // In production, this would fetch new emails from the provider
    // For now, we just update the sync timestamp

    return c.json({ account: accounts[accountIndex] });
  } catch (error) {
    console.error('Sync email error:', error);
    return c.json({ error: 'Failed to sync email: ' + error.message }, 500);
  }
});

// ============================================================================
// INVENTORY ROUTES
// ============================================================================

app.get('/make-server-8405be07/inventory', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Get all inventory items for the organization
    const items = await kv.getByPrefix(`inventory:${organizationId}:`);
    
    return c.json({ items: items || [] });
  } catch (error) {
    console.error('Get inventory error:', error);
    return c.json({ error: 'Failed to get inventory: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/inventory', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const itemData = await c.req.json();

    const itemId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item = {
      id: itemId,
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`inventory:${organizationId}:${itemId}`, item);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Created inventory item',
      module: 'inventory',
      changes: `Created item: ${itemData.name || itemData.sku}`,
    });

    return c.json({ item }, 201);
  } catch (error) {
    console.error('Create inventory error:', error);
    return c.json({ error: 'Failed to create inventory: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/inventory/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const itemId = c.req.param('id');

    const existingItem = await kv.get(`inventory:${organizationId}:${itemId}`);

    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedItem = {
      ...existingItem,
      ...updates,
      id: itemId,
      createdAt: existingItem.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`inventory:${organizationId}:${itemId}`, updatedItem);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Updated inventory item',
      module: 'inventory',
      changes: `Updated item: ${updatedItem.name || updatedItem.sku}`,
    });

    return c.json({ item: updatedItem });
  } catch (error) {
    console.error('Update inventory error:', error);
    return c.json({ error: 'Failed to update inventory: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/inventory/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const itemId = c.req.param('id');

    const existingItem = await kv.get(`inventory:${organizationId}:${itemId}`);

    await kv.del(`inventory:${organizationId}:${itemId}`);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Deleted inventory item',
      module: 'inventory',
      changes: `Deleted item: ${existingItem?.name || existingItem?.sku || itemId}`,
    });

    return c.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return c.json({ error: 'Failed to delete inventory: ' + error.message }, 500);
  }
});

// ============================================================================
// TENANTS ROUTES (Super Admin Only)
// ============================================================================

// Get current user's organization (must come BEFORE /:id routes)
app.get('/make-server-8405be07/tenants/current', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    
    if (!userData || !userData.organizationId) {
      return c.json({ error: 'User organization not found' }, 404);
    }

    // Get the current organization
    const organization = await kv.get(`tenant:${userData.organizationId}`);
    
    if (!organization) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json({ organization });
  } catch (error) {
    console.error('Get current tenant error:', error);
    return c.json({ error: 'Failed to get current tenant: ' + error.message }, 500);
  }
});

app.get('/make-server-8405be07/tenants', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    
    // Only super_admin can view all tenants
    if (userData?.role !== 'super_admin' && user.user_metadata?.role !== 'super_admin') {
      return c.json({ error: 'Access denied. Super Admin access required.' }, 403);
    }

    // Get all tenants
    const tenants = await kv.getByPrefix('tenant:');
    
    return c.json({ tenants: tenants || [] });
  } catch (error) {
    console.error('Get tenants error:', error);
    return c.json({ error: 'Failed to get tenants: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/tenants', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    
    // Only super_admin can create tenants
    if (userData?.role !== 'super_admin' && user.user_metadata?.role !== 'super_admin') {
      return c.json({ error: 'Access denied. Super Admin access required.' }, 403);
    }

    const tenantData = await c.req.json();
    const tenantId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tenant = {
      id: tenantId,
      ...tenantData,
      userCount: 0,
      contactsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`tenant:${tenantId}`, tenant);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:system:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Created tenant organization',
      module: 'tenants',
      changes: `Created organization: ${tenantData.name}`,
    });

    return c.json({ tenant }, 201);
  } catch (error) {
    console.error('Create tenant error:', error);
    return c.json({ error: 'Failed to create tenant: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/tenants/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    
    // Only super_admin can update tenants
    if (userData?.role !== 'super_admin' && user.user_metadata?.role !== 'super_admin') {
      return c.json({ error: 'Access denied. Super Admin access required.' }, 403);
    }

    const tenantId = c.req.param('id');
    const existingTenant = await kv.get(`tenant:${tenantId}`);

    if (!existingTenant) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    const updates = await c.req.json();
    const updatedTenant = {
      ...existingTenant,
      ...updates,
      id: tenantId,
      createdAt: existingTenant.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`tenant:${tenantId}`, updatedTenant);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:system:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Updated tenant organization',
      module: 'tenants',
      changes: `Updated organization: ${updatedTenant.name}`,
    });

    return c.json({ tenant: updatedTenant });
  } catch (error) {
    console.error('Update tenant error:', error);
    return c.json({ error: 'Failed to update tenant: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/tenants/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    
    // Only super_admin can delete tenants
    if (userData?.role !== 'super_admin' && user.user_metadata?.role !== 'super_admin') {
      return c.json({ error: 'Access denied. Super Admin access required.' }, 403);
    }

    const tenantId = c.req.param('id');
    const existingTenant = await kv.get(`tenant:${tenantId}`);

    if (!existingTenant) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    await kv.del(`tenant:${tenantId}`);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:system:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Deleted tenant organization',
      module: 'tenants',
      changes: `Deleted organization: ${existingTenant.name}`,
    });

    return c.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    return c.json({ error: 'Failed to delete tenant: ' + error.message }, 500);
  }
});

// ============================================================================
// USERS ROUTES
// ============================================================================

// Get all users in the organization
app.get('/make-server-8405be07/users', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Only super_admin and admin can view users
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    // Get all users from Supabase Auth
    const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('List users error:', error);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    // Filter users by organization and enrich with KV data
    const orgUsers = [];
    for (const authUser of authUsers || []) {
      const userOrgId = authUser.user_metadata?.organizationId;
      
      // Super admin sees all users, admin sees only their org
      if (role === 'super_admin' || userOrgId === organizationId) {
        const kvData = await kv.get(`user:${authUser.id}`);
        orgUsers.push({
          id: authUser.id,
          email: authUser.email,
          name: kvData?.name || authUser.user_metadata?.name || authUser.email,
          role: kvData?.role || authUser.user_metadata?.role || 'standard_user',
          organization_id: userOrgId,
          status: kvData?.status || 'active',
          last_login: authUser.last_sign_in_at,
          created_at: authUser.created_at,
        });
      }
    }

    return c.json({ users: orgUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users: ' + error.message }, 500);
  }
});

// Invite a new user
app.post('/make-server-8405be07/users/invite', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Only super_admin and admin can invite users
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    const { email, name, role: newUserRole } = await c.req.json();

    // Generate a temporary password
    const tempPassword = `Temp${Date.now()}!`;

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: newUserRole,
        organizationId,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      return c.json({ error: createError.message }, 400);
    }

    // Store user data in KV store
    const newUserData = {
      id: newUser.user.id,
      email,
      name,
      role: newUserRole,
      organizationId,
      status: 'invited',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${newUser.user.id}`, newUserData);
    await kv.set(`user:email:${email}`, newUser.user.id);

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Invited user',
      module: 'users',
      changes: `Invited ${name} (${email}) with role ${newUserRole}`,
    });

    return c.json({ user: newUserData }, 201);
  } catch (error) {
    console.error('Invite user error:', error);
    return c.json({ error: 'Failed to invite user: ' + error.message }, 500);
  }
});

// Update user
app.put('/make-server-8405be07/users/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;

    // Only super_admin and admin can update users
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    const userId = c.req.param('id');
    const updates = await c.req.json();

    // Get existing user data
    const existingUserData = await kv.get(`user:${userId}`);
    
    if (!existingUserData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Update user metadata in Supabase Auth if role is changing
    if (updates.role) {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUserData,
          role: updates.role,
        },
      });
    }

    // Update user data in KV store
    const updatedUserData = {
      ...existingUserData,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${userId}`, updatedUserData);

    return c.json({ user: updatedUserData });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user: ' + error.message }, 500);
  }
});

// Delete user
app.delete('/make-server-8405be07/users/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Only super_admin and admin can delete users
    if (role !== 'super_admin' && role !== 'admin') {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    const userId = c.req.param('id');

    // Prevent self-deletion
    if (userId === user.id) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }

    // Get user data before deletion for audit log
    const targetUserData = await kv.get(`user:${userId}`);

    // Delete user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return c.json({ error: deleteError.message }, 400);
    }

    // Delete user data from KV store
    await kv.del(`user:${userId}`);
    if (targetUserData?.email) {
      await kv.del(`user:email:${targetUserData.email}`);
    }

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Deleted user',
      module: 'users',
      changes: `Deleted user ${targetUserData?.name} (${targetUserData?.email})`,
    });

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user: ' + error.message }, 500);
  }
});

// ============================================================================
// PROJECT MANAGERS ROUTES
// ============================================================================

// Get project managers by customer ID
app.get('/make-server-8405be07/project-managers/customer/:customerId', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const customerId = c.req.param('customerId');

    // Get all project managers and filter by customer ID
    const allProjectManagers = await kv.getByPrefix(`project-manager:${organizationId}:`);
    const projectManagers = (allProjectManagers || []).filter((pm: any) => pm.customer_id === customerId);

    return c.json({ projectManagers: projectManagers || [] });
  } catch (error) {
    console.error('Get project managers by customer error:', error);
    return c.json({ error: 'Failed to fetch project managers: ' + error.message }, 500);
  }
});

// ============================================================================
// CONTACTS ADMIN ROUTES
// ============================================================================

// Reassign contacts to a new owner by email
app.post('/make-server-8405be07/contacts/reassign-by-email', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user data from KV store
    const userData = await getUserData(user.id);
    const role = userData?.role || user.user_metadata?.role;
    const userOrgId = userData?.organizationId || user.user_metadata?.organizationId;

    if (!userData) {
      console.log('⚠️ User data not found in KV, using metadata:', user.user_metadata);
    }

    // Only admins and super_admins can reassign contacts
    if (role !== 'admin' && role !== 'super_admin') {
      return c.json({ error: 'Unauthorized: Only admins can reassign contacts' }, 403);
    }

    const { fromEmail, toEmail, organizationId } = await c.req.json();

    if (!fromEmail || !toEmail || !organizationId) {
      return c.json({ error: 'fromEmail, toEmail, and organizationId are required' }, 400);
    }

    console.log(`🔄 Reassigning contacts from ${fromEmail} to ${toEmail} in org ${organizationId}`);

    // Get all users from Supabase Auth to find the from/to user IDs
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return c.json({ error: 'Failed to list users' }, 500);
    }

    // Find the "from" user by email
    const fromUser = authUsers?.find(u => u.email === fromEmail);
    if (!fromUser) {
      return c.json({ error: `User with email ${fromEmail} not found` }, 404);
    }

    // Find the "to" user by email
    const toUser = authUsers?.find(u => u.email === toEmail);
    if (!toUser) {
      return c.json({ error: `User with email ${toEmail} not found` }, 404);
    }

    const fromUserId = fromUser.id;
    const toUserId = toUser.id;

    console.log(`📋 Found users: ${fromUserId} (${fromEmail}) -> ${toUserId} (${toEmail})`);

    // Update all contacts from fromUserId to toUserId
    const { data: updatedContacts, error: updateError } = await supabase
      .from('contacts')
      .update({ owner_id: toUserId })
      .eq('owner_id', fromUserId)
      .eq('organization_id', organizationId)
      .select('id');

    if (updateError) {
      console.error('❌ Error updating contacts:', updateError);
      return c.json({ error: updateError.message }, 500);
    }

    const count = updatedContacts?.length || 0;
    console.log(`✅ Successfully reassigned ${count} contacts from ${fromEmail} to ${toEmail}`);

    return c.json({ 
      success: true, 
      count,
      message: `Reassigned ${count} contacts from ${fromEmail} to ${toEmail}` 
    });
  } catch (error) {
    console.error('❌ Reassign contacts error:', error);
    return c.json({ error: 'Failed to reassign contacts: ' + error.message }, 500);
  }
});

// Health check
app.get('/make-server-8405be07/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// USER PLANNER DEFAULTS ROUTES
// ============================================================================

/**
 * Get user-specific planner defaults
 * GET /make-server-8405be07/user-planner-defaults/:organizationId/:userId
 */
app.get('/make-server-8405be07/user-planner-defaults/:organizationId/:userId', async (c) => {
  try {
    const { organizationId, userId } = c.req.param();
    
    // Verify authentication
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    
    if (!user) {
      console.error('❌ User planner defaults GET: Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Ensure user can only access their own defaults (or is admin)
    if (user.id !== userId) {
      // Check if user is admin and in same organization
      const userData = await getUserData(user.id);
      if (!userData || userData.organizationId !== organizationId || !['super_admin', 'org_admin'].includes(userData.role)) {
        console.error('❌ User planner defaults GET: Forbidden - User cannot access other user defaults');
        return c.json({ error: 'Forbidden' }, 403);
      }
    }
    
    const key = `user_planner_defaults:${organizationId}:${userId}`;
    const defaults = await kv.get(key);
    
    console.log('✅ User planner defaults retrieved:', { organizationId, userId, hasDefaults: !!defaults });
    
    return c.json({
      defaults: defaults || {},
    });
  } catch (error) {
    console.error('❌ Get user planner defaults error:', error);
    return c.json({ error: 'Failed to get user planner defaults: ' + error.message }, 500);
  }
});

/**
 * Save user-specific planner defaults
 * POST /make-server-8405be07/user-planner-defaults/:organizationId/:userId
 */
app.post('/make-server-8405be07/user-planner-defaults/:organizationId/:userId', async (c) => {
  try {
    const { organizationId, userId } = c.req.param();
    const { defaults } = await c.req.json();
    
    // Verify authentication
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    
    if (!user) {
      console.error('❌ User planner defaults POST: Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Ensure user can only update their own defaults
    if (user.id !== userId) {
      console.error('❌ User planner defaults POST: Forbidden - User can only update their own defaults');
      return c.json({ error: 'Forbidden - You can only update your own defaults' }, 403);
    }
    
    // Validate defaults format
    if (!defaults || typeof defaults !== 'object') {
      console.error('❌ User planner defaults POST: Invalid defaults format');
      return c.json({ error: 'Invalid defaults format - must be an object' }, 400);
    }
    
    const key = `user_planner_defaults:${organizationId}:${userId}`;
    await kv.set(key, defaults);
    
    console.log('✅ User planner defaults saved:', { organizationId, userId, defaultsCount: Object.keys(defaults).length });
    
    return c.json({
      success: true,
      message: 'User planner defaults saved successfully',
    });
  } catch (error) {
    console.error('❌ Save user planner defaults error:', error);
    return c.json({ error: 'Failed to save user planner defaults: ' + error.message }, 500);
  }
});

/**
 * Delete user-specific planner defaults (restore to org defaults)
 * DELETE /make-server-8405be07/user-planner-defaults/:organizationId/:userId
 */
app.delete('/make-server-8405be07/user-planner-defaults/:organizationId/:userId', async (c) => {
  try {
    const { organizationId, userId } = c.req.param();
    
    // Verify authentication
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    
    if (!user) {
      console.error('❌ User planner defaults DELETE: Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Ensure user can only delete their own defaults
    if (user.id !== userId) {
      console.error('❌ User planner defaults DELETE: Forbidden - User can only delete their own defaults');
      return c.json({ error: 'Forbidden - You can only delete your own defaults' }, 403);
    }
    
    const key = `user_planner_defaults:${organizationId}:${userId}`;
    await kv.del(key);
    
    console.log('✅ User planner defaults deleted:', { organizationId, userId });
    
    return c.json({
      success: true,
      message: 'User planner defaults deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete user planner defaults error:', error);
    return c.json({ error: 'Failed to delete user planner defaults: ' + error.message }, 500);
  }
});

// ============================================================================
// TRACKING ROUTES
// ============================================================================

// Helper to update lead score
async function updateContactLeadScore(organizationId: string, contactId: string, points: number, action: string) {
  if (!contactId || !organizationId) return;

  try {
    // Check if table exists/is accessible
    const { data: existing, error: fetchError } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('contact_id', contactId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
       // Table might not exist
       return;
    }

    const newScore = (existing?.score || 0) + points;
    let status = 'unscored';
    if (newScore >= 80) status = 'hot';
    else if (newScore >= 50) status = 'warm';
    else if (newScore > 0) status = 'cold';

    const scoreHistory = existing?.score_history || [];
    scoreHistory.push({
        action,
        change: points,
        timestamp: new Date().toISOString()
    });

    if (existing) {
        await supabase
            .from('lead_scores')
            .update({
                score: newScore,
                status,
                last_activity: new Date().toISOString(),
                score_history: scoreHistory
            })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('lead_scores')
            .insert([{
                contact_id: contactId,
                organization_id: organizationId,
                score: newScore,
                status,
                last_activity: new Date().toISOString(),
                score_history: scoreHistory
            }]);
    }
  } catch (e) {
      console.error('Lead scoring update failed:', e);
  }
}

// Helper to create follow-up task
async function createFollowUpTask(entity: any, type: 'quote' | 'bid' = 'quote') {
  const createdBy = entity.created_by || entity.createdBy || entity.ownerId;
  const orgId = entity.organization_id || entity.organizationId;
  const title = entity.title || entity.quote_number || entity.id;

  if (!entity || !createdBy || !orgId) return;

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const taskData = {
      title: `Follow up: ${title}`,
      description: `Customer viewed ${type} ${title}. Follow up to close the deal.`,
      status: 'pending',
      priority: 'high',
      due_date: tomorrow.toISOString().split('T')[0],
      assigned_to: createdBy,
      owner_id: createdBy,
      organization_id: orgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to Postgres
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();
    
    if (error) {
        console.error('Failed to create Postgres task:', error);
        // Fallback or retry? For now just log.
        return;
    }

    console.log(`Created follow-up task for ${type}:`, data.id);
  } catch (e) {
    console.error(`Failed to create follow-up task for ${type}:`, e);
  }
}

app.get('/make-server-8405be07/track/open', async (c) => {
  try {
    const id = c.req.query('id');
    const orgId = c.req.query('orgId');
    const type = c.req.query('type') || 'quote';

    if (id && orgId) {
      // 1. Log open event
      const trackingKey = `tracking:${orgId}:${type}:${id}:opens`;
      const timestamp = new Date().toISOString();
      
      // Get existing opens
      let opens = await kv.get(trackingKey);
      if (!Array.isArray(opens)) opens = [];
      opens.push({ timestamp, userAgent: c.req.header('user-agent') });
      
      // Save updated opens
      await kv.set(trackingKey, opens);

      // 2. Update entity status
      if (type === 'quote') {
        // Fetch quote to get contact details for lead scoring
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', id)
          .single();

        // Check if newly viewed
        const isNewView = quote && quote.status !== 'viewed' && quote.status !== 'accepted' && quote.status !== 'rejected';

        // Update Postgres table status
        if (quote && quote.status !== 'viewed' && quote.status !== 'accepted' && quote.status !== 'rejected') {
            await supabase
            .from('quotes')
            .update({ 
                status: 'viewed'
            })
            .eq('id', id);
        }

        if (isNewView) {
            // Update Lead Score
            if (quote?.contact_id) {
               await updateContactLeadScore(quote.organization_id || orgId, quote.contact_id, 5, 'Quote Viewed');
            }

            // Create Follow Up Task
            await createFollowUpTask(quote);
        }

        // Update KV tracking index for timestamps
        const statusKey = `tracking_status:${orgId}:quotes`;
        const statusMap = await kv.get(statusKey) || {};
        // Only update if not already tracked or to update timestamp
        if (!statusMap[id]) {
          statusMap[id] = { readAt: timestamp, status: 'viewed' };
          await kv.set(statusKey, statusMap);
        }
      } else if (type === 'bid') {
        // Update KV bid
        const bidKey = `bid:${orgId}:${id}`;
        const bid = await kv.get(bidKey);
        if (bid) {
          const isNewView = bid.status !== 'viewed';
          bid.read = true;
          bid.readAt = timestamp;
          bid.status = 'viewed';
          await kv.set(bidKey, bid);
          
          if (isNewView) {
             if (!bid.organizationId) bid.organizationId = orgId;
             await createFollowUpTask(bid, 'bid');
          }
        }
      }
    }

    // Return 1x1 transparent GIF
    const gif = new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 68, 0, 59]);
    return new Response(gif, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Tracking open error:', error);
    // Return GIF anyway
    const gif = new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 68, 0, 59]);
    return new Response(gif, { headers: { 'Content-Type': 'image/gif' } });
  }
});

app.get('/make-server-8405be07/track/click', async (c) => {
  try {
    const url = c.req.query('url');
    const id = c.req.query('id');
    const orgId = c.req.query('orgId');
    const type = c.req.query('type') || 'quote';

    if (!url) {
        return c.text('Missing URL', 400);
    }

    if (id && orgId) {
      // 1. Log click event
      const trackingKey = `tracking:${orgId}:${type}:${id}:clicks`;
      const timestamp = new Date().toISOString();
      
      // Get existing clicks
      let clicks = await kv.get(trackingKey);
      if (!Array.isArray(clicks)) clicks = [];
      clicks.push({ timestamp, url, userAgent: c.req.header('user-agent') });
      
      // Save updated clicks
      await kv.set(trackingKey, clicks);

      // 2. Update entity status
       if (type === 'quote') {
        // Fetch quote for lead scoring
        const { data: quote } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', id)
          .single();

        // Check if newly viewed
        const isNewView = quote && quote.status !== 'viewed' && quote.status !== 'accepted' && quote.status !== 'rejected';

        // Update Postgres status
        if (quote && quote.status !== 'viewed' && quote.status !== 'accepted' && quote.status !== 'rejected') {
            await supabase.from('quotes').update({ status: 'viewed' }).eq('id', id);
        }

        if (isNewView) {
            // Update Lead Score (+10 for click)
            if (quote?.contact_id) {
               await updateContactLeadScore(quote.organization_id || orgId, quote.contact_id, 10, 'Quote Link Clicked');
            }

            // Create Follow Up Task
            await createFollowUpTask(quote);
        }

        // Update KV tracking index for quotes (since Postgres table lacks read_at)
        const statusKey = `tracking_status:${orgId}:quotes`;
        const statusMap = await kv.get(statusKey) || {};
        if (!statusMap[id]) {
          statusMap[id] = { readAt: timestamp, status: 'viewed' };
          await kv.set(statusKey, statusMap);
        }
      } else if (type === 'bid') {
        const bidKey = `bid:${orgId}:${id}`;
        const bid = await kv.get(bidKey);
        if (bid) {
          const isNewView = bid.status !== 'viewed';
          bid.read = true;
          bid.readAt = timestamp;
          bid.clicked = true;
          bid.status = 'viewed';
          await kv.set(bidKey, bid);
          
          if (isNewView) {
             if (!bid.organizationId) bid.organizationId = orgId;
             await createFollowUpTask(bid, 'bid');
          }
        }
      }
    }

    return c.redirect(url);
  } catch (error) {
    console.error('Tracking click error:', error);
    const url = c.req.query('url');
    if (url) return c.redirect(url);
    return c.text('Error processing tracking link', 500);
  }
});

app.post('/make-server-8405be07/public/events', async (c) => {
  try {
    const { type, entityType, entityId, orgId, url, userAgent } = await c.req.json();
    
    // Validate required fields
    if (!type || !entityId || !orgId) {
       return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const timestamp = new Date().toISOString();
    const ua = userAgent || c.req.header('user-agent');
    
    if (type === 'open') {
        const trackingKey = `tracking:${orgId}:${entityType}:${entityId}:opens`;
        let opens = await kv.get(trackingKey);
        if (!Array.isArray(opens)) opens = [];
        opens.push({ timestamp, userAgent: ua });
        await kv.set(trackingKey, opens);
        
        // Update entity status
        if (entityType === 'quote') {
            // Update KV tracking index for quotes (since Postgres table lacks read_at)
            const statusKey = `tracking_status:${orgId}:quotes`;
            const statusMap = await kv.get(statusKey) || {};
            if (!statusMap[entityId]) {
              statusMap[entityId] = { readAt: timestamp, status: 'viewed' };
              await kv.set(statusKey, statusMap);
            }
        } else if (entityType === 'bid') {
             const bidKey = `bid:${orgId}:${entityId}`;
             const bid = await kv.get(bidKey);
             if (bid) {
               const isNewView = bid.status !== 'viewed';
               bid.read = true;
               bid.readAt = timestamp;
               bid.status = 'viewed';
               await kv.set(bidKey, bid);

               if (isNewView) {
                    if (!bid.organizationId) bid.organizationId = orgId;
                    await createFollowUpTask(bid, 'bid');
               }
             }
        }
    } else if (type === 'click') {
        const trackingKey = `tracking:${orgId}:${entityType}:${entityId}:clicks`;
        let clicks = await kv.get(trackingKey);
        if (!Array.isArray(clicks)) clicks = [];
        clicks.push({ timestamp, url, userAgent: ua });
        await kv.set(trackingKey, clicks);

        if (entityType === 'quote') {
             // Update KV tracking index for quotes (since Postgres table lacks read_at)
            const statusKey = `tracking_status:${orgId}:quotes`;
            const statusMap = await kv.get(statusKey) || {};
            if (!statusMap[entityId]) {
              statusMap[entityId] = { readAt: timestamp, status: 'viewed' };
              await kv.set(statusKey, statusMap);
            }
        } else if (entityType === 'bid') {
             const bidKey = `bid:${orgId}:${entityId}`;
             const bid = await kv.get(bidKey);
             if (bid) {
               const isNewView = bid.status !== 'viewed';
               bid.read = true;
               bid.readAt = timestamp;
               bid.clicked = true;
               bid.status = 'viewed';
               await kv.set(bidKey, bid);

               if (isNewView) {
                    if (!bid.organizationId) bid.organizationId = orgId;
                    await createFollowUpTask(bid, 'bid');
               }
             }
        }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Tracking event error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Public Quote/Bid View
app.get('/make-server-8405be07/public/view', async (c) => {
    try {
        const id = c.req.query('id');
        const orgId = c.req.query('orgId');
        const type = c.req.query('type'); // 'quote' or 'bid'

        if (!id || !orgId) return c.json({error: 'Missing params'}, 400);

        // Fetch from DB or KV
        if (type === 'bid') {
            const key = `bid:${orgId}:${id}`;
            const data = await kv.get(key);
            if (data) {
                const isNewView = data.status !== 'viewed';
                if (data.status !== 'accepted' && data.status !== 'rejected') {
                    data.status = 'viewed';
                    data.read = true;
                    if (!data.readAt) data.readAt = new Date().toISOString();
                    await kv.set(key, data);
                    
                    if (isNewView) {
                         if (!data.organizationId) data.organizationId = orgId;
                         await createFollowUpTask(data, 'bid');
                    }
                }
                return c.json({ data });
            }
            return c.json({error: 'Not found'}, 404);
        } else {
            // Assume quote (Postgres)
            // We need to use service role to fetch public quote since user is anon
            // But we are in server, so we use the global supabase client (which uses service role)
            const { data, error } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle();
            
            if (error) throw error;
            if (data) {
                // Track view if not already accepted/rejected and status is not already viewed
                if (data.status !== 'accepted' && data.status !== 'rejected') {
                    const isNewView = data.status !== 'viewed';
                    const timestamp = new Date().toISOString();
                    
                    if (isNewView) {
                        // Update Postgres status
                        await supabase.from('quotes').update({ status: 'viewed' }).eq('id', id);

                        // Update Lead Score
                        const orgIdToUse = data.organization_id || orgId;
                        if (data.contact_id) {
                             await updateContactLeadScore(orgIdToUse, data.contact_id, 5, 'Quote Viewed Online');
                        }

                        // Create Follow Up Task
                        await createFollowUpTask(data);

                        // Update KV tracking index
                        const statusKey = `tracking_status:${orgIdToUse}:quotes`;
                        const statusMap = await kv.get(statusKey) || {};
                        if (!statusMap[id]) {
                            statusMap[id] = { readAt: timestamp, status: 'viewed' };
                            await kv.set(statusKey, statusMap);
                        }
                    }
                }
                return c.json({ data });
            }
            
            return c.json({error: 'Not found'}, 404);
        }
    } catch (error) {
        return c.json({ error: 'Failed to fetch public item: ' + error.message }, 500);
    }
});

// DEBUG ENDPOINT - List all landing pages (for troubleshooting)
app.get('/make-server-8405be07/debug/landing-pages', async (c) => {
  try {
    const allPages = await kv.getByPrefix('landing_page:');
    console.log(`[DEBUG /debug/landing-pages] Found ${allPages.length} landing pages with prefix 'landing_page:'`);
    
    const pageList = allPages.map((p: any) => {
      console.log(`[DEBUG] Page: id=${p.id}, name=${p.name}, slug=${p.slug}, orgId=${p.organizationId}`);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        organizationId: p.organizationId,
        createdAt: p.createdAt,
        hasContent: !!p.content,
        contentKeys: p.content ? Object.keys(p.content) : []
      };
    });
    
    return c.json({ 
      count: pageList.length,
      pages: pageList,
      debug: {
        kvPrefix: 'landing_page:',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[DEBUG ERROR]', error);
    return c.json({ error: 'Failed to list landing pages: ' + error.message }, 500);
  }
});

// PUBLIC LANDING PAGE
app.get('/make-server-8405be07/public/landing-page/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    console.log(`[PUBLIC LANDING PAGE] Request for slug: "${slug}"`);
    
    if (!slug) {
      console.log('[PUBLIC LANDING PAGE] ERROR: No slug provided');
      return c.json({ error: 'Slug required' }, 400);
    }

    // Scan all landing pages to find the slug
    // Note: Ideally we would maintain a slug -> id index
    const allPages = await kv.getByPrefix('landing_page:');
    console.log(`[PUBLIC LANDING PAGE] Found ${allPages.length} pages total in KV store`);
    console.log('[PUBLIC LANDING PAGE] Available slugs:', allPages.map((p: any) => `"${p.slug}"`).join(', '));
    console.log('[PUBLIC LANDING PAGE] Page details:', JSON.stringify(allPages.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      orgId: p.organizationId
    })), null, 2));
    
    const page = allPages.find((p: any) => p.slug === slug);
    console.log(`[PUBLIC LANDING PAGE] Slug match result: ${page ? 'FOUND' : 'NOT FOUND'}`);

    if (!page) {
      console.log('[PUBLIC LANDING PAGE] ERROR: Page not found');
      return c.json({ 
        error: 'Landing page not found',
        debug: {
          requestedSlug: slug,
          availableSlugs: allPages.map((p: any) => p.slug).filter(Boolean),
          totalPages: allPages.length,
          hint: allPages.length === 0 
            ? 'No landing pages exist in the system. Create one in Marketing > Landing Pages.'
            : 'The requested slug does not match any existing landing page. Check the slug in the page settings.'
        }
      }, 404);
    }
    
    console.log('[PUBLIC LANDING PAGE] SUCCESS: Returning page:', page.name);
    
    // Only allow published pages or draft pages if in preview mode (but this is public endpoint, so strictly published usually)
    // For now, allow all for testing, but typically check page.status === 'published'

    // Increment view count
    page.views_count = (page.views_count || 0) + 1;
    await kv.set(`landing_page:${page.organizationId}:${page.id}`, page);

    return c.json({ page });
  } catch (error) {
    console.error('[PUBLIC LANDING PAGE] Exception:', error);
    return c.json({ error: 'Failed to fetch landing page: ' + error.message }, 500);
  }
});

// Get quote tracking status
app.get('/make-server-8405be07/quotes/tracking-status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    let organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Fallback: If organizationId is missing (e.g. user created via frontend), fetch from profiles table
    if (!organizationId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          organizationId = profile.organization_id;
          // Optionally cache this in KV to avoid future lookups
          if (userData) {
             userData.organizationId = organizationId;
             await kv.set(`user:${user.id}`, userData);
          }
        }
      } catch (profileError) {
        console.error('Error fetching profile for organizationId:', profileError);
      }
    }

    const statusKey = `tracking_status:${organizationId}:quotes`;
    const statusMap = await kv.get(statusKey) || {};

    return c.json({ trackingStatus: statusMap });
  } catch (error) {
    console.error('Get quote tracking status error:', error);
    return c.json({ error: 'Failed to fetch quote tracking status: ' + error.message }, 500);
  }
});

// ============================================================================
// MARKETING ROUTES
// ============================================================================

// JOURNEYS
app.get('/make-server-8405be07/marketing/journeys', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const journeys = await kv.getByPrefix(`journey:${organizationId}:`);
    return c.json({ journeys: journeys || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch journeys: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/marketing/journeys', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const journeyData = await c.req.json();
    const journeyId = journeyData.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const journey = {
      id: journeyId,
      ...journeyData,
      organizationId,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`journey:${organizationId}:${journeyId}`, journey);
    return c.json({ journey }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create journey: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/marketing/journeys/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const journeyId = c.req.param('id');
    const updates = await c.req.json();

    const existingJourney = await kv.get(`journey:${organizationId}:${journeyId}`);
    if (!existingJourney) return c.json({ error: 'Journey not found' }, 404);

    const updatedJourney = {
      ...existingJourney,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`journey:${organizationId}:${journeyId}`, updatedJourney);
    return c.json({ journey: updatedJourney });
  } catch (error) {
    return c.json({ error: 'Failed to update journey: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/marketing/journeys/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const journeyId = c.req.param('id');

    await kv.del(`journey:${organizationId}:${journeyId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete journey: ' + error.message }, 500);
  }
});

// LANDING PAGES
app.get('/make-server-8405be07/marketing/landing-pages', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    const pages = await kv.getByPrefix(`landing_page:${organizationId}:`);
    return c.json({ pages: pages || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch landing pages: ' + error.message }, 500);
  }
});

app.post('/make-server-8405be07/marketing/landing-pages', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const pageData = await c.req.json();
    const pageId = pageData.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const page = {
      id: pageId,
      ...pageData,
      organizationId,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`landing_page:${organizationId}:${pageId}`, page);
    return c.json({ page }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create landing page: ' + error.message }, 500);
  }
});

app.put('/make-server-8405be07/marketing/landing-pages/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const pageId = c.req.param('id');
    const updates = await c.req.json();

    const existingPage = await kv.get(`landing_page:${organizationId}:${pageId}`);
    if (!existingPage) return c.json({ error: 'Landing page not found' }, 404);

    const updatedPage = {
      ...existingPage,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`landing_page:${organizationId}:${pageId}`, updatedPage);
    return c.json({ page: updatedPage });
  } catch (error) {
    return c.json({ error: 'Failed to update landing page: ' + error.message }, 500);
  }
});

app.delete('/make-server-8405be07/marketing/landing-pages/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    const pageId = c.req.param('id');

    await kv.del(`landing_page:${organizationId}:${pageId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete landing page: ' + error.message }, 500);
  }
});

// LEAD SCORES
app.get('/make-server-8405be07/marketing/lead-scores', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userData = await getUserData(user.id);
    const organizationId = userData?.organizationId || user.user_metadata?.organizationId;

    // Use Postgres table 'lead_scores'
    const { data, error } = await supabase
      .from('lead_scores')
      .select('*, contacts(first_name, last_name, email, company)')
      .eq('organization_id', organizationId);

    if (error) {
        // Fallback to KV if table doesn't exist
        const scores = await kv.getByPrefix(`lead_score:${organizationId}:`);
        return c.json({ scores: scores || [] });
    }

    return c.json({ scores: data || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch lead scores: ' + error.message }, 500);
  }
});

// ============================================================================
// CAMPAIGN SEND ROUTE
// ============================================================================

app.post('/make-server-8405be07/campaigns/:id/send', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userData = await getUserData(user.id);
    let organizationId = userData?.organizationId || user.user_metadata?.organizationId;
    
    if (!organizationId) {
      console.error('❌ User has no organization ID');
      return c.json({ error: 'User organization not found. Please contact support.' }, 400);
    }

    const campaignId = c.req.param('id');
    
    console.log(`🔍 Lookup campaign: ${campaignId} for user in org: ${organizationId}`);

    // Get campaign from database - query by ID first to ensure existence
    // Add retry logic for potential read-replica lag
    let campaign = null;
    let campaignError = null;
    
    for (let i = 0; i < 3; i++) {
        const result = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
        
        campaign = result.data;
        campaignError = result.error;
        
        if (campaign) break;
        // Wait 500ms before retry
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (campaignError || !campaign) {
      console.error(`❌ Campaign not found by ID: ${campaignId}`, campaignError);
      return c.json({ error: 'Campaign not found' }, 404);
    }
    
    // Verify organization ownership
    if (campaign.organization_id !== organizationId) {
      console.error(`❌ Campaign org mismatch: Campaign ${campaign.organization_id} vs User ${organizationId}`);
      
      // Attempt to re-hydrate user organization from DB to ensure it's not a stale cache issue
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      if (profile && profile.organization_id === campaign.organization_id) {
          console.log(`✅ Organization match confirmed after re-fetching profile. Updating cache.`);
          // Update local variable and cache
          organizationId = profile.organization_id;
          if (userData) {
              userData.organizationId = organizationId;
              await kv.set(`user:${user.id}`, userData);
          }
      } else {
          // Genuine mismatch
          return c.json({ error: 'Campaign not found' }, 404);
      }
    }

    console.log('📧 Sending campaign:', campaign.name, 'Audience segment:', campaign.audience_segment);

    // Get all contacts in the organization
    const { data: allContacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organizationId);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return c.json({ error: 'Failed to fetch contacts: ' + contactsError.message }, 500);
    }

    // Filter contacts by audience segment (tags)
    let targetContacts = allContacts || [];
    
    if (campaign.audience_segment && campaign.audience_segment !== 'all') {
      targetContacts = targetContacts.filter((contact: any) => {
        const tags = contact.tags || [];
        // Check if contact has the segment tag
        return tags.includes(campaign.audience_segment);
      });
      console.log(`📊 Filtered to ${targetContacts.length} contacts with tag: ${campaign.audience_segment}`);
    } else {
      console.log(`📊 Sending to all ${targetContacts.length} contacts`);
    }

    // Validate we have contacts to send to
    if (targetContacts.length === 0) {
      return c.json({ 
        error: `No contacts found with segment "${campaign.audience_segment}". Please add contacts with this tag first.`,
        sent: 0,
        failed: 0,
        total: 0
      }, 400);
    }

    // Fetch email accounts to send from
    const accountsKey = `email:accounts:${organizationId}:${user.id}`;
    let accounts = [];
    try {
      accounts = await kv.get(accountsKey) || [];
    } catch (e) {
      console.warn('Failed to fetch accounts from KV, checking DB fallback');
    }

    // If no accounts in KV, try DB
    if (!accounts || accounts.length === 0) {
       const { data: dbAccounts } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id);
       accounts = dbAccounts || [];
    }

    if (accounts.length === 0) {
        return c.json({ 
            error: 'No email accounts connected. Please connect an email account to send campaigns.',
            sent: 0,
            failed: 0,
            total: targetContacts.length
        }, 400);
    }

    // Select the best account (prioritize connected ones, or first one)
    // TODO: Allow user to select sender account in campaign settings
    const senderAccount = accounts[0];
    console.log(`📧 Sending campaign from account: ${senderAccount.email} (Provider: ${senderAccount.provider}, ID: ${senderAccount.id})`);

    // Track email sends
    const sentEmails: any[] = [];
    const failedEmails: any[] = [];

    // Send emails to each contact using the existing email functions
    for (const contact of targetContacts) {
      try {
        if (!contact.email) {
          console.warn(`⚠️ Contact ${contact.name} has no email address, skipping`);
          failedEmails.push({ contact: contact.name, reason: 'No email address' });
          continue;
        }

        console.log(`📧 Sending campaign "${campaign.name}" to ${contact.email}`);
        
        // Parse metadata from description field (which stores JSON)
        let metadata: any = {};
        try {
          if (campaign.description) {
            metadata = JSON.parse(campaign.description);
          }
        } catch (e) {
          // If description is not JSON, treat it as plain text
          metadata = { emailContent: campaign.description };
        }
        
        // Personalize body - use emailContent from metadata if available
        let body = metadata.emailContent || campaign.content || '';
        body = body.replace(/{{name}}/g, contact.first_name || contact.name || 'Valued Customer');
        body = body.replace(/{{first_name}}/g, contact.first_name || 'Valued Customer');
        body = body.replace(/{{last_name}}/g, contact.last_name || '');
        body = body.replace(/{{email}}/g, contact.email);
        
        // Auto-insert landing page link if campaign has one (check metadata)
        const landingPageSlug = metadata.landingPageSlug || campaign.landing_page_slug;
        if (landingPageSlug) {
          // Use the client-side app URL for landing pages (not the server endpoint)
          // The PublicLandingPage component handles rendering at /landing/{slug}
          const appUrl = Deno.env.get('APP_URL') || 'https://your-app.com';
          
          // Construct proper landing page URL with UTM tracking
          // Using query parameter routing for immediate compatibility
          const landingPageUrl = `${appUrl}?view=landing&slug=${landingPageSlug}&campaign=${campaign.id}&utm_source=email&utm_medium=campaign&utm_campaign=${encodeURIComponent(campaign.name)}`;
          
          // Replace {{landing_page}} placeholder or append CTA button
          if (body.includes('{{landing_page}}')) {
            body = body.replace(/{{landing_page}}/g, landingPageUrl);
          } else {
            // Auto-append a landing page CTA button
            const ctaButton = `<br/><br/><div style="text-align: center; margin: 30px 0;">
              <a href="${landingPageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Learn More
              </a>
            </div>`;
            body = body + ctaButton;
          }
        }
        
        // Add footer/unsubscribe
        // TODO: Add real unsubscribe link
        const unsubscribeLink = `<br/><br/><div style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
          <p>You are receiving this email because you are a valued contact of ${userData?.organizationName || 'our company'}.</p>
        </div>`;
        
        const fullBody = body + unsubscribeLink;

        // Send using the appropriate provider function
        let response;
        const payload = {
            accountId: senderAccount.id,
            from: senderAccount.email,
            sender_name: userData?.name || 'ProSpaces CRM',
            to: contact.email,
            subject: campaign.subject || campaign.name,
            body: fullBody,
            html: fullBody // Add html field as fallback for providers expecting it
        };

        console.log(`🚀 Invoking email function for provider: ${senderAccount.provider || 'generic'}`);

        try {
            if (senderAccount.provider === 'outlook' || senderAccount.provider === 'azure') {
                response = await supabase.functions.invoke('azure-send-email', {
                    body: payload,
                    headers: { Authorization: authHeader }
                });
            } else if (senderAccount.nylas_grant_id) {
                response = await supabase.functions.invoke('nylas-send-email', {
                    body: payload,
                    headers: { Authorization: authHeader }
                });
            } else if (senderAccount.provider === 'google' || senderAccount.provider === 'gmail') {
                // Try gmail-send-email if it exists
                response = await supabase.functions.invoke('gmail-send-email', {
                    body: payload,
                    headers: { Authorization: authHeader }
                });
            } else {
                throw new Error('Using generic provider'); // Trigger fallback
            }

            // Check if the specific provider function failed
            if (response.error) {
                console.warn(`Provider function invocation failed: ${response.error.message}`);
                throw new Error(response.error.message);
            }
            
            if (response.data && !response.data.success) {
                 console.warn(`Provider function returned failure: ${response.data.error}`);
                 throw new Error(response.data.error || 'Provider returned failure');
            }

        } catch (providerError: any) {
            console.warn(`⚠️ Specific provider send failed or not configured (${providerError.message}). Falling back to generic/SMTP send-email.`);
            
            try {
                 await sendEmailViaSMTP(senderAccount, contact.email, campaign.subject || campaign.name, fullBody, fullBody);
                 response = { data: { success: true }, error: null };
            } catch (smtpError: any) {
                 console.error('SMTP send error:', smtpError);
                 response = { data: null, error: { message: smtpError.message || 'SMTP sending failed' } };
            }
        }

        if (response.error) {
            console.error('Final email send invocation error:', response.error, JSON.stringify(response));
            throw new Error(response.error.message || 'Function invocation failed with unknown error');
        }
        
        // Check if the function itself returned an error
        if (response.data && !response.data.success) {
             console.error('Final email send logic error:', response.data.error);
             throw new Error(response.data.error || 'Email sending failed');
        }

        // Store campaign email send record
        const emailRecordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await kv.set(`campaign_email:${organizationId}:${campaignId}:${emailRecordId}`, {
          id: emailRecordId,
          campaignId: campaign.id,
          campaignName: campaign.name,
          contactId: contact.id,
          contactEmail: contact.email,
          contactName: contact.name,
          sentAt: new Date().toISOString(),
          opened: false,
          clicked: false,
          converted: false,
        });

        sentEmails.push({ 
          contact: contact.name, 
          email: contact.email 
        });

      } catch (sendError: any) {
        console.error(`Failed to send to ${contact.email}:`, sendError);
        failedEmails.push({ 
          contact: contact.name, 
          reason: sendError.message 
        });
      }
    }

    // Update campaign statistics in database
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        // sent column removed to avoid PGRST204 error
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating campaign stats:', updateError);
    }

    // Log audit trail
    const auditId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${organizationId}:${auditId}`, {
      id: auditId,
      timestamp: new Date().toISOString(),
      user: userData?.name || user.email,
      userId: user.id,
      action: 'Sent campaign',
      module: 'campaigns',
      changes: `Sent campaign "${campaign.name}" to ${sentEmails.length} contacts`,
    });

    console.log(`✅ Campaign sent: ${sentEmails.length} successful, ${failedEmails.length} failed`);

    return c.json({
      success: true,
      sent: sentEmails.length,
      failed: failedEmails.length,
      total: targetContacts.length,
      sentTo: sentEmails.map(e => e.email),
      failedContacts: failedEmails,
      message: `Campaign "${campaign.name}" sent to ${sentEmails.length} contacts successfully!`,
    }, 200);

  } catch (error: any) {
    console.error('Campaign send error:', error);
    return c.json({ error: 'Failed to send campaign: ' + error.message }, 500);
  }
});

// ============================================================================
// LANDING PAGE ANALYTICS TRACKING
// ============================================================================

// Track landing page visit
app.post('/make-server-8405be07/analytics/landing-page/visit', async (c) => {
  try {
    const body = await c.req.json();
    const { slug, campaignId, utmSource, utmMedium, utmCampaign, referrer } = body;

    if (!slug) {
      return c.json({ error: 'Missing slug parameter' }, 400);
    }

    const timestamp = new Date().toISOString();
    const visitId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store the visit record
    const visitData = {
      id: visitId,
      slug,
      campaignId: campaignId || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      referrer: referrer || null,
      timestamp,
    };

    await kv.set(`landing_visit:${slug}:${visitId}`, visitData);

    // If campaign-specific, also track under campaign
    if (campaignId) {
      await kv.set(`campaign_landing_visit:${campaignId}:${visitId}`, visitData);
      
      // Increment campaign visit counter
      const statsKey = `campaign_landing_stats:${campaignId}`;
      const stats = await kv.get(statsKey) || { visits: 0, conversions: 0 };
      stats.visits = (stats.visits || 0) + 1;
      await kv.set(statsKey, stats);
    }

    // Track overall landing page stats
    const pageStatsKey = `landing_page_stats:${slug}`;
    const pageStats = await kv.get(pageStatsKey) || { visits: 0, conversions: 0 };
    pageStats.visits = (pageStats.visits || 0) + 1;
    await kv.set(pageStatsKey, pageStats);

    console.log(`📊 Landing page visit tracked: ${slug}${campaignId ? ` (campaign: ${campaignId})` : ''}`);

    return c.json({ success: true, visitId });
  } catch (error: any) {
    console.error('Error tracking landing page visit:', error);
    return c.json({ error: 'Failed to track visit: ' + error.message }, 500);
  }
});

// Track landing page conversion
app.post('/make-server-8405be07/analytics/landing-page/conversion', async (c) => {
  try {
    const body = await c.req.json();
    const { slug, campaignId, conversionType, conversionData } = body;

    if (!slug) {
      return c.json({ error: 'Missing slug parameter' }, 400);
    }

    const timestamp = new Date().toISOString();
    const conversionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store the conversion record
    const conversion = {
      id: conversionId,
      slug,
      campaignId: campaignId || null,
      conversionType: conversionType || 'general',
      conversionData: conversionData || {},
      timestamp,
    };

    await kv.set(`landing_conversion:${slug}:${conversionId}`, conversion);

    // If campaign-specific, also track under campaign
    if (campaignId) {
      await kv.set(`campaign_landing_conversion:${campaignId}:${conversionId}`, conversion);
      
      // Increment campaign conversion counter
      const statsKey = `campaign_landing_stats:${campaignId}`;
      const stats = await kv.get(statsKey) || { visits: 0, conversions: 0 };
      stats.conversions = (stats.conversions || 0) + 1;
      await kv.set(statsKey, stats);
    }

    // Track overall landing page stats
    const pageStatsKey = `landing_page_stats:${slug}`;
    const pageStats = await kv.get(pageStatsKey) || { visits: 0, conversions: 0 };
    pageStats.conversions = (pageStats.conversions || 0) + 1;
    await kv.set(pageStatsKey, pageStats);

    console.log(`🎯 Landing page conversion tracked: ${slug}${campaignId ? ` (campaign: ${campaignId})` : ''}`);

    return c.json({ success: true, conversionId });
  } catch (error: any) {
    console.error('Error tracking landing page conversion:', error);
    return c.json({ error: 'Failed to track conversion: ' + error.message }, 500);
  }
});

// Get landing page analytics for a campaign
app.get('/make-server-8405be07/analytics/campaign/:campaignId/landing-page', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const campaignId = c.req.param('campaignId');
    
    // Get stats
    const statsKey = `campaign_landing_stats:${campaignId}`;
    const stats = await kv.get(statsKey) || { visits: 0, conversions: 0 };

    // Get recent visits
    const visits = await kv.getByPrefix(`campaign_landing_visit:${campaignId}:`);
    
    // Get conversions
    const conversions = await kv.getByPrefix(`campaign_landing_conversion:${campaignId}:`);

    // Calculate conversion rate
    const conversionRate = stats.visits > 0 ? (stats.conversions / stats.visits) * 100 : 0;

    // Group visits by UTM source
    const utmBreakdown: any = {};
    visits.forEach((visit: any) => {
      const source = visit.utmSource || 'direct';
      if (!utmBreakdown[source]) {
        utmBreakdown[source] = { visits: 0, conversions: 0 };
      }
      utmBreakdown[source].visits++;
    });

    // Add conversions to UTM breakdown
    conversions.forEach((conversion: any) => {
      const matchingVisit = visits.find((v: any) => v.timestamp <= conversion.timestamp);
      const source = matchingVisit?.utmSource || 'direct';
      if (utmBreakdown[source]) {
        utmBreakdown[source].conversions++;
      }
    });

    return c.json({
      stats: {
        visits: stats.visits || 0,
        conversions: stats.conversions || 0,
        conversionRate: conversionRate.toFixed(2),
      },
      utmBreakdown,
      recentVisits: visits.slice(0, 20),
      recentConversions: conversions.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Error fetching landing page analytics:', error);
    return c.json({ error: 'Failed to fetch analytics: ' + error.message }, 500);
  }
});

Deno.serve(app.fetch);