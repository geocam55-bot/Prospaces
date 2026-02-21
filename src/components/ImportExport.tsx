import { useState } from 'react';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { contactsAPI, inventoryAPI, bidsAPI } from '../utils/api';
import { clearOwnerProfileCache } from '../utils/contacts-client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Users, 
  Package, 
  FileText, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Clock, 
  History,
  Calendar as CalendarIcon
} from 'lucide-react';

import { getPriceTierLabel } from '../lib/global-settings';

interface ImportExportProps {
  user: User;
  onNavigate?: (view: string) => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  updated?: number;
  created?: number;
}

interface ColumnMapping {
  [fileColumn: string]: string; // Maps file column to database field
}

interface MappingState {
  type: 'contacts' | 'inventory' | 'bids' | null;
  data: any[];
  fileColumns: string[];
  mapping: ColumnMapping;
}

// Database field definitions
const DATABASE_FIELDS = {
  contacts: [
    { value: 'name', label: 'Name (Full Name)', required: true },
    { value: 'email', label: 'Email', required: false },
    { value: 'phone', label: 'Phone', required: false },
    { value: 'company', label: 'Company', required: false },
    { value: 'status', label: 'Status', required: false },
    { value: 'priceLevel', label: 'Price Level', required: false },
    { value: 'address', label: 'Address', required: false },
    { value: 'notes', label: 'Notes', required: false },
    { value: 'legacyNumber', label: 'Legacy #', required: false },
    { value: 'accountOwnerNumber', label: 'Account Owner #', required: false },
    { value: 'ptdSales', label: 'PTD Sales', required: false },
    { value: 'ptdGpPercent', label: 'PTD GP%', required: false },
    { value: 'ytdSales', label: 'YTD Sales', required: false },
    { value: 'ytdGpPercent', label: 'YTD GP%', required: false },
    { value: 'lyrSales', label: 'LYR Sales', required: false },
    { value: 'lyrGpPercent', label: 'LYR GP%', required: false },
  ],
  inventory: [
    { value: 'name', label: 'Item Name', required: true },
    { value: 'sku', label: 'SKU', required: true },
    { value: 'description', label: 'Description', required: false },
    { value: 'category', label: 'Category', required: false },
    { value: 'quantity', label: 'Quantity On Hand', required: false },
    { value: 'quantity_on_order', label: 'Quantity On Order', required: false },
    { value: 'unit_price', label: 'Unit Price', required: false },
    { value: 'cost', label: 'Cost', required: false },
    { value: 'price_tier_1', label: `T1 — ${getPriceTierLabel(1)}`, required: false },
    { value: 'price_tier_2', label: `T2 — ${getPriceTierLabel(2)}`, required: false },
    { value: 'price_tier_3', label: `T3 — ${getPriceTierLabel(3)}`, required: false },
    { value: 'price_tier_4', label: `T4 — ${getPriceTierLabel(4)}`, required: false },
    { value: 'price_tier_5', label: `T5 — ${getPriceTierLabel(5)}`, required: false },
    { value: 'department_code', label: 'Department Code', required: false },
    { value: 'unit_of_measure', label: 'Unit of Measure', required: false },
  ],
  bids: [
    { value: 'clientName', label: 'Client Name', required: true },
    { value: 'projectName', label: 'Project Name', required: true },
    { value: 'description', label: 'Description', required: false },
    { value: 'subtotal', label: 'Subtotal', required: false },
    { value: 'tax', label: 'Tax', required: false },
    { value: 'total', label: 'Total', required: false },
    { value: 'status', label: 'Status', required: false },
    { value: 'validUntil', label: 'Valid Until', required: false },
    { value: 'notes', label: 'Notes', required: false },
    { value: 'terms', label: 'Terms', required: false },
  ],
};

export function ImportExport({ user, onNavigate }: ImportExportProps) {
  console.log('ImportExport component mounted for user:', user);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mappingState, setMappingState] = useState<MappingState | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  
  // Scheduling state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleJobType, setScheduleJobType] = useState<'import' | 'export'>('import');
  const [scheduleDataType, setScheduleDataType] = useState<'contacts' | 'inventory' | 'bids'>('contacts');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduleFileName, setScheduleFileName] = useState('');
  const [scheduleFileData, setScheduleFileData] = useState<any[] | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Create scheduled job
  const createScheduledJob = async () => {
    if (!scheduleDateTime) {
      toast.error('Please select a date and time');
      return;
    }

    const scheduledTime = new Date(scheduleDateTime);
    const now = new Date();
    
    if (scheduledTime <= now) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    try {
      setIsScheduling(true);
      const supabase = createClient();

      // Get the authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('You must be logged in to schedule jobs');
      }

      const jobData = {
        organization_id: user.organizationId,
        created_by: authUser.id, // Use authenticated user ID
        job_type: scheduleJobType,
        data_type: scheduleDataType,
        scheduled_time: scheduledTime.toISOString(),
        status: 'pending' as const,
        creator_name: user.full_name || user.email || 'User',
        file_name: scheduleFileName || `${scheduleJobType}_${scheduleDataType}_${scheduledTime.toISOString().split('T')[0]}.csv`,
        file_data: scheduleFileData ? { records: scheduleFileData } : null,
      };

      const { error } = await supabase
        .from('scheduled_jobs')
        .insert(jobData);

      if (error) throw error;

      toast.success(`${scheduleJobType === 'import' ? 'Import' : 'Export'} scheduled for ${scheduledTime.toLocaleString()}`);
      
      // Reset scheduling dialog
      setShowScheduleDialog(false);
      setScheduleDateTime('');
      setScheduleFileName('');
      setScheduleFileData(null);
    } catch (error: any) {
      console.error('Failed to schedule job:', error);
      toast.error('Failed to schedule job: ' + error.message);
    } finally {
      setIsScheduling(false);
    }
  };

  // Open schedule dialog for export
  const openScheduleExportDialog = (dataType: 'contacts' | 'inventory' | 'bids') => {
    setScheduleJobType('export');
    setScheduleDataType(dataType);
    setScheduleFileName(`${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`);
    setScheduleFileData(null);
    setShowScheduleDialog(true);
  };

  // Open schedule dialog for import (with file data)
  const openScheduleImportDialog = (dataType: 'contacts' | 'inventory' | 'bids', fileName: string, fileData: any[]) => {
    setScheduleJobType('import');
    setScheduleDataType(dataType);
    setScheduleFileName(fileName);
    setScheduleFileData(fileData);
    setShowScheduleDialog(true);
  };

  // Create background import job (runs immediately in background)
  const createBackgroundImportJob = async () => {
    if (!mappingState) return;

    const { type, data, mapping } = mappingState;

    try {
      // Map the data using the column mapping
      const mappedDataRaw = data.map(row => {
        const mappedRow: any = {};
        Object.entries(mapping).forEach(([fileCol, dbField]) => {
          if (dbField && row[fileCol] !== undefined) {
            mappedRow[dbField] = row[fileCol];
          }
        });
        return mappedRow;
      });

      // Filter out rows where all mapped values are empty (trailing blank rows, etc.)
      const mappedData = mappedDataRaw.filter(row => {
        const hasData = Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== '');
        return hasData;
      });

      if (mappedDataRaw.length !== mappedData.length) {
        console.log(`Filtered out ${mappedDataRaw.length - mappedData.length} empty rows after mapping`);
      }

      const supabase = createClient();

      // Verify the user is authenticated
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError);
        throw new Error('You must be logged in to create background imports');
      }

      console.log('Authenticated user:', authUser.id);
      console.log('App user org:', user.organizationId);
      console.log('Total records to import:', mappedData.length);

      // Chunk large datasets to stay under DB/edge-function payload limits
      const CHUNK_SIZE = 2000;
      const chunks: any[][] = [];
      for (let i = 0; i < mappedData.length; i += CHUNK_SIZE) {
        chunks.push(mappedData.slice(i, i + CHUNK_SIZE));
      }

      console.log(`Splitting ${mappedData.length} records into ${chunks.length} job(s) of up to ${CHUNK_SIZE} each`);

      // Get session once before the loop
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token found');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/background-jobs/create`;
      let totalCreated = 0;

      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const chunkLabel = chunks.length > 1 ? ` (part ${idx + 1}/${chunks.length})` : '';
        const fileName = `background_import_${type}_${new Date().toISOString().split('T')[0]}${chunks.length > 1 ? `_part${idx + 1}` : ''}.csv`;

        const jobRow = {
          organization_id: user.organizationId,
          created_by: authUser.id,
          job_type: 'import',
          data_type: type,
          scheduled_time: new Date().toISOString(),
          status: 'pending',
          creator_name: user.full_name || user.email || 'User',
          file_name: fileName,
          file_data: { records: chunk, mapping: mapping },
          // Note: created_at is NOT sent — the DB defaults it to NOW()
          // and the server ensures scheduled_time > created_at
        };

        console.log(`Creating job${chunkLabel}: ${chunk.length} records`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(jobRow),
        });

        if (!response.ok) {
          const errBody = await response.text();
          let errMsg = `Server error ${response.status}`;
          try { errMsg = JSON.parse(errBody).error || errMsg; } catch {}
          throw new Error(`Failed to create job${chunkLabel}: ${errMsg}`);
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
        console.log(`Job created via edge function${chunkLabel}:`, result.job?.id);

        totalCreated += chunk.length;

        // Show progress for multi-chunk imports
        if (chunks.length > 1) {
          toast.info(`Created job ${idx + 1} of ${chunks.length} (${totalCreated}/${mappedData.length} records)`);
        }
      }

      toast.success(
        `Background import started for ${mappedData.length} records!`,
        {
          description: chunks.length > 1
            ? `Split into ${chunks.length} jobs. Go to Background Imports to monitor progress.`
            : 'You can close this page. We\'ll notify you when it\'s complete.',
          duration: 10000,
          action: {
            label: 'View Status',
            onClick: () => onNavigate?.('background-imports')
          }
        }
      );
      
      // Clear mapping state
      clearMapping();
    } catch (error: any) {
      console.error('Failed to create background import job:', error);
      toast.error('Failed to start background import: ' + error.message);
    }
  };

  // Get minimum datetime (current time + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // Parse file (CSV or Excel)
  const parseFile = async (file: File): Promise<any[]> => {
    const fileName = file.name.toLowerCase();
    
    // Check if it's an Excel file
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return parseExcel(file);
    } else if (fileName.endsWith('.csv')) {
      const text = await file.text();
      return parseCSV(text);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel files.');
    }
  };

  // Parse Excel data
  const parseExcel = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON (first row is header)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (error: any) {
          reject(new Error('Failed to parse Excel file: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsBinaryString(file);
    });
  };

  // Parse a single CSV line respecting quoted fields (handles commas inside quotes)
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    values.push(current.trim());
    return values;
  };

  // Parse CSV data (first row is header)
  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^['"]|['"]$/g, '').trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      // Be forgiving with column count — pad short rows with empty strings, ignore extra columns
      if (values.length < headers.length) {
        console.warn(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}. Padding with empty values.`);
        while (values.length < headers.length) {
          values.push('');
        }
      }

      // Skip rows where every value is blank (trailing empty lines, rows of commas, etc.)
      if (values.every(v => !v || v.trim() === '')) {
        console.log(`Row ${i + 1}: Skipping empty row`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
      });
      data.push(row);
    }

    return data;
  };

  // Auto-detect column mapping based on column names
  const autoMapColumns = (fileColumns: string[], type: 'contacts' | 'inventory' | 'bids'): ColumnMapping => {
    const mapping: ColumnMapping = {}; 
    const dbFields = DATABASE_FIELDS[type];

    // Define common synonyms for fields
    const fieldSynonyms: { [key: string]: string[] } = {
      // Contact field synonyms
      'name': ['item name', 'product name', 'item description', 'product description', 'customer name', 'contact name', 'full name', 'client name', 'account name', 'customer', 'contact'],
      'email': ['email address', 'e-mail', 'e-mail address', 'contact email', 'customer email'],
      'phone': ['phone number', 'telephone', 'tel', 'mobile', 'cell', 'cell phone', 'contact phone', 'customer phone', 'phone #'],
      'company': ['company name', 'business', 'business name', 'organization', 'firm', 'employer'],
      'status': ['contact status', 'customer status', 'account status', 'customer type'],
      'priceLevel': ['price level', 'pricing level', 'pricing tier', 'customer tier', 'discount level', 'price group', 'pricing group'],
      'address': ['street address', 'mailing address', 'billing address', 'street', 'addr', 'location', 'full address'],
      'legacyNumber': ['legacy #', 'legacy number', 'legacy no', 'customer #', 'customer number', 'cust #', 'cust no', 'account #', 'account number', 'acct #', 'acct no', 'old id', 'old #', 'customer id', 'cust id'],
      'accountOwnerNumber': ['account owner #', 'account owner', 'owner #', 'owner number', 'sales rep', 'sales rep #', 'rep #', 'assigned to', 'salesperson', 'salesperson #'],
      'ptdSales': ['ptd sales', 'period to date sales', 'ptd $', 'current period sales'],
      'ptdGpPercent': ['ptd gp%', 'ptd gp', 'ptd gross profit', 'ptd margin', 'ptd gp percent'],
      'ytdSales': ['ytd sales', 'year to date sales', 'ytd $', 'annual sales'],
      'ytdGpPercent': ['ytd gp%', 'ytd gp', 'ytd gross profit', 'ytd margin', 'ytd gp percent'],
      'lyrSales': ['lyr sales', 'last year sales', 'ly sales', 'prior year sales', 'previous year sales'],
      'lyrGpPercent': ['lyr gp%', 'lyr gp', 'last year gp', 'ly gp%', 'prior year gp'],
      // Inventory field synonyms
      'sku': ['item number', 'item#', 'item code', 'product code', 'product number', 'part number', 'part#'],
      'description': ['description', 'item description', 'product description'],
      'quantity': ['qty', 'stock', 'quantity on hand', 'on hand', 'available', 'qty on hand'],
      'quantity_on_order': ['qty on order', 'on order', 'quantity on order', 'ordered', 'qty ordered'],
      'unit_price': ['price', 'selling price', 'unit price', 'sale price', 'base price'],
      'category': ['dept', 'department', 'class', 'product category'],
      'supplier': ['vendor', 'manufacturer'],
      'price_tier_1': ['retail price', 'price 1', 'price tier 1', 'tier 1', 't1', 'retail', 'price level 1', 'level 1', getPriceTierLabel(1).toLowerCase(), `${getPriceTierLabel(1).toLowerCase()} price`],
      'price_tier_2': ['vip price', 'price 2', 'price tier 2', 'tier 2', 't2', 'vip', 'price level 2', 'level 2', 'wholesale price', 'wholesale', getPriceTierLabel(2).toLowerCase(), `${getPriceTierLabel(2).toLowerCase()} price`],
      'price_tier_3': ['vip b price', 'vipb price', 'price 3', 'price tier 3', 'tier 3', 't3', 'vip b', 'vipb', 'price level 3', 'level 3', 'contractor price', 'contractor', getPriceTierLabel(3).toLowerCase(), `${getPriceTierLabel(3).toLowerCase()} price`],
      'price_tier_4': ['vip a price', 'vipa price', 'price 4', 'price tier 4', 'tier 4', 't4', 'vip a', 'vipa', 'price level 4', 'level 4', 'premium price', 'premium', getPriceTierLabel(4).toLowerCase(), `${getPriceTierLabel(4).toLowerCase()} price`],
      'price_tier_5': ['price 5', 'price tier 5', 'tier 5', 't5', 'price level 5', 'level 5', getPriceTierLabel(5).toLowerCase(), `${getPriceTierLabel(5).toLowerCase()} price`],
      'department_code': ['dept code', 'department', 'dept', 'department code'],
      'unit_of_measure': ['uom', 'unit', 'measure', 'unit of measure', 'units'],
    };

    fileColumns.forEach(fileCol => {
      const normalized = fileCol.toLowerCase().trim().replace(/[_\s-]/g, '');
      
      // Try to find a matching database field
      const match = dbFields.find(dbField => {
        const dbNormalized = dbField.value.toLowerCase().replace(/[_\s-]/g, '');
        const labelNormalized = dbField.label.toLowerCase().replace(/[_\s-]/g, '');
        const fileColLower = fileCol.toLowerCase().trim();
        const dbFieldLower = dbField.value.toLowerCase();
        const labelLower = dbField.label.toLowerCase();
        
        // Try exact match first (case-insensitive)
        if (fileColLower === dbFieldLower || fileColLower === labelLower) {
          return true;
        }
        
        // Try normalized match
        if (normalized === dbNormalized || normalized === labelNormalized) {
          return true;
        }
        
        // Try synonym match
        const synonyms = fieldSynonyms[dbField.value] || [];
        if (synonyms.some(syn => fileColLower === syn || normalized === syn.replace(/[_\s-]/g, ''))) {
          return true;
        }
        
        // Try partial match
        return normalized.includes(dbNormalized) || dbNormalized.includes(normalized);
      });

      if (match) {
        mapping[fileCol] = match.value;
        console.log(`Auto-mapped "${fileCol}" -> "${match.value}" (${match.label})`);
      } else {
        console.log(`No match found for column "${fileCol}"`);
      }
    });

    console.log('Final mapping:', mapping);
    return mapping;
  };

  // Handle file selection and show mapping UI
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'contacts' | 'inventory' | 'bids'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportResult(null);

    try {
      const data = await parseFile(file);
      
      if (data.length === 0) {
        toast.error('No data found in file');
        return;
      }

      // Extract column names from first row (already done by parseFile)
      const fileColumns = Object.keys(data[0]);
      
      // Auto-detect mapping
      const autoMapping = autoMapColumns(fileColumns, type);

      setMappingState({
        type,
        data,
        fileColumns,
        mapping: autoMapping,
      });

      toast.success(`File loaded with ${data.length} rows. Please review column mapping.`);
    } catch (error: any) {
      toast.error('Failed to load file: ' + error.message);
    } finally {
      event.target.value = '';
    }
  };

  // Update column mapping
  const updateMapping = (fileColumn: string, dbField: string) => {
    if (!mappingState) return;

    const newMapping = { ...mappingState.mapping };
    
    // If dbField is empty, remove from mapping; otherwise set it
    if (!dbField) {
      delete newMapping[fileColumn];
    } else {
      newMapping[fileColumn] = dbField;
    }

    setMappingState({
      ...mappingState,
      mapping: newMapping,
    });
  };

  // Clear mapping
  const clearMapping = () => {
    setMappingState(null);
    setImportResult(null);
  };

  // Execute import with mapped columns
  const executeImport = async () => {
    if (!mappingState) return;

    console.log('Starting import...', mappingState);

    const { type, data, mapping } = mappingState;
    setIsImporting(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: data.length });

    try {
      console.log(`Importing ${data.length} ${type} records...`);
      let success = 0;
      let failed = 0;
      const errors: string[] = [];
      let updated = 0;
      let created = 0;

      // Check if required fields are mapped
      const dbFields = DATABASE_FIELDS[type!];
      const requiredFields = dbFields.filter(f => f.required);
      const mappedDbFields = Object.values(mapping);

      console.log('Required fields:', requiredFields.map(f => f.value));
      console.log('Mapped fields:', mappedDbFields);

      for (const reqField of requiredFields) {
        if (!mappedDbFields.includes(reqField.value)) {
          console.error('Missing required field:', reqField.label);
          toast.error(`Required field "${reqField.label}" is not mapped`);
          setIsImporting(false);
          return;
        }
      }

      // Map all rows to database fields
      const mappedDataRaw = data.map(row => {
        const mappedRow: any = {};
        Object.entries(mapping).forEach(([fileCol, dbField]) => {
          if (dbField && row[fileCol] !== undefined) {
            mappedRow[dbField] = row[fileCol];
          }
        });
        return mappedRow;
      });

      // Filter out rows where all mapped values are empty (trailing blank rows, etc.)
      const mappedData = mappedDataRaw.filter(row => {
        const hasData = Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== '');
        return hasData;
      });

      if (mappedDataRaw.length !== mappedData.length) {
        console.log(`Filtered out ${mappedDataRaw.length - mappedData.length} empty rows after mapping`);
      }

      // Use bulk processing for inventory
      if (type === 'inventory') {
        const BATCH_SIZE = 50;
        const totalBatches = Math.ceil(mappedData.length / BATCH_SIZE);
        
        console.log(`Processing ${mappedData.length} items in ${totalBatches} batches of ${BATCH_SIZE}`);

        for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
          const batch = mappedData.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          
          console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} items)`);
          
          try {
            const result = await inventoryAPI.bulkUpsertBySKU(batch);
            created += result.created;
            updated += result.updated;
            failed += result.failed;
            
            if (result.errors && result.errors.length > 0) {
              result.errors.forEach(err => errors.push(err));
            }
            
            success += result.created + result.updated;
            
            // Update progress
            setImportProgress({ current: Math.min(i + BATCH_SIZE, mappedData.length), total: mappedData.length });
            
            // Small delay between batches to avoid overwhelming the server
            if (i + BATCH_SIZE < mappedData.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error: any) {
            console.error(`Batch ${batchNum} failed:`, error);
            errors.push(`Batch ${batchNum}: ${error.message}`);
            failed += batch.length;
          }
        }
      } else if (type === 'contacts') {
        // Pre-fetch auth data ONCE for the entire import (avoid 364 separate auth calls)
        const supabaseForAuth = createClient();
        const { data: { user: authUser } } = await supabaseForAuth.auth.getUser();
        if (!authUser) {
          throw new Error('User not authenticated. Please sign in again.');
        }
        
        // Import ensureUserProfile to get the profile once
        const { ensureUserProfile } = await import('../utils/ensure-profile');
        const authProfile = await ensureUserProfile(authUser.id);
        const preloadedAuth = { userId: authUser.id, profile: authProfile };
        
        console.log(`Pre-loaded auth for import: user=${authUser.id}, org=${authProfile.organization_id}`);

        // Log unique account owners found in CSV for debugging ownership resolution
        const uniqueOwners = new Set(
          mappedData
            .map((c: any) => c.accountOwnerNumber ? String(c.accountOwnerNumber).trim().toLowerCase() : '')
            .filter((v: string) => v !== '')
        );
        if (uniqueOwners.size > 0) {
          console.log(`📋 Import will resolve ${uniqueOwners.size} unique account owner(s):`, [...uniqueOwners]);
        } else {
          console.log('📋 No accountOwnerNumber mapped — all contacts will be owned by the importing user');
        }

        // Use batch processing for contacts
        const BATCH_SIZE = 25; // Slightly smaller batches for contacts
        const totalBatches = Math.ceil(mappedData.length / BATCH_SIZE);
        
        console.log(`Processing ${mappedData.length} contacts in ${totalBatches} batches of ${BATCH_SIZE}`);

        for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
          const batch = mappedData.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          
          console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} contacts)`);
          
          // Process contacts in parallel within the batch, passing pre-loaded auth
          const batchPromises = batch.map(async (contact, idx) => {
            try {
              const rowNum = i + idx + 2;
              const result = await importContact(contact, rowNum, errors, preloadedAuth);
              return { success: true, result };
            } catch (error: any) {
              const rowNum = i + idx + 2;
              const errMsg = error.message || 'Unknown error';
              const errDetail = error.details || error.code || '';
              errors.push(`Row ${rowNum} (${contact.name || 'unnamed'}): ${errMsg}${errDetail ? ` [${errDetail}]` : ''}`);
              console.error(`Row ${rowNum} failed:`, error);
              return { success: false, error };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          // Tally results
          batchResults.forEach(result => {
            if (result.success) {
              if (result.result?.action === 'skipped') {
                // Empty row — don't count as success or failure
              } else if (result.result?.action === 'updated') {
                updated++;
                success++;
              } else {
                created++;
                success++;
              }
            } else {
              failed++;
            }
          });
          
          // Update progress
          setImportProgress({ current: Math.min(i + BATCH_SIZE, mappedData.length), total: mappedData.length });
          
          // Small delay between batches
          if (i + BATCH_SIZE < mappedData.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } else {
        // Use sequential processing for bids
        for (let i = 0; i < mappedData.length; i++) {
          const mappedRow = mappedData[i];
          try {
            if (type === 'bids') {
              await importBid(mappedRow, i + 2, errors);
              created++;
              success++;
            }
            
            // Update progress
            setImportProgress({ current: i + 1, total: mappedData.length });
          } catch (error: any) {
            errors.push(`Row ${i + 2}: ${error.message}`);
            failed++;
          }
        }
      }

      setImportResult({ success, failed, errors: errors.slice(0, 25), updated, created });
      
      if (failed > 0 && success === 0) {
        toast.error(`Import failed: all ${failed} records failed. Check error details below.`);
      } else if (failed > 0) {
        toast.warning(`Import complete: ${success} successful (${created} created, ${updated} updated), ${failed} failed`);
      } else {
        toast.success(`Import complete: ${success} successful (${created} created, ${updated} updated)`)
      }
      
      if (failed === 0) {
        setMappingState(null);
      }
    } catch (error: any) {
      toast.error('Failed to import data: ' + error.message);
      setImportResult({ success: 0, failed: 0, errors: [error.message] });
      // Clear the owner profile cache after import completes
      clearOwnerProfileCache();
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // Import individual contact
  const importContact = async (contact: any, rowNum: number, errors: string[], preloadedAuth?: { userId: string; profile: any }) => {
    // Only name is strictly required — email is optional for customer imports
    const contactName = contact.name ? String(contact.name).trim() : '';
    if (!contactName) {
      // Check if the row is effectively empty (no meaningful data at all)
      const hasAnyData = Object.values(contact).some(
        (v: any) => v !== undefined && v !== null && String(v).trim() !== ''
      );
      if (!hasAnyData) {
        // Silently skip completely empty rows — not an error
        console.log(`Row ${rowNum}: Skipping empty row`);
        return { action: 'skipped' as const };
      }
      throw new Error('Missing required field: Name');
    }

    // Clean the contact data - remove fields that don't exist in database
    const cleanContact: any = {
      name: contactName,
      phone: contact.phone ? String(contact.phone).trim() : '',
      company: contact.company ? String(contact.company).trim() : '',
      status: contact.status ? String(contact.status).trim() : 'Prospect',
      priceLevel: contact.priceLevel ? String(contact.priceLevel).trim() : getPriceTierLabel(1),
    };

    // Add email only if provided — the upsert function handles missing emails
    const emailVal = contact.email ? String(contact.email).trim() : '';
    if (emailVal) {
      cleanContact.email = emailVal;
    }
    // If no email, we leave it unset; upsertContactByLegacyNumberClient
    // will generate a placeholder at insert time if the DB requires it

    // Add optional fields only if they have values
    if (contact.address) cleanContact.address = String(contact.address).trim();
    if (contact.notes) cleanContact.notes = String(contact.notes).trim();
    if (contact.legacyNumber) cleanContact.legacyNumber = String(contact.legacyNumber).trim();
    if (contact.accountOwnerNumber) cleanContact.accountOwnerNumber = String(contact.accountOwnerNumber).trim();
    
    // Add numeric fields only if they have values
    if (contact.ptdSales) cleanContact.ptdSales = parseFloat(contact.ptdSales);
    if (contact.ptdGpPercent) cleanContact.ptdGpPercent = parseFloat(contact.ptdGpPercent);
    if (contact.ytdSales) cleanContact.ytdSales = parseFloat(contact.ytdSales);
    if (contact.ytdGpPercent) cleanContact.ytdGpPercent = parseFloat(contact.ytdGpPercent);
    if (contact.lyrSales) cleanContact.lyrSales = parseFloat(contact.lyrSales);
    if (contact.lyrGpPercent) cleanContact.lyrGpPercent = parseFloat(contact.lyrGpPercent);

    // Use upsert logic: check by Legacy # or email, update if exists, otherwise create new
    const result = await contactsAPI.upsertByLegacyNumber(cleanContact, preloadedAuth);
    
    // Log whether we created or updated
    if (result.action === 'updated') {
      console.log(`Row ${rowNum}: Updated existing contact: ${cleanContact.name}`);
    } else {
      console.log(`Row ${rowNum}: Created new contact: ${cleanContact.name}`);
    }

    return result;
  };

  // Import individual inventory item
  const importInventoryItem = async (item: any, rowNum: number, errors: string[]) => {
    if (!item.name || !item.sku) {
      throw new Error('Missing required fields (name, sku)');
    }

    // Only include valid database fields - remove any extra fields
    const cleanItem: any = {
      name: item.name,
      sku: item.sku,
    };

    // Add optional fields only if they exist - ONLY valid database columns
    if (item.description) cleanItem.description = item.description;
    if (item.category) cleanItem.category = item.category;
    else cleanItem.category = 'General';
    
    // Convert numeric fields — use != null to avoid skipping legitimate 0 values
    if (item.quantity != null && item.quantity !== '') cleanItem.quantity = parseInt(item.quantity) || 0;
    if (item.quantity_on_order != null && item.quantity_on_order !== '') cleanItem.quantity_on_order = parseInt(item.quantity_on_order) || 0;
    if (item.unit_price != null && item.unit_price !== '') cleanItem.unit_price = parseFloat(item.unit_price) || 0;
    if (item.cost != null && item.cost !== '') cleanItem.cost = parseFloat(item.cost) || 0;
    
    // Price tiers (stored in dollars here; inventory-client.ts converts to cents)
    // Use != null so that a CSV value of "0" or 0 is still imported (not skipped)
    if (item.price_tier_1 != null && item.price_tier_1 !== '') cleanItem.price_tier_1 = parseFloat(item.price_tier_1) || 0;
    if (item.price_tier_2 != null && item.price_tier_2 !== '') cleanItem.price_tier_2 = parseFloat(item.price_tier_2) || 0;
    if (item.price_tier_3 != null && item.price_tier_3 !== '') cleanItem.price_tier_3 = parseFloat(item.price_tier_3) || 0;
    if (item.price_tier_4 != null && item.price_tier_4 !== '') cleanItem.price_tier_4 = parseFloat(item.price_tier_4) || 0;
    if (item.price_tier_5 != null && item.price_tier_5 !== '') cleanItem.price_tier_5 = parseFloat(item.price_tier_5) || 0;
    
    // Use price_tier_1 as a fallback for unit_price if not already set
    if (cleanItem.unit_price == null && cleanItem.price_tier_1 != null) {
      cleanItem.unit_price = cleanItem.price_tier_1;
    }
    
    // Department code and unit of measure — use != null to preserve empty-string values
    if (item.department_code != null && item.department_code !== '') cleanItem.department_code = item.department_code;
    if (item.unit_of_measure != null && item.unit_of_measure !== '') cleanItem.unit_of_measure = item.unit_of_measure;

    // Use upsert logic: check by SKU and update if exists, otherwise create new
    const result = await inventoryAPI.upsertBySKU(cleanItem);
    
    // Log whether we created or updated
    if (result.action === 'updated') {
      const duplicateInfo = result.updatedCount && result.updatedCount > 1 
        ? ` (${result.updatedCount} duplicate records updated)` 
        : '';
      console.log(`Row ${rowNum}: Updated existing inventory item (SKU: ${cleanItem.sku})${duplicateInfo}`);
    } else {
      console.log(`Row ${rowNum}: Created new inventory item`);
    }

    return result;
  };

  // Import individual bid
  const importBid = async (bid: any, rowNum: number, errors: string[]) => {
    if (!bid.clientName || !bid.projectName) {
      throw new Error('Missing required fields (clientName, projectName)');
    }

    // Convert numeric fields — map 'tax' → 'tax_amount' (actual bids table column)
    bid.subtotal = bid.subtotal ? parseFloat(bid.subtotal) : 0;
    bid.tax_amount = bid.tax ? parseFloat(bid.tax) : 0;
    bid.total = bid.total ? parseFloat(bid.total) : 0;

    // Remove the raw 'tax' field so it doesn't leak through to the database
    delete bid.tax;

    // Set defaults
    bid.status = bid.status || 'draft';
    bid.validUntil = bid.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    bid.terms = bid.terms || 'Payment due within 30 days';

    await bidsAPI.create(bid);
  };

  // Export Contacts
  const handleExportContacts = async () => {
    setIsExporting(true);
    try {
      const response = await contactsAPI.getAll();
      const contacts = response.contacts || [];

      const csvContent = [
        'name,email,phone,company,address,status,priceLevel,notes,legacyNumber,accountOwnerNumber,ptdSales,ptdGpPercent,ytdSales,ytdGpPercent,lyrSales,lyrGpPercent',
        ...contacts.map((c: any) => 
          `"${c.name}","${c.email}","${c.phone || ''}","${c.company || ''}","${c.address || ''}","${c.status || ''}","${c.priceLevel || ''}","${c.notes || ''}","${c.legacyNumber || ''}","${c.accountOwnerNumber || ''}","${c.ptdSales || ''}","${c.ptdGpPercent || ''}","${c.ytdSales || ''}","${c.ytdGpPercent || ''}","${c.lyrSales || ''}","${c.lyrGpPercent || ''}"`
        )
      ].join('\n');

      downloadCSV(csvContent, 'contacts_export.csv');
      toast.success('Contacts exported successfully');
    } catch (error: any) {
      toast.error('Failed to export contacts: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export Inventory
  const handleExportInventory = async () => {
    setIsExporting(true);
    try {
      const response = await inventoryAPI.getAll();
      const inventory = response.inventory || [];

      const csvContent = [
        'name,sku,description,category,quantity,quantity_on_order,unit_price,cost,price_tier_1,price_tier_2,price_tier_3,price_tier_4,price_tier_5,department_code,unit_of_measure',
        ...inventory.map((i: any) => 
          `"${(i.name || '').replace(/"/g, '""')}","${(i.sku || '').replace(/"/g, '""')}","${(i.description || '').replace(/"/g, '""')}","${i.category || ''}","${i.quantity || 0}","${i.quantity_on_order || 0}","${i.unit_price ?? i.unitPrice ?? 0}","${i.cost ?? 0}","${i.priceTier1 ?? i.price_tier_1 ?? ''}","${i.priceTier2 ?? i.price_tier_2 ?? ''}","${i.priceTier3 ?? i.price_tier_3 ?? ''}","${i.priceTier4 ?? i.price_tier_4 ?? ''}","${i.priceTier5 ?? i.price_tier_5 ?? ''}","${i.departmentCode ?? i.department_code ?? ''}","${i.unitOfMeasure ?? i.unit_of_measure ?? 'ea'}"`
        )
      ].join('\n');

      downloadCSV(csvContent, 'inventory_export.csv');
      toast.success('Inventory exported successfully');
    } catch (error: any) {
      toast.error('Failed to export inventory: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export Bids
  const handleExportBids = async () => {
    setIsExporting(true);
    try {
      const response = await bidsAPI.getAll();
      const bids = response.bids || [];

      const csvContent = [
        'clientName,projectName,description,subtotal,tax,total,status,validUntil,notes,terms',
        ...bids.map((b: any) => 
          `"${b.clientName}","${b.projectName}","${b.description || ''}","${b.subtotal}","${b.tax}","${b.total}","${b.status}","${b.validUntil}","${b.notes || ''}","${b.terms || ''}"`
        )
      ].join('\n');

      downloadCSV(csvContent, 'bids_export.csv');
      toast.success('Deals exported successfully');
    } catch (error: any) {
      toast.error('Failed to export bids: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Download CSV file
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download sample CSV templates
  const downloadTemplate = (type: 'contacts' | 'inventory' | 'bids') => {
    let lines: string[] = [];
    let filename = '';

    switch (type) {
      case 'contacts':
        lines = [
          'name,email,phone,company,address,status,priceLevel,notes,legacyNumber,accountOwnerNumber,ptdSales,ptdGpPercent,ytdSales,ytdGpPercent,lyrSales,lyrGpPercent',
          'John Doe,john@example.com,555-1234,Acme Corp,123 Main St New York NY 10001,Prospect,Retail,Sample contact notes,LEG-12345,AO-67890,1000,20,2000,30,3000,40',
        ];
        filename = 'contacts_template.csv';
        break;
      case 'inventory':
        lines = [
          'name,sku,description,category,quantity,quantity_on_order,unit_price,cost,price_tier_1,price_tier_2,price_tier_3,price_tier_4,price_tier_5,department_code,unit_of_measure',
          'Sample Item,SKU-001,Sample description,Electronics,100,50,99.99,50.00,99.99,89.99,79.99,69.99,59.99,DEPT-01,ea',
        ];
        filename = 'inventory_template.csv';
        break;
      case 'bids':
        lines = [
          'clientName,projectName,description,subtotal,tax,total,status,validUntil,notes,terms',
          'Acme Corp,Website Redesign,Complete website overhaul,10000,1000,11000,draft,2024-12-31,Sample bid,Payment due within 30 days',
        ];
        filename = 'bids_template.csv';
        break;
    }

    const csvContent = lines.join('\n');
    downloadCSV(csvContent, filename);
    toast.success('Template downloaded');
  };

  // Render column mapping UI
  const renderMappingUI = () => {
    if (!mappingState) return null;

    const { type, data, fileColumns, mapping } = mappingState;
    const dbFields = DATABASE_FIELDS[type!];
    const previewData = data.slice(0, 3);

    return (
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Map Columns to Database Fields</CardTitle>
              <CardDescription>
                {data.length} rows detected. Match your file columns to database fields.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearMapping}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Column Mapping */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fileColumns.map((fileCol) => {
                const mappedField = mapping[fileCol];
                const dbField = dbFields.find(f => f.value === mappedField);
                
                return (
                  <div key={fileCol} className="bg-white p-4 rounded-lg border space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="text-gray-600">File Column:</span>
                      <span className="font-medium">{fileCol}</span>
                    </Label>
                    
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Select
                        value={mappedField || '__skip__'}
                        onValueChange={(value) => updateMapping(fileCol, value === '__skip__' ? '' : value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select database field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">-- Skip this column --</SelectItem>
                          {dbFields.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview values */}
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Preview: </span>
                      {previewData.map((row, i) => row[fileCol]).filter(Boolean).slice(0, 2).join(', ')}
                      {previewData.length > 2 && '...'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Required Fields Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Required fields: </span>
              {dbFields
                .filter(f => f.required)
                .map(f => f.label)
                .join(', ')}
            </AlertDescription>
          </Alert>

          {/* Import Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={clearMapping}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (!mappingState) return;
                openScheduleImportDialog(
                  mappingState.type!,
                  `import_${mappingState.type}_${new Date().toISOString().split('T')[0]}.csv`,
                  mappingState.data
                );
              }}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Schedule for Later
            </Button>
            <Button
              variant="secondary"
              onClick={createBackgroundImportJob}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Run in Background
            </Button>
            <Button onClick={executeImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {mappingState.data.length} Records Now
                </>
              )}
            </Button>
          </div>

          {/* Import Progress */}
          {importProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Processing records...</span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PermissionGate user={user} module="import-export" action="view">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => onNavigate ? onNavigate('background-imports') : window.location.hash = '#background-imports'}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Background Imports
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate ? onNavigate('scheduled-jobs') : window.location.hash = '#scheduled-jobs'}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          View Scheduled Jobs
        </Button>
      </div>

      {importResult && (
        <Alert className={importResult.failed === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          {importResult.failed === 0 ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription>
            <p className={importResult.failed === 0 ? 'text-green-900' : 'text-yellow-900'}>
              Import completed: {importResult.success} successful, {importResult.failed} failed
            </p>
            {(importResult.created || importResult.updated) && (
              <p className="text-sm text-gray-700 mt-1">
                {importResult.created ? `Created ${importResult.created} new records` : ''}
                {importResult.created && importResult.updated ? ' • ' : ''}
                {importResult.updated ? `Updated ${importResult.updated} existing records` : ''}
              </p>
            )}
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside mt-1">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="text-red-700">{error}</li>
                  ))}
                  {importResult.errors.length >= 25 && (
                    <li className="text-gray-600">...and more errors (showing first 25)</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Column Mapping UI */}
      {mappingState && renderMappingUI()}

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          {!mappingState && (
            <>
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  Import data from CSV or Excel files (.csv, .xlsx, .xls). The first row must contain column headers. You'll be able to map your columns to database fields.
                </AlertDescription>
              </Alert>

              {/* Import Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Import Contacts (Customers)
                  </CardTitle>
                  <CardDescription>
                    Import customer contact information from CSV or Excel files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('contacts')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => handleFileSelect(e, 'contacts')}
                        disabled={isImporting}
                        className="hidden"
                        id="import-contacts"
                      />
                      <label htmlFor="import-contacts">
                        <Button
                          asChild
                          disabled={isImporting}
                          className="w-full sm:w-auto"
                        >
                          <span className="flex items-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Select File
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported formats: CSV, Excel (.xlsx, .xls). Required fields: Name (Full Name), Email
                  </p>
                </CardContent>
              </Card>

              {/* Import Inventory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Import Inventory
                  </CardTitle>
                  <CardDescription>
                    Import inventory items from CSV or Excel files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('inventory')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => handleFileSelect(e, 'inventory')}
                        disabled={isImporting}
                        className="hidden"
                        id="import-inventory"
                      />
                      <label htmlFor="import-inventory">
                        <Button
                          asChild
                          disabled={isImporting}
                          className="w-full sm:w-auto"
                        >
                          <span className="flex items-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Select File
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported formats: CSV, Excel (.xlsx, .xls). Required fields: Item Name, SKU
                  </p>
                </CardContent>
              </Card>

              {/* Import Deals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Import Deals (Sales & Quotes)
                  </CardTitle>
                  <CardDescription>
                    Import sales deals and quotes from CSV or Excel files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('bids')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => handleFileSelect(e, 'bids')}
                        disabled={isImporting}
                        className="hidden"
                        id="import-bids"
                      />
                      <label htmlFor="import-bids">
                        <Button
                          asChild
                          disabled={isImporting}
                          className="w-full sm:w-auto"
                        >
                          <span className="flex items-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Select File
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported formats: CSV, Excel (.xlsx, .xls). Required fields: Client Name, Project Name
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Export your data to CSV files for backup or migration to other systems.
            </AlertDescription>
          </Alert>

          {/* Export Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Export Contacts (Customers)
              </CardTitle>
              <CardDescription>
                Download all customer contacts as CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportContacts}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export Contacts'}
              </Button>
              <Button
                variant="outline"
                onClick={() => openScheduleExportDialog('contacts')}
                disabled={isExporting}
                className="flex items-center gap-2 ml-3"
              >
                <Clock className="h-4 w-4" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>

          {/* Export Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Export Inventory
              </CardTitle>
              <CardDescription>
                Download all inventory items as CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportInventory}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export Inventory'}
              </Button>
              <Button
                variant="outline"
                onClick={() => openScheduleExportDialog('inventory')}
                disabled={isExporting}
                className="flex items-center gap-2 ml-3"
              >
                <Clock className="h-4 w-4" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>

          {/* Export Deals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export Deals (Sales & Quotes)
              </CardTitle>
              <CardDescription>
                Download all sales deals and quotes as CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExportBids}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export Deals'}
              </Button>
              <Button
                variant="outline"
                onClick={() => openScheduleExportDialog('bids')}
                disabled={isExporting}
                className="flex items-center gap-2 ml-3"
              >
                <Clock className="h-4 w-4" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Schedule {scheduleJobType === 'import' ? 'Import' : 'Export'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScheduleDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Schedule this {scheduleJobType} to run automatically at a specific date and time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job Details */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Job Type:</span>
                  <span className="font-medium capitalize">{scheduleJobType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Data Type:</span>
                  <span className="font-medium capitalize">{scheduleDataType}</span>
                </div>
                {scheduleFileName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">File Name:</span>
                    <span className="font-medium text-xs">{scheduleFileName}</span>
                  </div>
                )}
              </div>

              {/* Date/Time Picker */}
              <div className="space-y-2">
                <Label htmlFor="schedule-datetime" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Schedule Date & Time
                </Label>
                <Input
                  id="schedule-datetime"
                  type="datetime-local"
                  value={scheduleDateTime}
                  min={getMinDateTime()}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Minimum: {new Date(getMinDateTime()).toLocaleString()}
                </p>
              </div>

              {/* Info Alert */}
              <Alert className="border-blue-200 bg-blue-50">
                <History className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  This job will be automatically processed at the scheduled time. You can view and manage scheduled jobs in the Import & Export module.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(false)}
                  disabled={isScheduling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createScheduledJob}
                  disabled={isScheduling || !scheduleDateTime}
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule Job
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </PermissionGate>
  );
}
