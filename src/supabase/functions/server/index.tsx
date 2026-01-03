import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

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

// Helper function to get user metadata
async function getUserData(userId: string) {
  try {
    const userData = await kv.get(`user:${userId}`);
    return userData;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
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

Deno.serve(app.fetch);