import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { getServerHeaders } from '../utils/server-headers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { AlertTriangle, Trash2, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function InventoryDuplicateCleaner({ organizationId, onCleanupComplete }: { 
  organizationId: string;
  onCleanupComplete: () => void;
}) {
  const [isScanning, setIsScanning] = useState(true); // start as true since we auto-scan
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupResults, setCleanupResults] = useState<string | null>(null);
  const [scanDone, setScanDone] = useState(false);

  // Scan result — counts only (no huge ID payload)
  const [scanResult, setScanResult] = useState<{
    totalScanned: number;
    uniqueSkus: number;
    duplicateSkus: number;
    toDeleteCount: number;
  } | null>(null);

  // Delete progress
  const [deleteProgress, setDeleteProgress] = useState<{
    deleted: number;
    total: number;
    percent: number;
  } | null>(null);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/inventory-diagnostic`;

  const getAuthHeaders = async () => {
    const headers = await getServerHeaders();
    if (!headers['X-User-Token']) throw new Error('Not authenticated');
    return headers;
  };

  // Auto-scan on mount
  useEffect(() => {
    if (organizationId) {
      scanServerSide();
    }
  }, [organizationId]);

  // ========== SERVER-SIDE PARALLEL SCAN (counts only) ==========
  const scanServerSide = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setCleanupResults(null);

    try {
      const headers = await getAuthHeaders();
      console.log('Scanning for duplicates (server-side parallel)...');

      const response = await fetch(`${baseUrl}/dedup-scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dedup scan result:', data);

      setScanResult({
        totalScanned: data.totalScanned,
        uniqueSkus: data.uniqueSkus,
        duplicateSkus: data.duplicateSkus,
        toDeleteCount: data.toDeleteCount,
      });

      if (data.duplicateSkus > 0) {
        toast.warning(`Found ${data.duplicateSkus.toLocaleString()} duplicate SKUs (${data.toDeleteCount.toLocaleString()} extra records)`);
      } else {
        toast.success('No duplicate SKUs found!');
      }
    } catch (err: any) {
      console.error('Error scanning for duplicates:', err);
      setError(err.message || 'Failed to scan for duplicates');
      toast.error('Scan failed: ' + err.message);
    } finally {
      setIsScanning(false);
      setScanDone(true);
    }
  };

  // ========== SELF-CONTAINED CHUNKED DELETE ==========
  // Each call to dedup-delete-chunk re-scans server-side, finds remaining
  // duplicates, and deletes up to 5,000.  We loop until done.
  const cleanupServerChunked = async () => {
    if (!scanResult || scanResult.toDeleteCount === 0) return;

    const toRemove = scanResult.toDeleteCount;
    if (!confirm(
      `Remove ${toRemove.toLocaleString()} duplicate records?\n\n` +
      `This keeps the OLDEST record for each SKU and deletes newer duplicates.\n` +
      `${scanResult.uniqueSkus.toLocaleString()} unique items will remain.`
    )) return;

    setIsCleaning(true);
    setError(null);
    setCleanupResults(null);

    let totalDeleted = 0;
    let totalErrors = 0;
    const originalTotal = toRemove;

    try {
      const headers = await getAuthHeaders();
      let done = false;

      while (!done) {
        const response = await fetch(`${baseUrl}/dedup-delete-chunk`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ organizationId, batchSize: 5000 }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();
        totalDeleted += data.deleted || 0;
        totalErrors += data.errors || 0;
        done = data.done;

        const percent = Math.min(100, Math.round((totalDeleted / originalTotal) * 100));
        setDeleteProgress({
          deleted: totalDeleted,
          total: originalTotal,
          percent,
        });

        console.log(
          `Dedup chunk: deleted ${data.deleted}, remaining ~${data.remaining}, ` +
          `cumulative ${totalDeleted}/${originalTotal} (${percent}%), done=${done}`
        );
      }

      setCleanupResults(
        `Cleanup complete!\n` +
        `  Scanned: ${scanResult.totalScanned.toLocaleString()} records\n` +
        `  Unique SKUs: ${scanResult.uniqueSkus.toLocaleString()}\n` +
        `  Duplicates removed: ${totalDeleted.toLocaleString()}` +
        (totalErrors > 0 ? `\n  Errors: ${totalErrors}` : '')
      );

      setScanResult(null);
      toast.success(`Removed ${totalDeleted.toLocaleString()} duplicate records!`);

      setTimeout(() => {
        onCleanupComplete();
      }, 1500);

    } catch (err: any) {
      console.error('Error cleaning duplicates:', err);
      setError(err.message || 'Failed to clean duplicates');
      toast.error('Cleanup failed: ' + err.message);
    } finally {
      setIsCleaning(false);
      setDeleteProgress(null);
    }
  };

  // ===== Self-hide: return nothing if scan completed with zero duplicates =====
  const hasDuplicates = scanResult && scanResult.duplicateSkus > 0;
  const scanFoundNothing = scanDone && !isScanning && !isCleaning && !hasDuplicates && !error && !cleanupResults;
  if (scanFoundNothing) {
    return null; // no duplicates — hide completely
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          {isScanning ? (
            <Loader2 className="size-5 text-orange-600 mt-1 animate-spin" />
          ) : (
            <AlertTriangle className="size-5 text-orange-600 mt-1" />
          )}
          <div className="flex-1">
            <CardTitle className="text-orange-900">
              {isScanning ? 'Checking for Duplicates...' : 'Duplicate Records Detected'}
            </CardTitle>
            <CardDescription className="text-orange-700 mt-1">
              {isScanning 
                ? 'Scanning your inventory for duplicate SKU entries (server-side parallel scan)...'
                : 'Your inventory contains duplicate SKU entries that should be cleaned up. The oldest record for each SKU will be kept.'
              }
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
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 whitespace-pre-line">
              {cleanupResults}
            </AlertDescription>
          </Alert>
        )}

        {/* Scan Results */}
        {scanResult && scanResult.duplicateSkus > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Scanned</div>
                  <div className="text-xl font-semibold">{scanResult.totalScanned.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Unique SKUs</div>
                  <div className="text-xl font-semibold text-green-600">{scanResult.uniqueSkus.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duplicate SKUs</div>
                  <div className="text-xl font-semibold text-orange-600">{scanResult.duplicateSkus.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Records to Remove</div>
                  <div className="text-xl font-semibold text-red-600">{scanResult.toDeleteCount.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {scanResult && scanResult.duplicateSkus === 0 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              No duplicates found! All {scanResult.uniqueSkus.toLocaleString()} SKUs are unique.
            </AlertDescription>
          </Alert>
        )}

        {/* Delete Progress */}
        {deleteProgress && isCleaning && (
          <div className="space-y-2">
            <Progress value={deleteProgress.percent} className="h-3" />
            <div className="text-sm text-muted-foreground flex justify-between">
              <span>Removing duplicates... {deleteProgress.percent}%</span>
              <span>{deleteProgress.deleted.toLocaleString()} / {deleteProgress.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={scanServerSide}
            disabled={isScanning || isCleaning}
            variant="outline"
          >
            {isScanning ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="size-4 mr-2" />
                Re-scan for Duplicates
              </>
            )}
          </Button>

          {scanResult && scanResult.toDeleteCount > 0 && (
            <Button
              onClick={cleanupServerChunked}
              disabled={isCleaning || isScanning}
              variant="destructive"
            >
              {isCleaning ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Removing {deleteProgress ? `${deleteProgress.percent}%` : '...'}
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Remove {scanResult.toDeleteCount.toLocaleString()} Duplicates
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
