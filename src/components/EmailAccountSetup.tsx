import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Mail, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

// Cache backend availability check to avoid repeated failed requests
// This prevents console spam from 404 errors when Edge Functions aren't deployed
let backendAvailabilityCache: { checked: boolean; available: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // Cache for 1 minute

interface EmailAccountSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: (account: EmailAccount) => void;
  editingAccount?: EmailAccount | null;
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
}

export function EmailAccountSetup({ isOpen, onClose, onAccountAdded, editingAccount }: EmailAccountSetupProps) {
  const [step, setStep] = useState<'select' | 'oauth' | 'imap' | 'success'>('select');
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'outlook' | 'apple' | 'imap' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [error, setError] = useState('');

  // Populate form when editing an account
  useEffect(() => {
    if (editingAccount && isOpen) {
      if (editingAccount.imapConfig) {
        setStep('imap');
        setSelectedProvider('imap');
        setImapHost(editingAccount.imapConfig.host);
        setImapPort(editingAccount.imapConfig.port.toString());
        setImapUsername(editingAccount.imapConfig.username);
        setImapPassword(editingAccount.imapConfig.password);
        
        if (editingAccount.smtpConfig) {
          setSmtpHost(editingAccount.smtpConfig.host);
          setSmtpPort(editingAccount.smtpConfig.port.toString());
        }
      }
    } else if (!isOpen) {
      // Reset form when dialog closes
      setStep('select');
      setSelectedProvider(null);
      setEmail('');
      setImapHost('');
      setImapPort('993');
      setImapUsername('');
      setImapPassword('');
      setSmtpHost('');
      setSmtpPort('465');
      setError('');
    }
  }, [editingAccount, isOpen]);

  // Auto-fill SMTP settings based on IMAP host
  useEffect(() => {
    if (imapHost) {
      const smtpMap: { [key: string]: { host: string; port: string } } = {
        'imap.gmail.com': { host: 'smtp.gmail.com', port: '465' },
        'outlook.office365.com': { host: 'smtp.office365.com', port: '587' },
        'imap.mail.yahoo.com': { host: 'smtp.mail.yahoo.com', port: '465' },
      };
      
      const smtp = smtpMap[imapHost];
      if (smtp && !smtpHost) {
        setSmtpHost(smtp.host);
        setSmtpPort(smtp.port);
      }
    }
  }, [imapHost]);

  const oauthProviders = [
    {
      id: 'gmail' as const,
      name: 'Gmail',
      description: 'Connect your Google Workspace or Gmail account',
      icon: '📧',
      color: 'bg-red-100 text-red-600 hover:bg-red-200',
    },
    {
      id: 'outlook' as const,
      name: 'Microsoft Outlook',
      description: 'Connect your Microsoft 365 or Outlook.com account',
      icon: '📨',
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    },
    {
      id: 'apple' as const,
      name: 'Apple Mail',
      description: 'Connect your iCloud Mail account',
      icon: '✉️',
      color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    },
  ];

  const handleOAuthProviderSelect = (provider: 'gmail' | 'outlook' | 'apple') => {
    setSelectedProvider(provider);
    setStep('oauth');
    setError('');
  };

  const handleIMAPSelect = () => {
    setSelectedProvider('imap');
    setStep('imap');
    setError('');
  };

  const handleOAuthConnect = async () => {
    if (!selectedProvider || selectedProvider === 'imap') return;

    setIsConnecting(true);
    setError('');

    try {
      const supabaseUrl = `https://${projectId}.supabase.co`;
      
      // Get the access token from Supabase session (more reliable than localStorage)
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to connect an email account. Please log out and log back in.');
      }

      // Use Azure OAuth for Outlook, Nylas for Gmail/Apple
      const isOutlook = selectedProvider === 'outlook';
      const endpoint = isOutlook ? 'make-server-8405be07/azure-oauth-init' : 'nylas-connect';
      
      console.log('Attempting to connect to:', `${supabaseUrl}/functions/v1/${endpoint}`);
      console.log('Using access token:', session.access_token.substring(0, 20) + '...');

      // Call appropriate OAuth function
      const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider, // Send original provider name: 'gmail', 'outlook', 'apple'
          email: email || `user@${selectedProvider}.com`, // Email will be determined after OAuth
        }),
      }).catch((fetchError) => {
        console.error('Fetch error details:', fetchError);
        throw new Error(
          `Unable to connect to email backend. The Edge Functions may not be deployed yet.`
        );
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth init error response:', errorText);
        
        let errorMessage = '';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorText;
        } catch {
          errorMessage = errorText;
        }
        
        if (response.status === 404) {
          throw new Error(
            'Email integration backend not found. The Edge Functions need to be deployed.'
          );
        } else if (response.status === 401) {
          throw new Error('Unauthorized. Please log out and log back in.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please ensure your account has email permissions enabled.');
        } else {
          throw new Error(`Failed to initialize OAuth (${response.status}): ${errorMessage}`);
        }
      }

      const data = await response.json();
      console.log('OAuth init response:', data);
      console.log('OAuth init response - has authUrl?', !!data?.authUrl);
      console.log('OAuth init response - authUrl value:', data?.authUrl);
      console.log('OAuth init response - all keys:', Object.keys(data));

      if (!data?.success || !data?.authUrl) {
        console.error('Invalid response structure:', data);
        throw new Error(data?.error || `Failed to generate authorization URL. Nylas response: ${JSON.stringify(data)}`);
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const providerName = getProviderInfo()?.name || 'Email';
      const popup = window.open(
        data.authUrl,
        `${providerName} OAuth`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        console.log('[EmailAccountSetup] Message received:', {
          origin: event.origin,
          type: event.data?.type,
          hasAccount: !!event.data?.account,
          fullData: event.data
        });
        
        // Only accept messages from our Supabase domain
        if (!event.origin.includes('supabase.co')) {
          console.log('[EmailAccountSetup] Ignoring message from non-Supabase origin:', event.origin);
          return;
        }

        if (event.data.type === 'gmail-oauth-success' || event.data.type === 'nylas-oauth-success' || event.data.type === 'outlook-oauth-success' || event.data.type === 'microsoft-oauth-success' || event.data.type === 'azure-oauth-success') {
          console.log('[EmailAccountSetup] OAuth success message received!');
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          setStep('success');
          
          // Convert Supabase account to EmailAccount format
          const account: EmailAccount = {
            id: event.data.account.id,
            provider: selectedProvider,
            email: event.data.account.email,
            connected: true,
            lastSync: event.data.account.last_sync,
          };
          
          console.log('[EmailAccountSetup] Converted account:', account);
          
          setTimeout(() => {
            onAccountAdded(account);
            handleClose();
            toast.success(`${providerName} account connected successfully!`);
          }, 1500);
        } else if (event.data.type === 'gmail-oauth-error' || event.data.type === 'nylas-oauth-error' || event.data.type === 'outlook-oauth-error') {
          console.log('[EmailAccountSetup] OAuth error message received:', event.data.error);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          setError(event.data.error || `Failed to connect ${providerName} account`);
        }
      };

      console.log('[EmailAccountSetup] Adding message listener');
      window.addEventListener('message', handleMessage);

      // Handle popup closed before OAuth completed
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          console.log('[EmailAccountSetup] Popup was closed');
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          if (isConnecting) {
            setIsConnecting(false);
            setError('OAuth cancelled - popup was closed before completing authentication');
          }
        }
      }, 500);

    } catch (err: any) {
      setIsConnecting(false);
      setError(err.message || 'Failed to initiate OAuth flow');
      console.error('OAuth error:', err);
    }
  };

  const handleIMAPConnect = async () => {
    if (!imapHost || !imapPort || !imapUsername || !imapPassword || !smtpHost || !smtpPort) {
      setError('Please fill in all IMAP configuration fields');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const supabaseUrl = `https://${projectId}.supabase.co`;
      
      // Get the access token from Supabase session (more reliable than localStorage)
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to connect an email account. Please log out and log back in.');
      }

      // Check if the backend is available (silently - errors are expected if not deployed)
      let backendAvailable = false;
      if (backendAvailabilityCache && (Date.now() - backendAvailabilityCache.timestamp < CACHE_DURATION)) {
        backendAvailable = backendAvailabilityCache.available;
      } else {
        try {
          // Use a very short timeout and catch all errors silently
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
          
          const testResponse = await fetch(`${supabaseUrl}/functions/v1/nylas-connect`, {
            method: 'HEAD',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          backendAvailable = testResponse.ok;
        } catch (error) {
          // Silently fail - Edge Functions not deployed is expected for many users
          // No logging needed as this is a normal scenario
          backendAvailable = false;
        }
        backendAvailabilityCache = { checked: true, available: backendAvailable, timestamp: Date.now() };
      }

      if (!backendAvailable) {
        // Backend not available - store configuration locally for demo purposes
        const account: EmailAccount = {
          id: editingAccount?.id || crypto.randomUUID(),
          provider: 'imap',
          email: imapUsername,
          connected: false, // Mark as not connected since backend isn't available
          lastSync: undefined,
          imapConfig: {
            host: imapHost,
            port: parseInt(imapPort),
            username: imapUsername,
            password: imapPassword,
          },
          smtpConfig: {
            host: smtpHost,
            port: parseInt(smtpPort),
            username: imapUsername,
            password: imapPassword,
          },
        };

        setIsConnecting(false);
        
        // Show warning instead of success
        onAccountAdded(account);
        handleClose();
        toast.warning('Email configuration saved locally. Deploy backend functions to enable live email syncing.');
        return;
      }

      // Call Nylas connect function for IMAP using fetch
      const response = await fetch(`${supabaseUrl}/functions/v1/nylas-connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'imap',
          email: imapUsername,
          imapConfig: {
            host: imapHost,
            port: parseInt(imapPort),
            username: imapUsername,
            password: imapPassword,
          },
          smtpConfig: {
            host: smtpHost,
            port: parseInt(smtpPort),
            username: imapUsername,
            password: imapPassword,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to connect IMAP: ${errorText}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to connect IMAP account');
      }

      // Account connected successfully
      const account: EmailAccount = {
        id: data.account?.id || (editingAccount?.id || Date.now().toString()),
        provider: 'imap',
        email: imapUsername,
        connected: true,
        lastSync: data.account?.last_sync || new Date().toISOString(),
        imapConfig: {
          host: imapHost,
          port: parseInt(imapPort),
          username: imapUsername,
          password: imapPassword,
        },
        smtpConfig: {
          host: smtpHost,
          port: parseInt(smtpPort),
          username: imapUsername,
          password: imapPassword,
        },
      };

      setIsConnecting(false);
      setStep('success');

      // Add/Update account after a short delay to show success message
      setTimeout(() => {
        onAccountAdded(account);
        handleClose();
        toast.success('IMAP account connected successfully!');
      }, 1500);

    } catch (err: any) {
      setIsConnecting(false);
      
      // Provide helpful error messages
      let errorMessage = err.message || 'Failed to connect IMAP account';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Nylas') || errorMessage.includes('not configured')) {
        errorMessage = '⚠️ Email backend not deployed yet.\n\nTo use live email (IMAP or OAuth), you need to deploy the backend functions first. See deployment guides for instructions.';
      }
      
      setError(errorMessage);
      console.error('IMAP connection error:', err);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedProvider(null);
    setImapHost('');
    setImapPort('993');
    setImapUsername('');
    setImapPassword('');
    setSmtpHost('');
    setSmtpPort('465');
    setError('');
    setIsConnecting(false);
    onClose();
  };

  const getProviderInfo = () => {
    return oauthProviders.find(p => p.id === selectedProvider);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Add Email Account</DialogTitle>
              <DialogDescription>
                Choose how you want to connect your email account
              </DialogDescription>
            </DialogHeader>

            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>⚠️ Edge Functions Required for OAuth</strong>
                <br />
                To use OAuth (Gmail/Outlook), you need to deploy the Nylas Edge Functions first.
                <br />
                <br />
                <strong>Quick options:</strong>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Deploy functions: See deployment guide files</li>
                  <li>Use IMAP/SMTP below (manual setup, works immediately)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="imap" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="imap">IMAP/SMTP (Recommended)</TabsTrigger>
                <TabsTrigger value="oauth">OAuth</TabsTrigger>
              </TabsList>

              <TabsContent value="imap" className="space-y-3 mt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recommended:</strong> Use IMAP/SMTP for direct email access. You'll need your email provider's server settings and an app-specific password.
                  </AlertDescription>
                </Alert>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={handleIMAPSelect}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100 text-blue-600">
                        🔒
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm text-gray-900 mb-1">IMAP/SMTP Connection</h3>
                        <p className="text-xs text-gray-600">Configure with your email server settings</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="oauth" className="space-y-3 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    OAuth integration requires backend OAuth credentials to be configured by your administrator. IMAP/SMTP is recommended for most users.
                  </AlertDescription>
                </Alert>
                {oauthProviders.map((provider) => (
                  <Card
                    key={provider.id}
                    className="cursor-pointer hover:shadow-md transition-shadow opacity-60"
                    onClick={() => handleOAuthProviderSelect(provider.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${provider.color}`}>
                          {provider.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm text-gray-900 mb-1">{provider.name}</h3>
                          <p className="text-xs text-gray-600">{provider.description}</p>
                          <p className="text-xs text-orange-600 mt-1">Requires OAuth setup</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Connect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Your email credentials are securely stored and encrypted. We only access emails you explicitly sync.
              </AlertDescription>
            </Alert>
          </>
        )}

        {step === 'oauth' && selectedProvider && selectedProvider !== 'imap' && (
          <>
            <DialogHeader>
              <DialogTitle>Connect {getProviderInfo()?.name}</DialogTitle>
              <DialogDescription>
                {selectedProvider === 'gmail' ? 'OAuth2 authentication with Google' : 'OAuth authentication for ' + getProviderInfo()?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center text-3xl ${getProviderInfo()?.color}`}>
                  {getProviderInfo()?.icon}
                </div>
              </div>

              {selectedProvider === 'outlook' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Microsoft 365 / Outlook:</strong>
                    <br />
                    You will be redirected to Microsoft to log in.
                    <br />
                    If your organization uses <strong>Microsoft Authenticator</strong>, please have your device ready to approve the login request.
                  </AlertDescription>
                </Alert>
              )}

              {selectedProvider === 'gmail' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Gmail OAuth Setup:</strong>
                    <br />
                    Click below to authenticate with Google. You'll be redirected to Google's secure login page to grant access to your Gmail account.
                    <br />
                    <br />
                    <strong>Note:</strong> OAuth must be configured by your administrator. See deployment guides for details.
                  </AlertDescription>
                </Alert>
              )}

              {selectedProvider !== 'gmail' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>OAuth Setup Required</strong>
                    <br />
                    To use OAuth authentication, your administrator needs to configure:
                    <ul className="mt-2 ml-4 text-xs space-y-1">
                      <li>• {selectedProvider === 'outlook' ? 'Azure AD app registration' : 'Apple Developer credentials'}</li>
                      <li>• OAuth 2.0 client credentials</li>
                      <li>• Authorized redirect URIs</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="whitespace-pre-line">{error}</div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleOAuthConnect}
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? 'Connecting...' : `Connect ${getProviderInfo()?.name}`}
                </Button>
                <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'imap' && (
          <>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account Settings' : 'IMAP/SMTP Configuration'}</DialogTitle>
              <DialogDescription>
                Enter your email server settings and credentials
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Common IMAP Settings:</strong>
                  <br />
                  Gmail: imap.gmail.com:993 (use app-specific password)
                  <br />
                  Outlook: outlook.office365.com:993
                  <br />
                  Yahoo: imap.mail.yahoo.com:993
                  <br />
                  <a 
                    href="https://myaccount.google.com/apppasswords" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-1 inline-block"
                  >
                    → Create Gmail App Password
                  </a>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="imap-host">IMAP Server</Label>
                  <Input
                    id="imap-host"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-port">Port</Label>
                  <Input
                    id="imap-port"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    placeholder="993"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imap-security">Security</Label>
                  <Input
                    id="imap-security"
                    value="SSL/TLS"
                    disabled
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="imap-username">Username/Email</Label>
                  <Input
                    id="imap-username"
                    type="email"
                    value={imapUsername}
                    onChange={(e) => setImapUsername(e.target.value)}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="imap-password">Password</Label>
                  <Input
                    id="imap-password"
                    type="password"
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                    placeholder="App-specific password recommended"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="smtp-host">SMTP Server</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-security">Security</Label>
                  <Input
                    id="smtp-security"
                    value="SSL/TLS"
                    disabled
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  For Gmail and other providers with 2FA, you'll need to create an app-specific password instead of your regular password.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="whitespace-pre-line">{error}</div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleIMAPConnect}
                  disabled={!imapHost || !imapPort || !imapUsername || !imapPassword || !smtpHost || !smtpPort || isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Account'}
                </Button>
                <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Account Connected!</DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg text-gray-900 mb-2">Successfully Connected</h3>
              <p className="text-sm text-gray-600">
                Your email account has been connected and is ready to use.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}