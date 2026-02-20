import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Clock,
  Calendar as CalendarIcon,
  Trash2,
  PlayCircle,
  History,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { contactsAPI, inventoryAPI, bidsAPI } from '../utils/api';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { getPriceTierLabel } from '../lib/global-settings';

interface ScheduledJobsProps {
  user: User;
  onNavigate?: (view: string) => void;
}

interface ScheduledJob {
  id: string;
  organization_id: string;
  created_by: string;
  job_type: 'import' | 'export';
  data_type: 'contacts' | 'inventory' | 'bids';
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
  };
}

export function ScheduledJobs({ user, onNavigate }: ScheduledJobsProps) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadJobs();
    
    // Refresh jobs every 30 seconds
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Check for and process due jobs every 60 seconds
  useEffect(() => {
    const processInterval = setInterval(async () => {
      await checkAndProcessDueJobs();
    }, 60000); // Check every minute

    // Also check immediately on mount
    checkAndProcessDueJobs();

    return () => clearInterval(processInterval);
  }, [user]);

  const checkAndProcessDueJobs = async () => {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Find pending jobs that are due
      const { data: dueJobs, error } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'pending')
        .lte('scheduled_time', now);

      if (error) throw error;

      if (dueJobs && dueJobs.length > 0) {
        console.log(`⏰ Found ${dueJobs.length} due job(s) to process`);
        
        for (const job of dueJobs) {
          await processJob(job);
        }

        // Reload jobs to show updated statuses
        loadJobs();
      }
    } catch (error: any) {
      console.error('Failed to check for due jobs:', error);
    }
  };

  const processJob = async (job: any) => {
    const supabase = createClient();
    
    try {
      console.log(`🚀 Processing job ${job.id}: ${job.job_type} ${job.data_type}`);

      // Mark as processing
      await supabase
        .from('scheduled_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id);

      let recordCount = 0;

      if (job.job_type === 'export') {
        // Handle export
        recordCount = await executeExport(job.data_type);
      } else if (job.job_type === 'import') {
        // Handle import
        recordCount = await executeImport(job);
      }

      // Mark as completed
      await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          record_count: recordCount
        })
        .eq('id', job.id);

      toast.success(`${job.job_type === 'import' ? 'Import' : 'Export'} completed: ${recordCount} records`);
    } catch (error: any) {
      console.error(`Failed to process job ${job.id}:`, error);

      // Mark as failed
      await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', job.id);

      toast.error(`Job failed: ${error.message}`);
    }
  };

  const executeExport = async (dataType: 'contacts' | 'inventory' | 'bids'): Promise<number> => {
    let data: any[] = [];
    let csvContent = '';

    if (dataType === 'contacts') {
      const response = await contactsAPI.getAll('team');
      data = response.contacts || [];
      csvContent = [
        'name,email,phone,company,address,status,priceLevel,notes,legacyNumber,accountOwnerNumber,ptdSales,ptdGpPercent,ytdSales,ytdGpPercent,lyrSales,lyrGpPercent',
        ...data.map((c: any) => 
          `"${c.name}","${c.email}","${c.phone || ''}","${c.company || ''}","${c.address || ''}","${c.status || ''}","${c.priceLevel || ''}","${c.notes || ''}","${c.legacyNumber || ''}","${c.accountOwnerNumber || ''}","${c.ptdSales || ''}","${c.ptdGpPercent || ''}","${c.ytdSales || ''}","${c.ytdGpPercent || ''}","${c.lyrSales || ''}","${c.lyrGpPercent || ''}"`
        )
      ].join('\n');
    } else if (dataType === 'inventory') {
      const response = await inventoryAPI.getAll();
      data = response.inventory || [];
      csvContent = [
        'name,sku,description,category,quantity,quantity_on_order,unit_price,cost',
        ...data.map((i: any) => 
          `\"${i.name}\",\"${i.sku}\",\"${i.description || ''}\",\"${i.category}\",\"${i.quantity}\",\"${i.quantity_on_order}\",\"${i.unit_price}\",\"${i.cost || ''}\"`
        )
      ].join('\n');
    } else if (dataType === 'bids') {
      const response = await bidsAPI.getAll('team');
      data = response.bids || [];
      csvContent = [
        'clientName,projectName,description,subtotal,tax,total,status,validUntil,notes,terms',
        ...data.map((b: any) => 
          `"${b.clientName}","${b.projectName}","${b.description || ''}","${b.subtotal}","${b.tax}","${b.total}","${b.status}","${b.validUntil}","${b.notes || ''}","${b.terms || ''}"`
        )
      ].join('\n');
    }

    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return data.length;
  };

  const executeImport = async (job: any): Promise<number> => {
    if (!job.file_data || !job.file_data.records) {
      throw new Error('No import data found');
    }

    const data = job.file_data.records;
    let successCount = 0;
    const errors: string[] = [];

    if (job.data_type === 'contacts') {
      for (const record of data) {
        try {
          // Validate required fields
          if (!record.name || !record.email) {
            throw new Error('Missing required fields (name, email)');
          }

          // Clean the contact data
          const cleanContact: any = {
            name: record.name,
            email: record.email,
            phone: record.phone || '',
            company: record.company || '',
            status: record.status || 'Prospect',
            priceLevel: record.priceLevel || getPriceTierLabel(1),
          };

          // Add optional fields
          if (record.address) cleanContact.address = record.address;
          if (record.notes) cleanContact.notes = record.notes;
          if (record.legacyNumber) cleanContact.legacyNumber = record.legacyNumber;
          if (record.accountOwnerNumber) cleanContact.accountOwnerNumber = record.accountOwnerNumber;
          if (record.ptdSales) cleanContact.ptdSales = parseFloat(record.ptdSales);
          if (record.ptdGpPercent) cleanContact.ptdGpPercent = parseFloat(record.ptdGpPercent);
          if (record.ytdSales) cleanContact.ytdSales = parseFloat(record.ytdSales);
          if (record.ytdGpPercent) cleanContact.ytdGpPercent = parseFloat(record.ytdGpPercent);
          if (record.lyrSales) cleanContact.lyrSales = parseFloat(record.lyrSales);
          if (record.lyrGpPercent) cleanContact.lyrGpPercent = parseFloat(record.lyrGpPercent);

          // Check if contact exists by email
          const existing = await contactsAPI.getByEmail(cleanContact.email);
          
          if (existing) {
            await contactsAPI.update(existing.id, cleanContact);
          } else {
            await contactsAPI.create(cleanContact);
          }

          successCount++;
        } catch (error: any) {
          errors.push(error.message);
        }
      }
    } else if (job.data_type === 'inventory') {
      // Validate and clean inventory data before bulk upsert
      const cleanedInventory = [];
      
      for (const record of data) {
        try {
          // Validate required fields
          if (!record.name || !record.sku) {
            errors.push(`Skipping record - Missing required fields (name: ${record.name}, sku: ${record.sku})`);
            continue;
          }

          // Clean the inventory data
          const cleanItem: any = {
            name: record.name,
            sku: record.sku,
            description: record.description || '',
            quantity: parseInt(record.quantity) || 0,
            quantity_on_order: parseInt(record.quantity_on_order) || 0,
            unit_price: parseFloat(record.unit_price) || 0,
            cost: parseFloat(record.cost) || 0,
            // Note: location, supplier, notes removed - not in simplified schema
          };

          cleanedInventory.push(cleanItem);
        } catch (error: any) {
          errors.push(`Error cleaning inventory record: ${error.message}`);
        }
      }

      // Use bulk upsert with cleaned data
      if (cleanedInventory.length > 0) {
        try {
          const result = await inventoryAPI.bulkUpsertBySKU(cleanedInventory);
          successCount = result.created + result.updated;
        } catch (error: any) {
          throw new Error(`Inventory import failed: ${error.message}`);
        }
      } else {
        throw new Error('No valid inventory records to import');
      }
    } else if (job.data_type === 'bids') {
      for (const record of data) {
        try {
          if (!record.clientName || !record.projectName) {
            throw new Error('Missing required fields (clientName, projectName)');
          }

          const cleanBid: any = {
            clientName: record.clientName,
            projectName: record.projectName,
            description: record.description || '',
            subtotal: parseFloat(record.subtotal) || 0,
            tax: parseFloat(record.tax) || 0,
            total: parseFloat(record.total) || 0,
            status: record.status || 'Draft',
            validUntil: record.validUntil || '',
            notes: record.notes || '',
            terms: record.terms || '',
          };

          await bidsAPI.create(cleanBid);
          successCount++;
        } catch (error: any) {
          errors.push(error.message);
        }
      }
    }

    if (errors.length > 0) {
      console.warn('Import completed with errors:', errors);
    }

    return successCount;
  };

  const loadJobs = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('scheduled_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      setJobs(data || []);
    } catch (error: any) {
      console.error('Failed to load scheduled jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      setIsProcessing(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('scheduled_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('organization_id', user.organizationId);

      if (error) throw error;

      toast.success('Job cancelled successfully');
      loadJobs();
    } catch (error: any) {
      toast.error('Failed to cancel job: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      setIsProcessing(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('scheduled_jobs')
        .delete()
        .eq('id', jobId)
        .eq('organization_id', user.organizationId);

      if (error) throw error;

      toast.success('Job deleted successfully');
      loadJobs();
    } catch (error: any) {
      toast.error('Failed to delete job: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ScheduledJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getJobTypeIcon = (jobType: 'import' | 'export') => {
    return jobType === 'import' ? '📥' : '📤';
  };

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const completedJobs = jobs.filter(j => ['completed', 'failed', 'cancelled'].includes(j.status));

  return (
    <PermissionGate user={user} module="import-export" action="view">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('import-export')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Import & Export
            </Button>
          )}
          <div>
            <h2 className="text-2xl text-gray-900">Scheduled Jobs</h2>
            <p className="text-sm text-gray-600">View and manage scheduled import/export jobs</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadJobs} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Auto-Processing Active:</strong> Jobs are automatically checked every minute and will execute when their scheduled time arrives. Keep this page open for jobs to process, or upgrade to background processing with a Supabase Edge Function.
        </AlertDescription>
      </Alert>

      {/* Pending Jobs */}
      {pendingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Pending Jobs ({pendingJobs.length})
            </CardTitle>
            <CardDescription>
              These jobs are scheduled to run automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getJobTypeIcon(job.job_type)}</span>
                    <span className="font-medium capitalize">
                      {job.job_type} {job.data_type}
                    </span>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Scheduled: {formatDateTime(job.scheduled_time)}
                    </span>
                    {job.file_name && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {job.file_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Created by {job.creator_name || 'Unknown'} on {formatDateTime(job.created_at)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelJob(job.id)}
                  disabled={isProcessing}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Job History
          </CardTitle>
          <CardDescription>
            Recent completed, failed, and cancelled jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completedJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No job history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedJobs.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getJobTypeIcon(job.job_type)}</span>
                      <span className="font-medium capitalize">
                        {job.job_type} {job.data_type}
                      </span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        {job.status === 'completed' ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                        {job.completed_at ? formatDateTime(job.completed_at) : 'Not completed'}
                      </span>
                      {job.record_count && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {job.record_count} records
                        </span>
                      )}
                    </div>
                    {job.error_message && (
                      <p className="text-xs text-red-600">
                        Error: {job.error_message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Scheduled for {formatDateTime(job.scheduled_time)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJob(job.id)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGate>
  );
}