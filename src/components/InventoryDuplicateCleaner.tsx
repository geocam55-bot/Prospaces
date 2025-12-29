import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface DuplicateGroup {
  sku: string;
  name: string;
  count: number;
  ids: string[];
}

export function InventoryDuplicateCleaner({ organizationId, onCleanupComplete }: { 
  organizationId: string;
  onCleanupComplete: () => void;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cleanupResults, setCleanupResults] = useState<string | null>(null);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    setError(null);
    setDuplicates([]);
    
    try {
      console.log('🔍 Scanning for duplicates...');
      
      // Load all inventory items
      const { data: allItems, error: loadError } = await supabase
        .from('inventory')
        .select('id, sku, name')
        .eq('organization_id', organizationId)
        .order('sku');
      
      if (loadError) throw loadError;
      
      if (!allItems) {
        setError('No items found');
        return;
      }
      
      // Group by SKU
      const skuGroups = new Map<string, { name: string; ids: string[] }>();
      
      allItems.forEach(item => {
        if (!item.sku) return;
        
        if (!skuGroups.has(item.sku)) {
          skuGroups.set(item.sku, { name: item.name, ids: [] });
        }
        skuGroups.get(item.sku)!.ids.push(item.id);
      });
      
      // Find duplicates (where count > 1)
      const duplicatesList: DuplicateGroup[] = [];
      skuGroups.forEach((value, sku) => {
        if (value.ids.length > 1) {
          duplicatesList.push({
            sku,
            name: value.name,
            count: value.ids.length,
            ids: value.ids
          });
        }
      });
      
      duplicatesList.sort((a, b) => b.count - a.count);
      setDuplicates(duplicatesList);
      
      console.log(`✅ Found ${duplicatesList.length} duplicate SKUs affecting ${duplicatesList.reduce((sum, d) => sum + d.count, 0)} total records`);
      
    } catch (err) {
      console.error('❌ Error scanning for duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for duplicates');
    } finally {
      setIsScanning(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!confirm(`Are you sure you want to remove ${duplicates.reduce((sum, d) => sum + (d.count - 1), 0)} duplicate records?\n\nThis will keep the oldest record for each SKU and delete the rest.`)) {
      return;
    }
    
    setIsCleaning(true);
    setError(null);
    setCleanupResults(null);
    
    try {
      let deletedCount = 0;
      let keptCount = 0;
      
      for (const duplicate of duplicates) {
        // Sort IDs and keep the first one (oldest)
        const [keepId, ...deleteIds] = duplicate.ids;
        
        // Delete the duplicate records
        for (const deleteId of deleteIds) {
          const { error: deleteError } = await supabase
            .from('inventory')
            .delete()
            .eq('id', deleteId)
            .eq('organization_id', organizationId); // Safety check
          
          if (deleteError) {
            console.error(`❌ Failed to delete ${deleteId}:`, deleteError);
          } else {
            deletedCount++;
          }
        }
        
        keptCount++;
      }
      
      setCleanupResults(`✅ Cleanup complete!\n• Kept ${keptCount} unique items\n• Removed ${deletedCount} duplicate records`);
      setDuplicates([]);
      
      // Trigger reload
      setTimeout(() => {
        onCleanupComplete();
      }, 2000);
      
    } catch (err) {
      console.error('❌ Error cleaning duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to clean duplicates');
    } finally {
      setIsCleaning(false);
    }
  };

  const totalDuplicates = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-orange-600 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-orange-900">Duplicate Records Detected</CardTitle>
            <CardDescription className="text-orange-700 mt-1">
              Your inventory contains duplicate SKU entries that should be cleaned up
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {cleanupResults && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800 whitespace-pre-line">
              {cleanupResults}
            </AlertDescription>
          </Alert>
        )}
        
        {duplicates.length > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Duplicate SKUs</div>
                  <div className="text-2xl font-semibold text-orange-600">{duplicates.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Records to Remove</div>
                  <div className="text-2xl font-semibold text-red-600">{totalDuplicates}</div>
                </div>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-white rounded-lg border">
              {duplicates.slice(0, 10).map((dup, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{dup.sku}</div>
                    <div className="text-xs text-muted-foreground truncate">{dup.name}</div>
                  </div>
                  <div className="text-orange-600 font-semibold ml-2">
                    {dup.count}x
                  </div>
                </div>
              ))}
              {duplicates.length > 10 && (
                <div className="text-xs text-center text-muted-foreground pt-2">
                  + {duplicates.length - 10} more duplicate groups
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={scanForDuplicates}
            disabled={isScanning || isCleaning}
            variant="outline"
          >
            {isScanning ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              'Scan for Duplicates'
            )}
          </Button>
          
          {duplicates.length > 0 && (
            <Button
              onClick={cleanupDuplicates}
              disabled={isCleaning}
              variant="destructive"
            >
              {isCleaning ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Remove {totalDuplicates} Duplicates
                </>
              )}
            </Button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Note: This will keep the oldest record for each duplicate SKU and delete the rest.
        </p>
      </CardContent>
    </Card>
  );
}
