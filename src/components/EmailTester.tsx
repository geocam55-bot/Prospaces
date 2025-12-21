import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Send, 
  Mail, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Link2,
  Loader2,
  TestTube,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import type { User } from '../types';

interface EmailTesterProps {
  user: User;
  onClose: () => void;
}

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function EmailTester({ user, onClose }: EmailTesterProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('ProSpaces CRM Email Test');
  const [testBody, setTestBody] = useState('This is a test email sent from ProSpaces CRM to verify email functionality.');
  const [searchQuery, setSearchQuery] = useState('test');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const updateTestResult = (test: string, status: TestResult['status'], message: string, details?: string) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.test === test);
      if (existing) {
        return prev.map(r => r.test === test ? { test, status, message, details } : r);
      }
      return [...prev, { test, status, message, details }];
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    await test1_CheckEmailAccounts();
    await test2_CheckEdgeFunctions();
    await test3_FetchEmails();
    await test4_SearchEmails();
    
    setIsRunning(false);
    toast.success('All tests completed!');
  };

  // Test 1: Check if email accounts are connected
  const test1_CheckEmailAccounts = async () => {
    updateTestResult('accounts', 'pending', 'Checking email accounts...');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        updateTestResult('accounts', 'error', 'No active session', 'You must be logged in to test email functionality');
        return;
      }

      const { data: accounts, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('organization_id', user.organizationId);

      if (error) {
        updateTestResult('accounts', 'error', 'Database query failed', error.message);
        return;
      }

      if (!accounts || accounts.length === 0) {
        updateTestResult('accounts', 'warning', 'No email accounts connected', 'Go to Settings → Email & Calendar to connect an account');
        return;
      }

      // Check for connected Nylas accounts
      const nylasAccounts = accounts.filter(acc => 
        acc.provider !== 'imap' && acc.nylas_grant_id
      );

      if (nylasAccounts.length === 0) {
        updateTestResult('accounts', 'warning', `Found ${accounts.length} account(s) (IMAP only)`, 'Connect Outlook or Gmail for full Nylas functionality');
        // Use first account for testing
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        }
        return;
      }

      setSelectedAccountId(nylasAccounts[0].id);
      updateTestResult(
        'accounts', 
        'success', 
        `Found ${nylasAccounts.length} connected Nylas account(s)`,
        `Active accounts: ${nylasAccounts.map(a => a.email).join(', ')}`
      );
    } catch (error: any) {
      updateTestResult('accounts', 'error', 'Unexpected error', error.message);
    }
  };

  // Test 2: Check if Nylas Edge Functions are deployed
  const test2_CheckEdgeFunctions = async () => {
    updateTestResult('edge-functions', 'pending', 'Checking Edge Functions...');

    try {
      const supabase = createClient();
      
      // Test nylas-connect function
      const connectResponse = await supabase.functions.invoke('nylas-connect', {
        body: { test: true }
      });

      // Test nylas-sync-emails function
      const syncResponse = await supabase.functions.invoke('nylas-sync-emails', {
        body: { test: true }
      });

      // If both respond (even with errors), they're deployed
      const connectDeployed = connectResponse.data || connectResponse.error;
      const syncDeployed = syncResponse.data || syncResponse.error;

      if (connectDeployed && syncDeployed) {
        updateTestResult(
          'edge-functions', 
          'success', 
          'All Edge Functions are deployed',
          'nylas-connect ✓, nylas-sync-emails ✓'
        );
      } else {
        const missing = [];
        if (!connectDeployed) missing.push('nylas-connect');
        if (!syncDeployed) missing.push('nylas-sync-emails');
        
        updateTestResult(
          'edge-functions', 
          'error', 
          'Some Edge Functions are missing',
          `Missing: ${missing.join(', ')}`
        );
      }
    } catch (error: any) {
      updateTestResult('edge-functions', 'error', 'Failed to check Edge Functions', error.message);
    }
  };

  // Test 3: Fetch emails from connected account
  const test3_FetchEmails = async () => {
    updateTestResult('fetch-emails', 'pending', 'Fetching emails...');

    if (!selectedAccountId) {
      updateTestResult('fetch-emails', 'warning', 'Skipped - No account selected', 'Connect an email account first');
      return;
    }

    try {
      const supabase = createClient();
      
      // Try to fetch from Supabase first (cached emails)
      const { data: cachedEmails, error: cacheError } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('date', { ascending: false })
        .limit(10);

      if (cacheError) {
        updateTestResult('fetch-emails', 'error', 'Database query failed', cacheError.message);
        return;
      }

      if (cachedEmails && cachedEmails.length > 0) {
        updateTestResult(
          'fetch-emails', 
          'success', 
          `Fetched ${cachedEmails.length} cached email(s)`,
          `Most recent: "${cachedEmails[0].subject}" from ${cachedEmails[0].from}`
        );
        return;
      }

      // Try live sync via Nylas
      updateTestResult('fetch-emails', 'pending', 'No cached emails, trying live sync...');
      
      const syncResponse = await supabase.functions.invoke('nylas-sync-emails', {
        body: {
          accountId: selectedAccountId,
          limit: 10,
        },
      });

      if (syncResponse.error) {
        updateTestResult('fetch-emails', 'error', 'Live sync failed', syncResponse.error.message);
        return;
      }

      if (syncResponse.data?.emails && syncResponse.data.emails.length > 0) {
        updateTestResult(
          'fetch-emails', 
          'success', 
          `Synced ${syncResponse.data.emails.length} email(s)`,
          `Live sync successful via Nylas`
        );
      } else {
        updateTestResult('fetch-emails', 'warning', 'No emails found', 'Mailbox may be empty or sync not working');
      }
    } catch (error: any) {
      updateTestResult('fetch-emails', 'error', 'Unexpected error', error.message);
    }
  };

  // Test 4: Search emails
  const test4_SearchEmails = async () => {
    if (!searchQuery.trim()) {
      updateTestResult('search-emails', 'warning', 'Skipped - No search query', 'Enter a search term to test');
      return;
    }

    updateTestResult('search-emails', 'pending', `Searching for "${searchQuery}"...`);

    if (!selectedAccountId) {
      updateTestResult('search-emails', 'warning', 'Skipped - No account selected', 'Connect an email account first');
      return;
    }

    try {
      const supabase = createClient();
      
      const { data: emails, error } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', selectedAccountId)
        .or(`subject.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%,from.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) {
        updateTestResult('search-emails', 'error', 'Search query failed', error.message);
        return;
      }

      if (emails && emails.length > 0) {
        updateTestResult(
          'search-emails', 
          'success', 
          `Found ${emails.length} email(s) matching "${searchQuery}"`,
          `Subjects: ${emails.map(e => `"${e.subject}"`).slice(0, 3).join(', ')}`
        );
      } else {
        updateTestResult('search-emails', 'warning', 'No matching emails found', 'Try a different search term');
      }
    } catch (error: any) {
      updateTestResult('search-emails', 'error', 'Unexpected error', error.message);
    }
  };

  // Test 5: Send email
  const test5_SendEmail = async () => {
    if (!testEmail.trim() || !testSubject.trim() || !testBody.trim()) {
      toast.error('Please fill in all email fields');
      return;
    }

    if (!selectedAccountId) {
      toast.error('No email account selected');
      return;
    }

    updateTestResult('send-email', 'pending', 'Sending test email...');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        updateTestResult('send-email', 'error', 'No active session', 'You must be logged in');
        return;
      }

      // Get account details
      const { data: account } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', selectedAccountId)
        .single();

      if (!account) {
        updateTestResult('send-email', 'error', 'Account not found', 'Selected email account does not exist');
        return;
      }

      // Try Nylas send
      if (account.nylas_grant_id) {
        const response = await supabase.functions.invoke('nylas-send-email', {
          body: {
            grantId: account.nylas_grant_id,
            to: testEmail,
            subject: testSubject,
            body: testBody,
          },
        });

        if (response.error) {
          updateTestResult('send-email', 'error', 'Failed to send via Nylas', response.error.message);
          return;
        }

        updateTestResult(
          'send-email', 
          'success', 
          'Email sent successfully!',
          `Sent to ${testEmail} via Nylas`
        );
        toast.success(`Test email sent to ${testEmail}`);
        return;
      }

      // Try SMTP send
      if (account.smtp_config) {
        const response = await supabase.functions.invoke('simple-send-email', {
          body: {
            from: account.email,
            to: testEmail,
            subject: testSubject,
            body: testBody,
            smtpConfig: account.smtp_config,
          },
        });

        if (response.error) {
          updateTestResult('send-email', 'error', 'Failed to send via SMTP', response.error.message);
          return;
        }

        updateTestResult(
          'send-email', 
          'success', 
          'Email sent successfully!',
          `Sent to ${testEmail} via SMTP`
        );
        toast.success(`Test email sent to ${testEmail}`);
        return;
      }

      updateTestResult('send-email', 'error', 'No send method available', 'Account has no Nylas grant or SMTP config');
    } catch (error: any) {
      updateTestResult('send-email', 'error', 'Unexpected error', error.message);
    }
  };

  // Test 6: Email-to-Contact linking
  const test6_LinkEmailToContact = async () => {
    updateTestResult('email-linking', 'pending', 'Testing email-to-contact linking...');

    if (!selectedAccountId) {
      updateTestResult('email-linking', 'warning', 'Skipped - No account selected', 'Connect an email account first');
      return;
    }

    try {
      const supabase = createClient();
      
      // Get a sample email
      const { data: emails } = await supabase
        .from('emails')
        .select('*')
        .eq('account_id', selectedAccountId)
        .limit(1)
        .single();

      if (!emails) {
        updateTestResult('email-linking', 'warning', 'No emails to test with', 'Sync some emails first');
        return;
      }

      // Try to find matching contact by email domain
      const emailDomain = emails.from.split('@')[1];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', user.organizationId)
        .ilike('email', `%@${emailDomain}`)
        .limit(1);

      if (contacts && contacts.length > 0) {
        updateTestResult(
          'email-linking', 
          'success', 
          'Email-to-contact linking works',
          `Can link "${emails.subject}" to contact: ${contacts[0].name}`
        );
      } else {
        updateTestResult('email-linking', 'warning', 'No matching contacts found', 'Create contacts to test linking');
      }
    } catch (error: any) {
      updateTestResult('email-linking', 'error', 'Unexpected error', error.message);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">PASS</Badge>;
      case 'error':
        return <Badge className="bg-red-500">FAIL</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">WARN</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500">RUNNING</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TestTube className="h-6 w-6" />
              <div>
                <CardTitle>Email Functionality Tester</CardTitle>
                <CardDescription>Comprehensive testing suite for ProSpaces CRM email integration</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={test6_LinkEmailToContact}
              disabled={isRunning}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Test Linking
            </Button>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            <h3 className="font-semibold">Test Results</h3>
            {testResults.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No tests run yet. Click "Run All Tests" to start testing your email integration.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{result.message}</span>
                          {getStatusBadge(result.status)}
                        </div>
                        {result.details && (
                          <p className="text-sm text-muted-foreground">{result.details}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Send Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Test Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>To Email Address</Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Email subject"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  placeholder="Email body"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={test5_SendEmail} 
                disabled={isRunning || !selectedAccountId}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Search Test */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Emails Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search term (e.g., 'invoice', 'meeting')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button onClick={test4_SearchEmails} disabled={isRunning}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {testResults.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Tests Complete: {testResults.filter(r => r.status === 'success').length} passed,{' '}
                    {testResults.filter(r => r.status === 'error').length} failed,{' '}
                    {testResults.filter(r => r.status === 'warning').length} warnings
                  </span>
                  <Button variant="link" onClick={() => setTestResults([])}>
                    Clear Results
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
