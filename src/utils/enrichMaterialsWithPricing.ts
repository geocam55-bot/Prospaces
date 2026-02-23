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
  /** Standard lumber length in feet for length-aware SKU matching */
  lumberLength?: number;
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
  console.log(`[enrichMaterials] Enriching ${materials.length} materials for '${plannerType}' planner${materialType ? ` (${materialType})` : ''}`);

  try {
    const supabase = createClient();
    
    // Get project wizard defaults
    const defaults = await getProjectWizardDefaults(organizationId);
    console.log(`[enrichMaterials] Found ${defaults.length} default mappings`);

    // Build a lookup map: material_category -> inventory_item_id
    const defaultsMap = new Map<string, string>();
    defaults.forEach(def => {
      if (def.planner_type === plannerType && def.inventory_item_id) {
        // Match on material_type if both are provided
        if (materialType && def.material_type) {
          if (def.material_type.toLowerCase() === materialType.toLowerCase()) {
            defaultsMap.set(def.material_category.toLowerCase(), def.inventory_item_id);
          }
        } else if (!def.material_type || !materialType) {
          // Include defaults without material_type (they apply to all material types)
          // OR when no materialType is provided in the function call
          defaultsMap.set(def.material_category.toLowerCase(), def.inventory_item_id);
        }
      }
    });

    console.log(`[enrichMaterials] Mapped ${defaultsMap.size} categories to inventory items`);

    // Get unique inventory item IDs
    const inventoryItemIds = Array.from(new Set(defaultsMap.values()));
    
    if (inventoryItemIds.length === 0) {
      console.log(`[enrichMaterials] ℹ️ No inventory defaults configured for '${plannerType}' planner type. Returning materials without pricing enrichment.`);
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
        
        // -----------------------------------------------------------------
        // Length-aware matching: if the material specifies a lumberLength,
        // first try the length-specific default key (e.g. "joists (12')"),
        // then fall back to the generic key (e.g. "joists").
        // -----------------------------------------------------------------
        const tryLengthFirst = (baseKey: string): string | undefined => {
          if (material.lumberLength) {
            const lengthKey = `${baseKey} (${material.lumberLength}')`;
            const lengthMatch = defaultsMap.get(lengthKey);
            if (lengthMatch) {
              console.log(`[enrichMaterials] 📏 Length-specific match: "${lengthKey}" -> ${lengthMatch}`);
              return lengthMatch;
            }
          }
          return defaultsMap.get(baseKey);
        };

        // Smart matching for deck materials
        if (description.includes('ledger')) {
          inventoryItemId = tryLengthFirst('ledger board');
        } else if (description.includes('joist') && !description.includes('hanger') && !description.includes('rim')) {
          inventoryItemId = tryLengthFirst('joists');
        } else if (description.includes('rim joist') || description.includes('rim joists')) {
          inventoryItemId = tryLengthFirst('rim joists');
        } else if (description.includes('joist hanger')) {
          inventoryItemId = defaultsMap.get('joist hangers');
        } else if (description.includes('beam')) {
          inventoryItemId = tryLengthFirst('beams');
        } else if (description.includes('post') && !description.includes('railing') && !description.includes('anchor')) {
          inventoryItemId = tryLengthFirst('posts');
        } else if (description.includes('post anchor')) {
          inventoryItemId = defaultsMap.get('post anchors');
        } else if (description.includes('decking') || description.includes('deck board')) {
          inventoryItemId = tryLengthFirst('decking boards');
        } else if (description.includes('railing post')) {
          inventoryItemId = defaultsMap.get('railing posts');
        } else if (description.includes('top rail') || description.includes('cap rail')) {
          inventoryItemId = defaultsMap.get('railing top rail');
        } else if (description.includes('bottom rail')) {
          inventoryItemId = defaultsMap.get('railing bottom rail');
        } else if (description.includes('baluster') || description.includes('spindle')) {
          inventoryItemId = defaultsMap.get('railing balusters');
        } else if (description.includes('railing bracket')) {
          inventoryItemId = defaultsMap.get('railing brackets');
        } else if (description.includes('stringer')) {
          inventoryItemId = tryLengthFirst('stair stringers');
        } else if (description.includes('stair') && description.includes('tread')) {
          inventoryItemId = defaultsMap.get('stair treads');
        } else if (description.includes('deck screw')) {
          inventoryItemId = defaultsMap.get('deck screws');
        } else if (description.includes('structural screw')) {
          inventoryItemId = defaultsMap.get('structural screws');
        } else if (description.includes('concrete mix')) {
          inventoryItemId = defaultsMap.get('concrete mix');
        }
        
        // -----------------------------------------------------------
        // Smart matching for garage materials
        // -----------------------------------------------------------
        if (!inventoryItemId && plannerType === 'garage') {
          if (description.includes('stud')) {
            inventoryItemId = tryLengthFirst('wall studs');
          } else if (description.includes('plate')) {
            inventoryItemId = tryLengthFirst('plates');
          } else if (description.includes('header')) {
            inventoryItemId = tryLengthFirst('headers');
          } else if (description.includes('blocking') || description.includes('bracing')) {
            inventoryItemId = defaultsMap.get('blocking/bracing');
          } else if (description.includes('truss')) {
            inventoryItemId = defaultsMap.get('roof trusses');
          } else if (description.includes('wall sheathing')) {
            inventoryItemId = defaultsMap.get('wall sheathing');
          } else if (description.includes('roof sheathing')) {
            inventoryItemId = defaultsMap.get('roof sheathing');
          } else if (description.includes('fascia')) {
            inventoryItemId = tryLengthFirst('fascia boards');
          } else if (description.includes('trim')) {
            inventoryItemId = defaultsMap.get('trim boards');
          } else if (description.includes('house wrap') || description.includes('tyvek')) {
            inventoryItemId = defaultsMap.get('house wrap');
          } else if (description.includes('siding')) {
            inventoryItemId = defaultsMap.get('siding');
          } else if (description.includes('garage door opener')) {
            inventoryItemId = defaultsMap.get('garage door opener');
          } else if (description.includes('overhead') || description.includes('garage door')) {
            inventoryItemId = defaultsMap.get('garage door');
          } else if (description.includes('walk door') || description.includes('entry door') || description.includes('steel walk')) {
            inventoryItemId = defaultsMap.get('entry door');
          } else if (description.includes('sub-panel') || description.includes('sub panel')) {
            inventoryItemId = defaultsMap.get('sub-panel');
          } else if (description.includes('romex')) {
            inventoryItemId = defaultsMap.get('romex wire');
          } else if (description.includes('shop light') || description.includes('led')) {
            inventoryItemId = defaultsMap.get('led shop lights');
          } else if (description.includes('gfci') || description.includes('outlet')) {
            inventoryItemId = defaultsMap.get('outlets (gfci)');
          } else if (description.includes('light switch')) {
            inventoryItemId = defaultsMap.get('light switches');
          } else if (description.includes('junction box')) {
            inventoryItemId = defaultsMap.get('junction boxes');
          } else if (description.includes('insulation') && description.includes('wall')) {
            inventoryItemId = defaultsMap.get('insulation (walls)');
          } else if (description.includes('insulation') && description.includes('ceiling')) {
            inventoryItemId = defaultsMap.get('insulation (ceiling)');
          } else if (description.includes('anchor bolt')) {
            inventoryItemId = defaultsMap.get('anchor bolts');
          } else if (description.includes('hurricane')) {
            inventoryItemId = defaultsMap.get('hurricane ties');
          } else if (description.includes('felt') || description.includes('underlayment')) {
            inventoryItemId = defaultsMap.get('felt underlayment');
          } else if (description.includes('shingle')) {
            inventoryItemId = defaultsMap.get('roof shingles');
          } else if (description.includes('ridge cap')) {
            inventoryItemId = defaultsMap.get('ridge cap');
          } else if (description.includes('drip edge')) {
            inventoryItemId = defaultsMap.get('drip edge');
          } else if (description.includes('roofing nail')) {
            inventoryItemId = defaultsMap.get('roofing nails');
          } else if (description.includes('window')) {
            inventoryItemId = defaultsMap.get('windows');
          }
        }

        // -----------------------------------------------------------
        // Smart matching for shed materials
        // -----------------------------------------------------------
        if (!inventoryItemId && plannerType === 'shed') {
          if (description.includes('floor joist')) {
            inventoryItemId = tryLengthFirst('floor joists');
          } else if (description.includes('rim joist') || description.includes('rim joists')) {
            inventoryItemId = tryLengthFirst('rim joists');
          } else if (description.includes('wall stud') || (description.includes('stud') && !description.includes('joist'))) {
            inventoryItemId = tryLengthFirst('wall studs');
          } else if (description.includes('plate')) {
            inventoryItemId = tryLengthFirst('plates');
          } else if (description.includes('header')) {
            inventoryItemId = tryLengthFirst('headers');
          } else if (description.includes('rafter')) {
            inventoryItemId = tryLengthFirst('rafters');
          } else if (description.includes('collar tie')) {
            inventoryItemId = defaultsMap.get('collar ties');
          } else if (description.includes('ridge board') || description.includes('ridge')) {
            inventoryItemId = tryLengthFirst('ridge board');
          } else if (description.includes('loft joist')) {
            inventoryItemId = tryLengthFirst('loft joists');
          } else if (description.includes('truss')) {
            inventoryItemId = defaultsMap.get('roof trusses');
          } else if (description.includes('wall sheathing')) {
            inventoryItemId = defaultsMap.get('wall sheathing');
          } else if (description.includes('roof sheathing')) {
            inventoryItemId = defaultsMap.get('roof sheathing');
          } else if (description.includes('tongue') || description.includes('floor decking') || description.includes('plywood') && categoryKey === 'flooring') {
            inventoryItemId = defaultsMap.get('floor decking');
          } else if (description.includes('fascia')) {
            inventoryItemId = tryLengthFirst('fascia boards');
          } else if (description.includes('corner trim')) {
            inventoryItemId = defaultsMap.get('corner trim');
          } else if (description.includes('door/window trim') || (description.includes('trim') && description.includes('door'))) {
            inventoryItemId = defaultsMap.get('door/window trim');
          } else if (description.includes('flower box')) {
            inventoryItemId = defaultsMap.get('flower box kit');
          } else if (description.includes('skid')) {
            inventoryItemId = defaultsMap.get('foundation skids');
          } else if (description.includes('runner')) {
            inventoryItemId = defaultsMap.get('runners');
          } else if (description.includes('concrete block')) {
            inventoryItemId = defaultsMap.get('concrete blocks');
          } else if (description.includes('landscape fabric')) {
            inventoryItemId = defaultsMap.get('landscape fabric');
          } else if (description.includes('border')) {
            inventoryItemId = defaultsMap.get('border');
          } else if (description.includes('house wrap')) {
            inventoryItemId = defaultsMap.get('house wrap');
          } else if (description.includes('siding')) {
            inventoryItemId = defaultsMap.get('siding');
          } else if (description.includes('shutter')) {
            inventoryItemId = defaultsMap.get('shutters');
          } else if (description.includes('door') && description.includes('hinge')) {
            inventoryItemId = defaultsMap.get('hinges');
          } else if (description.includes('handle') || description.includes('latch')) {
            inventoryItemId = defaultsMap.get('handle/latch');
          } else if (description.includes('door') && !description.includes('trim') && !description.includes('hinge') && !description.includes('handle')) {
            inventoryItemId = defaultsMap.get('door');
          } else if (description.includes('barn door hardware')) {
            inventoryItemId = defaultsMap.get('door hardware');
          } else if (description.includes('shelf support') || description.includes('shelf bracket')) {
            inventoryItemId = defaultsMap.get('shelf supports') || defaultsMap.get('shelf brackets');
          } else if (description.includes('plywood shelving')) {
            inventoryItemId = defaultsMap.get('plywood shelving');
          } else if (description.includes('hurricane')) {
            inventoryItemId = defaultsMap.get('hurricane ties');
          } else if (description.includes('felt') || description.includes('underlayment')) {
            inventoryItemId = defaultsMap.get('felt underlayment');
          } else if (description.includes('shingle')) {
            inventoryItemId = defaultsMap.get('roof shingles');
          } else if (description.includes('ridge cap')) {
            inventoryItemId = defaultsMap.get('ridge cap');
          } else if (description.includes('drip edge')) {
            inventoryItemId = defaultsMap.get('drip edge');
          } else if (description.includes('roofing nail')) {
            inventoryItemId = defaultsMap.get('roofing nails');
          } else if (description.includes('window')) {
            inventoryItemId = defaultsMap.get('windows');
          }
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