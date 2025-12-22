import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, CheckCircle, XCircle, Loader2, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

interface CalendarAccount {
  id: string;
  provider: 'google' | 'outlook';
  email: string;
  connected: boolean;
  last_sync?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface CalendarAccountSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
  editingAccount?: CalendarAccount | null;
  existingAccounts?: CalendarAccount[];
}

export function CalendarAccountSetup({ isOpen, onClose, onAccountAdded, editingAccount, existingAccounts = [] }: CalendarAccountSetupProps) {
  const [step, setStep] = useState<'list' | 'select' | 'oauth' | 'success'>('list');
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setEmail(editingAccount.email);
      setSelectedProvider(editingAccount.provider);
    }
  }, [editingAccount]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setTimeout(() => {
        setStep('list');
        setSelectedProvider(null);
        setEmail('');
        setError('');
      }, 200);
    } else {
      // Show manage view if accounts exist, otherwise show select
      if (existingAccounts.length > 0) {
        setStep('list');
      } else {
        setStep('select');
      }
    }
  }, [isOpen, existingAccounts.length]);

  const calendarProviders = [
    {
      id: 'google' as const,
      name: 'Google Calendar',
      description: 'Sync with your Google Calendar',
      icon: '📅',
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      status: 'available'
    },
    {
      id: 'outlook' as const,
      name: 'Outlook Calendar',
      description: 'Sync with your Microsoft Outlook Calendar',
      icon: '📆',
      color: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-200',
      status: 'available'
    },
  ];

  const handleProviderSelect = (provider: 'google' | 'outlook') => {
    setSelectedProvider(provider);
    setStep('oauth');
    setError('');
  };

  const handleOAuthConnect = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get user's organization from profiles table
      const { data: userProfile, error: orgError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (orgError || !userProfile || !userProfile.organization_id) {
        throw new Error('Organization not found. Please ensure you are part of an organization.');
      }

      // Call Edge Function to initiate OAuth (Nylas unified auth)
      const { data: oauthData, error: oauthError } = await supabase.functions.invoke('nylas-connect', {
        body: {
          provider: selectedProvider === 'google' ? 'gmail' : 'outlook',
          email: email.trim(),
          returnUrl: window.location.origin, // Pass current app URL for redirect after OAuth
        }
      });

      if (oauthError) {
        console.error('[Calendar] OAuth initialization error:', oauthError);
        throw new Error(oauthError.message || 'Failed to initialize OAuth. Please ensure Edge Functions are deployed.');
      }

      if (!oauthData?.authUrl) {
        throw new Error('Failed to get authorization URL from server.');
      }

      toast.info('Opening authorization window...', {
        description: `Please sign in with ${selectedProvider === 'google' ? 'Google' : 'Microsoft'}`
      });

      // Open OAuth in a popup window instead of redirecting
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        oauthData.authUrl,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'nylas-oauth-success') {
          console.log('[Calendar] OAuth success:', event.data.account);
          
          toast.success('Calendar connected!', {
            description: `${event.data.account.email} has been successfully connected`
          });
          
          // Clean up
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          setStep('success');
          
          // Notify parent to refresh accounts
          onAccountAdded();
          
          // Close dialog after a moment
          setTimeout(() => {
            onClose();
          }, 1500);
          
        } else if (event.data.type === 'nylas-oauth-error') {
          console.error('[Calendar] OAuth error:', event.data.error);
          
          toast.error('Failed to connect calendar', {
            description: event.data.error
          });
          
          // Clean up
          window.removeEventListener('message', handleMessage);
          setError(event.data.error);
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed without completing OAuth
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          
          // Only set error if we're still in connecting state (no success/error message received)
          if (isConnecting) {
            setIsConnecting(false);
            setError('Authorization was cancelled');
          }
        }
      }, 500);

    } catch (error: any) {
      console.error('[Calendar] Connection error:', error);
      setError(error.message || 'Failed to connect calendar. Please try again.');
      toast.error('Failed to connect calendar', {
        description: error.message
      });
      setIsConnecting(false);
    }
  };

  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to disconnect ${email}? This will stop syncing with this calendar.`)) {
      return;
    }

    setIsDeleting(accountId);
    try {
      const supabase = createClient();
      
      // Delete from email_accounts (Nylas unified table)
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        throw error;
      }

      toast.success('Calendar disconnected', {
        description: `${email} has been removed`
      });

      // Notify parent to refresh
      onAccountAdded();

    } catch (error: any) {
      console.error('[Calendar] Delete error:', error);
      toast.error('Failed to disconnect calendar');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReconnect = (account: CalendarAccount) => {
    setEmail(account.email);
    setSelectedProvider(account.provider);
    setStep('oauth');
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never synced';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const renderManageAccounts = () => (
    <div className="space-y-4">
      {existingAccounts.length > 0 ? (
        <>
          <p className="text-sm text-gray-600">
            Manage your connected calendar accounts
          </p>

          <div className="space-y-3">
            {existingAccounts.map((account) => {
              const provider = calendarProviders.find(p => p.id === account.provider);
              if (!provider) return null;

              return (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{provider.name}</h4>
                      <p className="text-sm text-gray-600 truncate">{account.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last synced: {formatLastSync(account.last_sync)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReconnect(account)}
                        disabled={isDeleting === account.id}
                        title="Reconnect calendar"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id, account.email)}
                        disabled={isDeleting === account.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Disconnect calendar"
                      >
                        {isDeleting === account.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setStep('select')}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Connect Another Calendar
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No calendar accounts connected</p>
          <Button onClick={() => setStep('select')}>
            <Calendar className="h-4 w-4 mr-2" />
            Connect Your First Calendar
          </Button>
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Tip:</strong> Click reconnect to refresh your calendar connection if sync is not working.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderListAccounts = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Choose a calendar provider to sync your appointments
      </p>

      <div className="grid gap-3">
        {calendarProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleProviderSelect(provider.id)}
            className={`${provider.color} transition-colors rounded-lg p-4 text-left w-full`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{provider.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium">{provider.name}</h4>
                <p className="text-sm opacity-80 mt-1">{provider.description}</p>
              </div>
              <Calendar className="h-5 w-5 opacity-50" />
            </div>
          </button>
        ))}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Two-way sync enabled:</strong> Changes in your calendar will sync to CRM appointments, and vice versa.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderOAuthStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${
          selectedProvider === 'google' ? 'bg-blue-100' : 'bg-cyan-100'
        } mb-4`}>
          <Calendar className={`h-8 w-8 ${
            selectedProvider === 'google' ? 'text-blue-600' : 'text-cyan-600'
          }`} />
        </div>
        <h3 className="font-medium text-lg mb-2">
          Connect {selectedProvider === 'google' ? 'Google' : 'Outlook'} Calendar
        </h3>
        <p className="text-sm text-gray-600">
          Authorize access to sync your calendar events with ProSpaces CRM
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Calendar Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`Enter your ${selectedProvider === 'google' ? 'Google' : 'Outlook'} email`}
            disabled={isConnecting}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            You'll be redirected to {selectedProvider === 'google' ? 'Google' : 'Microsoft'} to authorize calendar access. 
            We only request permissions to read and write calendar events.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('list')}
          disabled={isConnecting}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleOAuthConnect}
          disabled={isConnecting || !email.trim()}
          className="flex-1"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Connect Calendar
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="font-medium text-lg mb-2">Calendar Connected!</h3>
      <p className="text-sm text-gray-600">
        Your {selectedProvider === 'google' ? 'Google' : 'Outlook'} Calendar is now synced with ProSpaces CRM
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'list' && (existingAccounts.length > 0 ? 'Manage Calendars' : 'Connect Calendar')}
            {step === 'select' && 'Connect Calendar'}
            {step === 'oauth' && 'Authorize Calendar Access'}
            {step === 'success' && 'Success!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'list' && (existingAccounts.length > 0 ? 'View and manage your connected calendar accounts' : 'Sync your appointments with your personal calendar')}
            {step === 'select' && 'Sync your appointments with your personal calendar'}
            {step === 'oauth' && 'Grant ProSpaces permission to sync calendar events'}
            {step === 'success' && 'Your calendar is ready to sync'}
          </DialogDescription>
        </DialogHeader>

        {step === 'list' && (existingAccounts.length > 0 ? renderManageAccounts() : renderListAccounts())}
        {step === 'select' && renderListAccounts()}
        {step === 'oauth' && renderOAuthStep()}
        {step === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  );
}