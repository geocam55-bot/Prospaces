import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

// Helper function to transform between camelCase and snake_case
function transformToDbFormat(contactData: any) {
  const transformed: any = { ...contactData };
  
  // Transform standard fields from camelCase to snake_case
  if ('ownerId' in transformed) {
    transformed.owner_id = transformed.ownerId;
    delete transformed.ownerId;
  }
  if ('createdAt' in transformed) {
    transformed.created_at = transformed.createdAt;
    delete transformed.createdAt;
  }
  if ('updatedAt' in transformed) {
    transformed.updated_at = transformed.updatedAt;
    delete transformed.updatedAt;
  }
  // Remove priceLevel transformation - column doesn't exist in database
  if ('priceLevel' in transformed) {
    delete transformed.priceLevel;
  }
  if ('createdBy' in transformed) {
    transformed.created_by = transformed.createdBy;
    delete transformed.createdBy;
  }
  
  // Transform new fields from camelCase to snake_case
  // Only include if they have actual values (not empty strings or undefined)
  if ('legacyNumber' in transformed) {
    if (transformed.legacyNumber) {
      transformed.legacy_number = transformed.legacyNumber;
    }
    delete transformed.legacyNumber;
  }
  if ('accountOwnerNumber' in transformed) {
    if (transformed.accountOwnerNumber) {
      transformed.account_owner_number = transformed.accountOwnerNumber;
    }
    delete transformed.accountOwnerNumber;
  }
  if ('tags' in transformed) {
    // Tags field for segmentation
    transformed.tags = transformed.tags;
  }
  
  // Transform sales/GP fields
  if ('ptdSales' in transformed) {
    if (transformed.ptdSales !== undefined && transformed.ptdSales !== '') {
      transformed.ptd_sales = transformed.ptdSales;
    }
    delete transformed.ptdSales;
  }
  if ('ptdGpPercent' in transformed) {
    if (transformed.ptdGpPercent !== undefined && transformed.ptdGpPercent !== '') {
      transformed.ptd_gp_percent = transformed.ptdGpPercent;
    }
    delete transformed.ptdGpPercent;
  }
  if ('ytdSales' in transformed) {
    if (transformed.ytdSales !== undefined && transformed.ytdSales !== '') {
      transformed.ytd_sales = transformed.ytdSales;
    }
    delete transformed.ytdSales;
  }
  if ('ytdGpPercent' in transformed) {
    if (transformed.ytdGpPercent !== undefined && transformed.ytdGpPercent !== '') {
      transformed.ytd_gp_percent = transformed.ytdGpPercent;
    }
    delete transformed.ytdGpPercent;
  }
  if ('lyrSales' in transformed) {
    if (transformed.lyrSales !== undefined && transformed.lyrSales !== '') {
      transformed.lyr_sales = transformed.lyrSales;
    }
    delete transformed.lyrSales;
  }
  if ('lyrGpPercent' in transformed) {
    if (transformed.lyrGpPercent !== undefined && transformed.lyrGpPercent !== '') {
      transformed.lyr_gp_percent = transformed.lyrGpPercent;
    }
    delete transformed.lyrGpPercent;
  }
  
  // Note: address and notes are already in snake_case in the database
  // so no transformation needed for these fields
  
  return transformed;
}

// Helper function to transform snake_case from database to camelCase
function transformFromDbFormat(contactData: any) {
  if (!contactData) return contactData;
  
  const transformed: any = { ...contactData };
  
  // Transform standard fields from snake_case to camelCase
  if ('created_at' in transformed) {
    transformed.createdAt = transformed.created_at;
    delete transformed.created_at;
  }
  if ('updated_at' in transformed) {
    transformed.updatedAt = transformed.updated_at;
    delete transformed.updated_at;
  }
  if ('owner_id' in transformed) {
    transformed.ownerId = transformed.owner_id;
    delete transformed.owner_id;
  }
  
  // Handle price_level with migration logic BEFORE deleting it
  if ('price_level' in transformed) {
    const oldValue = transformed.price_level;
    // If it's already a named level, use it
    if (['Retail', 'Wholesale', 'Contractor', 'Premium', 'Standard'].includes(oldValue)) {
      transformed.priceLevel = oldValue;
    } 
    // If it's an old tier format (tier1, tier2, etc.), convert it
    else if (typeof oldValue === 'string' && oldValue.startsWith('tier')) {
      const tierNumber = parseInt(oldValue.replace('tier', ''));
      const tierToLevel: Record<number, string> = {
        1: 'Retail',
        2: 'Wholesale',
        3: 'Contractor',
        4: 'Premium',
        5: 'Standard',
      };
      transformed.priceLevel = tierToLevel[tierNumber] || 'Retail';
    }
    // If it's a number, convert it
    else if (typeof oldValue === 'number') {
      const tierToLevel: Record<number, string> = {
        1: 'Retail',
        2: 'Wholesale',
        3: 'Contractor',
        4: 'Premium',
        5: 'Standard',
      };
      transformed.priceLevel = tierToLevel[oldValue] || 'Retail';
    }
    // Default fallback
    else {
      transformed.priceLevel = 'Retail';
    }
    delete transformed.price_level;
  } else {
    // If no price_level field at all, default to Retail
    transformed.priceLevel = 'Retail';
  }
  
  if ('created_by' in transformed) {
    transformed.createdBy = transformed.created_by;
    delete transformed.created_by;
  }
  if ('organization_id' in transformed) {
    transformed.organizationId = transformed.organization_id;
    delete transformed.organization_id;
  }
  
  // Transform new fields from snake_case to camelCase
  if ('legacy_number' in transformed) {
    transformed.legacyNumber = transformed.legacy_number;
    delete transformed.legacy_number;
  }
  if ('account_owner_number' in transformed) {
    transformed.accountOwnerNumber = transformed.account_owner_number;
    delete transformed.account_owner_number;
  }
  
  // Transform sales/GP fields
  if ('ptd_sales' in transformed) {
    transformed.ptdSales = transformed.ptd_sales;
    delete transformed.ptd_sales;
  }
  if ('ptd_gp_percent' in transformed) {
    transformed.ptdGpPercent = transformed.ptd_gp_percent;
    delete transformed.ptd_gp_percent;
  }
  if ('ytd_sales' in transformed) {
    transformed.ytdSales = transformed.ytd_sales;
    delete transformed.ytd_sales;
  }
  if ('ytd_gp_percent' in transformed) {
    transformed.ytdGpPercent = transformed.ytd_gp_percent;
    delete transformed.ytd_gp_percent;
  }
  if ('lyr_sales' in transformed) {
    transformed.lyrSales = transformed.lyr_sales;
    delete transformed.lyr_sales;
  }
  if ('lyr_gp_percent' in transformed) {
    transformed.lyrGpPercent = transformed.lyr_gp_percent;
    delete transformed.lyr_gp_percent;
  }
  
  return transformed;
}

export async function getAllContactsClient(filterByAccountOwner?: string) {
  try {
    const supabase = createClient();
    
    // First, get the current user and their profile (includes role)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Silently return empty during initial load
      return { contacts: [] };
    }

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      // Return empty array instead of throwing - this prevents "Error" in dashboard
      return { contacts: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;
    const userEmail = profile.email;

    console.log('🔐 Current user:', userEmail, 'Role:', userRole, 'Organization:', userOrgId);

    let query = supabase
      .from('contacts')
      .select('*');

    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super Admin: Can see all data across all organizations
      console.log('🔓 Super Admin - Loading all contacts');
      // No filtering needed
    } else if (userRole === 'admin') {
      // Admin: Can ONLY see their own data (Team Dashboard shows team data)
      console.log('🔒 Admin - Loading own contacts only (strict filtering)');
      query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
    } else if (userRole === 'manager') {
      // Manager: Can ONLY see their own data (Team Dashboard shows team data)
      console.log('👔 Manager - Loading own contacts only (strict filtering)');
      query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
    } else if (userRole === 'marketing') {
      // Marketing: Can see all data within their organization (for campaigns)
      console.log('📢 Marketing - Loading contacts for organization:', userOrgId);
      query = query.eq('organization_id', userOrgId);
    } else {
      // Standard User: Only show their own contacts (strict filtering)
      console.log('👤 Standard User - Loading only own contacts (strict filtering)');
      query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error loading contacts:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Handle specific error cases
      if (error.code === '42703') {
        throw new Error('Database column missing. Please run the latest migration.');
      } else if (error.code === 'PGRST205' || error.code === '42P01') {
        throw new Error('Database table missing. Please run the database setup.');
      }
      
      throw error;
    }

    // Debug: Log the filtered results with owner information
    console.log('📊 Query completed successfully');
    console.log('📊 User details:', { 
      userId: user.id, 
      email: userEmail, 
      role: userRole, 
      orgId: userOrgId 
    });
    
    if (data) {
      console.log('📊 Filtered data - Total rows:', data.length);
      if (data.length > 0) {
        console.log('📊 Sample contacts (first 3):', data.slice(0, 3).map(d => ({
          name: d.name,
          company: d.company,
          owner_id: d.owner_id,
          organization_id: d.organization_id,
          created_at: d.created_at
        })));
      }
    } else {
      console.log('📊 No data returned from database (data is null/undefined)');
    }

    // Transform data from database format to application format
    const transformedData = (data || []).map(transformFromDbFormat);

    // 🚨 SAFETY NET: Client-side filter to ensure no other users' data leaks through
    // Filter out any contacts that don't belong to the current user (except for super_admin and marketing)
    let finalData = transformedData;
    if (userRole !== 'super_admin' && userRole !== 'marketing') {
      finalData = transformedData.filter(contact => contact.ownerId === user.id);
      
      // Only log if we actually filtered something out (which shouldn't happen)
      if (finalData.length !== transformedData.length) {
        console.warn(`🚨 CLIENT-SIDE FILTER: Removed ${transformedData.length - finalData.length} contacts that didn't belong to current user`);
      }
    }

    return { contacts: finalData };
  } catch (error: any) {
    console.error('Error loading contacts:', error);
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { contacts: [] };
  }
}

export async function createContactClient(contactData: any) {
  try {
    const supabase = createClient();
    
    // Transform data before sending to database
    const dbData = transformToDbFormat(contactData);

    // Get current user for organization_id and owner_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      dbData.organization_id = user.user_metadata?.organizationId;
      // Set owner_id to current user (can be reassigned later by managers)
      dbData.owner_id = user.id;
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;

    // Transform back to application format
    return transformFromDbFormat(data);
  } catch (error: any) {
    console.error('Error creating contact:', error);
    throw error;
  }
}

export async function upsertContactByLegacyNumberClient(contactData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const profile = await ensureUserProfile(user.id);

    // Transform data from camelCase to snake_case
    const transformedData = transformToDbFormat(contactData);
    
    // Query to find existing contact by legacy_number
    const { data: existingContact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('legacy_number', contactData.legacyNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingContact) {
      // Update existing contact
      const { data, error } = await supabase
        .from('contacts')
        .update({
          ...transformedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContact.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Contact updated (by legacy number):', data);
      return { contact: transformFromDbFormat(data) };
    } else {
      // Insert new contact
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          ...transformedData,
          owner_id: user.id,
          organization_id: profile.organization_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Contact created (via legacy number upsert):', data);
      return { contact: transformFromDbFormat(data) };
    }
  } catch (error: any) {
    console.error('Error upserting contact by legacy number:', error);
    throw error;
  }
}

export async function updateContactClient(id: string, contactData: any) {
  try {
    const supabase = createClient();
    
    // Transform and clean the contact data
    const transformedData = transformToDbFormat(contactData);

    // Get list of columns that exist in the database
    // We'll check if advanced fields exist before trying to update them
    const { data: columnCheck } = await supabase
      .from('contacts')
      .select('legacy_number')
      .limit(1);
    
    const hasAdvancedFields = columnCheck !== null; // If query succeeds, column exists

    // Only include fields that exist in the database schema
    const baseFields = [
      'name', 'email', 'phone', 'company', 'status',
      'price_level', 'owner_id', 'tags'
    ];
    
    // Advanced fields that may not exist yet (require migration)
    const advancedFields = [
      'legacy_number', 'account_owner_number',
      'address', 'notes',
      'ptd_sales', 'ptd_gp_percent',
      'ytd_sales', 'ytd_gp_percent',
      'lyr_sales', 'lyr_gp_percent'
    ];

    const allowedFields = hasAdvancedFields 
      ? [...baseFields, ...advancedFields]
      : baseFields;

    const cleanedData: any = {};
    for (const field of allowedFields) {
      if (field in transformedData) {
        cleanedData[field] = transformedData[field];
      }
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(cleanedData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return { contact: transformFromDbFormat(data) };
  } catch (error: any) {
    console.error('Error updating contact:', error);
    throw error;
  }
}

export async function deleteContactClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    throw error;
  }
}

export async function claimUnassignedContactsClient(accountOwnerEmail: string) {
  try {
    const supabase = createClient();
    
    // Get the current user and their profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's profile to get their organization_id
    const profile = await ensureUserProfile(user.id);
    const userOrgId = profile.organization_id;
    
    console.log('🔍 Claiming unassigned contacts for:', accountOwnerEmail, 'Org:', userOrgId);
    
    // Find all contacts without an account_owner_number
    // Note: We can't chain .or() twice - need to find unassigned first, then filter
    const { data: allUnassigned, error: fetchError } = await supabase
      .from('contacts')
      .select('id, organization_id, name, company, account_owner_number')
      .or('account_owner_number.is.null,account_owner_number.eq.');

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      throw fetchError;
    }

    console.log('📊 Total unassigned contacts found:', allUnassigned?.length || 0);
    if (allUnassigned && allUnassigned.length > 0) {
      console.log('📊 Sample unassigned contacts:', allUnassigned.slice(0, 5).map(c => ({
        name: c.name,
        company: c.company,
        org_id: c.organization_id,
        account_owner: c.account_owner_number
      })));
    }

    if (!allUnassigned || allUnassigned.length === 0) {
      console.log('No unassigned contacts found');
      // Return contacts using the proper filtering
      return getAllContactsClient();
    }

    // Filter to only those that either have no org or belong to user's org
    const unassignedContacts = allUnassigned.filter(c => 
      !c.organization_id || c.organization_id === userOrgId
    );

    console.log(`📊 Unassigned contacts in user's org or orphaned: ${unassignedContacts.length}`);
    
    if (unassignedContacts.length === 0) {
      console.log('⚠️ No claimable unassigned contacts found for this organization');
      console.log('⚠️ User org:', userOrgId);
      console.log('⚠️ Unassigned contact orgs:', [...new Set(allUnassigned.map(c => c.organization_id || 'NULL'))]);
      return getAllContactsClient();
    }

    console.log(`✅ Found ${unassignedContacts.length} claimable contacts:`, unassignedContacts.map(c => `${c.name} (${c.company}) - Org: ${c.organization_id || 'NULL'}`));

    // Update all unassigned contacts - set BOTH account_owner_number AND organization_id
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ 
        account_owner_number: accountOwnerEmail,
        organization_id: userOrgId  // CRITICAL: Set the organization_id!
      })
      .in('id', unassignedContacts.map(c => c.id));

    if (updateError) {
      console.error('❌ Error updating contacts:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully assigned ${unassignedContacts.length} contacts to ${accountOwnerEmail} in organization ${userOrgId}`);

    // Return contacts using the proper filtering logic
    return getAllContactsClient();
  } catch (error: any) {
    console.error('❌ Error claiming unassigned contacts:', error);
    throw error;
  }
}

export async function getSegmentsClient() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ User not authenticated, returning empty segments');
      return { segments: [] };
    }

    const profile = await ensureUserProfile(user.id);

    // Get all unique tags from contacts
    const { data, error } = await supabase
      .from('contacts')
      .select('tags')
      .eq('organization_id', profile.organization_id)
      .not('tags', 'is', null);

    if (error) throw error;

    // Extract unique tags
    const tagsSet = new Set<string>();
    data?.forEach((contact: any) => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });

    const segments = Array.from(tagsSet).sort();
    console.log('✅ Loaded segments:', segments);
    return { segments };
  } catch (error: any) {
    console.error('Error loading segments:', error);
    return { segments: [] };
  }
}