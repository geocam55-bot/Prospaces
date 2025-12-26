import { createClient } from './supabase/client';
import { getProjectWizardDefaults } from './project-wizard-defaults-client';

interface MaterialItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
  sku?: string;
  cost?: number;
  unitPrice?: number;
  totalCost?: number;
}

interface InventoryItemWithPricing {
  id: string;
  unit_price: number; // stored in cents
  cost: number; // stored in cents
  sku?: string;
}

/**
 * Enrich materials with T1 pricing from inventory based on project wizard defaults
 */
export async function enrichMaterialsWithT1Pricing(
  materials: MaterialItem[],
  organizationId: string,
  plannerType: 'deck' | 'garage' | 'shed',
  materialType?: string
): Promise<{ materials: MaterialItem[]; totalT1Price: number }> {
  console.log('[enrichMaterials] 🔍 Enriching materials with T1 pricing');
  console.log('[enrichMaterials] Planner type:', plannerType);
  console.log('[enrichMaterials] Material type:', materialType);
  console.log('[enrichMaterials] Materials count:', materials.length);

  try {
    const supabase = createClient();
    
    // Get project wizard defaults
    const defaults = await getProjectWizardDefaults(organizationId);
    console.log('[enrichMaterials] Found defaults:', defaults.length);

    // Build a lookup map: material_category -> inventory_item_id
    const defaultsMap = new Map<string, string>();
    defaults.forEach(def => {
      console.log('[enrichMaterials] Processing default:', {
        planner: def.planner_type,
        category: def.material_category,
        materialType: def.material_type,
        hasItemId: !!def.inventory_item_id,
        matches: def.planner_type === plannerType
      });
      
      if (def.planner_type === plannerType && def.inventory_item_id) {
        // Match on material_type if both are provided
        if (materialType && def.material_type) {
          console.log('[enrichMaterials] Comparing material types:', {
            provided: materialType.toLowerCase(),
            stored: def.material_type.toLowerCase(),
            matches: def.material_type.toLowerCase() === materialType.toLowerCase()
          });
          if (def.material_type.toLowerCase() === materialType.toLowerCase()) {
            defaultsMap.set(def.material_category.toLowerCase(), def.inventory_item_id);
            console.log('[enrichMaterials] ✅ Added to map (material type match):', def.material_category.toLowerCase(), '->', def.inventory_item_id);
          }
        } else if (!def.material_type || !materialType) {
          // Include defaults without material_type (they apply to all material types)
          // OR when no materialType is provided in the function call
          defaultsMap.set(def.material_category.toLowerCase(), def.inventory_item_id);
          console.log('[enrichMaterials] ✅ Added to map (no material type filter):', def.material_category.toLowerCase(), '->', def.inventory_item_id);
        }
      }
    });

    console.log('[enrichMaterials] Defaults map:', Array.from(defaultsMap.entries()));
    console.log('[enrichMaterials] Material categories in list:', materials.map(m => m.category));

    // Get unique inventory item IDs
    const inventoryItemIds = Array.from(new Set(defaultsMap.values()));
    
    if (inventoryItemIds.length === 0) {
      console.warn('[enrichMaterials] ⚠️ No inventory items mapped for this project type');
      console.warn('[enrichMaterials] Available defaults:', defaults.map(d => ({ planner: d.planner_type, category: d.material_category, type: d.material_type, hasItem: !!d.inventory_item_id })));
      return { materials, totalT1Price: 0 };
    }

    // Fetch inventory items with pricing
    const { data: inventoryItems, error } = await supabase
      .from('inventory')
      .select('id, unit_price, cost, sku')
      .in('id', inventoryItemIds)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[enrichMaterials] ❌ Error fetching inventory items:', error);
      return { materials, totalT1Price: 0 };
    }

    console.log('[enrichMaterials] Fetched inventory items:', inventoryItems?.length || 0);

    // Build inventory lookup by ID
    const inventoryMap = new Map<string, InventoryItemWithPricing>();
    inventoryItems?.forEach(item => {
      inventoryMap.set(item.id, {
        id: item.id,
        unit_price: item.unit_price || 0,
        cost: item.cost || 0,
        sku: item.sku,
      });
    });

    // Enrich materials
    let totalT1Price = 0;
    const enrichedMaterials = materials.map(material => {
      // Try to find matching inventory item by category OR by smart matching based on description
      const categoryKey = material.category.toLowerCase();
      let inventoryItemId = defaultsMap.get(categoryKey);
      
      // If no direct category match, try smart matching based on description
      if (!inventoryItemId) {
        const description = material.description.toLowerCase();
        
        // Smart matching for deck materials
        if (description.includes('joist')) {
          inventoryItemId = defaultsMap.get('joists');
        } else if (description.includes('beam')) {
          inventoryItemId = defaultsMap.get('beams');
        } else if (description.includes('post') && !description.includes('railing')) {
          inventoryItemId = defaultsMap.get('posts');
        } else if (description.includes('decking') || description.includes('deck board')) {
          inventoryItemId = defaultsMap.get('decking boards');
        } else if (description.includes('railing post')) {
          inventoryItemId = defaultsMap.get('railing posts');
        } else if (description.includes('top rail') || description.includes('cap rail')) {
          inventoryItemId = defaultsMap.get('railing top rail');
        } else if (description.includes('bottom rail')) {
          inventoryItemId = defaultsMap.get('railing bottom rail');
        } else if (description.includes('baluster') || description.includes('spindle')) {
          inventoryItemId = defaultsMap.get('railing balusters');
        } else if (description.includes('stringer')) {
          inventoryItemId = defaultsMap.get('stair stringers');
        } else if (description.includes('stair') && description.includes('tread')) {
          inventoryItemId = defaultsMap.get('stair treads');
        }
        
        if (inventoryItemId) {
          console.log(`[enrichMaterials] 🔍 Smart matched "${material.description}" -> inventory item ${inventoryItemId}`);
        }
      }
      
      if (inventoryItemId) {
        const inventoryItem = inventoryMap.get(inventoryItemId);
        
        if (inventoryItem) {
          // Convert from cents to dollars for T1 pricing (unit_price)
          const t1Price = inventoryItem.unit_price / 100;
          const costPrice = inventoryItem.cost / 100;
          const total = t1Price * material.quantity;
          
          totalT1Price += total;
          
          console.log(`[enrichMaterials] ✅ Matched "${material.description}" (${material.category}) -> T1: $${t1Price.toFixed(2)} x ${material.quantity} = $${total.toFixed(2)}`);
          
          return {
            ...material,
            itemId: inventoryItemId, // Add inventory item ID
            sku: inventoryItem.sku || `MATERIAL-${inventoryItemId.slice(0, 8)}`,
            unitPrice: t1Price, // T1 pricing
            cost: costPrice,
            totalCost: total,
          };
        }
      }
      
      console.log(`[enrichMaterials] ⚠️ No pricing found for "${material.description}" (category: ${material.category})`);
      return material;
    });

    console.log('[enrichMaterials] ✅ Total T1 price:', totalT1Price.toFixed(2));
    
    return {
      materials: enrichedMaterials,
      totalT1Price,
    };
  } catch (error) {
    console.error('[enrichMaterials] ❌ Unexpected error:', error);
    return { materials, totalT1Price: 0 };
  }
}