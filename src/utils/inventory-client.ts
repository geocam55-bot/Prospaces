import { createClient } from './supabase/client';
import { ensureUserProfile } from './ensure-profile';

export async function getAllInventoryClient() {
  try {
    const supabase = createClient();
    
    // Try to get user, with fallback to session
    let authUser;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback: check if there's a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authUser = session.user;
        console.log('✅ Using session user for inventory (getUser failed)');
      } else {
        // Silently return empty during initial load
        return { items: [] };
      }
    } else {
      authUser = user;
    }

    console.log('🔍 getAllInventoryClient - User ID:', authUser.id);
    console.log('🔍 getAllInventoryClient - User metadata:', authUser.user_metadata);

    // Get user's profile to check their role
    let profile;
    try {
      profile = await ensureUserProfile(authUser.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { items: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔐 Inventory - Current user:', profile.email, 'Role:', userRole, 'Organization:', userOrgId);

    if (!userOrgId) {
      console.error('❌ No organization_id found for user!');
      return { items: [] };
    }

    // ✅ CRITICAL FIX: Load ALL items by fetching in batches (Supabase has a hard 1000 row limit per query)
    // We'll fetch 1000 items at a time until we have all 14k+ SKUs
    console.log('🔄 Fetching inventory in batches...');
    
    const allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const batchQuery = supabase
        .from('inventory')
        .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, image_url, organization_id, created_at, updated_at', { count: 'exact' })
        .eq('organization_id', userOrgId)
        .order('name', { ascending: true })
        .range(offset, offset + batchSize - 1);
      
      const { data: batchData, error: batchError } = await batchQuery;
      
      if (batchError) {
        console.error('❌ Database error loading inventory:', batchError);
        console.error('❌ Error code:', batchError.code);
        console.error('❌ Error message:', batchError.message);
        
        // Handle specific error cases gracefully
        if (batchError.code === '42703') {
          console.error('❌ Column missing - database migration may be needed');
          return { items: [] };
        } else if (batchError.code === 'PGRST205' || batchError.code === '42P01') {
          console.error('❌ Table missing - database setup may be needed');
          return { items: [] };
        }
        
        throw batchError;
      }
      
      if (batchData && batchData.length > 0) {
        allData.push(...batchData);
        console.log(`📦 Fetched batch: ${batchData.length} items (total so far: ${allData.length})`);
        
        // If we got fewer items than batchSize, we've reached the end
        if (batchData.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log('📊 Inventory filtered data - Total rows returned:', allData.length);
    console.log('📦 Sample inventory data (first 3):', allData.slice(0, 3));

    // Convert snake_case to camelCase and map to expected format
    const items = allData ? allData.map(mapInventoryItem) : [];
    console.log('✅ Mapped inventory items count:', items.length);
    console.log('✅ Sample mapped items (first 2):', items.slice(0, 2));
    return { items };
  } catch (error: any) {
    console.error('❌ Error loading inventory:', error?.message || error);
    if (error?.code) {
      console.error('❌ Error code:', error.code);
    }
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { items: [] };
  }
}

// Get inventory with server-side filtering for better performance
export async function searchInventoryClient(filters?: {
  search?: string;
  category?: string;
  status?: string;
  organizationId?: string;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ User not authenticated, returning empty inventory');
      return { items: [] };
    }

    // Get user's profile to check their role and organization
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      return { items: [] };
    }

    const userRole = profile.role;
    const userOrgId = profile.organization_id;

    console.log('🔍 Search Inventory - User:', profile.email, 'Role:', userRole, 'Org:', userOrgId);

    let query = supabase
      .from('inventory')
      .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, image_url, organization_id, created_at, updated_at');

    // Apply organization filter based on user's role
    // ALL roles should only see inventory from their own organization
    query = query.eq('organization_id', userOrgId);
    console.log('🔒 Filtering inventory for organization:', userOrgId);

    // Apply category filter
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    // Note: Status filter removed - column doesn't exist in actual schema
    // The UI still shows status filter, but it's handled client-side for backward compatibility

    // Apply search filter - use ILIKE for case-insensitive pattern matching
    // This uses the trigram indexes we created
    if (filters?.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},sku.ilike.${searchTerm},description.ilike.${searchTerm}`);
    }

    // Order by name
    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    console.log('📊 Search results - Total rows:', data?.length || 0);

    // Convert snake_case to camelCase and map to expected format
    const items = data ? data.map(mapInventoryItem) : [];
    return { items };
  } catch (error: any) {
    console.error('Error searching inventory:', error);
    // Return empty array instead of throwing to prevent "Error" in dashboard
    return { items: [] };
  }
}

export async function createInventoryClient(itemData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // ✅ FIX: Get organization_id from profile, not user_metadata
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      throw new Error('Failed to get user profile');
    }

    const organizationId = profile.organization_id;

    if (!organizationId) {
      console.error('❌ No organization_id found for user!');
      throw new Error('No organization_id found for user');
    }

    console.log('➕ Creating inventory item for organization:', organizationId);

    // Clean the data - only include fields that exist in the database
    const cleanData: any = {
      name: itemData.name,
      sku: itemData.sku,
      organization_id: organizationId, // ✅ Use profile organization_id
    };

    // Add optional fields only if they exist - ONLY valid database columns
    if (itemData.description !== undefined) cleanData.description = itemData.description;
    if (itemData.category !== undefined) cleanData.category = itemData.category;
    if (itemData.quantity !== undefined) {
      // Parse quantity as integer - handle decimal values by rounding
      const qty = typeof itemData.quantity === 'string' 
        ? parseFloat(itemData.quantity) 
        : itemData.quantity;
      cleanData.quantity = Math.round(qty);
    }
    if (itemData.quantity_on_order !== undefined) {
      // Parse quantity_on_order as integer - handle decimal values by rounding
      const qtyOnOrder = typeof itemData.quantity_on_order === 'string' 
        ? parseFloat(itemData.quantity_on_order) 
        : itemData.quantity_on_order;
      cleanData.quantity_on_order = Math.round(qtyOnOrder);
    }
    if (itemData.unit_price !== undefined) {
      // Convert unit_price to cents (integer) - multiply by 100
      const price = typeof itemData.unit_price === 'string' 
        ? parseFloat(itemData.unit_price) 
        : itemData.unit_price;
      cleanData.unit_price = Math.round(price * 100);
    }
    if (itemData.cost !== undefined) {
      // Convert cost to cents (integer) - multiply by 100
      const cost = typeof itemData.cost === 'string' 
        ? parseFloat(itemData.cost) 
        : itemData.cost;
      cleanData.cost = Math.round(cost * 100);
    }
    if (itemData.image_url !== undefined) cleanData.image_url = itemData.image_url;

    console.log('➕ Creating inventory item with clean data:', cleanData);

    const { data, error } = await supabase
      .from('inventory')
      .insert([cleanData])
      .select()
      .single();

    if (error) throw error;

    // Convert snake_case to camelCase and map to expected format
    const item = data ? mapInventoryItem(data) : null;
    return { item };
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
}

export async function updateInventoryClient(id: string, itemData: any) {
  try {
    const supabase = createClient();
    // Clean the data - only include fields that exist in the database
    const cleanData: any = {};

    // Add fields only if they exist
    if (itemData.name !== undefined) cleanData.name = itemData.name;
    if (itemData.sku !== undefined) cleanData.sku = itemData.sku;
    if (itemData.description !== undefined) cleanData.description = itemData.description;
    if (itemData.category !== undefined) cleanData.category = itemData.category;
    if (itemData.quantity !== undefined) {
      // Parse quantity as integer - handle decimal values by rounding
      const qty = typeof itemData.quantity === 'string' 
        ? parseFloat(itemData.quantity) 
        : itemData.quantity;
      cleanData.quantity = Math.round(qty);
    }
    if (itemData.quantity_on_order !== undefined) {
      // Parse quantity_on_order as integer - handle decimal values by rounding
      const qtyOnOrder = typeof itemData.quantity_on_order === 'string' 
        ? parseFloat(itemData.quantity_on_order) 
        : itemData.quantity_on_order;
      cleanData.quantity_on_order = Math.round(qtyOnOrder);
    }
    if (itemData.unit_price !== undefined) {
      // Convert unit_price to cents (integer) - multiply by 100
      const price = typeof itemData.unit_price === 'string' 
        ? parseFloat(itemData.unit_price) 
        : itemData.unit_price;
      cleanData.unit_price = Math.round(price * 100);
    }
    if (itemData.cost !== undefined) {
      // Convert cost to cents (integer) - multiply by 100
      const cost = typeof itemData.cost === 'string' 
        ? parseFloat(itemData.cost) 
        : itemData.cost;
      cleanData.cost = Math.round(cost * 100);
    }
    if (itemData.image_url !== undefined) cleanData.image_url = itemData.image_url;
    // Note: Cost field temporarily removed from update to avoid PGRST204 error
    // Will be re-enabled after database migration

    console.log('🔄 Updating inventory item with clean data:', cleanData);
    console.log('🔍 Fields being updated:', Object.keys(cleanData));
    console.log('🔍 image_url value:', cleanData.image_url);

    const { data, error } = await supabase
      .from('inventory')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Convert snake_case to camelCase and map to expected format
    const item = data ? mapInventoryItem(data) : null;
    return { item };
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

export async function deleteInventoryClient(id: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

// Upsert inventory item by SKU - update if exists, create if new
export async function upsertInventoryBySKUClient(itemData: any) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Get organization_id from user profile (more reliable than metadata)
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      throw new Error('Failed to get user profile');
    }

    const organizationId = profile.organization_id;
    if (!organizationId) {
      console.error('❌ No organization_id in profile:', profile);
      throw new Error('No organization ID found in user profile');
    }

    console.log('📦 Upsert inventory - User:', profile.email, 'Org ID:', organizationId);
    console.log('📦 Upsert inventory - Raw itemData:', itemData);

    // Clean the data - only include fields that exist in the database
    const cleanData: any = {
      name: itemData.name,
      sku: itemData.sku,
      organization_id: organizationId,
    };

    // Add optional fields only if they exist - ONLY valid database columns
    if (itemData.description !== undefined) cleanData.description = itemData.description;
    if (itemData.category !== undefined) cleanData.category = itemData.category;
    if (itemData.quantity !== undefined) {
      // Parse quantity as integer - handle decimal values by rounding
      const qty = typeof itemData.quantity === 'string' 
        ? parseFloat(itemData.quantity) 
        : itemData.quantity;
      cleanData.quantity = Math.round(qty);
    }
    if (itemData.quantity_on_order !== undefined) {
      // Parse quantity_on_order as integer - handle decimal values by rounding
      const qtyOnOrder = typeof itemData.quantity_on_order === 'string' 
        ? parseFloat(itemData.quantity_on_order) 
        : itemData.quantity_on_order;
      cleanData.quantity_on_order = Math.round(qtyOnOrder);
    }
    if (itemData.unit_price !== undefined) {
      // Convert unit_price to cents (integer) - multiply by 100
      const price = typeof itemData.unit_price === 'string' 
        ? parseFloat(itemData.unit_price) 
        : itemData.unit_price;
      cleanData.unit_price = Math.round(price * 100);
    }
    if (itemData.cost !== undefined) {
      // Convert cost to cents (integer) - multiply by 100
      const cost = typeof itemData.cost === 'string' 
        ? parseFloat(itemData.cost) 
        : itemData.cost;
      cleanData.cost = Math.round(cost * 100);
    }
    if (itemData.image_url !== undefined) cleanData.image_url = itemData.image_url;
    // Note: Cost field temporarily removed from upsert to avoid PGRST204 error
    // Will be re-enabled after database migration

    console.log('✅ Clean data to send to database:', cleanData);

    // Check if item with this SKU already exists in this organization
    // If there are duplicates, we'll find ALL of them and update them all
    let existingItems: any[] = [];
    if (itemData.sku) {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, description, category, quantity, quantity_on_order, unit_price, cost, image_url, organization_id, created_at, updated_at')
        .eq('sku', itemData.sku)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true }); // Oldest first
      
      if (error) {
        console.error('Error checking for existing inventory item:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        existingItems = data;
        
        // Warn if there are duplicates
        if (data.length > 1) {
          console.warn(`⚠️ Found ${data.length} duplicate records for SKU "${itemData.sku}". Will update all of them.`);
        }
      }
    }

    if (existingItems.length > 0) {
      // Update ALL existing items with this SKU to ensure consistency
      const updateData = { ...cleanData };
      delete updateData.organization_id;
      
      console.log(`🔄 Updating ${existingItems.length} existing item(s) with data:`, updateData);
      
      // Update all records with this SKU
      const { data: updatedItems, error: updateError } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('sku', itemData.sku)
        .eq('organization_id', organizationId)
        .select();
      
      if (updateError) {
        console.error('Error updating inventory items:', updateError);
        throw updateError;
      }
      
      // Return the first updated item
      const item = updatedItems && updatedItems.length > 0 ? mapInventoryItem(updatedItems[0]) : null;
      return { 
        item, 
        action: 'updated',
        updatedCount: updatedItems?.length || 0
      };
    } else {
      // Create new item
      console.log('➕ Creating new item with data:', cleanData);
      
      const { data: createdItem, error: createError } = await supabase
        .from('inventory')
        .insert([cleanData])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating inventory item:', createError);
        throw createError;
      }
      
      const item = createdItem ? mapInventoryItem(createdItem) : null;
      return { item, action: 'created' };
    }
  } catch (error: any) {
    console.error('Error upserting inventory item:', error);
    throw error;
  }
}

// Bulk upsert inventory items - processes multiple records in a single batch
export async function bulkUpsertInventoryBySKUClient(itemsData: any[]) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    // Get organization_id from user profile (more reliable than metadata)
    let profile;
    try {
      profile = await ensureUserProfile(user.id);
    } catch (profileError) {
      console.error('❌ Failed to get user profile:', profileError);
      throw new Error('Failed to get user profile');
    }

    const organizationId = profile.organization_id;
    if (!organizationId) {
      console.error('❌ No organization_id in profile:', profile);
      throw new Error('No organization ID found in user profile');
    }

    if (!itemsData || itemsData.length === 0) {
      return { created: 0, updated: 0, failed: 0, errors: [] };
    }

    console.log(`📦 Bulk upsert ${itemsData.length} inventory items for org: ${organizationId}`);

    // Clean all items data
    const cleanItems = itemsData.map(itemData => {
      const cleanData: any = {
        name: itemData.name,
        sku: itemData.sku,
        organization_id: organizationId,
      };

      // Add optional fields only if they exist
      if (itemData.description !== undefined) cleanData.description = itemData.description;
      if (itemData.category !== undefined) cleanData.category = itemData.category;
      if (itemData.quantity !== undefined) {
        // Parse quantity as integer - handle decimal values by rounding
        const qty = typeof itemData.quantity === 'string' 
          ? parseFloat(itemData.quantity) 
          : itemData.quantity;
        cleanData.quantity = Math.round(qty);
      }
      if (itemData.quantity_on_order !== undefined) {
        // Parse quantity_on_order as integer - handle decimal values by rounding
        const qtyOnOrder = typeof itemData.quantity_on_order === 'string' 
          ? parseFloat(itemData.quantity_on_order) 
          : itemData.quantity_on_order;
        cleanData.quantity_on_order = Math.round(qtyOnOrder);
      }
      if (itemData.unit_price !== undefined) {
        // Convert unit_price to cents (integer) - multiply by 100
        const price = typeof itemData.unit_price === 'string' 
          ? parseFloat(itemData.unit_price) 
          : itemData.unit_price;
        cleanData.unit_price = Math.round(price * 100);
      }
      if (itemData.cost !== undefined) {
        // Convert cost to cents (integer) - multiply by 100
        const cost = typeof itemData.cost === 'string' 
          ? parseFloat(itemData.cost) 
          : itemData.cost;
        cleanData.cost = Math.round(cost * 100);
      }
      if (itemData.image_url !== undefined) cleanData.image_url = itemData.image_url;

      return cleanData;
    });

    console.log('🧹 Sample cleaned item (first record):', cleanItems[0]);
    console.log('🔍 All fields being sent:', cleanItems.length > 0 ? Object.keys(cleanItems[0]) : []);

    // Get all SKUs from the batch
    const skus = cleanItems.map(item => item.sku).filter(Boolean);

    // Query existing items by SKU in this organization
    // Note: This will get ALL records including duplicates
    const { data: existingItems, error: queryError } = await supabase
      .from('inventory')
      .select('id, sku')
      .eq('organization_id', organizationId)
      .in('sku', skus);

    if (queryError) {
      console.error('Error querying existing inventory:', queryError);
      throw queryError;
    }

    // Create a map of existing SKU -> Array of IDs (to handle duplicates)
    const existingSkuMap = new Map<string, string[]>();
    let duplicatesFound = 0;
    
    if (existingItems) {
      existingItems.forEach(item => {
        const existingIds = existingSkuMap.get(item.sku) || [];
        existingIds.push(item.id);
        existingSkuMap.set(item.sku, existingIds);
        
        // Track duplicates
        if (existingIds.length > 1 && existingIds.length === 2) {
          duplicatesFound++;
        }
      });
    }
    
    if (duplicatesFound > 0) {
      console.warn(`⚠️ Found ${duplicatesFound} SKUs with duplicate records. Will update all duplicates.`);
    }

    // Separate items into updates and creates
    const itemsToUpdate: { ids: string[]; data: any; sku: string }[] = [];
    const itemsToCreate: any[] = [];

    cleanItems.forEach(item => {
      const existingIds = existingSkuMap.get(item.sku);
      if (existingIds && existingIds.length > 0) {
        // Item exists (possibly with duplicates) - prepare for update
        const updateData = { ...item };
        delete updateData.organization_id; // Don't update organization_id
        itemsToUpdate.push({ ids: existingIds, data: updateData, sku: item.sku });
      } else {
        // Item doesn't exist - prepare for insert
        itemsToCreate.push(item);
      }
    });

    console.log(`📊 Batch breakdown: ${itemsToCreate.length} to create, ${itemsToUpdate.length} to update`);

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Bulk insert new items
    if (itemsToCreate.length > 0) {
      try {
        console.log('📝 Creating items without RPC - using direct insert...');
        
        // Direct insert without RPC to avoid schema cache issues
        const { data: createdData, error: createError } = await supabase
          .from('inventory')
          .insert(itemsToCreate)
          .select();

        if (createError) {
          console.error('Error bulk creating inventory:', createError);
          errors.push(`Bulk create error: ${createError.message}`);
          failed += itemsToCreate.length;
        } else {
          created = createdData?.length || 0;
          console.log(`✅ Successfully created ${created} items`);
        }
      } catch (error: any) {
        console.error('Error in bulk create:', error);
        errors.push(`Bulk create exception: ${error.message}`);
        failed += itemsToCreate.length;
      }
    }

    // Bulk update existing items (one by one since Supabase doesn't support bulk update well)
    if (itemsToUpdate.length > 0) {
      for (const { ids, data: updateData, sku } of itemsToUpdate) {
        try {
          for (const id of ids) {
            const { error: updateError } = await supabase
              .from('inventory')
              .update(updateData)
              .eq('id', id);

            if (updateError) {
              throw updateError;
            }
          }
          updated += ids.length;
        } catch (error: any) {
          failed++;
          errors.push(`SKU ${sku}: ${error.message}`);
        }
      }
    }

    console.log(`✅ Bulk upsert complete: ${created} created, ${updated} updated, ${failed} failed`);

    return { created, updated, failed, errors };
  } catch (error: any) {
    console.error('Error bulk upserting inventory:', error);
    throw error;
  }
}

// Helper function to convert snake_case to camelCase
function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => snakeToCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = snakeToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to map simple database schema to expected format
function mapInventoryItem(dbItem: any): any {
  // Convert unit_price from cents (integer) back to dollars (decimal)
  const unitPriceInDollars = dbItem.unit_price ? dbItem.unit_price / 100 : 0;
  
  // Convert cost from cents (integer) back to dollars (decimal)
  const costInDollars = dbItem.cost ? dbItem.cost / 100 : 0;
  
  // For simplified schema: use unit_price for all price tiers
  const priceTier1 = unitPriceInDollars;
  const priceTier2 = unitPriceInDollars;
  const priceTier3 = unitPriceInDollars;
  const priceTier4 = unitPriceInDollars;
  const priceTier5 = unitPriceInDollars;
  
  return {
    ...snakeToCamel(dbItem),
    // Map simple schema to full schema
    quantityOnHand: dbItem.quantity || 0,
    quantityOnOrder: dbItem.quantity_on_order || 0,
    unitPrice: unitPriceInDollars,
    cost: costInDollars, // Convert cost from cents to dollars
    priceTier1,
    priceTier2,
    priceTier3,
    priceTier4,
    priceTier5,
    reorderLevel: 0, // Simplified schema doesn't have reorder_level - default to 0
    minStock: 0, // Simplified schema doesn't have min_stock - default to 0
    maxStock: 0, // Simplified schema doesn't have max_stock - default to 0
    unitOfMeasure: 'ea',
    status: 'active',
    tags: [],
  };
}