import { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function NylasCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(errorDescription || error);
        postMessageToOpener({ type: 'nylas-oauth-error', error: errorDescription || error });
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Missing authorization code');
        return;
      }

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        // Construct the redirect URI that matches what was sent in init
        // CRITICAL: We must remove query parameters from the current URL to get the clean redirect URI
        // Otherwise, Nylas will see ?code=... in the redirect_uri and fail the match
        const url = new URL(window.location.href);
        url.search = '';
        const redirectUri = url.toString();
        const supabaseUrl = `https://${projectId}.supabase.co`;

        // Determine which endpoint to use
        let activePrefix = 'server'; // Default
        
        // 1. Try to get from state
        if (state) {
          try {
            const stateObj = JSON.parse(state);
            if (stateObj.endpoint !== undefined) {
              activePrefix = stateObj.endpoint;
              console.log('Using endpoint from state:', activePrefix);
            } else {
               // 2. Fallback to probing if not in state
               console.log('Endpoint not in state, probing...');
               activePrefix = await findActiveEndpoint(supabaseUrl, session?.access_token);
            }
          } catch (e) {
            console.warn('Failed to parse state, probing...', e);
            activePrefix = await findActiveEndpoint(supabaseUrl, session?.access_token);
          }
        } else {
           activePrefix = await findActiveEndpoint(supabaseUrl, session?.access_token);
        }

        const endpoint = activePrefix ? `${activePrefix}/nylas-token-exchange` : 'nylas-token-exchange';
        console.log('Exchange endpoint:', endpoint);

        const response = await fetch(
          `${supabaseUrl}/functions/v1/${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
            },
            body: JSON.stringify({
              code,
              state,
              redirect_uri: redirectUri
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to exchange token');
        }

        setStatus('success');
        setMessage('Authentication successful! You can close this window.');
        
        postMessageToOpener({ 
          type: 'nylas-oauth-success', 
          account: data.account 
        });

        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (err: any) {
        console.error('Token exchange error:', err);
        setStatus('error');
        setMessage(err.message || 'Authentication failed');
        postMessageToOpener({ type: 'nylas-oauth-error', error: err.message });
      }
    };

    handleCallback();
  }, []);

  const postMessageToOpener = (msg: any) => {
    if (window.opener) {
      window.opener.postMessage(msg, '*');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connecting Email Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-slate-600">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-green-800 font-medium">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="text-red-800 font-medium text-center">{message}</p>
              <p className="text-xs text-slate-500 mt-2">You can close this window and try again.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to probe endpoints
async function findActiveEndpoint(supabaseUrl: string, accessToken?: string): Promise<string> {
  const candidates = [
    'server/nylas-health',
    'make-server/nylas-health',
    'make-server-8405be07/nylas-health',
    'nylas-health'
  ];

  for (const candidate of candidates) {
    try {
      const url = `${supabaseUrl}/functions/v1/${candidate}`;
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

      if (response.ok) {
        const parts = candidate.split('/');
        if (parts.length > 1) {
          return parts[0];
        } else {
          return ''; 
        }
      }
    } catch (e) {
      // continue
    }
  }
  return 'server'; // fallback
}
