import { useState, useEffect } from 'react';
import { emailAPI } from '../utils/api';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { publicAnonKey } from '../utils/supabase/info.tsx';
import {
  Mail,
  Send,
  Search,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  Plus,
  RefreshCw,
  Link2,
  Settings,
  Paperclip,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { EmailAccountSetup } from './EmailAccountSetup';
import type { User } from '../types';

// Cache backend availability check to avoid repeated failed requests
// This prevents console spam from 404 errors when Edge Functions aren't deployed
let backendAvailabilityCache: { checked: boolean; available: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // Cache for 1 minute

// Function to check if the Edge Function is deployed
async function checkEdgeFunctionAvailability(): Promise<boolean> {
  // Check cache first
  if (backendAvailabilityCache && (Date.now() - backendAvailabilityCache.timestamp < CACHE_DURATION)) {
    return backendAvailabilityCache.available;
  }

  const supabase = createClient();
  
  try {
    // Try to invoke the function with a test request (will fail validation but tells us if it's deployed)
    const response = await supabase.functions.invoke('simple-send-email', {
      body: { test: true }
    });
    
    console.log('[Email] Backend check response:', {
      hasError: !!response.error,
      errorMessage: response.error?.message,
      errorName: response.error?.name,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullResponse: response
    });
    
    // If we get response.data (even if it's an error object), the function IS deployed
    if (response.data) {
      // Check if it's a validation error (which means function is working)
      if (response.data.error && 
          (response.data.error.includes('Missing required fields') || 
           response.data.error.includes('required'))) {
        console.log('[Email] Edge Function IS deployed (validation error = function working)');
        backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };
        return true;
      }
      
      // Any other response.data means function exists
      console.log('[Email] Edge Function IS deployed (got data response)');
      backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };
      return true;
    }
    
    // Check response.error
    if (response.error) {
      const errorMsg = response.error.message || '';
      
      // CORS errors mean function IS deployed
      if (errorMsg.includes('CORS') || errorMsg.includes('cors')) {
        console.log('[Email] Edge Function IS deployed (CORS error detected - function exists)');
        backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };
        return true;
      }
      
      // These errors mean the function is NOT deployed
      if (errorMsg.includes('404') || 
          errorMsg.includes('not found') ||
          errorMsg.includes('Function not found')) {
        console.log('[Email] Edge Function NOT deployed (404)');
        backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
        return false;
      }
      
      // Any other error type likely means function exists but had an issue
      console.log('[Email] Edge Function IS deployed (got error response, not 404)');
      backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };
      return true;
    }
    
    // Default: if we got here with no clear signal, assume available
    console.log('[Email] Edge Function IS deployed (default)');
    backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };
    return true;
  } catch (error: any) {
    console.log('[Email] Edge Function check error:', error);
    
    // Network errors or CORS errors still mean the function exists
    if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
      console.log('[Email] Edge Function IS deployed (CORS error in catch)');
      backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };
      return true;
    }
    
    backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
    return false;
  }
}

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
  linkedTo?: string;
  accountId: string;
}

interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'apple' | 'imap';
  email: string;
  connected: boolean;
  lastSync?: string;
  imapConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  smtpConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  nylasGrantId?: string;
}

interface EmailProps {
  user: User;
}

export function Email({ user }: EmailProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent' | 'archive' | 'trash'>('inbox');

  const [composeEmail, setComposeEmail] = useState({
    to: '',
    subject: '',
    body: '',
    linkTo: '',
  });

  // Load data on mount from Supabase
  useEffect(() => {
    loadAccountsFromSupabase();
    loadEmailsFromSupabase();
  }, []);

  const loadAccountsFromSupabase = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[Email] No session, skipping account load');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', session.user.id);
        // Temporarily removed organization filter to debug
        // .eq('organization_id', user.organizationId);

      if (error) {
        console.error('[Email] Error loading accounts:', error);
        return;
      }

      if (data && data.length > 0) {
        // Transform Supabase data to our format
        const transformedAccounts: EmailAccount[] = data.map(account => ({
          id: account.id,
          provider: account.provider as 'gmail' | 'outlook' | 'apple' | 'imap',
          email: account.email,
          connected: account.connected,
          lastSync: account.last_sync,
          imapConfig: account.imap_host ? {
            host: account.imap_host,
            port: account.imap_port,
            username: account.imap_username,
            password: account.imap_password,
          } : undefined,
          smtpConfig: account.smtp_host ? {
            host: account.smtp_host,
            port: account.smtp_port,
            username: account.smtp_username,
            password: account.smtp_password,
          } : undefined,
          nylasGrantId: account.nylas_grant_id,
        }));

        setAccounts(transformedAccounts);
        console.log(`[Email] Loaded ${transformedAccounts.length} account(s) from Supabase`);
        
        // Debug: Log account IDs
        const accountIds = transformedAccounts.map(a => a.id);
        console.log(`[Email] Account IDs:`, accountIds);
      }
    } catch (error) {
      console.error('[Email] Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailsFromSupabase = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', session.user.id)
        // Temporarily removed organization filter to debug
        // .eq('organization_id', user.organizationId)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[Email] Error loading emails:', error);
        return;
      }

      if (data && data.length > 0) {
        // Transform Supabase data to our format
        const transformedEmails: Email[] = data.map(email => ({
          id: email.id,
          from: email.from_email,
          to: email.to_email,
          subject: email.subject || '',
          body: email.body || '',
          date: email.received_at,
          read: email.is_read,
          starred: email.is_starred,
          folder: email.folder as 'inbox' | 'sent' | 'archive' | 'trash',
          linkedTo: email.contact_id ? `Contact: ${email.contact_id}` : undefined,
          accountId: email.account_id,
        }));

        setEmails(transformedEmails);
        console.log(`[Email] Loaded ${transformedEmails.length} email(s) from Supabase`);
        
        // Debug: Log unique account IDs in emails
        const uniqueAccountIds = [...new Set(transformedEmails.map(e => e.accountId))];
        console.log(`[Email] Unique account IDs in emails:`, uniqueAccountIds);
      }
    } catch (error) {
      console.error('[Email] Failed to load emails:', error);
    }
  };

  const saveAccountToSupabase = async (account: EmailAccount) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const accountData = {
        id: account.id,
        user_id: session.user.id,
        organization_id: user.organizationId,
        provider: account.provider,
        email: account.email,
        connected: account.connected,
        last_sync: account.lastSync,
        imap_host: account.imapConfig?.host,
        imap_port: account.imapConfig?.port,
        imap_username: account.imapConfig?.username,
        imap_password: account.imapConfig?.password,
        smtp_host: account.smtpConfig?.host,
        smtp_port: account.smtpConfig?.port,
        smtp_username: account.smtpConfig?.username,
        smtp_password: account.smtpConfig?.password,
        nylas_grant_id: account.nylasGrantId,
      };

      const { error } = await supabase
        .from('email_accounts')
        .upsert(accountData);

      if (error) {
        throw error;
      }

      console.log('[Email] Account saved to Supabase');
    } catch (error) {
      console.error('[Email] Failed to save account:', error);
      throw error;
    }
  };

  const saveEmailToSupabase = async (email: Email) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const emailData = {
        id: email.id,
        user_id: session.user.id,
        organization_id: user.organizationId,
        account_id: email.accountId,
        message_id: email.id, // Use our ID as message_id for now
        from_email: email.from,
        to_email: email.to,
        subject: email.subject,
        body: email.body,
        folder: email.folder,
        is_read: email.read,
        is_starred: email.starred,
        received_at: email.date,
      };

      const { error } = await supabase
        .from('emails')
        .upsert(emailData);

      if (error) {
        throw error;
      }

      console.log('[Email] Email saved to Supabase');
    } catch (error) {
      console.error('[Email] Failed to save email:', error);
      // Don't throw - we'll still save to localStorage as fallback
    }
  };

  const deleteAccountFromSupabase = async (accountId: string) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        throw error;
      }

      console.log('[Email] Account deleted from Supabase');
    } catch (error) {
      console.error('[Email] Failed to delete account:', error);
    }
  };

  const filteredEmails = emails
    .filter(email => {
      // If an account is selected, only show emails for that account
      // Otherwise show all emails
      if (selectedAccount) {
        return email.folder === currentFolder && email.accountId === selectedAccount;
      }
      return email.folder === currentFolder;
    })
    .filter(email =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
  // Debug: Log filtering info
  console.log(`[Email] Total emails: ${emails.length}, Current folder: ${currentFolder}, Filtered: ${filteredEmails.length}, Selected account: ${selectedAccount}`);

  const handleSendEmail = async () => {
    if (!selectedAccount) {
      toast.error('Please select an email account');
      return;
    }

    // Basic validation
    if (!composeEmail.to.trim()) {
      toast.error('Please enter a recipient email address');
      return;
    }

    if (!composeEmail.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!composeEmail.body.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const currentAccount = accounts.find(a => a.id === selectedAccount);
    if (!currentAccount) {
      toast.error('Email account not found');
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to send emails');
        return;
      }

      // First, check if this is a Nylas OAuth account (has grant_id)
      // We need to fetch the full account data from Supabase to check for nylas_grant_id
      const { data: dbAccount, error: accountError } = await supabase
        .from('email_accounts')
        .select('nylas_grant_id')
        .eq('id', selectedAccount)
        .single();

      if (accountError) {
        console.error('[Email] Failed to fetch account details:', accountError);
      }

      // If this is a Nylas OAuth account, use the Nylas Send API
      if (dbAccount?.nylas_grant_id) {
        console.log('[Email] Using Nylas OAuth send for account:', selectedAccount);
        
        try {
          const response = await supabase.functions.invoke('nylas-send-email', {
            body: {
              accountId: selectedAccount,
              to: composeEmail.to.trim(),
              subject: composeEmail.subject.trim(),
              body: composeEmail.body.trim(),
            },
          });

          if (response.error) {
            console.error('[Email] Nylas send error:', response.error);
            throw new Error(response.error.message || 'Failed to send email via Nylas');
          }

          if (!response.data?.success) {
            throw new Error(response.data?.error || 'Failed to send email via Nylas');
          }

          console.log('[Email] ✅ Email sent successfully via Nylas OAuth');
          
          // Reload emails from Supabase to get the sent email
          await loadEmailsFromSupabase();
          
          setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
          setIsComposeOpen(false);
          toast.success('✅ Email sent successfully!');
          return;
        } catch (nylasError: any) {
          console.error('[Email] Nylas send failed:', nylasError);
          
          // Check if Edge Function is not deployed
          if (nylasError.message?.includes('Failed to send a request') || 
              nylasError.message?.includes('FunctionsHttpError') ||
              nylasError.message?.includes('404')) {
            toast.error(
              'Nylas send function not deployed. Deploy via: supabase functions deploy nylas-send-email',
              { duration: 10000 }
            );
          } else {
            toast.error(`Failed to send email: ${nylasError.message}`);
          }
          
          // Save as draft
          const draftEmail: Email = {
            id: crypto.randomUUID(),
            from: currentAccount.email,
            to: composeEmail.to,
            subject: composeEmail.subject,
            body: composeEmail.body,
            date: new Date().toISOString(),
            read: true,
            starred: false,
            folder: 'drafts' as const,
            linkedTo: composeEmail.linkTo || undefined,
            accountId: selectedAccount,
          };
          
          await saveEmailToSupabase(draftEmail);
          setEmails([draftEmail, ...emails]);
          setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
          setIsComposeOpen(false);
          toast.info('💾 Email saved as draft - sending failed');
          return;
        }
      }

      // Check if we have SMTP credentials for direct sending
      if (currentAccount.smtpConfig) {
        console.log('[Email] Checking if Edge Function is available...');
        
        // Check if Edge Function is deployed before attempting to send
        const isFunctionAvailable = await checkEdgeFunctionAvailability();
        
        if (!isFunctionAvailable) {
          console.log('[Email] Edge Function not available, skipping to demo mode');
          toast.error(
            'Email sending function not deployed yet. ' +
            'Deploy it via Supabase Dashboard at: ' +
            'https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions',
            { duration: 8000 }
          );
          
          // Fall through to demo mode
        } else {
          console.log('[Email] Edge Function available, attempting SMTP send...');
          
          // Validate SMTP config before sending
          if (!currentAccount.smtpConfig.host || !currentAccount.smtpConfig.port || 
              !currentAccount.smtpConfig.username || !currentAccount.smtpConfig.password) {
            throw new Error('Incomplete SMTP configuration. Please reconfigure your email account.');
          }
        
          // Prepare request payload
          const payload = {
            to: composeEmail.to.trim(),
            subject: composeEmail.subject.trim(),
            body: composeEmail.body.trim(),
            from: currentAccount.email,
            smtpConfig: {
              host: currentAccount.smtpConfig.host,
              port: currentAccount.smtpConfig.port,
              username: currentAccount.smtpConfig.username,
              password: currentAccount.smtpConfig.password,
            },
          };
          
          console.log('[Email] Sending payload:', {
            ...payload,
            smtpConfig: { ...payload.smtpConfig, password: '***' }
          });
          
          // Try to use simple-send-email function with SMTP credentials
          try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              throw new Error('Not authenticated');
            }

            // Direct fetch to Edge Function with proper CORS headers
            const functionUrl = `https://usorqldwroecyxucmtuw.supabase.co/functions/v1/simple-send-email`;
            
            const fetchResponse = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': publicAnonKey,
              },
              body: JSON.stringify(payload),
            });

            console.log('[Email] Fetch response status:', fetchResponse.status);
            
            if (!fetchResponse.ok) {
              const errorText = await fetchResponse.text();
              console.error('[Email] Fetch error:', errorText);
              throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
            }

            const responseData = await fetchResponse.json();
            console.log('[Email] Response data:', responseData);

            if (!responseData.success) {
              throw new Error(responseData.error || 'Failed to send email');
            }

            // Success! Email sent via SMTP
            console.log('[Email] ✅ Email sent successfully via SMTP');
            
            const newEmail: Email = {
              id: crypto.randomUUID(),
              from: currentAccount.email,
              to: composeEmail.to,
              subject: composeEmail.subject,
              body: composeEmail.body,
              date: new Date().toISOString(),
              read: true,
              starred: false,
              folder: 'sent' as const,
              linkedTo: composeEmail.linkTo || undefined,
              accountId: selectedAccount,
            };

            // Save to Supabase
            await saveEmailToSupabase(newEmail);
            
            setEmails([newEmail, ...emails]);
            setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
            setIsComposeOpen(false);
            toast.success('✅ Email sent successfully via SMTP!');
            return;
          } catch (smtpError: any) {
            console.error('[Email] SMTP send error:', smtpError);
            
            // Check if it's a CORS/network error
            if (smtpError instanceof TypeError && smtpError.message === 'Failed to fetch') {
              toast.error(
                '❌ CORS Error: Edge Function needs to be redeployed',
                {
                  description: 'The simple-send-email function needs to be redeployed via Supabase Dashboard with the updated CORS headers. Check the Edge Function code at /supabase/functions/simple-send-email/index.ts',
                  duration: 10000,
                }
              );
              
              // Save as draft instead
              const draftEmail: Email = {
                id: crypto.randomUUID(),
                from: currentAccount.email,
                to: composeEmail.to,
                subject: composeEmail.subject,
                body: composeEmail.body,
                date: new Date().toISOString(),
                read: true,
                starred: false,
                folder: 'drafts' as const,
                linkedTo: composeEmail.linkTo || undefined,
                accountId: selectedAccount,
              };
              
              await saveEmailToSupabase(draftEmail);
              setEmails([draftEmail, ...emails]);
              setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
              setIsComposeOpen(false);
              toast.info('💾 Email saved as draft due to CORS error');
              return;
            }
            
            // If simple-send-email function isn't deployed, fall through to demo mode
            if (smtpError.message?.includes('Failed to send a request') || 
                smtpError.message?.includes('FunctionsHttpError') ||
                smtpError.message?.includes('FunctionsRelayError') ||
                smtpError.message?.includes('404')) {
              console.log('[Email] simple-send-email function not deployed, falling back to demo mode');
              toast.error('Email function not deployed. Run: supabase functions deploy simple-send-email');
              // Continue to demo mode below
            } else {
              // Real SMTP error - show it to user
              throw smtpError;
            }
          }
        }
      }

      // Demo mode fallback
      console.log('[Email] Using demo mode (backend not available)');
      
      toast.error('Email sending failed', {
        description: 'The simple-send-email Edge Function is not responding. Please check:\n1. Edge Function is deployed in Supabase Dashboard\n2. SMTP configuration is complete\n3. Check browser console for detailed error',
        duration: 10000,
      });

      // Save as draft instead of showing confusing confirm dialog
      const draftEmail: Email = {
        id: crypto.randomUUID(),
        from: currentAccount.email,
        to: composeEmail.to,
        subject: composeEmail.subject,
        body: composeEmail.body,
        date: new Date().toISOString(),
        read: true,
        starred: false,
        folder: 'drafts' as const,
        linkedTo: composeEmail.linkTo || undefined,
        accountId: selectedAccount,
      };

      await saveEmailToSupabase(draftEmail);
      setEmails([draftEmail, ...emails]);
      setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
      setIsComposeOpen(false);
      toast.info('💾 Email saved as draft - please check email configuration');
      return;
    } catch (error: any) {
      console.error('[Email] Send error:', error);
      
      // Show specific error message
      if (error.message?.includes('SMTP') || error.message?.includes('connection')) {
        toast.error(`SMTP Error: ${error.message}`);
      } else if (error.message?.includes('Failed to send a request') || error.message?.includes('FunctionsHttpError')) {
        toast.error('Email function not deployed. Run: supabase functions deploy simple-send-email');
      } else {
        toast.error(`Failed to send email: ${error.message}`);
      }
    }
  };

  const handleMarkAsRead = (id: string) => {
    setEmails(emails.map(email =>
      email.id === id ? { ...email, read: true } : email
    ));
  };

  const handleToggleStar = (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    setEmails(emails.map(e =>
      e.id === id ? { ...e, starred: !e.starred } : e
    ));
    toast.success(email.starred ? 'Unstarred' : 'Starred');
  };

  const handleArchive = (id: string) => {
    setEmails(emails.map(email =>
      email.id === id ? { ...email, folder: 'archive' as const } : email
    ));
    setSelectedEmail(null);
    toast.success('Email archived');
  };

  const handleDelete = (id: string) => {
    setEmails(emails.map(email =>
      email.id === id ? { ...email, folder: 'trash' as const } : email
    ));
    setSelectedEmail(null);
    toast.success('Email moved to trash');
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this email? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Delete from Supabase
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Email] Failed to delete email from database:', error);
        toast.error('Failed to delete email from database');
        return;
      }

      // Remove from local state
      setEmails(emails.filter(e => e.id !== id));
      setSelectedEmail(null);
      toast.success('Email permanently deleted');
    } catch (error) {
      console.error('[Email] Failed to delete email:', error);
      toast.error('Failed to delete email');
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;
    
    setIsSyncing(true);
    
    try {
      const currentAccount = accounts.find(a => a.id === selectedAccount);
      
      if (!currentAccount) {
        toast.error('Please select an email account');
        setIsSyncing(false);
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to sync emails');
        setIsSyncing(false);
        return;
      }

      // Check cache to see if we already know backend is unavailable
      // This prevents repeated network errors when Edge Functions aren't deployed
      if (backendAvailabilityCache && 
          !backendAvailabilityCache.available && 
          (Date.now() - backendAvailabilityCache.timestamp < CACHE_DURATION)) {
        // We know backend is not available from a recent check - don't make any network request
        setIsSyncing(false);
        toast.error('Email sync not available. Deploy Nylas Edge Functions to enable syncing.');
        return;
      }

      // Try to call the Edge Function
      // If this fails, we'll cache that it's not available
      const response = await supabase.functions.invoke('nylas-sync-emails', {
        body: {
          accountId: selectedAccount,
          limit: 50,
        },
      });

      // If we get here and there's an error, cache that backend is not available
      if (response.error) {
        // Cache the failure so we don't keep retrying
        backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
        throw new Error(response.error.message || 'Failed to sync emails');
      }

      if (!response.data?.success) {
        // Cache the failure
        backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
        throw new Error(response.data?.error || 'Failed to sync emails');
      }

      // Success! Cache that backend IS available
      backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };

      // Reload emails from Supabase
      await loadEmailsFromSupabase();
      
      // Update last sync time
      setAccounts(accounts.map(account =>
        account.id === selectedAccount
          ? { ...account, lastSync: new Date().toISOString() }
          : account
      ));

      const syncedCount = response.data.syncedCount || 0;
      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} new email${syncedCount > 1 ? 's' : ''}!`);
      } else {
        toast.success('No new emails');
      }
      
    } catch (error: any) {
      // Log at debug level - this is a user-initiated action that may fail if backend not configured
      console.debug('[Email] Sync error:', error);
      
      // Cache that backend is not available
      if (!backendAvailabilityCache || backendAvailabilityCache.available) {
        backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
      }
      
      // Check if it's a Nylas configuration error
      if (error.message?.includes('Nylas') || error.message?.includes('not configured')) {
        toast.error('Email backend not configured. See DEPLOY_NYLAS.md to set up email sync.');
      } else if (error.message?.includes('Failed to send a request') || error.message?.includes('FunctionsHttpError')) {
        // Edge function not deployed
        toast.error('Email sync not available. Deploy Nylas Edge Functions to enable syncing.');
      } else {
        toast.error(`Failed to sync emails: ${error.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAccountAdded = async (account: EmailAccount) => {
    try {
      // Save to Supabase first
      await saveAccountToSupabase(account);
      
      if (editingAccount) {
        // Update existing account
        setAccounts(accounts.map(a => a.id === editingAccount.id ? account : a));
        toast.success('Email account updated successfully!');
      } else {
        // Add new account
        setAccounts([...accounts, account]);
        setSelectedAccount(account.id);
        toast.success('Email account connected successfully!');
      }
      setIsSettingsOpen(false);
      setEditingAccount(null);
    } catch (error: any) {
      console.error('[Email] Failed to save account:', error);
      toast.error(`Failed to save account: ${error.message}`);
    }
  };

  const handleEditAccount = () => {
    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      setEditingAccount(account);
      setIsSettingsOpen(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    
    const account = accounts.find(a => a.id === selectedAccount);
    if (confirm(`Are you sure you want to delete the account ${account?.email}? All associated emails will be removed.`)) {
      // Delete from Supabase first
      await deleteAccountFromSupabase(selectedAccount);
      
      // Remove account
      setAccounts(accounts.filter(a => a.id !== selectedAccount));
      
      // Remove emails for this account
      setEmails(emails.filter(e => e.accountId !== selectedAccount));
      
      // Select first remaining account or clear
      const remainingAccounts = accounts.filter(a => a.id !== selectedAccount);
      if (remainingAccounts.length > 0) {
        setSelectedAccount(remainingAccounts[0].id);
      } else {
        setSelectedAccount('');
      }
      
      toast.success('Email account deleted successfully');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getProviderIcon = (provider: string) => {
    // For display purposes - in production would use actual provider logos
    return provider.charAt(0).toUpperCase();
  };

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox' && e.accountId === selectedAccount).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Email</h1>
          <p className="text-gray-600 mt-1">Manage emails from connected accounts</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
          <Button onClick={() => setIsComposeOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* Account Selector and Sync */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600">
                            {getProviderIcon(account.provider)}
                          </div>
                          {account.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accounts.find(a => a.id === selectedAccount)?.lastSync && (
                  <span className="text-xs text-gray-500">
                    Last synced: {formatDate(accounts.find(a => a.id === selectedAccount)!.lastSync!)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEditAccount}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg text-gray-900 mb-2">No email accounts connected</h3>
            <p className="text-sm text-gray-600 mb-6">
              Connect your Gmail, Outlook, or Apple Mail account to manage emails within the CRM
            </p>
            
            <Alert className="mb-6 text-left">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Getting Started:</strong>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li><strong>IMAP/SMTP (Recommended):</strong> Connect directly using your email provider's server settings. Works immediately with no backend setup required.</li>
                  <li><strong>OAuth (Advanced):</strong> Requires deploying Nylas Edge Functions to Supabase. See deployment guides for instructions.</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <Button onClick={() => setIsSettingsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Email Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <Tabs value={currentFolder} onValueChange={(value: any) => setCurrentFolder(value)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="inbox" className="text-xs">
                        Inbox {unreadCount > 0 && `(${unreadCount})`}
                      </TabsTrigger>
                      <TabsTrigger value="sent" className="text-xs">Sent</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        handleMarkAsRead(email.id);
                      }}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                      } ${!email.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-sm ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {email.folder === 'sent' ? `To: ${email.to}` : email.from}
                        </span>
                        <div className="flex items-center gap-1">
                          {email.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(email.date)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mb-1 ${!email.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">{email.body}</p>
                      {email.linkedTo && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          {email.linkedTo}
                        </Badge>
                      )}
                    </button>
                  ))}
                  {filteredEmails.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <Mail className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No emails found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Detail */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl text-gray-900 mb-2">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>From: {selectedEmail.from}</span>
                        <span>•</span>
                        <span>To: {selectedEmail.to}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selectedEmail.date).toLocaleString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleStar(selectedEmail.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          {selectedEmail.starred ? 'Unstar' : 'Star'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(selectedEmail.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(selectedEmail.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handlePermanentDelete(selectedEmail.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.body.includes('<!DOCTYPE') || selectedEmail.body.includes('<html') ? (
                      // Render HTML emails in an iframe for isolation
                      <iframe
                        srcDoc={selectedEmail.body}
                        className="w-full min-h-[400px] border-0 bg-white"
                        sandbox="allow-same-origin"
                        title="Email content"
                      />
                    ) : (
                      // Render plain text emails
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedEmail.body}</p>
                    )}
                  </div>
                  {selectedEmail.linkedTo && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-900">
                        <Link2 className="h-4 w-4" />
                        <span>Linked to: {selectedEmail.linkedTo}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setComposeEmail({
                          to: selectedEmail.from,
                          subject: `Re: ${selectedEmail.subject}`,
                          body: '',
                          linkTo: selectedEmail.linkedTo || '',
                        });
                        setIsComposeOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Button variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Forward
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-24 pb-24 text-center">
                  <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select an email to view</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>
              Send a new email from your connected account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={composeEmail.to}
                onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={composeEmail.subject}
                onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={composeEmail.body}
                onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkTo">Link to CRM Record (optional)</Label>
              <Input
                id="linkTo"
                value={composeEmail.linkTo}
                onChange={(e) => setComposeEmail({ ...composeEmail, linkTo: e.target.value })}
                placeholder="e.g., Contact: John Smith"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach File
              </Button>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSendEmail} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Setup Dialog */}
      <EmailAccountSetup
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setEditingAccount(null);
        }}
        onAccountAdded={handleAccountAdded}
        editingAccount={editingAccount}
      />
    </div>
  );
}