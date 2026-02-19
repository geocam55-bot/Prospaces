/**
 * BackgroundJobProcessor — headless component mounted at the App level.
 * It polls for pending scheduled_jobs every 15 seconds and auto-processes
 * any that are due, so users don't have to stay on the Background Imports
 * or Scheduled Jobs page for jobs to run.
 *
 * This component renders nothing visible.
 */
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '../utils/supabase/client';
import { inventoryAPI, contactsAPI, bidsAPI } from '../utils/api';
import { getPriceTierLabel } from '../lib/global-settings';
import { toast } from 'sonner@2.0.3';
import type { User } from '../App';

interface BackgroundJobProcessorProps {
  user: User;
  onNavigate?: (view: string) => void;
}

interface JobRow {
  id: string;
  organization_id: string;
  created_by: string;
  job_type: 'import' | 'export';
  data_type: 'inventory' | 'contacts' | 'bids';
  scheduled_time: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  record_count?: number;
  file_name?: string;
  creator_name?: string;
  file_data?: {
    records: any[];
    mapping?: Record<string, string>;
  };
}

export function BackgroundJobProcessor({ user, onNavigate }: BackgroundJobProcessorProps) {
  // Prevent concurrent processing runs
  const processingRef = useRef(false);

  const processImportJob = useCallback(async (job: JobRow) => {
    const supabase = createClient();

    try {
      console.log(`[JobProcessor] Processing job ${job.id} (${job.data_type})`);

      // Mark as processing
      await supabase
        .from('scheduled_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id);

      const records = job.file_data?.records || [];
      const totalRecords = records.length;
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      const dataType = job.data_type;

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        for (const record of batch) {
          try {
            if (dataType === 'inventory') {
              if (!record.name || !record.sku) {
                throw new Error('Missing required fields: name and sku are required');
              }

              const { data: existing } = await supabase
                .from('inventory')
                .select('id')
                .eq('organization_id', user.organizationId)
                .eq('sku', record.sku)
                .maybeSingle();

              const inventoryData: any = {
                organization_id: user.organizationId,
                name: record.name,
                sku: record.sku,
                description: record.description || '',
                category: record.category || 'Uncategorized',
              };
              if (record.quantity != null && record.quantity !== '') inventoryData.quantity = parseFloat(record.quantity) || 0;
              if (record.quantity_on_order != null && record.quantity_on_order !== '') inventoryData.quantity_on_order = parseFloat(record.quantity_on_order) || 0;
              if (record.unit_price != null && record.unit_price !== '') inventoryData.unit_price = parseFloat(record.unit_price) || 0;
              if (record.cost != null && record.cost !== '') inventoryData.cost = parseFloat(record.cost) || 0;
              if (record.price_tier_1 != null && record.price_tier_1 !== '') inventoryData.price_tier_1 = parseFloat(record.price_tier_1) || 0;
              if (record.price_tier_2 != null && record.price_tier_2 !== '') inventoryData.price_tier_2 = parseFloat(record.price_tier_2) || 0;
              if (record.price_tier_3 != null && record.price_tier_3 !== '') inventoryData.price_tier_3 = parseFloat(record.price_tier_3) || 0;
              if (record.price_tier_4 != null && record.price_tier_4 !== '') inventoryData.price_tier_4 = parseFloat(record.price_tier_4) || 0;
              if (record.price_tier_5 != null && record.price_tier_5 !== '') inventoryData.price_tier_5 = parseFloat(record.price_tier_5) || 0;
              if (record.department_code != null && record.department_code !== '') inventoryData.department_code = record.department_code;
              if (record.unit_of_measure != null && record.unit_of_measure !== '') inventoryData.unit_of_measure = record.unit_of_measure;

              if (existing) {
                await inventoryAPI.update(existing.id, inventoryData);
              } else {
                await inventoryAPI.create(inventoryData);
              }
            } else if (dataType === 'contacts') {
              if (!record.name || !record.email) {
                throw new Error('Missing required fields: name and email are required');
              }

              const contactData = {
                name: record.name,
                email: record.email,
                phone: record.phone || '',
                company: record.company || '',
                status: record.status || 'Prospect',
                priceLevel: record.priceLevel || getPriceTierLabel(1),
                address: record.address || '',
                notes: record.notes || '',
                legacyNumber: record.legacyNumber || '',
                accountOwnerNumber: record.accountOwnerNumber || '',
                ptdSales: parseFloat(record.ptdSales) || 0,
                ptdGpPercent: parseFloat(record.ptdGpPercent) || 0,
                ytdSales: parseFloat(record.ytdSales) || 0,
                ytdGpPercent: parseFloat(record.ytdGpPercent) || 0,
                lyrSales: parseFloat(record.lyrSales) || 0,
                lyrGpPercent: parseFloat(record.lyrGpPercent) || 0,
              };

              const { data: existing } = await supabase
                .from('contacts')
                .select('id')
                .eq('organization_id', user.organizationId)
                .eq('email', record.email)
                .maybeSingle();

              if (existing) {
                await contactsAPI.updateContact(existing.id, contactData);
              } else {
                await contactsAPI.createContact(contactData);
              }
            } else if (dataType === 'bids') {
              if (!record.clientName || !record.projectName) {
                throw new Error('Missing required fields: clientName and projectName are required');
              }

              const bidData = {
                clientName: record.clientName,
                projectName: record.projectName,
                description: record.description || '',
                subtotal: parseFloat(record.subtotal) || 0,
                tax: parseFloat(record.tax) || 0,
                total: parseFloat(record.total) || 0,
                status: record.status || 'Draft',
                validUntil: record.validUntil || null,
              };

              await bidsAPI.createBid(bidData);
            }

            successCount++;
          } catch (error: any) {
            failCount++;
            errors.push(`Row ${i + batch.indexOf(record) + 1}: ${error.message}`);
          }
        }

        // Update progress
        const progress = Math.round(((i + batch.length) / totalRecords) * 100);
        await supabase
          .from('scheduled_jobs')
          .update({
            progress: {
              current: i + batch.length,
              total: totalRecords,
              percent: progress,
            },
          })
          .eq('id', job.id);
      }

      // Mark as completed
      await supabase
        .from('scheduled_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          record_count: successCount,
          error_message: errors.length > 0 ? errors.slice(0, 10).join('\n') : null,
        })
        .eq('id', job.id);

      console.log(`[JobProcessor] Job ${job.id} completed: ${successCount} imported, ${failCount} failed`);

      // Notify user
      const dataTypeLabel = dataType === 'inventory' ? 'items' : dataType === 'contacts' ? 'contacts' : 'bids';
      toast.success(`Import Complete!`, {
        description: `Successfully imported ${successCount.toLocaleString()} ${dataTypeLabel}${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        duration: 10000,
        action: onNavigate
          ? {
              label: `View ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`,
              onClick: () => onNavigate(dataType),
            }
          : undefined,
      });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Import Complete`, {
          body: `Successfully imported ${successCount} ${dataTypeLabel}`,
        });
      }
    } catch (error: any) {
      console.error(`[JobProcessor] Job ${job.id} failed:`, error);

      await supabase
        .from('scheduled_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('id', job.id);

      toast.error(`Import Failed`, {
        description: error.message || 'An error occurred during import',
        duration: 10000,
      });
    }
  }, [user.organizationId, onNavigate]);

  const checkAndProcessDueJobs = useCallback(async () => {
    // Guard against concurrent runs
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Find pending import/export jobs that are due
      const { data: dueJobs, error } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'pending')
        .lte('scheduled_time', now)
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('[JobProcessor] Error querying due jobs:', error);
        return;
      }

      if (dueJobs && dueJobs.length > 0) {
        console.log(`[JobProcessor] Found ${dueJobs.length} due job(s) to process`);

        for (const job of dueJobs as JobRow[]) {
          if (job.job_type === 'import') {
            await processImportJob(job);
          }
          // Scheduled exports are handled by ScheduledJobs component since they
          // need the executeExport helper which downloads a file; we only auto-
          // process imports here.
        }
      }
    } catch (error: any) {
      console.error('[JobProcessor] Unexpected error:', error);
    } finally {
      processingRef.current = false;
    }
  }, [user.organizationId, processImportJob]);

  useEffect(() => {
    // Check immediately on mount
    checkAndProcessDueJobs();

    // Then poll every 15 seconds
    const interval = setInterval(checkAndProcessDueJobs, 15_000);

    return () => clearInterval(interval);
  }, [checkAndProcessDueJobs]);

  // This component renders nothing — it's purely a background worker
  return null;
}
