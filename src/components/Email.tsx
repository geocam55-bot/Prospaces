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
  Inbox,
  AlertCircle,
  Flag,
  FolderOpen,
  FileText,
  Folders,
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
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'important';
  linkedTo?: string;
  accountId: string;
  flagged?: boolean;
  priority?: 'low' | 'normal' | 'high';
  hasAttachments?: boolean;
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
  const [currentFolder, setCurrentFolder] = useState<Email['folder']>('inbox');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; email: Email } | null>(null);
  const [showFoldersSidebar, setShowFoldersSidebar] = useState(true);

  const [composeEmail, setComposeEmail] = useState({
    to: '',
    subject: '',
    body: '',
    linkTo: '',
  });

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleScroll = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Load data on mount from Supabase
  useEffect(() => {
    loadAccountsFromSupabase();
    loadEmailsFromSupabase();
    
    // Check for OAuth callback success/error
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const provider = urlParams.get('provider');
    const email = urlParams.get('email');
    
    if (oauthSuccess === 'true' && provider && email) {
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected: ${decodeURIComponent(email)}`);
      // Reload accounts to show the newly connected account
      setTimeout(() => {
        loadAccountsFromSupabase();
      }, 1000);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      toast.error(`OAuth failed: ${decodeURIComponent(oauthError)}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto-select first account when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
      console.log(`[Email] Auto-selected first account: ${accounts[0].email}`);
    }
  }, [accounts, selectedAccount]);

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
          folder: email.folder as Email['folder'],
          linkedTo: email.contact_id ? `Contact: ${email.contact_id}` : undefined,
          accountId: email.account_id,
          // New fields - use optional chaining for backward compatibility
          flagged: email.is_flagged ?? false,
          priority: email.priority ?? 'normal',
          hasAttachments: email.has_attachments ?? false,
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
      if (selectedAccount && email.accountId !== selectedAccount) {
        return false;
      }

      // Handle special folders
      if (currentFolder === 'important') {
        return email.starred;
      } else if (currentFolder === 'flagged') {
        return email.flagged;
      }
      
      // Regular folders
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

      // Check if this is an Outlook account with Azure OAuth
      if (currentAccount.provider === 'outlook') {
        console.log('[Email] Using Azure OAuth send for Outlook account:', selectedAccount);
        
        try {
          const response = await supabase.functions.invoke('azure-send-email', {
            body: {
              accountId: selectedAccount,
              to: composeEmail.to.trim(),
              subject: composeEmail.subject.trim(),
              body: composeEmail.body.trim(),
            },
          });

          if (response.error) {
            console.error('[Email] Azure send error:', response.error);
            throw new Error(response.error.message || 'Failed to send email via Azure');
          }

          if (!response.data?.success) {
            throw new Error(response.data?.error || 'Failed to send email via Azure');
          }

          console.log('[Email] ✅ Email sent successfully via Azure OAuth');
          
          // Reload emails from Supabase to get the sent email
          await loadEmailsFromSupabase();
          
          setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
          setIsComposeOpen(false);
          toast.success('✅ Email sent successfully!');
          return;
        } catch (azureError: any) {
          console.error('[Email] Azure send failed:', azureError);
          
          // Check if Edge Function is not deployed
          if (azureError.message?.includes('Failed to send a request') || 
              azureError.message?.includes('FunctionsHttpError') ||
              azureError.message?.includes('404')) {
            toast.error(
              'Azure send function not deployed. Deploy via: supabase functions deploy azure-send-email',
              { duration: 10000 }
            );
          } else {
            toast.error(`Failed to send email: ${azureError.message}`);
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

      // Check if this is a Nylas OAuth account (has grant_id) for Gmail
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

  const handleMarkAsRead = async (id: string, read: boolean = true) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ is_read: read })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, read } : e
      ));
      toast.success(read ? 'Marked as read' : 'Marked as unread');
    } catch (error) {
      console.error('[Email] Failed to update read status:', error);
    }
  };

  const handleToggleStar = async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ is_starred: !email.starred })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, starred: !e.starred } : e
      ));
      toast.success(email.starred ? 'Unstarred' : 'Starred');
    } catch (error) {
      console.error('[Email] Failed to toggle star:', error);
    }
  };

  const handleToggleFlag = async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ is_flagged: !email.flagged })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, flagged: !e.flagged } : e
      ));
      toast.success(email.flagged ? 'Flag removed' : 'Flagged');
    } catch (error) {
      console.error('[Email] Failed to toggle flag:', error);
    }
  };

  const handleMoveToFolder = async (id: string, folder: Email['folder']) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ folder })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, folder } : e
      ));
      
      setSelectedEmail(null);
      
      const folderNames: Record<Email['folder'], string> = {
        inbox: 'Inbox',
        sent: 'Sent',
        drafts: 'Drafts',
        archive: 'Archive',
        trash: 'Trash',
        spam: 'Spam',
        important: 'Important'
      };
      
      toast.success(`Moved to ${folderNames[folder]}`);
    } catch (error) {
      console.error('[Email] Failed to move email:', error);
    }
  };

  const handleArchive = (id: string) => {
    handleMoveToFolder(id, 'archive');
  };

  const handleDelete = (id: string) => {
    handleMoveToFolder(id, 'trash');
  };

  const handleContextMenu = (e: React.MouseEvent, email: Email) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      email
    });
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
    console.log('[Email] Sync button clicked');
    
    if (!selectedAccount) {
      console.log('[Email] No account selected');
      toast.error('Please select an email account first');
      return;
    }
    
    console.log('[Email] Starting sync for account:', selectedAccount);
    setIsSyncing(true);
    
    try {
      const currentAccount = accounts.find(a => a.id === selectedAccount);
      
      if (!currentAccount) {
        toast.error('Please select an email account');
        setIsSyncing(false);
        return;
      }

      console.log('[Email] Current account:', currentAccount.email, 'Provider:', currentAccount.provider);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to sync emails');
        setIsSyncing(false);
        return;
      }

      // Check if this is an Outlook account with Azure OAuth
      if (currentAccount.provider === 'outlook') {
        console.log('[Email] Using Azure sync for Outlook account');
        
        // Use Azure sync endpoint
        const response = await supabase.functions.invoke('azure-sync-emails', {
          body: {
            accountId: selectedAccount,
            limit: 50,
          },
        });

        console.log('[Email] Azure sync response:', response);

        if (response.error) {
          console.error('[Email] Azure sync error:', response.error);
          throw new Error(response.error.message || 'Failed to sync emails');
        }

        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Failed to sync emails');
        }

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
        
        setIsSyncing(false);
        return;
      }

      console.log('[Email] Using Nylas sync for Gmail account');

      // Check cache to see if we already know backend is unavailable
      // This prevents repeated network errors when Edge Functions aren't deployed
      if (backendAvailabilityCache && 
          !backendAvailabilityCache.available && 
          (Date.now() - backendAvailabilityCache.timestamp < CACHE_DURATION)) {
        // We know backend is not available from a recent check - don't make any network request
        console.log('[Email] Backend cached as unavailable, skipping sync');
        setIsSyncing(false);
        toast.error('Email sync not available. Deploy Edge Functions to enable syncing.');
        return;
      }

      // Try to call the Nylas Edge Function for Gmail
      const response = await supabase.functions.invoke('nylas-sync-emails', {
        body: {
          accountId: selectedAccount,
          limit: 50,
        },
      });

      console.log('[Email] Nylas sync response:', response);

      // If we get here and there's an error, cache that backend is not available
      if (response.error) {
        console.error('[Email] Nylas sync error:', response.error);
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
      // Log the full error for debugging
      console.error('[Email] Sync error:', error);
      
      // Cache that backend is not available
      if (!backendAvailabilityCache || backendAvailabilityCache.available) {
        backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
      }
      
      // Check if it's a configuration error
      if (error.message?.includes('Nylas') || error.message?.includes('not configured')) {
        toast.error('Email backend not configured. See DEPLOY_NYLAS.md to set up email sync.');
      } else if (error.message?.includes('Azure') || error.message?.includes('AZURE_CLIENT_ID')) {
        toast.error('Azure OAuth not configured. See AZURE_OAUTH_QUICK_START.md to set up Outlook sync.');
      } else if (error.message?.includes('Failed to send a request') || error.message?.includes('FunctionsHttpError') || error.message?.includes('FunctionsRelayError')) {
        // Edge function not deployed
        toast.error('Email sync Edge Functions not deployed. Deploy them to enable syncing.', { duration: 5000 });
      } else {
        toast.error(`Failed to sync emails: ${error.message}`);
      }
    } finally {
      console.log('[Email] Sync complete, resetting isSyncing state');
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

  const stripHtml = (html: string) => {
    // Remove HTML tags and decode entities for preview
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getEmailPreview = (body: string) => {
    // Strip HTML tags and limit to first 100 characters
    const plainText = stripHtml(body);
    return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
  };

  const getProviderIcon = (provider: string) => {
    // For display purposes - in production would use actual provider logos
    return provider.charAt(0).toUpperCase();
  };

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox' && e.accountId === selectedAccount).length;

  // Folder counts
  const folderCounts = {
    inbox: emails.filter(e => e.folder === 'inbox' && e.accountId === selectedAccount).length,
    sent: emails.filter(e => e.folder === 'sent' && e.accountId === selectedAccount).length,
    drafts: emails.filter(e => e.folder === 'drafts' && e.accountId === selectedAccount).length,
    archive: emails.filter(e => e.folder === 'archive' && e.accountId === selectedAccount).length,
    trash: emails.filter(e => e.folder === 'trash' && e.accountId === selectedAccount).length,
    spam: emails.filter(e => e.folder === 'spam' && e.accountId === selectedAccount).length,
    important: emails.filter(e => e.starred && e.accountId === selectedAccount).length,
    flagged: emails.filter(e => e.flagged && e.accountId === selectedAccount).length,
  };

  const folders: Array<{ 
    id: Email['folder'] | 'flagged'; 
    label: string; 
    icon: any; 
    count: number;
  }> = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: folderCounts.inbox },
    { id: 'important', label: 'Starred', icon: Star, count: folderCounts.important },
    { id: 'flagged', label: 'Flagged', icon: Flag, count: folderCounts.flagged },
    { id: 'sent', label: 'Sent', icon: Send, count: folderCounts.sent },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: folderCounts.drafts },
    { id: 'archive', label: 'Archive', icon: Archive, count: folderCounts.archive },
    { id: 'spam', label: 'Spam', icon: AlertCircle, count: folderCounts.spam },
    { id: 'trash', label: 'Trash', icon: Trash2, count: folderCounts.trash },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl text-gray-900">Email</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage emails from connected accounts</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Account</span>
          </Button>
          <Button onClick={() => setIsComposeOpen(true)} className="text-xs sm:text-sm">
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Compose</span>
          </Button>
        </div>
      </div>

      {/* Account Selector and Sync */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select email account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((account, index, self) => 
                        // Remove duplicates based on email address
                        index === self.findIndex((a) => a.email === account.email && a.connected)
                      )
                      .filter(account => account.connected) // Only show connected accounts
                      .map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600">
                              {getProviderIcon(account.provider)}
                            </div>
                            <span className="text-xs sm:text-sm truncate">{account.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {accounts.find(a => a.id === selectedAccount)?.lastSync && (
                  <span className="text-xs text-gray-500 hidden md:inline">
                    Last synced: {formatDate(accounts.find(a => a.id === selectedAccount)!.lastSync!)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Settings className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Account Settings</span>
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
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="text-xs">
                  <RefreshCw className={`h-4 w-4 sm:mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Folders Sidebar */}
          <div className={`lg:col-span-2 ${selectedEmail ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Folders</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setShowFoldersSidebar(!showFoldersSidebar)}
                  >
                    <Folders className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {folders.map((folder) => {
                    const Icon = folder.icon;
                    const isActive = currentFolder === folder.id || 
                      (currentFolder === 'important' && folder.id === 'important') ||
                      (currentFolder === 'flagged' && folder.id === 'flagged');
                    
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          if (folder.id === 'flagged' || folder.id === 'important') {
                            setCurrentFolder(folder.id as any);
                          } else {
                            setCurrentFolder(folder.id as Email['folder']);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{folder.label}</span>
                        </div>
                        {folder.count > 0 && (
                          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                            {folder.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email List */}
          <div className={`lg:col-span-4 ${selectedEmail ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200 max-h-[600px] lg:max-h-[600px] overflow-y-auto">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        if (!email.read) {
                          handleMarkAsRead(email.id, true);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, email)}
                      className={`w-full text-left p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                      } ${!email.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-xs sm:text-sm truncate flex-1 ${!email.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {email.folder === 'sent' ? `To: ${email.to}` : email.from}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {email.flagged && <Flag className="h-3 w-3 text-red-500 fill-red-500" />}
                          {email.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          {email.hasAttachments && <Paperclip className="h-3 w-3 text-gray-500" />}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(email.date)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs sm:text-sm mb-1 truncate ${!email.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">{getEmailPreview(email.body)}</p>
                      {email.linkedTo && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          <span className="truncate">{email.linkedTo}</span>
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
          <div className={`lg:col-span-6 ${!selectedEmail ? 'hidden lg:block' : ''}`}>
            {selectedEmail ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Back button for mobile */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="lg:hidden mb-2 -ml-2"
                        onClick={() => setSelectedEmail(null)}
                      >
                        ← Back to list
                      </Button>
                      <h2 className="text-lg sm:text-xl text-gray-900 mb-2 break-words">{selectedEmail.subject}</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                        <span className="truncate">From: {selectedEmail.from}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">To: {selectedEmail.to}</span>
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
                    {selectedEmail.body.includes('<') && selectedEmail.body.includes('>') ? (
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
                  <div className="flex flex-wrap gap-2 mt-6">
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
                      className="text-xs sm:text-sm"
                    >
                      <Send className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Reply</span>
                    </Button>
                    <Button variant="outline" className="text-xs sm:text-sm">
                      <Send className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Forward</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                      onClick={() => handlePermanentDelete(selectedEmail.id)}
                    >
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
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
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Compose Email</DialogTitle>
            <DialogDescription className="text-sm">
              Send a new email from your connected account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to" className="text-sm">To</Label>
              <Input
                id="to"
                value={composeEmail.to}
                onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })}
                placeholder="recipient@example.com"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm">Subject</Label>
              <Input
                id="subject"
                value={composeEmail.subject}
                onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body" className="text-sm">Message</Label>
              <Textarea
                id="body"
                value={composeEmail.body}
                onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                rows={6}
                className="text-sm min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkTo" className="text-sm">Link to CRM Record (optional)</Label>
              <Input
                id="linkTo"
                value={composeEmail.linkTo}
                onChange={(e) => setComposeEmail({ ...composeEmail, linkTo: e.target.value })}
                placeholder="e.g., Contact: John Smith"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <Paperclip className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Attach File</span>
              </Button>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSendEmail} className="flex-1 text-sm">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)} className="text-sm">
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleMarkAsRead(contextMenu.email.id, !contextMenu.email.read);
              setContextMenu(null);
            }}
          >
            {contextMenu.email.read ? (
              <>
                <Mail className="h-4 w-4" />
                Mark as Unread
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Mark as Read
              </>
            )}
          </button>
          
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleToggleStar(contextMenu.email.id);
              setContextMenu(null);
            }}
          >
            <Star className="h-4 w-4" />
            {contextMenu.email.starred ? 'Unstar' : 'Star'}
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleToggleFlag(contextMenu.email.id);
              setContextMenu(null);
            }}
          >
            <Flag className="h-4 w-4" />
            {contextMenu.email.flagged ? 'Remove Flag' : 'Flag'}
          </button>

          <div className="border-t border-gray-200 my-1" />

          <div className="px-2 py-1 text-xs font-semibold text-gray-500">Move to</div>
          
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'inbox');
              setContextMenu(null);
            }}
          >
            <Inbox className="h-4 w-4" />
            Inbox
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'archive');
              setContextMenu(null);
            }}
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'spam');
              setContextMenu(null);
            }}
          >
            <AlertCircle className="h-4 w-4" />
            Spam
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'trash');
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </button>

          <div className="border-t border-gray-200 my-1" />

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => {
              handlePermanentDelete(contextMenu.email.id);
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Permanently
          </button>
        </div>
      )}
    </div>
  );
}