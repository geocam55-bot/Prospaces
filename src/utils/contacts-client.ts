import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';
import { getPriceTierLabel, getActivePriceLevels } from '../lib/global-settings';
import { projectId, publicAnonKey } from './supabase/info';
import { getServerHeaders } from './server-headers';

// ── Cached column detection ────────────────────────────────────────────
// Probes the contacts table once per session to discover which columns exist.
// Prevents 42703 errors when referencing columns that haven't been migrated yet.
let _existingColumns: Set<string> | null = null;
let _columnCacheTime = 0;
const COLUMN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Cached owner profile resolution ────────────────────────────────────
// During bulk imports many contacts share the same account_owner_number (email).
// Cache the email→profileId lookup to avoid repeated queries.
const _ownerProfileCache: Map<string, string | null> = new Map();
let _ownerCacheTime = 0;
const OWNER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Resolve account_owner_number (email) to a profile user ID within the org.
 * Returns the owner's profile ID, or null if not found.
 */
async function resolveOwnerByAccountOwnerNumber(
  supabase: any,
  accountOwnerEmail: string,
  organizationId: string,
): Promise<string | null> {
  const normalizedEmail = accountOwnerEmail.trim().toLowerCase();
  if (!normalizedEmail) return null;

  // Bust the cache if it's stale
  if (Date.now() - _ownerCacheTime > OWNER_CACHE_TTL) {
    _ownerProfileCache.clear();
    _ownerCacheTime = Date.now();
  }

  const cacheKey = `${organizationId}::${normalizedEmail}`;
  if (_ownerProfileCache.has(cacheKey)) {
    return _ownerProfileCache.get(cacheKey) ?? null;
  }

  // Look up the profile by email in the same organization
  const { data: matchedProfile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    console.warn('[resolveOwner] Error looking up profile by email:', error.message);
    _ownerProfileCache.set(cacheKey, null);
    return null;
  }

  const resolvedId = matchedProfile?.id ?? null;
  _ownerProfileCache.set(cacheKey, resolvedId);

  if (resolvedId) {
    console.log(`[resolveOwner] Resolved "${normalizedEmail}" → profile ${resolvedId}`);
  } else {
    console.log(`[resolveOwner] No profile found for "${normalizedEmail}" in org ${organizationId}`);
  }

  return resolvedId;
}

/** Clear the owner cache (called externally if needed, e.g. after bulk import) */
export function clearOwnerProfileCache() {
  _ownerProfileCache.clear();
  _ownerCacheTime = 0;
}

async function getExistingContactColumns(supabase: any): Promise<Set<string>> {
  if (_existingColumns && Date.now() - _columnCacheTime < COLUMN_CACHE_TTL) {
    return _existingColumns;
  }

  const baseColumns = [
    'id', 'name', 'email', 'phone', 'company', 'status',
    'owner_id', 'organization_id', 'created_at', 'updated_at',
  ];

  // Fast path: if rows already exist, read one to discover all columns
  const { data: sample } = await supabase
    .from('contacts')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    _existingColumns = new Set(Object.keys(sample[0]));
    _columnCacheTime = Date.now();
    console.log('📋 Contact columns (from sample row):', [..._existingColumns].sort().join(', '));
    return _existingColumns;
  }

  // No rows yet — probe groups of advanced columns with .limit(0)
  _existingColumns = new Set(baseColumns);

  const advancedGroups: string[][] = [
    ['legacy_number', 'account_owner_number'],
    ['address', 'notes'],
    ['tags'],
    ['price_level'],
    ['ptd_sales', 'ptd_gp_percent', 'ytd_sales', 'ytd_gp_percent', 'lyr_sales', 'lyr_gp_percent'],
    ['created_by'],
  ];

  for (const group of advancedGroups) {
    const { error } = await supabase
      .from('contacts')
      .select(group.join(', '))
      .limit(0);
    if (!error) {
      group.forEach((col) => _existingColumns!.add(col));
    }
  }

  _columnCacheTime = Date.now();
  console.log('📋 Contact columns (probed):', [..._existingColumns].sort().join(', '));
  return _existingColumns;
}

/** Remove any keys from `data` that are not actual DB columns */
function filterToExistingColumns(data: any, existingCols: Set<string>): any {
  const cleaned: any = {};
  for (const key of Object.keys(data)) {
    if (existingCols.has(key)) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

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
  // Transform priceLevel from camelCase to snake_case for database
  if ('priceLevel' in transformed) {
    // Guard: ensure price_level is always a non-undefined string so that
    // JSON.stringify won't silently strip it from the request body.
    const pl = transformed.priceLevel;
    transformed.price_level = (pl !== undefined && pl !== null && pl !== '') ? pl : getPriceTierLabel(1);
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
    // Check if it matches any currently configured tier label
    const activeLabels = getActivePriceLevels();
    if (activeLabels.includes(oldValue)) {
      transformed.priceLevel = oldValue;
    }
    // Handle legacy names from old system
    else if (['Wholesale', 'Contractor', 'Premium', 'Standard', 'VIP'].includes(oldValue)) {
      const legacyMapping: Record<string, string> = {
        'VIP': getPriceTierLabel(2),
        'Wholesale': getPriceTierLabel(3),
        'Contractor': getPriceTierLabel(4),
        'Premium': getPriceTierLabel(4),
        'Standard': getPriceTierLabel(4),
      };
      transformed.priceLevel = legacyMapping[oldValue] || getPriceTierLabel(1);
    }
    // If it's an old tier format (tier1, tier2, etc.), convert it
    else if (typeof oldValue === 'string' && oldValue.startsWith('tier')) {
      const tierNumber = parseInt(oldValue.replace('tier', ''));
      transformed.priceLevel = getPriceTierLabel(tierNumber) || getPriceTierLabel(1);
    }
    // If it's a number, convert it
    else if (typeof oldValue === 'number') {
      transformed.priceLevel = getPriceTierLabel(oldValue) || getPriceTierLabel(1);
    }
    // Default fallback
    else {
      transformed.priceLevel = getPriceTierLabel(1);
    }
    delete transformed.price_level;
  } else {
    // If no price_level field at all, default to tier 1 label
    transformed.priceLevel = getPriceTierLabel(1);
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

export async function getAllContactsClient(filterByAccountOwner?: string, scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();

    console.log(`[contacts-client] Fetching contacts via server endpoint (scope=${scope})...`);
    
    const headers = await getServerHeaders();
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/contacts?scope=${scope}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[contacts-client] Server error:', response.status, errorBody);
      
      // Fallback to direct Supabase query if server endpoint fails
      console.warn('[contacts-client] Falling back to direct Supabase query...');
      return await getAllContactsClientDirect(scope);
    }

    const result = await response.json();
    
    console.log(`[contacts-client] Server returned ${result.meta?.count || 0} contacts for role=${result.meta?.role}`);
    
    // Transform from DB snake_case to app camelCase
    const transformedData = (result.contacts || []).map(transformFromDbFormat);
    
    return { contacts: transformedData };
  } catch (error: any) {
    console.error('[contacts-client] Error fetching via server, falling back to direct query:', error);
    return await getAllContactsClientDirect(scope);
  }
}

/**
 * Direct Supabase query fallback (subject to RLS).
 * Used only when the server endpoint is unavailable.
 */
async function getAllContactsClientDirect(scope: 'personal' | 'team' = 'personal') {
  try {
    const supabase = createClient();
    
    // First, get the current user and their profile (includes role)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { contacts: [] };
    }

    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('Failed to get user profile:', profileError);
      return { contacts: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;
    const userEmail = profile.email;

    console.log('[contacts-client-direct] User:', userEmail, 'Role:', userRole, 'Org:', userOrgId, 'Scope:', scope);

    const existingCols = await getExistingContactColumns(supabase);
    const hasAccountOwnerCol = existingCols.has('account_owner_number');

    let query = supabase
      .from('contacts')
      .select('*');

    // Scope-based filtering (matches server-side logic)
    if (scope === 'personal') {
      // Personal scope: ALL roles see only their own contacts
      if (userRole === 'super_admin') {
        // no filter
      } else {
        if (hasAccountOwnerCol && userEmail) {
          query = query.eq('organization_id', userOrgId)
            .or(`owner_id.eq.${user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
        }
      }
    } else {
      // Team scope: role-based filtering
      if (userRole === 'super_admin') {
        // no filter
      } else if (['admin', 'manager', 'director', 'marketing'].includes(userRole)) {
        query = query.eq('organization_id', userOrgId);
      } else {
        if (hasAccountOwnerCol && userEmail) {
          query = query.eq('organization_id', userOrgId)
            .or(`owner_id.eq.${user.id},account_owner_number.ilike.${userEmail}`);
        } else {
          query = query.eq('organization_id', userOrgId).eq('owner_id', user.id);
        }
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[contacts-client-direct] Query error:', error);
      if (error.code === '42703' && hasAccountOwnerCol) {
        _existingColumns = null;
        const retryQuery = supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', userOrgId)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        
        const { data: retryData, error: retryError } = await retryQuery;
        if (retryError) throw retryError;
        return { contacts: (retryData || []).map(transformFromDbFormat) };
      }
      throw error;
    }

    const transformedData = (data || []).map(transformFromDbFormat);
    return { contacts: transformedData };
  } catch (error: any) {
    console.error('[contacts-client-direct] Error:', error);
    return { contacts: [] };
  }
}

export async function createContactClient(contactData: any) {
  try {
    const supabase = createClient();
    
    // Transform data before sending to database
    const dbData = transformToDbFormat(contactData);

    // Try server endpoint first (bypasses RLS, uses profile org_id)
    try {
      const headers = await getServerHeaders();
      console.log('[contacts-client] Creating contact via server endpoint (bypasses RLS)...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/contacts`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(dbData),
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[contacts-client] Server create successful: ${result.contact?.id}`);
        const transformedContact = transformFromDbFormat(result.contact);
        return { contact: transformedContact };
      } else {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[contacts-client] Server create error:', response.status, errorBody);
        // Fall through to direct Supabase insert
      }
    } catch (serverError: any) {
      console.warn('[contacts-client] Server create failed, falling back to direct:', serverError.message);
    }

    // Fallback: direct Supabase insert (subject to RLS)
    console.log('[contacts-client] Falling back to direct Supabase insert...');

    // Get current user's profile for correct organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Use profile's organization_id (authoritative), NOT user_metadata (stale JWT)
      try {
        const profile = await ensureUserProfile(user.id);
        dbData.organization_id = profile.organization_id;
      } catch (profileError) {
        // Last-resort fallback to JWT metadata
        console.warn('[contacts-client] Could not get profile, falling back to JWT metadata:', profileError);
        dbData.organization_id = user.user_metadata?.organizationId;
      }
      dbData.owner_id = user.id;
    }

    // Filter to only columns that exist in the database
    const existingCols = await getExistingContactColumns(supabase);
    const filteredData = filterToExistingColumns(dbData, existingCols);

    const { data, error } = await supabase
      .from('contacts')
      .insert([filteredData])
      .select()
      .single();

    if (error) throw error;

    // Transform back to application format and wrap in { contact: ... }
    return { contact: transformFromDbFormat(data) };
  } catch (error: any) {
    console.error('Error creating contact:', error);
    throw error;
  }
}

export async function upsertContactByLegacyNumberClient(contactData: any, preloadedAuth?: { userId: string; profile: any }) {
  try {
    const supabase = createClient();
    
    let userId: string;
    let profile: any;
    
    if (preloadedAuth) {
      // Use pre-fetched auth data (bulk import optimization)
      userId = preloadedAuth.userId;
      profile = preloadedAuth.profile;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      userId = user.id;
      profile = await ensureUserProfile(user.id);
    }

    // Detect which columns actually exist in the contacts table (cached)
    const existingCols = await getExistingContactColumns(supabase);

    // Transform data from camelCase to snake_case
    const transformedData = transformToDbFormat(contactData);

    // ── Resolve owner from account_owner_number ─────────────────────────
    // If the CSV provides an account_owner_number (email), look up the
    // matching profile in the same org and use that user as the owner.
    let resolvedOwnerId: string = userId; // default to importing user
    const accountOwnerEmail = contactData.accountOwnerNumber
      ? String(contactData.accountOwnerNumber).trim()
      : '';

    if (accountOwnerEmail && existingCols.has('account_owner_number')) {
      const ownerProfileId = await resolveOwnerByAccountOwnerNumber(
        supabase,
        accountOwnerEmail,
        profile.organization_id,
      );
      if (ownerProfileId) {
        resolvedOwnerId = ownerProfileId;
      } else {
        console.log(`[upsert] account_owner_number "${accountOwnerEmail}" not found in profiles — using importer as owner`);
      }
    }
    
    // Helper: build an update payload that also reassigns owner_id when
    // the CSV provides account_owner_number
    const buildUpdatePayload = () => {
      const base: any = {
        ...transformedData,
        updated_at: new Date().toISOString(),
      };
      // Always set owner_id to the resolved owner on update so re-imports
      // correctly reassign contacts whose account_owner_number changed
      if (accountOwnerEmail) {
        base.owner_id = resolvedOwnerId;
      }
      return filterToExistingColumns(base, existingCols);
    };

    // Only attempt legacy number lookup if the column exists AND legacyNumber is provided
    const hasLegacyNumber = existingCols.has('legacy_number')
      && contactData.legacyNumber
      && String(contactData.legacyNumber).trim() !== '';
    
    if (hasLegacyNumber) {
      // Query to find existing contact by legacy_number
      const { data: existingContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('legacy_number', contactData.legacyNumber)
        .limit(1);

      if (fetchError) {
        console.error('Error looking up contact by legacy number:', fetchError);
        throw fetchError;
      }

      const existingContact = existingContacts && existingContacts.length > 0 ? existingContacts[0] : null;

      if (existingContact) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingContact.id)
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Contact updated (by legacy number):', data?.name || data?.email);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }
    
    // Also check by email if no legacy number match was found and email is provided
    const contactEmail = contactData.email && String(contactData.email).trim() !== '' ? String(contactData.email).trim() : null;
    
    if (contactEmail) {
      const { data: existingByEmail, error: emailFetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('email', contactEmail)
        .limit(1);
      
      if (!emailFetchError && existingByEmail && existingByEmail.length > 0) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingByEmail[0].id)
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Contact updated (by email):', data?.name || data?.email);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }

    // Try matching by account_owner_number + name (same owner, same contact name)
    const hasAccountOwnerCol = existingCols.has('account_owner_number');
    const contactName = contactData.name ? String(contactData.name).trim() : '';

    if (hasAccountOwnerCol && accountOwnerEmail && contactName) {
      const { data: existingByOwnerName, error: ownerNameError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .ilike('account_owner_number', accountOwnerEmail)
        .eq('name', contactName)
        .limit(1);

      if (!ownerNameError && existingByOwnerName && existingByOwnerName.length > 0) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingByOwnerName[0].id)
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Contact updated (by account_owner_number + name):', data?.name || data?.email);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }
    
    // Also try matching by name + company as a last resort for dedup
    const contactCompany = contactData.company ? String(contactData.company).trim() : '';
    
    if (contactName && contactCompany) {
      const { data: existingByName, error: nameFetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('name', contactName)
        .eq('company', contactCompany)
        .limit(1);
      
      if (!nameFetchError && existingByName && existingByName.length > 0) {
        const updatePayload = buildUpdatePayload();

        const { data, error } = await supabase
          .from('contacts')
          .update(updatePayload)
          .eq('id', existingByName[0].id)
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Contact updated (by name+company):', data?.name || data?.email);
        return { contact: transformFromDbFormat(data), action: 'updated' as const };
      }
    }
    
    // Insert new contact — use resolvedOwnerId from account_owner_number lookup
    const insertData = filterToExistingColumns({
      ...transformedData,
      owner_id: resolvedOwnerId,
      organization_id: profile.organization_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, existingCols);
    
    if (!insertData.email || String(insertData.email).trim() === '') {
      const nameSlug = (contactData.name || 'contact').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30);
      insertData.email = `${nameSlug}-${Date.now()}@import.placeholder`;
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Contact created (via import):', data?.name || data?.email, '| owner:', resolvedOwnerId);
    return { contact: transformFromDbFormat(data), action: 'created' as const };
  } catch (error: any) {
    console.error('Error upserting contact:', error.message, error.code, error.details);
    throw error;
  }
}

export async function updateContactClient(id: string, contactData: any) {
  try {
    const supabase = createClient();
    
    // Transform data to DB format (camelCase → snake_case)
    const transformedData = transformToDbFormat(contactData);
    
    // Try server endpoint first (bypasses RLS)
    try {
      const headers = await getServerHeaders();
      console.log(`[contacts-client] Updating contact ${id} via server endpoint...`);
      console.log(`[contacts-client] Payload keys:`, Object.keys(transformedData));
      console.log(`[contacts-client] price_level in payload:`, transformedData.price_level);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/contacts/${id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(transformedData),
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[contacts-client] Server update successful. price_level in response:`, result.contact?.price_level);
        if (result.warnings && result.warnings.length > 0) {
          console.warn('[contacts-client] Server warnings:', result.warnings);
        }
        const transformedContact = transformFromDbFormat(result.contact);
        return { contact: transformedContact };
      } else {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[contacts-client] Server update error:', response.status, errorBody);
        // Fall through to direct Supabase update
      }
    } catch (serverError: any) {
      console.warn('[contacts-client] Server update failed, falling back to direct:', serverError.message);
    }
    
    // Fallback: direct Supabase update (subject to RLS)
    console.log(`[contacts-client] Falling back to direct Supabase update for contact ${id}`);
    const existingColumns = await getExistingContactColumns(supabase);
    const cleanedData = filterToExistingColumns(transformedData, existingColumns);

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
    
    // Try server endpoint first (bypasses RLS)
    try {
      const headers = await getServerHeaders();
      console.log(`[contacts-client] Deleting contact ${id} via server endpoint (bypasses RLS)...`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/contacts/${id}`,
        {
          method: 'DELETE',
          headers,
        }
      );
      
      if (response.ok) {
        console.log(`[contacts-client] Server delete successful for contact ${id}`);
        return { success: true };
      } else {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[contacts-client] Server delete error:', response.status, errorBody);
        // Fall through to direct Supabase delete
      }
    } catch (serverError: any) {
      console.warn('[contacts-client] Server delete failed, falling back to direct:', serverError.message);
    }
    
    // Fallback: direct Supabase delete (subject to RLS)
    console.log(`[contacts-client] Falling back to direct Supabase delete for contact ${id}`);
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
    
    // Detect available columns
    const existingCols = await getExistingContactColumns(supabase);
    
    // If account_owner_number column doesn't exist, we can't claim contacts this way
    if (!existingCols.has('account_owner_number')) {
      console.warn('⚠️ account_owner_number column does not exist — skipping claim');
      return getAllContactsClient();
    }
    
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
    const { data: allUnassigned, error: fetchError } = await supabase
      .from('contacts')
      .select('id, organization_id, name, company, account_owner_number')
      .or('account_owner_number.is.null,account_owner_number.eq.');

    if (fetchError) {
      // If the column doesn't exist at runtime (cache stale), gracefully return
      if (fetchError.code === '42703') {
        console.warn('⚠️ account_owner_number column missing at query time — skipping claim');
        _existingColumns = null; // bust cache
        return getAllContactsClient();
      }
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

    // Check if tags column exists before querying it
    const existingCols = await getExistingContactColumns(supabase);
    if (!existingCols.has('tags')) {
      console.warn('⚠️ tags column does not exist — returning empty segments');
      return { segments: [] };
    }

    // Get all unique tags from contacts
    const { data, error } = await supabase
      .from('contacts')
      .select('tags')
      .eq('organization_id', profile.organization_id)
      .not('tags', 'is', null);

    if (error) {
      if (error.code === '42703') {
        console.warn('⚠️ tags column missing at query time — returning empty segments');
        _existingColumns = null; // bust cache
        return { segments: [] };
      }
      throw error;
    }

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