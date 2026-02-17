import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Package,
  FileSpreadsheet,
  Bell,
  BellRing
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';
import { inventoryAPI } from '../utils/api';
import { contactsAPI } from '../utils/api';
import { bidsAPI } from '../utils/api';

interface BackgroundImportManagerProps {
  user: User;
  onNavigate?: (view: string) => void;
}

interface BackgroundImportJob {
  id: string;
  organization_id: string;
  created_by: string;
  job_type: 'import';
  data_type: 'inventory' | 'contacts' | 'bids';
  scheduled_time: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
  progress?: {
    current: number;
    total: number;
    percent: number;
  };
}

export function BackgroundImportManager({ user, onNavigate }: BackgroundImportManagerProps) {
  const [activeJobs, setActiveJobs] = useState<BackgroundImportJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<BackgroundImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadJobs();
    
    // Set up real-time subscription
    const supabase = createClient();
    
    const channel = supabase
      .channel('background-import-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_jobs',
          filter: `organization_id=eq.${user.organizationId}`
        },
        (payload) => {
          console.log('📡 Real-time job update:', payload);
          
          const job = payload.new as BackgroundImportJob;
          
          // Show notification for completed jobs
          if (job && job.status === 'completed' && notificationsEnabled) {
            showCompletionNotification(job);
          }
          
          // Reload jobs
          loadJobs();
        }
      )
      .subscribe();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadJobs, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user.organizationId, notificationsEnabled]);

  // Auto-process pending jobs
  useEffect(() => {
    const processInterval = setInterval(async () => {
      await checkAndProcessDueJobs();
    }, 5000); // Check every 5 seconds

    // Check immediately on mount
    checkAndProcessDueJobs();

    return () => clearInterval(processInterval);
  }, [user]);

  const loadJobs = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .in('data_type', ['inventory', 'contacts', 'bids']) // Load all import types
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobs = (data || []) as BackgroundImportJob[];
      
      // Split into active and completed
      setActiveJobs(jobs.filter(j => ['pending', 'processing'].includes(j.status)));
      setCompletedJobs(jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status)).slice(0, 10));
      
    } catch (error: any) {
      console.error('Failed to load jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndProcessDueJobs = async () => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Find pending jobs that are due
      const { data: dueJobs, error } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .in('data_type', ['inventory', 'contacts', 'bids']) // Check all import types
        .eq('status', 'pending')
        .lte('scheduled_time', now);

      if (error) throw error;

      if (dueJobs && dueJobs.length > 0) {
        console.log(`⏰ Found ${dueJobs.length} import job(s) to process`);
        
        for (const job of dueJobs) {
          await processJob(job as BackgroundImportJob);
        }

        // Reload jobs to show updated statuses
        loadJobs();
      }
    } catch (error: any) {
      console.error('Failed to check for due jobs:', error);
    }
  };

  const processJob = async (job: BackgroundImportJob) => {
    const supabase = createClient();

    try {
      console.log(`🔄 Processing background import job ${job.id} (${job.data_type})`);

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

      // Process based on data type
      const dataType = job.data_type;

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        for (const record of batch) {
          try {
            if (dataType === 'inventory') {
              // Validate required fields for inventory
              if (!record.name || !record.sku) {
                throw new Error('Missing required fields: name and sku are required');
              }

              // Check for duplicates
              const { data: existing } = await supabase
                .from('inventory')
                .select('id')
                .eq('organization_id', user.organizationId)
                .eq('sku', record.sku)
                .maybeSingle();

              const inventoryData = {
                organization_id: user.organizationId,
                name: record.name,
                sku: record.sku,
                description: record.description || '',
                category: record.category || 'Uncategorized',
                quantity: parseFloat(record.quantity) || 0,
                quantity_on_order: parseFloat(record.quantity_on_order) || 0,
                unit_price: parseFloat(record.unit_price) || 0,
                cost: parseFloat(record.cost) || 0,
                price_tier_1: parseFloat(record.price_tier_1) || 0,
                price_tier_2: parseFloat(record.price_tier_2) || 0,
                price_tier_3: parseFloat(record.price_tier_3) || 0,
                price_tier_4: parseFloat(record.price_tier_4) || 0,
                price_tier_5: parseFloat(record.price_tier_5) || 0,
                department_code: record.department_code || '',
              };

              if (existing) {
                // Update existing
                await inventoryAPI.updateInventory(existing.id, inventoryData);
              } else {
                // Create new
                await inventoryAPI.createInventory(inventoryData);
              }
            } else if (dataType === 'contacts') {
              // Validate required fields for contacts
              if (!record.name || !record.email) {
                throw new Error('Missing required fields: name and email are required');
              }

              const contactData = {
                name: record.name,
                email: record.email,
                phone: record.phone || '',
                company: record.company || '',
                status: record.status || 'Prospect',
                priceLevel: record.priceLevel || 'Retail',
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

              // Check for duplicates by email
              const { data: existing } = await supabase
                .from('contacts')
                .select('id')
                .eq('organization_id', user.organizationId)
                .eq('email', record.email)
                .maybeSingle();

              if (existing) {
                // Update existing
                await contactsAPI.updateContact(existing.id, contactData);
              } else {
                // Create new
                await contactsAPI.createContact(contactData);
              }
            } else if (dataType === 'bids') {
              // Validate required fields for bids
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

              // Create new bid (no duplicate checking for bids)
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
              percent: progress
            }
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
          error_message: errors.length > 0 ? errors.slice(0, 10).join('\n') : null
        })
        .eq('id', job.id);

      console.log(`✅ Background import completed: ${successCount} imported, ${failCount} failed`);

      // Show completion notification
      if (notificationsEnabled) {
        showCompletionNotification({
          ...job,
          status: 'completed',
          record_count: successCount
        });
      }

      // Reload jobs
      loadJobs();

    } catch (error: any) {
      console.error('Failed to process job:', error);

      // Mark as failed
      await supabase
        .from('scheduled_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', job.id);

      // Reload jobs
      loadJobs();
    }
  };

  const showCompletionNotification = (job: BackgroundImportJob) => {
    const dataTypeLabel = job.data_type === 'inventory' ? 'items' : job.data_type === 'contacts' ? 'contacts' : 'bids';
    const dataTypeCapitalized = job.data_type.charAt(0).toUpperCase() + job.data_type.slice(1);
    
    if (job.status === 'completed') {
      toast.success(
        `✅ Import Complete!`,
        {
          description: `Successfully imported ${job.record_count || 0} ${dataTypeLabel} from ${job.file_name}`,
          duration: 10000,
          action: {
            label: `View ${dataTypeCapitalized}`,
            onClick: () => onNavigate?.(job.data_type)
          }
        }
      );

      // Browser notification (if permitted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${dataTypeCapitalized} Import Complete`, {
          body: `Successfully imported ${job.record_count || 0} ${dataTypeLabel}`,
          icon: '/favicon.svg',
          badge: '/favicon.svg'
        });
      }
    } else if (job.status === 'failed') {
      toast.error(
        `❌ Import Failed`,
        {
          description: job.error_message || 'An error occurred during import',
          duration: 10000
        }
      );
    }
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notifications enabled! You\'ll be notified when imports complete.');
      } else {
        toast.error('Notification permission denied');
      }
    } else {
      toast.error('Notifications not supported in this browser');
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const supabase = createClient();
      
      await supabase
        .from('scheduled_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      toast.success('Job cancelled');
      loadJobs();
    } catch (error: any) {
      console.error('Failed to cancel job:', error);
      toast.error('Failed to cancel job');
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const supabase = createClient();
      
      await supabase
        .from('scheduled_jobs')
        .delete()
        .eq('id', jobId);

      toast.success('Job deleted');
      loadJobs();
    } catch (error: any) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    }
  };

  const getStatusBadge = (status: BackgroundImportJob['status']) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      processing: { variant: 'default', icon: Loader2, label: 'Processing' },
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
      failed: { variant: 'destructive', icon: AlertCircle, label: 'Failed' },
      cancelled: { variant: 'outline', icon: X, label: 'Cancelled' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className={`size-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Background Import Manager</h2>
          <p className="text-muted-foreground">
            Monitor data imports (contacts, inventory, bids) running in the background
          </p>
        </div>
        
        <Button
          onClick={enableNotifications}
          variant={notificationsEnabled ? 'default' : 'outline'}
          className="gap-2"
        >
          {notificationsEnabled ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
        </Button>
      </div>

      {activeJobs.length === 0 && completedJobs.length === 0 && (
        <Alert>
          <Package className="size-4" />
          <AlertDescription>
            No background import jobs found. Import inventory files to see them here.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl">Active Imports</h3>
          
          {activeJobs.map(job => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="size-5" />
                      {job.file_name || 'Inventory Import'}
                    </CardTitle>
                    <CardDescription>
                      Started {new Date(job.created_at).toLocaleString()}
                      {job.creator_name && ` by ${job.creator_name}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                    {job.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelJob(job.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {job.progress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {job.progress.current.toLocaleString()} / {job.progress.total.toLocaleString()} records
                      </span>
                      <span>{job.progress.percent}%</span>
                    </div>
                    <Progress value={job.progress.percent} />
                  </div>
                )}
                
                {job.status === 'pending' && (
                  <Alert>
                    <Clock className="size-4" />
                    <AlertDescription>
                      Scheduled for {new Date(job.scheduled_time).toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}

                {job.status === 'processing' && (
                  <Alert>
                    <Loader2 className="size-4 animate-spin" />
                    <AlertDescription>
                      Processing {job.file_data?.records?.length.toLocaleString() || 0} records...
                      You can close this page - we'll notify you when it's done!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl">Recent Imports</h3>
          
          {completedJobs.map(job => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="size-5" />
                      {job.file_name || 'Inventory Import'}
                    </CardTitle>
                    <CardDescription>
                      {job.completed_at && `Completed ${new Date(job.completed_at).toLocaleString()}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteJob(job.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {job.status === 'completed' && (
                  <Alert>
                    <CheckCircle className="size-4" />
                    <AlertDescription>
                      Successfully imported {job.record_count?.toLocaleString() || 0} records
                    </AlertDescription>
                  </Alert>
                )}

                {job.status === 'failed' && job.error_message && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="font-mono text-xs">
                      {job.error_message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}