

export function ImportExport({ user, onNavigate }: ImportExportProps) {
  useEffect(() => {
    const focusTarget = sessionStorage.getItem('prospaces_import_export_focus');
    const scope = sessionStorage.getItem('prospaces_import_export_scope');

    if (scope === 'inventory-only') {
      setScopedModule('inventory');
    } else if (scope === 'contacts-only') {
      setScopedModule('contacts');
    }

    if (!focusTarget) {
      sessionStorage.removeItem('prospaces_import_export_scope');
      return;
    }

    if (focusTarget === 'inventory-import' || focusTarget === 'contacts-import') {
      setActiveTab('import');
    }
    if (focusTarget === 'inventory-export' || focusTarget === 'contacts-export') {
      setActiveTab('export');
    }

    const timeoutId = window.setTimeout(() => {
      const targetIdByFocus: Record<string, string> = {
        'inventory-import': 'import-inventory-card',
        'contacts-import': 'import-contacts-card',
        'inventory-export': 'export-inventory-card',
        'contacts-export': 'export-contacts-card',
      };
      const targetId = targetIdByFocus[focusTarget];
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
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Job Type:</span>
                  <span className="font-medium capitalize">{scheduleJobType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data Type:</span>
                  <span className="font-medium capitalize">{scheduleDataType}</span>
                </div>
                {scheduleJobType === 'export' && scheduleExportOptions?.format && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium uppercase">{scheduleExportOptions.format}</span>
                  </div>
                )}
                {scheduleFileName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">File Name:</span>
                    <span className="font-medium text-xs">{scheduleFileName}</span>
                  </div>
                )}
              </div>

              {/* Scheduler UI */}
              <Scheduler value={schedulerValues} onChange={setSchedulerValues} />

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
                  disabled={isScheduling || !schedulerValues.startDate || !schedulerValues.startTime}
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
  </PermissionGate>
}

  const loadOneDriveFiles = async (folderId?: string, emailOverride?: string) => {
    const lookupEmail = (emailOverride || oneDriveEmail).trim();
    if (!lookupEmail) {
      throw new Error('Connect a OneDrive account first');
    }

    setOneDriveLoading(true);
    try {
      const data = await callOneDriveEndpoint('onedrive-files', {
        email: lookupEmail,
        userId: user.id,
        folderId,
      });
      setOneDriveItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load OneDrive files');
      setOneDriveItems([]);
    } finally {
      setOneDriveLoading(false);
    }
  };

  const connectOneDrive = async () => {
    setOneDriveConnecting(true);
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to connect OneDrive');
      }

      const { data, error } = await supabase.functions.invoke('make-server-8405be07/microsoft-oauth-init', {
        method: 'POST',
        body: {
          userId: user.id,
          includeFiles: true,
          scopes: ONE_DRIVE_SCOPES,
        },
        headers: {
          'X-User-Token': session.access_token,
        },
      });

      if (error || !data?.success || !data?.authUrl) {
        throw new Error(data?.error || error?.message || 'Failed to initialize OneDrive OAuth');
      }

      const popup = window.open(
        data.authUrl,
        'OneDrive OAuth',
        'width=650,height=800,toolbar=no,location=yes,status=yes,menubar=no,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        window.clearInterval(popupCheck);
      };

      const onMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'outlook-oauth-success') {
          cleanup();
          const email = event.data?.account?.email;
          if (!email) {
            toast.error('Connected account email was not returned');
            setOneDriveConnecting(false);
            return;
          }

          setOneDriveEmail(email);
          setOneDriveFolderStack([]);
          await loadOneDriveFiles(undefined, email);
          toast.success(`Connected OneDrive account: ${email}`);
          setOneDriveConnecting(false);
        } else if (event.data?.type === 'oauth-error' || event.data?.type === 'outlook-oauth-error') {
          cleanup();
          setOneDriveConnecting(false);
          toast.error(event.data?.error || 'OneDrive OAuth failed');
        }
      };

      window.addEventListener('message', onMessage);

      const popupCheck = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          setOneDriveConnecting(false);
        }
      }, 500);
    } catch (error: any) {
      setOneDriveConnecting(false);
      toast.error(error.message || 'Failed to connect OneDrive');
    }
  };

  const disconnectOneDrive = () => {
    setOneDriveEmail('');
    setOneDriveItems([]);
    setOneDriveFolderStack([]);
    toast.success('OneDrive disconnected. You can now connect with a different account.');
  };

  const openOneDriveFolder = async (folder: OneDriveItem) => {
    setOneDriveFolderStack((current) => [...current, { id: folder.id, name: folder.name }]);
    await loadOneDriveFiles(folder.id);
  };

  const goToOneDriveRoot = async () => {
    setOneDriveFolderStack([]);
    await loadOneDriveFiles();
  };

  const goOneDriveBack = async () => {
    if (oneDriveFolderStack.length === 0) return;
    const nextStack = oneDriveFolderStack.slice(0, -1);
    setOneDriveFolderStack(nextStack);
    const parent = nextStack[nextStack.length - 1];
    await loadOneDriveFiles(parent?.id);
  };

  const base64ToFile = (base64: string, fileName: string, mimeType: string) => {
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mimeType || 'application/octet-stream' });
  };

  const importFromOneDriveFile = async (item: OneDriveItem) => {
    const name = item.name.toLowerCase();
    if (!(name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls'))) {
      toast.error('Only CSV, XLSX, and XLS files can be imported');
      return;
    }

    try {
      setOneDriveLoading(true);
      const data = await callOneDriveEndpoint('onedrive-file-content', {
        email: oneDriveEmail,
        userId: user.id,
        fileId: item.id, // FIX: send fileId, not itemId
      });

      const file = base64ToFile(data.base64, data.name || item.name, data.mimeType || item.mimeType || 'application/octet-stream');
      const rows = applyFreeImportLimit(await parseFile(file));

      if (rows.length === 0) {
        toast.error('No data found in selected OneDrive file');
        return;
      }

      const fileColumns = Object.keys(rows[0]);
      // Allow all contact fields to be mapped
      const allContactFields = [
        'firstName', 'lastName', 'email', 'phone', 'company', 'title', 'priceLevel', 'address', 'city', 'province', 'postalCode', 'notes', 'legacyNumber', 'accountOwnerNumber', 'ptdSales', 'ptdGpPercent', 'ytdSales', 'ytdGpPercent', 'lyrSales', 'lyrGpPercent'
      ];
      const autoMapping = autoMapColumns(fileColumns, oneDriveImportType);

      setMappingState({
        type: oneDriveImportType,
        data: rows,
        fileColumns,
        mapping: autoMapping,
        // Optionally, expose allContactFields for mapping UI if needed
      });

      toast.success(`Loaded ${rows.length} rows from ${item.name}. Review column mapping and schedule import if desired.`);
    } catch (error: any) {
      toast.error('Failed to import OneDrive file: ' + error.message);
    } finally {
      setOneDriveLoading(false);
    }
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
        // Row padding - expected more columns
        while (values.length < headers.length) {
          values.push('');
        }
      }

      // Skip rows where every value is blank (trailing empty lines, rows of commas, etc.)
      if (values.every(v => !v || v.trim() === '')) {
        // Skipping empty row
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
      'company': ['company name', 'business', 'business name', 'organization', 'firm', 'employer', 'account', 'customer account', 'company/account', 'client company', 'customer', 'client', 'account name', 'vendor'],
      'trade': ['trade', 'specialty', 'speciality', 'industry', 'segment', 'business type', 'construction trade', 'service trade'],
      'status': ['contact status', 'customer status', 'account status', 'customer type', 'state'],
      'priceLevel': ['price level', 'pricing level', 'pricing tier', 'customer tier', 'discount level', 'price group', 'pricing group', 'price leve', 'price tier', 'tier', 'level'],
      'address': ['street address', 'mailing address', 'billing address', 'street', 'addr', 'location', 'full address', 'address line', 'address 1', 'address1', 'street address 1'],
      'city': ['city', 'town', 'municipality', 'city/town'],
      'province': ['province', 'state', 'province/state', 'prov', 'st', 'region', 'province or state', 'state/province'],
      'postalCode': ['postal code', 'zip code', 'zip', 'postal', 'postcode', 'post code', 'postal/zip', 'zip/postal'],
      'legacyNumber': ['legacy #', 'legacy number', 'legacy no', 'legacy $', 'customer #', 'customer number', 'cust #', 'cust no', 'account #', 'account number', 'acct #', 'acct no', 'old id', 'old #', 'customer id', 'cust id', 'legacy id', 'legacyid', 'legacy', 'number', 'id', 'contact id', 'no', 'num', 'customer no'],
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
      const fileColLower = fileCol.toLowerCase().trim();

      // Pass 1: exact match and synonym match across all fields (prevents partial match
      // from stealing columns - e.g. "Company Name" must not map to 'name' via substring)
      let match = dbFields.find(dbField => {
        const dbNormalized = dbField.value.toLowerCase().replace(/[_\s-]/g, '');
        const labelNormalized = dbField.label.toLowerCase().replace(/[_\s-]/g, '');
        const dbFieldLower = dbField.value.toLowerCase();
        const labelLower = dbField.label.toLowerCase();

        // Try exact match first (case-insensitive)
        if (fileColLower === dbFieldLower || fileColLower === labelLower) return true;

        // Try normalized match
        if (normalized === dbNormalized || normalized === labelNormalized) return true;

        // Try synonym match
        const synonyms = fieldSynonyms[dbField.value] || [];
        return synonyms.some(syn => fileColLower === syn || normalized === syn.replace(/[_\s-]/g, ''));
      });

      // Pass 2: partial match only if no exact/synonym match found
      if (!match) {
        match = dbFields.find(dbField => {
          const dbNormalized = dbField.value.toLowerCase().replace(/[_\s-]/g, '');
          return normalized.includes(dbNormalized) || dbNormalized.includes(normalized);
        });
      }

      if (match) {
        mapping[fileCol] = match.value;
        // Auto-mapped column
      } else {
        // No match found for column
      }
    });

    // Final mapping ready
    return mapping;
  };

  // Handle file selection and show mapping UI
  const handleFileSelect = async (
    event: ChangeEvent<HTMLInputElement>,
    type: 'contacts' | 'inventory' | 'bids'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportResult(null);

    try {
      const data = applyFreeImportLimit(await parseFile(file));
      
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

  // Handle paste from clipboard
  const handlePasteData = async (type: 'contacts' | 'inventory' | 'bids') => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === '') {
        toast.error('No data found in clipboard');
        return;
      }

      // Parse as CSV
      const data = applyFreeImportLimit(parseCSV(text));
      
      if (data.length === 0) {
        toast.error('No valid data found in clipboard');
        return;
      }

      // Extract column names
      const fileColumns = Object.keys(data[0]);
      
      // Auto-detect mapping
      const autoMapping = autoMapColumns(fileColumns, type);

      setMappingState({
        type,
        data,
        fileColumns,
        mapping: autoMapping,
      });

      toast.success(`Pasted ${data.length} rows from clipboard. Please review column mapping.`);
    } catch (error: any) {
      toast.error('Failed to read clipboard: ' + error.message);
    }
  };

  // Execute import with mapped columns
  const executeImport = async () => {
    if (!mappingState) return;

    // Starting import

    const { type, data, mapping } = mappingState;
    setIsImporting(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: data.length });

    try {
      // Importing records
      let success = 0;
      let failed = 0;
      const errors: string[] = [];
      let updated = 0;
      let created = 0;

      // Check if required fields are mapped
      const dbFields = DATABASE_FIELDS[type!];
      const requiredFields = dbFields.filter(f => f.required);
      const mappedDbFields = Object.values(mapping);

      // Required and mapped fields verified

      for (const reqField of requiredFields) {
        if (!mappedDbFields.includes(reqField.value)) {
          // Missing required field
          toast.error(`Required field "${reqField.label}" is not mapped`);
          setIsImporting(false);
          return;
        }
      }

      // Map all rows to database fields
      const mappedDataRaw = data.map(row => {
        const mappedRow: any = {};
        Object.entries(mapping).forEach(([fileCol, dbField]) => {
          const mappedField = String(dbField || '');
          if (dbField && row[fileCol] !== undefined) {
            mappedRow[mappedField] = row[fileCol];
          }
        });
        return mappedRow;
      });

      // Filter out rows where all mapped values are empty (trailing blank rows, etc.)
      const mappedData = mappedDataRaw.filter(row => {
        const hasData = Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== '');
        return hasData;
      });

      if (!isAdminUser && isPlanLoaded && isFreeUser && mappedData.length > 100) {
        toast.error('Free users can import up to 100 records per import.');
        setIsImporting(false);
        setImportProgress(null);
        return;
      }

      if (mappedDataRaw.length !== mappedData.length) {
        // Filtered out empty rows after mapping
      }

      // Use bulk processing for inventory
      if (type === 'inventory') {
        const BATCH_SIZE = 50;
        const totalBatches = Math.ceil(mappedData.length / BATCH_SIZE);
        
        // Processing items in batches

        for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
          const batch = mappedData.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          
          // Processing batch
          
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
            // Batch failed
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
        
        // Pre-loaded auth for import

        // Log unique account owners found in CSV for debugging ownership resolution
        const uniqueOwners = new Set(
          mappedData
            .map((c: any) => c.accountOwnerNumber ? String(c.accountOwnerNumber).trim().toLowerCase() : '')
            .filter((v: string) => v !== '')
        );
        if (uniqueOwners.size > 0) {
          // Import will resolve unique account owners
        } else {
          // No accountOwnerNumber mapped — all contacts will be owned by the importing user
        }

        // Use batch processing for contacts
        const BATCH_SIZE = 25; // Slightly smaller batches for contacts
        const totalBatches = Math.ceil(mappedData.length / BATCH_SIZE);
        
        // Processing contacts in batches

        for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
          const batch = mappedData.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          
          // Processing contact batch
          
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
              // Row failed
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
    let contactName = contact.name ? String(contact.name).trim() : '';
    if (!contactName) {
      // Check if the row is effectively empty (no meaningful data at all)
      const hasAnyData = Object.values(contact).some(
        (v: any) => v !== undefined && v !== null && String(v).trim() !== ''
      );
      if (!hasAnyData) {
        // Silently skip completely empty rows — not an error
        return { action: 'skipped' as const };
      }
      // Try to derive a name from other fields before giving up
      const fallbackEmail = contact.email ? String(contact.email).trim() : '';
      const fallbackLegacy = contact.legacyNumber ? String(contact.legacyNumber).trim() : '';
      if (fallbackEmail) {
        contactName = fallbackEmail;
      } else if (fallbackLegacy) {
        contactName = `Legacy #${fallbackLegacy}`;
      } else {
        // Row has some data but nothing usable as a name — silently skip as a likely summary/footer row
        return { action: 'skipped' as const };
      }
    }

    // Clean the contact data - remove fields that don't exist in database
    const cleanContact: any = {
      name: contactName,
    };

    const stringFields = [
      'email', 'phone', 'company', 'trade', 'status', 'priceLevel', 'address', 'city', 
      'province', 'postalCode', 'notes', 'legacyNumber', 'accountOwnerNumber'
    ];
    
    const numericFields = [
      'ptdSales', 'ptdGpPercent', 'ytdSales', 'ytdGpPercent', 'lyrSales', 'lyrGpPercent'
    ];

    stringFields.forEach(field => {
      if (contact[field] !== undefined) {
        if (contact[field] === null || contact[field] === '') {
          cleanContact[field] = null;
        } else {
          cleanContact[field] = String(contact[field]).trim();
        }
      }
    });

    numericFields.forEach(field => {
      if (contact[field] !== undefined) {
        if (contact[field] === null || contact[field] === '') {
          cleanContact[field] = null;
        } else {
          const val = parseFloat(contact[field]);
          cleanContact[field] = !isNaN(val) ? val : null;
        }
      }
    });

    // Use upsert logic: check by Legacy # or email, update if exists, otherwise create new
    const result = await contactsAPI.upsertByLegacyNumber(cleanContact, preloadedAuth);

    return result;
  };

  // Import individual inventory item
  const importInventoryItem = async (item: any, rowNum: number, errors: string[]) => {
    if (!item.name || !item.sku) {
      throw new Error('Missing required fields (name, sku)');
    }

    // Clean the data - only include fields that exist in the database
    const cleanItem: any = {
      name: item.name,
      sku: item.sku,
    };

    const stringFields = ['description', 'category', 'department_code', 'unit_of_measure', 'image_url'];
    stringFields.forEach(field => {
      if (item[field] !== undefined) {
        if (item[field] === null || item[field] === '') {
          cleanItem[field] = null;
        } else {
          cleanItem[field] = String(item[field]).trim();
        }
      }
    });

    if (item.category !== undefined && !cleanItem.category) {
      cleanItem.category = 'General';
    }

    const floatFields = ['unit_price', 'cost', 'price_tier_1', 'price_tier_2', 'price_tier_3', 'price_tier_4', 'price_tier_5'];
    floatFields.forEach(field => {
      if (item[field] !== undefined) {
        if (item[field] === null || item[field] === '') {
          cleanItem[field] = null;
        } else {
          cleanItem[field] = parseFloat(item[field]) || 0;
        }
      }
    });

    const intFields = ['quantity', 'quantity_on_order'];
    intFields.forEach(field => {
      if (item[field] !== undefined) {
        if (item[field] === null || item[field] === '') {
          cleanItem[field] = null;
        } else {
          cleanItem[field] = parseInt(item[field], 10) || 0;
        }
      }
    });

    // Use price_tier_1 as a fallback for unit_price if not already set
    if (cleanItem.unit_price == null && cleanItem.price_tier_1 != null) {
      cleanItem.unit_price = cleanItem.price_tier_1;
    }

    // Use upsert logic: check by SKU and update if exists, otherwise create new
    const result = await inventoryAPI.upsertBySKU(cleanItem);
    
    // Log whether we created or updated
    if (result.action === 'updated') {
      const duplicateInfo = result.updatedCount && result.updatedCount > 1 
        ? ` (${result.updatedCount} duplicate records updated)` 
        : '';
    }

    return result;
  };

  // Import individual bid
  const importBid = async (bid: any, rowNum: number, errors: string[]) => {
    if (!bid.clientName || !bid.projectName) {
      throw new Error('Missing required fields (clientName, projectName)');
    }

    const cleanBid: any = {
      clientName: bid.clientName,
      projectName: bid.projectName,
    };

    const stringFields = ['description', 'status', 'validUntil', 'notes', 'terms'];
    stringFields.forEach(field => {
      if (bid[field] !== undefined) {
        if (bid[field] === null || bid[field] === '') {
          cleanBid[field] = null;
        } else {
          cleanBid[field] = String(bid[field]).trim();
        }
      }
    });

    if (bid.status !== undefined && !cleanBid.status) {
      cleanBid.status = 'draft';
    } else if (cleanBid.status === undefined) {
      cleanBid.status = 'draft';
    }

    if (bid.validUntil !== undefined && !cleanBid.validUntil) {
      cleanBid.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (cleanBid.validUntil === undefined) {
      cleanBid.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    if (bid.terms !== undefined && !cleanBid.terms) {
      cleanBid.terms = 'Payment due within 30 days';
    } else if (cleanBid.terms === undefined) {
      cleanBid.terms = 'Payment due within 30 days';
    }

    const floatFields = ['subtotal', 'tax', 'total'];
    floatFields.forEach(field => {
      if (bid[field] !== undefined) {
        const targetField = field === 'tax' ? 'tax_amount' : field;
        if (bid[field] === null || bid[field] === '') {
          cleanBid[targetField] = null;
        } else {
          cleanBid[targetField] = parseFloat(bid[field]) || 0;
        }
      }
    });

    await bidsAPI.create(cleanBid);
  };

  // Export Contacts
  const handleExportContacts = async () => {
    setIsExporting(true);
    try {
      const response = await contactsAPI.getAll();
      const contacts = response.contacts || [];

      const csvContent = [
        'name,email,phone,company,trade,address,city,province,postalCode,status,priceLevel,notes,legacyNumber,accountOwnerNumber,ptdSales,ptdGpPercent,ytdSales,ytdGpPercent,lyrSales,lyrGpPercent',
        ...contacts.map((c: any) => 
          `"${c.name}","${c.email}","${c.phone || ''}","${c.company || ''}","${c.trade || ''}","${c.address || ''}","${c.city || ''}","${c.province || ''}","${c.postalCode || ''}","${c.status || ''}","${c.priceLevel || ''}","${c.notes || ''}","${c.legacyNumber || ''}","${c.accountOwnerNumber || ''}","${c.ptdSales || ''}","${c.ptdGpPercent || ''}","${c.ytdSales || ''}","${c.ytdGpPercent || ''}","${c.lyrSales || ''}","${c.lyrGpPercent || ''}"`
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

  // Export Quotes
  const handleExportQuotes = async () => {
    setIsExporting(true);
    try {
      const response = await quotesAPI.getAll('team');
      const quotes = response.quotes || [];

      const rows = quotes.map((q: any) => {
        const lineItemsRaw = q.line_items || q.lineItems;
        const lineItems = Array.isArray(lineItemsRaw)
          ? lineItemsRaw
          : (() => {
              if (typeof lineItemsRaw !== 'string' || !lineItemsRaw.trim()) return [];
              try {
                const parsed = JSON.parse(lineItemsRaw);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })();

        const skuValues = lineItems
          .map((item: any) => item?.sku || item?.item_sku || item?.inventory_sku || '')
          .map((value: string) => String(value).trim())
          .filter(Boolean);

        const uniqueSkus = Array.from(new Set(skuValues));
        const skuDescriptions = lineItems
          .map((item: any) => item?.description || item?.desc || item?.itemName || item?.item_name || item?.name || item?.title || '')
          .map((value: unknown) => String(value ?? '').trim())
          .filter(Boolean);
        const uniqueSkuDescriptions = Array.from(new Set(skuDescriptions));

        const skuUnits = lineItems
          .map((item: any) => item?.unit_of_measure || item?.unitOfMeasure || item?.uom || item?.unit || '')
          .map((value: unknown) => String(value ?? '').trim())
          .filter(Boolean);
        const uniqueSkuUnits = Array.from(new Set(skuUnits));

        const skuQuantityPairs = lineItems
          .map((item: any) => {
            const sku = String(item?.sku || item?.item_sku || item?.inventory_sku || '').trim();
            if (!sku) return '';
            const qty = Number(item?.quantity ?? item?.qty ?? 0);
            return `${sku}:${Number.isFinite(qty) ? qty : 0}`;
          })
          .filter(Boolean);

        const skuUnitPricePairs = lineItems
          .map((item: any) => {
            const sku = String(item?.sku || item?.item_sku || item?.inventory_sku || '').trim();
            if (!sku) return '';
            const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? item?.price ?? 0);
            return `${sku}:${Number.isFinite(unitPrice) ? unitPrice : 0}`;
          })
          .filter(Boolean);

        const skuLineTotalPairs = lineItems
          .map((item: any) => {
            const sku = String(item?.sku || item?.item_sku || item?.inventory_sku || '').trim();
            if (!sku) return '';
            const qty = Number(item?.quantity ?? item?.qty ?? 0);
            const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? item?.price ?? 0);
            const explicitTotal = Number(item?.total ?? item?.line_total ?? item?.subtotal);
            const lineTotal = Number.isFinite(explicitTotal) ? explicitTotal : qty * unitPrice;
            return `${sku}:${Number.isFinite(lineTotal) ? lineTotal : 0}`;
          })
          .filter(Boolean);

        const skuTotalQuantity = lineItems.reduce((sum: number, item: any) => {
          const qty = Number(item?.quantity ?? item?.qty ?? 0);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);

        return {
          quote_number: q.quote_number || q.quoteNumber || '',
          title: q.title || q.projectName || '',
          contact_name: q.contact_name || q.contactName || '',
          contact_email: q.contact_email || q.contactEmail || '',
          status: q.status || '',
          price_tier: q.price_tier || q.priceTier || '',
          valid_until: q.valid_until || q.validUntil || '',
          subtotal: q.subtotal ?? '',
          tax_amount: q.tax_amount ?? q.tax ?? '',
          total: q.total ?? '',
          sku: uniqueSkus[0] || '',
          skus: uniqueSkus.join('|'),
          sku_description: uniqueSkuDescriptions[0] || '',
          sku_descriptions: uniqueSkuDescriptions.join('|'),
          sku_unit: uniqueSkuUnits[0] || '',
          sku_units: uniqueSkuUnits.join('|'),
          sku_total_quantity: skuTotalQuantity,
          sku_quantities: skuQuantityPairs.join('|'),
          sku_unit_prices: skuUnitPricePairs.join('|'),
          sku_line_totals: skuLineTotalPairs.join('|'),
          line_items_count: lineItems.length,
          notes: q.notes || '',
          terms: q.terms || '',
        };
      });

      const datePart = new Date().toISOString().split('T')[0];

      if (quoteExportFormat === 'xml') {
        const xmlContent = buildXml(rows, 'quotes', 'quote');
        downloadTextFile(xmlContent, `quotes_export_${datePart}.xml`, 'application/xml;charset=utf-8;');
        toast.success('Quotes exported as XML');
      } else if (quoteExportFormat === 'custom') {
        const template = quoteExportTemplates.find((item) => item.id === quoteCustomTemplateId);
        if (!template) {
          toast.error('Select a custom export template first');
          return;
        }

        const customContent = buildCustomText(rows, template);
        const extension = (template.file_extension || 'txt').replace(/^\./, '');
        const safeTemplateName = sanitizeFilename(template.name || 'custom');
        downloadTextFile(
          customContent,
          `quotes_export_${safeTemplateName}_${datePart}.${extension}`,
          'text/plain;charset=utf-8;'
        );
        toast.success(`Quotes exported using ${template.name}`);
      } else {
        const csvContent = buildCsv(rows);
        downloadTextFile(csvContent, `quotes_export_${datePart}.csv`, 'text/csv;charset=utf-8;');
        toast.success('Quotes exported as CSV');
      }
    } catch (error: any) {
      toast.error('Failed to export quotes: ' + error.message);
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
          'name,email,phone,company,trade,address,status,priceLevel,notes,legacyNumber,accountOwnerNumber,ptdSales,ptdGpPercent,ytdSales,ytdGpPercent,lyrSales,lyrGpPercent',
          'John Doe,john@example.com,555-1234,Acme Corp,Electrical,123 Main St New York NY 10001,Prospect,Retail,Sample contact notes,LEG-12345,AO-67890,1000,20,2000,30,3000,40',
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
                  <div key={fileCol} className="bg-background p-4 rounded-lg border space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="text-muted-foreground">File Column:</span>
                      <span className="font-medium">{fileCol}</span>
                    </Label>
                    
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
                    <div className="text-xs text-muted-foreground mt-2">
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
          <div className="flex flex-wrap items-center justify-end gap-3">
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
              disabled={isImporting || !(canUseProBackgroundTools || isAdminUser)}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Schedule for Later
            </Button>
            <Button
              variant="secondary"
              onClick={createBackgroundImportJob}
              disabled={isImporting || !canUseProBackgroundTools}
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
            <Button variant="outline" onClick={clearMapping}>
              Cancel
            </Button>
          </div>

          {/* Import Progress */}
          {importProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing records...</span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-end gap-3">
        {scopedModule && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {scopedModule === 'inventory' ? 'Inventory Mode' : 'Customer Mode'}
          </span>
        )}
        <ImportExportModuleHelp
          userId={user.id}
          activeTab={activeTab}
          isImporting={isImporting}
          isExporting={isExporting}
          onOpenImportTab={() => setActiveTab('import')}
          onOpenExportTab={() => setActiveTab('export')}
          onOpenBackgroundImports={() => {
            if (!canUseProBackgroundTools) {
              showProOnlyMessage();
              return;
            }
            onNavigate ? onNavigate('background-imports') : window.location.hash = '#background-imports';
          }}
          onOpenScheduledJobs={() => {
            if (!canUseProBackgroundTools) {
              showProOnlyMessage();
              return;
            }
            onNavigate ? onNavigate('scheduled-jobs') : window.location.hash = '#scheduled-jobs';
          }}
          onOpenScheduleDialog={() => {
            if (!canUseProBackgroundTools) {
              showProOnlyMessage();
              return;
            }
            setScheduleJobType('export');
            setScheduleDataType('contacts');
            setScheduleFileName(`contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
            setScheduleFileData(null);
            setScheduleExportOptions(null);
            setShowScheduleDialog(true);
          }}
        />
        <Button
          variant="outline"
          onClick={() => {
            if (!canUseProBackgroundTools) {
              showProOnlyMessage();
              return;
            }
            onNavigate ? onNavigate('background-imports') : window.location.hash = '#background-imports';
          }}
          disabled={!canUseProBackgroundTools}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Background Imports
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (!isAdminUser) {
              toast.info('Only Admin and SuperAdmin can view scheduled jobs.');
              return;
            }
            onNavigate ? onNavigate('scheduled-jobs') : window.location.hash = '#scheduled-jobs';
          }}
          disabled={!isAdminUser}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          View Scheduled Jobs
        </Button>
      </div>

      {isFreeUser && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Free users can import up to 100 records per import.
          </AlertDescription>
        </Alert>
      )}

      {isFreeOrStandardUser && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This options is for Professional or Higher Users.
          </AlertDescription>
        </Alert>
      )}

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
              <p className="text-sm text-foreground mt-1">
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
                    <li className="text-muted-foreground">...and more errors (showing first 25)</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Column Mapping UI */}
      {mappingState && renderMappingUI()}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Import from OneDrive
                  </CardTitle>
                  <CardDescription>
                    Connect Microsoft OneDrive, browse files, and import CSV or Excel directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={connectOneDrive}
                      disabled={oneDriveConnecting || oneDriveLoading || !!oneDriveEmail}
                      className="flex items-center gap-2"
                    >
                      {oneDriveConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-4 w-4" />
                          Connect OneDrive
                        </>
                      )}
                    </Button>

                    {oneDriveEmail && (
                      <Button
                        variant="destructive"
                        onClick={disconnectOneDrive}
                        disabled={oneDriveLoading || oneDriveConnecting}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Disconnect
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => loadOneDriveFiles()}
                      disabled={!oneDriveEmail || oneDriveLoading || oneDriveConnecting}
                    >
                      Refresh Files
                    </Button>

                    <Button
                      variant="outline"
                      onClick={goOneDriveBack}
                      disabled={oneDriveFolderStack.length === 0 || oneDriveLoading}
                    >
                      Back
                    </Button>

                    <Button
                      variant="outline"
                      onClick={goToOneDriveRoot}
                      disabled={!oneDriveEmail || oneDriveLoading || oneDriveFolderStack.length === 0}
                    >
                      Root
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
                    <Label>Import as</Label>
                    <Select
                      value={oneDriveImportType}
                      onValueChange={(value: 'contacts' | 'inventory' | 'bids') => setOneDriveImportType(value)}
                    >
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contacts">Contacts</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="bids">Bids</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {oneDriveEmail ? `Connected as ${oneDriveEmail}` : 'Not connected yet.'}
                    {oneDriveFolderStack.length > 0 ? ` Current folder: ${oneDriveFolderStack.map((f) => f.name).join(' / ')}` : ''}
                  </p>

                  <div className="border rounded-md divide-y">
                    {oneDriveLoading && (
                      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading OneDrive files...
                      </div>
                    )}

                    {!oneDriveLoading && oneDriveItems.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">
                        {oneDriveEmail ? 'No files found in this folder.' : 'Connect OneDrive to load files.'}
                      </div>
                    )}

                    {!oneDriveLoading && oneDriveItems.map((item) => (
                      <div key={item.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.isFolder ? `Folder${item.folderChildCount ? ` (${item.folderChildCount} items)` : ''}` : item.mimeType || 'File'}
                          </p>
                        </div>
                        {item.isFolder ? (
                          <Button size="sm" variant="outline" onClick={() => openOneDriveFolder(item)}>
                            <Folder className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => importFromOneDriveFile(item)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Import
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Import Contacts */}
              {!inventoryOnlyMode && (
              <Card id="import-contacts-card">
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
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('contacts')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="flex-1 flex gap-2">
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
                        >
                          <span className="flex items-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Select File
                          </span>
                        </Button>
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => handlePasteData('contacts')}
                        disabled={isImporting}
                        className="flex items-center gap-2"
                      >
                        <Clipboard className="h-4 w-4" />
                        Paste from Clipboard
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: CSV, Excel (.xlsx, .xls), or paste tab-delimited data. Required fields: Name (Full Name), Email
                  </p>
                </CardContent>
              </Card>
              )}

              {/* Import Inventory */}
              {!contactsOnlyMode && (
              <Card id="import-inventory-card">
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
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('inventory')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="flex-1 flex gap-2">
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
                        >
                          <span className="flex items-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Select File
                          </span>
                        </Button>
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => handlePasteData('inventory')}
                        disabled={isImporting}
                        className="flex items-center gap-2"
                      >
                        <Clipboard className="h-4 w-4" />
                        Paste from Clipboard
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: CSV, Excel (.xlsx, .xls), or paste tab-delimited data. Required fields: Item Name, SKU
                  </p>
                </CardContent>
              </Card>
              )}

              {/* Import Deals */}
              {!inventoryOnlyMode && !contactsOnlyMode && (
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
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate('bids')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="flex-1 flex gap-2">
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
                        >
                          <span className="flex items-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Select File
                          </span>
                        </Button>
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => handlePasteData('bids')}
                        disabled={isImporting}
                        className="flex items-center gap-2"
                      >
                        <Clipboard className="h-4 w-4" />
                        Paste from Clipboard
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: CSV, Excel (.xlsx, .xls), or paste tab-delimited data. Required fields: Client Name, Project Name
                  </p>
                </CardContent>
              </Card>
              )}
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
          {!inventoryOnlyMode && (
          <Card id="export-contacts-card">
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
                disabled={isExporting || !canUseProBackgroundTools}
                className="flex items-center gap-2 ml-3"
              >
                <Clock className="h-4 w-4" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>
          )}

          {/* Export Inventory */}
          {!contactsOnlyMode && (
          <Card id="export-inventory-card">
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
                disabled={isExporting || !canUseProBackgroundTools}
                className="flex items-center gap-2 ml-3"
              >
                <Clock className="h-4 w-4" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>
          )}

          {/* Export Quotes */}
          {!inventoryOnlyMode && !contactsOnlyMode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Export Quotes
              </CardTitle>
              <CardDescription>
                Export quotes as CSV, XML, or a custom organization format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={quoteExportFormat} onValueChange={(value: 'csv' | 'xml' | 'custom') => setQuoteExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="custom">Custom Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {quoteExportFormat === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Template</Label>
                    <Select value={quoteCustomTemplateId} onValueChange={setQuoteCustomTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select custom template" />
                      </SelectTrigger>
                      <SelectContent>
                        {quoteExportTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                onClick={handleExportQuotes}
                disabled={isExporting || (quoteExportFormat === 'custom' && !quoteCustomTemplateId)}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export Quotes'}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  openScheduleExportDialog('bids', {
                    entity: 'quotes',
                    format: quoteExportFormat,
                    templateId: quoteExportFormat === 'custom' ? quoteCustomTemplateId : undefined,
                  })
                }
                disabled={
                  isExporting ||
                  !canUseProBackgroundTools ||
                  (quoteExportFormat === 'custom' && !quoteCustomTemplateId)
                }
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>
          )}
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
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Job Type:</span>
                  <span className="font-medium capitalize">{scheduleJobType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data Type:</span>
                  <span className="font-medium capitalize">{scheduleDataType}</span>
                </div>
                {scheduleJobType === 'export' && scheduleExportOptions?.format && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium uppercase">{scheduleExportOptions.format}</span>
                  </div>
                )}
                {scheduleFileName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">File Name:</span>
                    <span className="font-medium text-xs">{scheduleFileName}</span>
                  </div>
                )}
              </div>


              {/* Date/Time Picker & Repeat Options */}
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
                <p className="text-xs text-muted-foreground">
                  Minimum: {new Date(getMinDateTime()).toLocaleString()}
                </p>

                {/* Repeat Dropdown */}
                <Label htmlFor="repeat-type" className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4" />
                  Repeat
                </Label>
                <select
                  id="repeat-type"
                  className="w-full border rounded p-2"
                  value={repeatType}
                  onChange={e => setRepeatType(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom...</option>
                </select>

                {/* Weekly: Day checkboxes */}
                {repeatType === 'weekly' && (
                  <div className="flex gap-2 mt-2">
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, idx) => (
                      <label key={day} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={repeatDaysOfWeek.includes(idx)}
                          onChange={e => {
                            if (e.target.checked) setRepeatDaysOfWeek([...repeatDaysOfWeek, idx]);
                            else setRepeatDaysOfWeek(repeatDaysOfWeek.filter(d => d !== idx));
                          }}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                )}

                {/* Monthly: Day of month picker */}
                {repeatType === 'monthly' && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...Array(31)].map((_, i) => (
                      <label key={i+1} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={repeatDaysOfMonth.includes(i+1)}
                          onChange={e => {
                            if (e.target.checked) setRepeatDaysOfMonth([...repeatDaysOfMonth, i+1]);
                            else setRepeatDaysOfMonth(repeatDaysOfMonth.filter(d => d !== i+1));
                          }}
                        />
                        {i+1}
                      </label>
                    ))}
                  </div>
                )}

                {/* Custom: Interval input */}
                {repeatType === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs">Every</span>
                    <Input
                      type="number"
                      min={1}
                      value={repeatInterval}
                      onChange={e => setRepeatInterval(Number(e.target.value))}
                      className="w-16"
                    />
                    <select
                      value={repeatCustomUnit}
                      onChange={e => setRepeatCustomUnit(e.target.value)}
                      className="border rounded p-1"
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                  </div>
                )}

                {/* End Date Picker (if repeating) */}
                {repeatType !== 'none' && (
                  <div className="mt-2">
                    <Label htmlFor="repeat-end-date" className="text-xs">End Date (optional)</Label>
                    <Input
                      id="repeat-end-date"
                      type="date"
                      value={repeatEndDate}
                      onChange={e => setRepeatEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
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
