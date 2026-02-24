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
  /** Conversion factor for non-lumber items */
  conversionFactor?: number;
  /** Quantity after applying conversion factor */
  convertedQuantity?: number;
  /** Whole units to order (ceiled convertedQuantity) */
  orderQuantity?: number;
  /** The purchase unit after conversion */
  convertedUnit?: string;
  /** Inventory item ID */
  itemId?: string;
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
  plannerType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen',
  materialType?: string,
  conversionFactors?: Record<string, number>
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
      let matchedDefaultKey: string | undefined = inventoryItemId ? categoryKey : undefined;
      
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
              matchedDefaultKey = lengthKey;
              return lengthMatch;
            }
          }
          if (defaultsMap.has(baseKey)) {
            matchedDefaultKey = baseKey;
          }
          return defaultsMap.get(baseKey);
        };

        // Helper to match and track the key
        const tryMatch = (key: string): string | undefined => {
          const match = defaultsMap.get(key);
          if (match) matchedDefaultKey = key;
          return match;
        };

        // Smart matching for deck materials
        if (description.includes('ledger flashing')) {
          inventoryItemId = tryMatch('ledger flashing');
        } else if (description.includes('ledger')) {
          inventoryItemId = tryLengthFirst('ledger board');
        } else if (description.includes('joist') && !description.includes('hanger') && !description.includes('rim')) {
          inventoryItemId = tryLengthFirst('joists');
        } else if (description.includes('rim joist') || description.includes('rim joists')) {
          inventoryItemId = tryLengthFirst('rim joists');
        } else if (description.includes('joist hanger')) {
          inventoryItemId = tryMatch('joist hangers');
        } else if (description.includes('beam')) {
          inventoryItemId = tryLengthFirst('beams');
        } else if (description.includes('post') && !description.includes('railing') && !description.includes('anchor')) {
          inventoryItemId = tryLengthFirst('posts');
        } else if (description.includes('post anchor')) {
          inventoryItemId = tryMatch('post anchors');
        } else if (description.includes('decking') || description.includes('deck board')) {
          inventoryItemId = tryLengthFirst('decking boards');
        } else if (description.includes('railing post')) {
          inventoryItemId = tryMatch('railing posts');
        } else if (description.includes('top rail') || description.includes('cap rail')) {
          inventoryItemId = tryMatch('railing top rail');
        } else if (description.includes('bottom rail')) {
          inventoryItemId = tryMatch('railing bottom rail');
        } else if (description.includes('baluster') || description.includes('spindle')) {
          inventoryItemId = tryMatch('railing balusters');
        } else if (description.includes('railing bracket')) {
          inventoryItemId = tryMatch('railing brackets');
        } else if (description.includes('stringer')) {
          inventoryItemId = tryLengthFirst('stair stringers');
        } else if (description.includes('stair') && description.includes('tread')) {
          inventoryItemId = tryMatch('stair treads');
        } else if (description.includes('deck screw')) {
          inventoryItemId = tryMatch('deck screws');
        } else if (description.includes('structural screw')) {
          inventoryItemId = tryMatch('structural screws');
        } else if (description.includes('lag screw') || description.includes('lag bolt')) {
          inventoryItemId = tryMatch('lag screws');
        } else if (description.includes('concrete mix')) {
          inventoryItemId = tryMatch('concrete mix');
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
            inventoryItemId = tryMatch('blocking/bracing');
          } else if (description.includes('truss')) {
            inventoryItemId = tryMatch('roof trusses');
          } else if (description.includes('wall sheathing')) {
            inventoryItemId = tryMatch('wall sheathing');
          } else if (description.includes('roof sheathing')) {
            inventoryItemId = tryMatch('roof sheathing');
          } else if (description.includes('fascia')) {
            inventoryItemId = tryLengthFirst('fascia boards');
          } else if (description.includes('trim')) {
            inventoryItemId = tryMatch('trim boards');
          } else if (description.includes('house wrap') || description.includes('tyvek')) {
            inventoryItemId = tryMatch('house wrap');
          } else if (description.includes('siding')) {
            inventoryItemId = tryMatch('siding');
          } else if (description.includes('garage door opener')) {
            inventoryItemId = tryMatch('garage door opener');
          } else if (description.includes('overhead') || description.includes('garage door')) {
            inventoryItemId = tryMatch('garage door');
          } else if (description.includes('walk door') || description.includes('entry door') || description.includes('steel walk')) {
            inventoryItemId = tryMatch('entry door');
          } else if (description.includes('sub-panel') || description.includes('sub panel')) {
            inventoryItemId = tryMatch('sub-panel');
          } else if (description.includes('romex')) {
            inventoryItemId = tryMatch('romex wire');
          } else if (description.includes('shop light') || description.includes('led')) {
            inventoryItemId = tryMatch('led shop lights');
          } else if (description.includes('gfci') || description.includes('outlet')) {
            inventoryItemId = tryMatch('outlets (gfci)');
          } else if (description.includes('light switch')) {
            inventoryItemId = tryMatch('light switches');
          } else if (description.includes('junction box')) {
            inventoryItemId = tryMatch('junction boxes');
          } else if (description.includes('insulation') && description.includes('wall')) {
            inventoryItemId = tryMatch('insulation (walls)');
          } else if (description.includes('insulation') && description.includes('ceiling')) {
            inventoryItemId = tryMatch('insulation (ceiling)');
          } else if (description.includes('anchor bolt')) {
            inventoryItemId = tryMatch('anchor bolts');
          } else if (description.includes('hurricane')) {
            inventoryItemId = tryMatch('hurricane ties');
          } else if (description.includes('felt') || description.includes('underlayment')) {
            inventoryItemId = tryMatch('felt underlayment');
          } else if (description.includes('shingle')) {
            inventoryItemId = tryMatch('roof shingles');
          } else if (description.includes('ridge cap')) {
            inventoryItemId = tryMatch('ridge cap');
          } else if (description.includes('drip edge')) {
            inventoryItemId = tryMatch('drip edge');
          } else if (description.includes('roofing nail')) {
            inventoryItemId = tryMatch('roofing nails');
          } else if (description.includes('window')) {
            inventoryItemId = tryMatch('windows');
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
            inventoryItemId = tryMatch('collar ties');
          } else if (description.includes('ridge board') || description.includes('ridge')) {
            inventoryItemId = tryLengthFirst('ridge board');
          } else if (description.includes('loft joist')) {
            inventoryItemId = tryLengthFirst('loft joists');
          } else if (description.includes('truss')) {
            inventoryItemId = tryMatch('roof trusses');
          } else if (description.includes('wall sheathing')) {
            inventoryItemId = tryMatch('wall sheathing');
          } else if (description.includes('roof sheathing')) {
            inventoryItemId = tryMatch('roof sheathing');
          } else if (description.includes('tongue') || description.includes('floor decking') || description.includes('plywood') && categoryKey === 'flooring') {
            inventoryItemId = tryMatch('floor decking');
          } else if (description.includes('fascia')) {
            inventoryItemId = tryLengthFirst('fascia boards');
          } else if (description.includes('corner trim')) {
            inventoryItemId = tryMatch('corner trim');
          } else if (description.includes('door/window trim') || (description.includes('trim') && description.includes('door'))) {
            inventoryItemId = tryMatch('door/window trim');
          } else if (description.includes('flower box')) {
            inventoryItemId = tryMatch('flower box kit');
          } else if (description.includes('skid')) {
            inventoryItemId = tryMatch('foundation skids');
          } else if (description.includes('runner')) {
            inventoryItemId = tryMatch('runners');
          } else if (description.includes('concrete block')) {
            inventoryItemId = tryMatch('concrete blocks');
          } else if (description.includes('landscape fabric')) {
            inventoryItemId = tryMatch('landscape fabric');
          } else if (description.includes('border')) {
            inventoryItemId = tryMatch('border');
          } else if (description.includes('house wrap')) {
            inventoryItemId = tryMatch('house wrap');
          } else if (description.includes('siding')) {
            inventoryItemId = tryMatch('siding');
          } else if (description.includes('shutter')) {
            inventoryItemId = tryMatch('shutters');
          } else if (description.includes('door') && description.includes('hinge')) {
            inventoryItemId = tryMatch('hinges');
          } else if (description.includes('handle') || description.includes('latch')) {
            inventoryItemId = tryMatch('handle/latch');
          } else if (description.includes('door') && !description.includes('trim') && !description.includes('hinge') && !description.includes('handle')) {
            inventoryItemId = tryMatch('door');
          } else if (description.includes('barn door hardware')) {
            inventoryItemId = tryMatch('door hardware');
          } else if (description.includes('shelf support') || description.includes('shelf bracket')) {
            inventoryItemId = tryMatch('shelf supports') || tryMatch('shelf brackets');
          } else if (description.includes('plywood shelving')) {
            inventoryItemId = tryMatch('plywood shelving');
          } else if (description.includes('hurricane')) {
            inventoryItemId = tryMatch('hurricane ties');
          } else if (description.includes('felt') || description.includes('underlayment')) {
            inventoryItemId = tryMatch('felt underlayment');
          } else if (description.includes('shingle')) {
            inventoryItemId = tryMatch('roof shingles');
          } else if (description.includes('ridge cap')) {
            inventoryItemId = tryMatch('ridge cap');
          } else if (description.includes('drip edge')) {
            inventoryItemId = tryMatch('drip edge');
          } else if (description.includes('roofing nail')) {
            inventoryItemId = tryMatch('roofing nails');
          } else if (description.includes('window')) {
            inventoryItemId = tryMatch('windows');
          }
        }

        if (inventoryItemId) {
          console.log(`[enrichMaterials] 🔍 Smart matched "${material.description}" -> inventory item ${inventoryItemId} (key: ${matchedDefaultKey})`);
        }
      }
      
      if (inventoryItemId) {
        const inventoryItem = inventoryMap.get(inventoryItemId);
        
        if (inventoryItem) {
          // Convert from cents to dollars for T1 pricing (unit_price)
          const t1Price = inventoryItem.unit_price / 100;
          const costPrice = inventoryItem.cost / 100;

          // Apply conversion factor if provided (e.g., screws sold by the box, tape by the roll)
          // CF is a multiplier: convertedQty = rawQty × CF
          // Pricing is PROPORTIONAL (no rounding): total = rawQty × CF × unitPrice
          // e.g., 12 ft of flashing tape, roll=$799, CF=0.0033 → 12 × 0.0033 × $799 = $31.64
          // e.g., 20 lbs deck screws, box=$X, CF=0.04 → 20 × 0.04 × $X = 0.8 × $X
          const cf = (matchedDefaultKey && conversionFactors?.[matchedDefaultKey]) || 1;
          const hasCF = cf !== 1 && cf > 0;
          const convertedQty = hasCF ? material.quantity * cf : material.quantity;
          const orderQty = hasCF ? Math.ceil(convertedQty) : material.quantity; // whole units to order

          // Proportional pricing based on actual usage, not rounded-up order qty
          const total = t1Price * convertedQty;
          
          totalT1Price += total;
          
          console.log(`[enrichMaterials] ✅ Matched "${material.description}" (${material.category}) -> T1: $${t1Price.toFixed(2)} × ${material.quantity}${hasCF ? ` (CF: ${cf}, converted: ${convertedQty.toFixed(4)}, order: ${orderQty})` : ''} = $${total.toFixed(2)}`);
          
          return {
            ...material,
            itemId: inventoryItemId,
            sku: inventoryItem.sku || `MATERIAL-${inventoryItemId.slice(0, 8)}`,
            unitPrice: t1Price,
            cost: costPrice,
            totalCost: total,
            ...(hasCF ? {
              conversionFactor: cf,
              convertedQuantity: convertedQty,
              orderQuantity: orderQty,
              convertedUnit: cf >= 1 ? `box${orderQty !== 1 ? 'es' : ''}` : 'each',
            } : {}),
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