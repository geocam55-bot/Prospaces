import { getAllContactsClient, createContactClient, updateContactClient, deleteContactClient, claimUnassignedContactsClient, upsertContactByLegacyNumberClient } from './contacts-client';
import { diagnoseContactsRLS } from './contacts-diagnostic';
import { getAllUsersClient, inviteUserClient, updateUserClient, deleteUserClient, resetPasswordClient } from './users-client';
import { getAllBidsClient, getBidsByOpportunityClient, createBidClient, updateBidClient, deleteBidClient, fixBidOrganizationIds } from './bids-client';
import { getAllQuotesClient, getQuotesByOpportunityClient, createQuoteClient, updateQuoteClient, deleteQuoteClient } from './quotes-client';
import { getAllAppointmentsClient, createAppointmentClient, deleteAppointmentClient } from './appointments-client';
import { getAllTasksClient, createTaskClient, updateTaskClient, deleteTaskClient } from './tasks-client';
import { getAllNotesClient, createNoteClient, deleteNoteClient } from './notes-client';
import { getAllInventoryClient, createInventoryClient, updateInventoryClient, deleteInventoryClient, upsertInventoryBySKUClient, bulkUpsertInventoryBySKUClient, searchInventoryClient } from './inventory-client';
import { getAllOpportunitiesClient, getOpportunitiesByCustomerClient, createOpportunityClient, updateOpportunityClient, deleteOpportunityClient } from './opportunities-client';
import { getAllCampaignsClient, createCampaignClient, updateCampaignClient, deleteCampaignClient } from './campaigns-client';
import { 
  getAllProjectManagersClient, 
  getProjectManagersByCustomerClient, 
  createProjectManagerClient, 
  updateProjectManagerClient, 
  deleteProjectManagerClient 
} from './project-managers-client';
import { 
  getUserPreferencesClient, 
  upsertUserPreferencesClient, 
  getOrganizationSettingsClient, 
  upsertOrganizationSettingsClient,
  updateOrganizationNameClient,
  updateUserProfileClient
} from './settings-client';
import { createClient } from './supabase/client';

const supabase = createClient();

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Auth APIs - use Supabase Auth directly
export const authAPI = {
  signup: async (data: { email: string; password: string; name: string; organizationId?: string; role?: string }) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          organizationId: data.organizationId,
          role: data.role || 'standard_user',
        }
      }
    });

    if (error) throw error;
    return { user: authData.user, session: authData.session };
  },

  signin: async (data: { email: string; password: string }) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    return { user: authData.user, session: authData.session };
  },

  signout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    // If we have a session, fetch the user's profile from the database
    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Return session without profile data if profile fetch fails
        return { session, user: null };
      }
      
      // Construct user object with profile data
      const user = {
        id: profile.id,
        email: profile.email || session.user.email,
        name: profile.name || session.user.user_metadata?.name || '',
        role: profile.role || 'standard_user',
        organizationId: profile.organization_id,
        managerId: profile.manager_id,
      };
      
      return { session, user };
    }
    
    return { session, user: null };
  },
};

// Quotes APIs - use direct Supabase client
export const quotesAPI = {
  getAll: () => getAllQuotesClient(),
  getQuotesByOpportunity: (opportunityId: string) => getQuotesByOpportunityClient(opportunityId),
  create: (data: any) => createQuoteClient(data),
  update: (id: string, data: any) => updateQuoteClient(id, data),
  delete: (id: string) => deleteQuoteClient(id),
};

// Security APIs - use direct Supabase client
export const securityAPI = {
  getPermissions: async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*');
    
    if (error) throw error;
    return { permissions: data || [] };
  },
  updatePermissions: async (permissions: any) => {
    const { error } = await supabase
      .from('permissions')
      .upsert(permissions);
    
    if (error) throw error;
    return { success: true };
  },
  getAuditLogs: async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') return { logs: [] };
      throw error;
    }
    return { logs: data || [] };
  },
};

// Tenants APIs - use direct Supabase client
export const tenantsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    console.log('[tenantsAPI] 📊 Fetched organizations:', data?.length);
    
    // Get user counts and contact counts for each organization
    const tenantsWithCounts = await Promise.all((data || []).map(async (org) => {
      // Count users in this organization
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);
      
      if (userError) console.error('[tenantsAPI] ❌ Error counting users for org', org.id, userError);
      
      // Count contacts in this organization
      const { count: contactsCount, error: contactError } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id);
      
      if (contactError) console.error('[tenantsAPI] ❌ Error counting contacts for org', org.id, contactError);
      
      console.log(`[tenantsAPI] 📈 Org: ${org.name} - Users: ${userCount}, Contacts: ${contactsCount}`);
      
      return {
        id: org.id,
        name: org.name,
        domain: org.domain || '',
        status: org.status || 'active',
        plan: org.plan || 'starter',
        logo: org.logo || '',
        billingEmail: org.billing_email || '',
        phone: org.phone || '',
        address: org.address || '',
        notes: org.notes || '',
        maxUsers: org.max_users || 10,
        maxContacts: org.max_contacts || 1000,
        features: org.features ? (typeof org.features === 'string' ? JSON.parse(org.features) : org.features) : [],
        ai_suggestions_enabled: org.ai_suggestions_enabled || false,
        marketing_enabled: org.marketing_enabled ?? true,
        inventory_enabled: org.inventory_enabled ?? true,
        import_export_enabled: org.import_export_enabled ?? true,
        documents_enabled: org.documents_enabled ?? true,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        userCount: userCount || 0,
        contactsCount: contactsCount || 0,
      };
    }));
    
    console.log('[tenantsAPI] ✅ Returning tenants with counts:', tenantsWithCounts);
    return { tenants: tenantsWithCounts };
  },
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { tenant: data };
  },
  getCurrent: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const organizationId = user.user_metadata?.organizationId;
    if (!organizationId) return { tenant: null };
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return { tenant: null };
      throw error;
    }
    return { tenant: data };
  },
  create: async (data: any) => {
    // Generate ID from name (slug format) or use random UUID
    const generateId = (name: string) => {
      // Convert to lowercase, replace spaces with hyphens, remove special chars
      return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\\s-]/g, '')
        .replace(/\\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50); // Limit length
    };
    
    let orgId = generateId(data.name);
    
    // Check if ID already exists, if so, append a number
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single();
    
    if (existingOrg) {
      // Append timestamp to make it unique
      orgId = `${orgId}-${Date.now()}`;
    }
    
    // Only include fields that exist in the current database schema
    const dbData: any = {
      id: orgId,
      name: data.name,
      status: data.status,
      logo: data.logo,
      ai_suggestions_enabled: data.ai_suggestions_enabled ?? false,
      marketing_enabled: data.marketing_enabled ?? true,
      inventory_enabled: data.inventory_enabled ?? true,
      import_export_enabled: data.import_export_enabled ?? true,
      documents_enabled: data.documents_enabled ?? true,
    };
    
    // Note: 'domain' field removed - it doesn't exist in the database schema
    
    const { data: org, error } = await supabase
      .from('organizations')
      .insert([dbData])
      .select()
      .single();
    
    if (error) {
      console.error('Failed to save tenant:', error);
      throw error;
    }
    return { tenant: org };
  },
  update: async (id: string, data: any) => {
    // Only include fields that exist in the current database schema
    const dbData: any = {
      name: data.name,
      status: data.status,
      logo: data.logo,
      ai_suggestions_enabled: data.ai_suggestions_enabled,
      marketing_enabled: data.marketing_enabled,
      inventory_enabled: data.inventory_enabled,
      import_export_enabled: data.import_export_enabled,
      documents_enabled: data.documents_enabled,
    };
    
    // Note: 'domain' field removed - it doesn't exist in the database schema
    
    const { data: org, error } = await supabase
      .from('organizations')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update tenant:', error);
      throw error;
    }
    return { tenant: org };
  },
  updateFeatures: async (id: string, features: { ai_suggestions_enabled?: boolean }) => {
    const { data: org, error } = await supabase
      .from('organizations')
      .update(features)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Failed to update organization features:', error);
      throw error;
    }
    return { tenant: org };
  },
  delete: async (id: string) => {
    // Comprehensive deletion - delete all related data first, then organization
    console.log(`[tenantsAPI] 🗑️ Starting comprehensive deletion of organization: ${id}`);
    
    try {
      // Delete in order: dependent records first, then organization
      
      // 1. Delete bids
      console.log('[tenantsAPI] 1/13 Deleting bids...');
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${bidsData?.length || 0} bids`);
      if (bidsError) console.error('[tenantsAPI] Error deleting bids:', bidsError);
      
      // 2. Delete opportunities
      console.log('[tenantsAPI] 2/13 Deleting opportunities...');
      const { data: oppData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${oppData?.length || 0} opportunities`);
      if (opportunitiesError) console.error('[tenantsAPI] Error deleting opportunities:', opportunitiesError);
      
      // 3. Delete project managers
      console.log('[tenantsAPI] 3/13 Deleting project managers...');
      const { data: pmData, error: projectManagersError } = await supabase
        .from('project_managers')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${pmData?.length || 0} project managers`);
      if (projectManagersError) console.error('[tenantsAPI] Error deleting project managers:', projectManagersError);
      
      // 4. Delete contacts
      console.log('[tenantsAPI] 4/13 Deleting contacts...');
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${contactsData?.length || 0} contacts`);
      if (contactsError) console.error('[tenantsAPI] Error deleting contacts:', contactsError);
      
      // 5. Delete appointments
      console.log('[tenantsAPI] 5/13 Deleting appointments...');
      const { data: apptData, error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${apptData?.length || 0} appointments`);
      if (appointmentsError) console.error('[tenantsAPI] Error deleting appointments:', appointmentsError);
      
      // 6. Delete notes
      console.log('[tenantsAPI] 6/13 Deleting notes...');
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${notesData?.length || 0} notes`);
      if (notesError) console.error('[tenantsAPI] Error deleting notes:', notesError);
      
      // 7. Delete tasks
      console.log('[tenantsAPI] 7/13 Deleting tasks...');
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${tasksData?.length || 0} tasks`);
      if (tasksError) console.error('[tenantsAPI] Error deleting tasks:', tasksError);
      
      // 8. Delete quotes
      console.log('[tenantsAPI] 8/13 Deleting quotes...');
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${quotesData?.length || 0} quotes`);
      if (quotesError) console.error('[tenantsAPI] Error deleting quotes:', quotesError);
      
      // 9. Delete documents
      console.log('[tenantsAPI] 9/13 Deleting documents...');
      const { data: docsData, error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${docsData?.length || 0} documents`);
      if (documentsError) console.error('[tenantsAPI] Error deleting documents:', documentsError);
      
      // 10. Delete inventory items
      console.log('[tenantsAPI] 10/13 Deleting inventory...');
      const { data: invData, error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${invData?.length || 0} inventory items`);
      if (inventoryError) console.error('[tenantsAPI] Error deleting inventory:', inventoryError);
      
      // 11. Delete files from storage (documents bucket)
      console.log('[tenantsAPI] 11/13 Deleting storage files...');
      const { data: files } = await supabase
        .storage
        .from('documents')
        .list(id);
      
      if (files && files.length > 0) {
        console.log(`[tenantsAPI] Found ${files.length} storage files to delete`);
        const filePaths = files.map(file => `${id}/${file.name}`);
        const { error: storageError } = await supabase
          .storage
          .from('documents')
          .remove(filePaths);
        if (storageError) console.error('[tenantsAPI] Error deleting storage files:', storageError);
        else console.log(`[tenantsAPI] Deleted ${files.length} storage files`);
      } else {
        console.log('[tenantsAPI] No storage files to delete');
      }
      
      // 12. Delete user profiles
      console.log('[tenantsAPI] 12/13 Deleting user profiles...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .eq('organization_id', id)
        .select();
      console.log(`[tenantsAPI] Deleted ${profilesData?.length || 0} user profiles`);
      if (profilesError) console.error('[tenantsAPI] Error deleting profiles:', profilesError);
      
      // 13. Finally, delete the organization
      console.log('[tenantsAPI] 13/13 Deleting organization...');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)
        .select();
      
      if (orgError) {
        console.error('[tenantsAPI] ❌ Error deleting organization:', orgError);
        console.error('[tenantsAPI] ❌ Error code:', orgError.code);
        console.error('[tenantsAPI] ❌ Error message:', orgError.message);
        console.error('[tenantsAPI] ❌ Error details:', orgError.details);
        console.error('[tenantsAPI] ❌ Error hint:', orgError.hint);
        throw orgError;
      }
      
      console.log(`[tenantsAPI] ✅ Deleted organization:`, orgData);
      console.log(`[tenantsAPI] ✅ Successfully deleted organization and all related data: ${id}`);
      return { success: true };
    } catch (error: any) {
      console.error('[tenantsAPI] ❌ Error during organization deletion:', error);
      console.error('[tenantsAPI] ❌ Full error object:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status
      });
      throw error;
    }
  },
};

// Inventory APIs - use direct Supabase client
export const inventoryAPI = {
  getAll: () => getAllInventoryClient(),
  create: (data: any) => createInventoryClient(data),
  update: (id: string, data: any) => updateInventoryClient(id, data),
  delete: (id: string) => deleteInventoryClient(id),
  upsertBySKU: (data: any) => upsertInventoryBySKUClient(data),
  bulkUpsertBySKU: (data: any) => bulkUpsertInventoryBySKUClient(data),
  search: (filters?: { search?: string; category?: string; status?: string; organizationId?: string }) => searchInventoryClient(filters),
};

// Email APIs - use direct Supabase client
export const emailAPI = {
  // Email accounts
  getAccounts: async () => {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('*');
    
    if (error) {
      if (error.code === '42P01') return { accounts: [] };
      throw error;
    }
    return { accounts: data || [] };
  },
  addAccount: async (accountData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const newAccount = {
      ...accountData,
      user_id: user.id,
      organization_id: user.user_metadata?.organizationId,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('email_accounts')
      .insert([newAccount])
      .select()
      .single();
    
    if (error) throw error;
    return { account: data };
  },
  deleteAccount: async (id: string) => {
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
  syncAccount: async (id: string) => {
    // This would typically trigger a sync - for now just return success
    return { success: true, message: 'Sync initiated' };
  },
  
  // Emails
  getEmails: async () => {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false });
    
    if (error) {
      if (error.code === '42P01') return { emails: [] };
      throw error;
    }
    return { emails: data || [] };
  },
  sendEmail: async (emailData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

      // Map fields to match database schema, similar to saveEmailToSupabase in Email.tsx
    const newEmail = {
      user_id: user.id,
      organization_id: user.user_metadata?.organizationId,
      account_id: emailData.account_id || emailData.accountId,
      message_id: emailData.message_id || emailData.id || crypto.randomUUID(),
      from_email: emailData.from_email || emailData.from,
      to_email: emailData.to_email || emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      is_read: emailData.is_read !== undefined ? emailData.is_read : (emailData.read !== undefined ? emailData.read : true),
      is_starred: emailData.is_starred !== undefined ? emailData.is_starred : (emailData.starred || false),
      folder: emailData.folder || 'sent',
      received_at: emailData.received_at || emailData.date || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('emails')
      .insert([newEmail])
      .select()
      .single();
    
    if (error) throw error;
    return { email: data };
  },
  updateEmail: async (id: string, emailData: any) => {
    const { data, error } = await supabase
      .from('emails')
      .update(emailData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { email: data };
  },
  deleteEmail: async (id: string) => {
    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
};

// Opportunities APIs - use direct Supabase client
export const opportunitiesAPI = {
  getAll: () => getAllOpportunitiesClient(),
  getByCustomer: (customerId: string) => getOpportunitiesByCustomerClient(customerId),
  create: (data: any) => createOpportunityClient(data),
  update: (id: string, data: any) => updateOpportunityClient(id, data),
  delete: (id: string) => deleteOpportunityClient(id),
};

// Project Managers APIs - use direct Supabase client
export const projectManagersAPI = {
  getAll: () => getAllProjectManagersClient(),
  getByCustomer: (customerId: string) => getProjectManagersByCustomerClient(customerId),
  create: (data: any) => createProjectManagerClient(data),
  update: (id: string, data: any) => updateProjectManagerClient(id, data),
  delete: (id: string) => deleteProjectManagerClient(id),
};

// Contacts APIs - use direct Supabase client
export const contactsAPI = {
  getAll: () => getAllContactsClient(),
  create: (data: any) => createContactClient(data),
  update: (id: string, data: any) => updateContactClient(id, data),
  delete: (id: string) => deleteContactClient(id),
  claimUnassigned: () => claimUnassignedContactsClient(),
  upsertByLegacyNumber: (data: any) => upsertContactByLegacyNumberClient(data),
  diagnoseRLS: () => diagnoseContactsRLS(),
};

// Users APIs - use direct Supabase client
export const usersAPI = {
  getAll: () => getAllUsersClient(),
  invite: (data: { email: string; name: string; role: string }) => inviteUserClient(data),
  update: (id: string, data: any) => updateUserClient(id, data),
  delete: (id: string) => deleteUserClient(id),
  resetPassword: (userId: string, newPassword: string) => resetPasswordClient(userId, newPassword),
};

// Appointments APIs - use direct Supabase client
export const appointmentsAPI = {
  getAll: () => getAllAppointmentsClient(),
  create: (data: any) => createAppointmentClient(data),
  delete: (id: string) => deleteAppointmentClient(id),
};

// Bids APIs - use direct Supabase client
export const bidsAPI = {
  getAll: () => getAllBidsClient(),
  getByOpportunity: (opportunityId: string) => getBidsByOpportunityClient(opportunityId),
  create: (data: any) => createBidClient(data),
  update: (id: string, data: any) => updateBidClient(id, data),
  delete: (id: string) => deleteBidClient(id),
  fixOrganizationIds: () => fixBidOrganizationIds(),
};

// Tasks APIs - use direct Supabase client
export const tasksAPI = {
  getAll: () => getAllTasksClient(),
  create: (data: any) => createTaskClient(data),
  update: (id: string, data: any) => updateTaskClient(id, data),
  delete: (id: string) => deleteTaskClient(id),
};

// Notes APIs - use direct Supabase client
export const notesAPI = {
  getAll: () => getAllNotesClient(),
  create: (data: any) => createNoteClient(data),
  delete: (id: string) => deleteNoteClient(id),
};

// Settings APIs - use direct Supabase client
export const settingsAPI = {
  getUserPreferences: (userId: string, organizationId: string) => getUserPreferencesClient(userId, organizationId),
  upsertUserPreferences: (data: any) => upsertUserPreferencesClient(data),
  getOrganizationSettings: (organizationId: string) => getOrganizationSettingsClient(organizationId),
  upsertOrganizationSettings: (data: any) => upsertOrganizationSettingsClient(data),
  updateOrganizationName: (organizationId: string, name: string) => updateOrganizationNameClient(organizationId, name),
  updateUserProfile: (userId: string, data: any) => updateUserProfileClient(userId, data),
};

// Campaigns APIs - use direct Supabase client
export const campaignsAPI = {
  getAll: () => getAllCampaignsClient(),
  create: (data: any) => createCampaignClient(data),
  update: (id: string, data: any) => updateCampaignClient(id, data),
  delete: (id: string) => deleteCampaignClient(id),
};