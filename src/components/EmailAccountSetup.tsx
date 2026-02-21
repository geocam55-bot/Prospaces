import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Mail, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

// Function to find the active function name
// The Edge Function is accessed via /functions/v1/make-server-8405be07
const SERVER_FUNCTION_BASE = (supabaseUrl: string) => 
  `${supabaseUrl}/functions/v1`;

async function findActiveFunctionName(supabaseUrl: string, accessToken?: string): Promise<string> {
  // Verify the server function is reachable via the correct health endpoint
  try {
    const url = `${SERVER_FUNCTION_BASE(supabaseUrl)}/make-server-8405be07/health`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok || response.status === 401) {
      return 'server';
    }
  } catch (e) {
    console.warn('[EmailSetup] Health check failed:', e);
  }

  return 'server'; // Default - function is always named "server"
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
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to connect an email account. Please log out and log back in.');
      }

      // Call OAuth init endpoint
      const endpoint = selectedProvider === 'gmail' 
        ? '/make-server-8405be07/google-oauth-init'
        : selectedProvider === 'outlook'
        ? '/make-server-8405be07/microsoft-oauth-init'
        : null;

      if (!endpoint) {
        throw new Error(`${selectedProvider} is not yet supported`);
      }

      console.log(`[OAuth] Calling ${endpoint}`);
      console.log(`[OAuth] Full URL: ${supabaseUrl}/functions/v1${endpoint}`);
      console.log(`[OAuth] Headers: Authorization=Bearer <anonKey>, X-User-Token=<${session.access_token?.length || 0} chars>`);

      const response = await fetch(`${supabaseUrl}/functions/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-User-Token': session.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OAuth] Error response from ${endpoint}:`, response.status, errorText);
        console.error(`[OAuth] Response headers:`, Object.fromEntries(response.headers.entries()));
        throw new Error(`OAuth init failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data?.success || !data?.authUrl) {
        throw new Error(data?.error || 'Failed to generate authorization URL.');
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

      // Track whether we've already handled the result
      let oauthHandled = false;

      const handleOAuthResult = (resultData: { type: string; account?: any; error?: string }) => {
        if (oauthHandled) return;
        oauthHandled = true;

        // Clean up listeners
        window.removeEventListener('message', handleMessage);
        if (pollInterval) clearInterval(pollInterval);
        if (popupCheckInterval) clearInterval(popupCheckInterval);

        if (resultData.type === 'gmail-oauth-success' || resultData.type === 'outlook-oauth-success') {
          console.log('[EmailAccountSetup] OAuth success:', resultData.type);
          setIsConnecting(false);
          setStep('success');
          
          const account: EmailAccount = {
            id: resultData.account.id,
            provider: selectedProvider,
            email: resultData.account.email,
            connected: true,
            lastSync: resultData.account.last_sync,
          };
          
          // Close popup if still open
          try { if (popup && !popup.closed) popup.close(); } catch (e) {}
          
          setTimeout(() => {
            onAccountAdded(account);
            handleClose();
            toast.success(`${providerName} account connected successfully!`);
          }, 1500);
        } else if (resultData.type === 'gmail-oauth-error' || resultData.type === 'outlook-oauth-error') {
          console.log('[EmailAccountSetup] OAuth error:', resultData.error);
          setIsConnecting(false);
          setError(resultData.error || `Failed to connect ${providerName} account`);
        }
      };

      // Method 1: Listen for postMessage from popup (works when window.opener is intact)
      const handleMessage = (event: MessageEvent) => {
        if (!event.origin.includes('supabase.co') && event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data.type === 'gmail-oauth-success' || event.data.type === 'outlook-oauth-success') {
          handleOAuthResult(event.data);
        } else if (event.data.type === 'gmail-oauth-error' || event.data.type === 'outlook-oauth-error') {
          handleOAuthResult(event.data);
        }
      };

      window.addEventListener('message', handleMessage);

      // Method 2: Poll server for result (fallback when cross-origin redirects break window.opener)
      let pollInterval: ReturnType<typeof setInterval> | null = null;
      const pollId = data.pollId;
      
      if (pollId) {
        let pollAttempts = 0;
        const maxPollAttempts = 120; // 2 minutes at 1s interval
        
        pollInterval = setInterval(async () => {
          if (oauthHandled) {
            if (pollInterval) clearInterval(pollInterval);
            return;
          }
          
          pollAttempts++;
          if (pollAttempts > maxPollAttempts) {
            if (pollInterval) clearInterval(pollInterval);
            return;
          }

          try {
            const pollResponse = await fetch(
              `${supabaseUrl}/functions/v1/make-server-8405be07/oauth-poll/${pollId}`,
              {
                headers: { 'Authorization': `Bearer ${publicAnonKey}` }
              }
            );
            
            if (pollResponse.ok) {
              const pollResult = await pollResponse.json();
              if (pollResult && !pollResult.pending) {
                console.log('[EmailAccountSetup] OAuth poll result received:', pollResult);
                const messageType = pollResult.success 
                  ? (selectedProvider === 'gmail' ? 'gmail-oauth-success' : 'outlook-oauth-success')
                  : (selectedProvider === 'gmail' ? 'gmail-oauth-error' : 'outlook-oauth-error');
                handleOAuthResult({ 
                  type: messageType, 
                  account: pollResult.account, 
                  error: pollResult.error 
                });
              }
            }
          } catch (pollErr) {
            console.warn('[EmailAccountSetup] Poll error (will retry):', pollErr);
          }
        }, 1000);
      }

      // Method 3: Detect popup closed without success
      let popupCheckInterval: ReturnType<typeof setInterval> | null = null;
      popupCheckInterval = setInterval(() => {
        if (popup?.closed) {
          if (popupCheckInterval) clearInterval(popupCheckInterval);
          // Give polling a few more seconds after popup closes
          setTimeout(() => {
            if (!oauthHandled) {
              if (pollInterval) clearInterval(pollInterval);
              window.removeEventListener('message', handleMessage);
              setIsConnecting(false);
            }
          }, 5000);
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
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to connect an email account. Please log out and log back in.');
      }

      const functionName = await findActiveFunctionName(supabaseUrl, session.access_token);
      
      const payload = {
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
      };

      const { data, error: invokeError } = await supabase.functions.invoke(functionName, {
         body: payload
      });

      if (invokeError) {
        // Attempt fallback fetch to get the real error body
        try {
            const fallbackUrl = `${supabaseUrl}/functions/v1/${functionName}`;
            const fallbackResponse = await fetch(fallbackUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const fallbackText = await fallbackResponse.text();
            try {
                const fallbackJson = JSON.parse(fallbackText);
                if (fallbackJson.error) throw new Error(fallbackJson.error);
            } catch (e) {
                if (fallbackText && fallbackText.length < 200) throw new Error(fallbackText);
            }
        } catch (fallbackErr: any) {
             if (fallbackErr.message && fallbackErr.message !== 'Failed to fetch') throw fallbackErr;
        }

         throw new Error(`Failed to connect IMAP: ${invokeError.message}`);
      }

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

      setTimeout(() => {
        onAccountAdded(account);
        handleClose();
        toast.success('IMAP account connected successfully!');
      }, 1500);

    } catch (err: any) {
      setIsConnecting(false);
      
      let errorMessage = err.message || 'Failed to connect IMAP account';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('not configured')) {
        errorMessage = 'Email backend not deployed yet or unreachable.';
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white text-gray-900 [&_*]:text-inherit">
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-gray-900">Add Email Account</DialogTitle>
              <DialogDescription className="text-gray-600">
                Choose how you want to connect your email account
              </DialogDescription>
            </DialogHeader>

            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Connection Help:</strong>
                <br />
                The system will automatically detect available email services.
                <br />
                If connections fail, check "Settings / Email Status" for diagnostics.
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
                    OAuth integration requires backend OAuth credentials to be configured by your administrator.
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
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    placeholder="user@example.com"
                    value={imapUsername}
                    onChange={(e) => {
                      setImapUsername(e.target.value);
                      setEmail(e.target.value);
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="imapHost">IMAP Host</Label>
                    <Input
                      id="imapHost"
                      placeholder="imap.example.com"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imapPort">Port</Label>
                    <Input
                      id="imapPort"
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPassword">Password (App Password recommended)</Label>
                  <Input
                    id="imapPassword"
                    type="password"
                    placeholder="••••••••"
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                  />
                </div>
                
                <div className="border-t pt-4 mt-2">
                   <Label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">SMTP Settings (Sending)</Label>
                   <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        placeholder="smtp.example.com"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Port</Label>
                      <Input
                        id="smtpPort"
                        placeholder="465"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
                  Cancel
                </Button>
                <Button onClick={handleIMAPConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Account'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
        
        {step === 'success' && (
           <div className="flex flex-col items-center justify-center py-6 space-y-4">
             <CheckCircle className="h-16 w-16 text-green-500" />
             <h3 className="text-xl font-medium">Account Connected!</h3>
             <p className="text-center text-gray-500">
               Your email account has been successfully connected and is now syncing.
             </p>
           </div>
        )}
      </DialogContent>
    </Dialog>
  );
}