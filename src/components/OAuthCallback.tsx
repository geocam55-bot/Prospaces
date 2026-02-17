import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || error);
          postMessageToOpener({ type: 'oauth-error', error: errorDescription || error });
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          postMessageToOpener({ type: 'oauth-error', error: 'No authorization code' });
          return;
        }

        console.log('[OAuth Callback] Received code, state:', state);

        // Parse state to determine provider
        let stateData: any = {};
        try {
          stateData = JSON.parse(decodeURIComponent(state || '{}'));
        } catch (e) {
          console.error('[OAuth Callback] Failed to parse state:', e);
        }

        const provider = stateData.provider || 'google';
        console.log('[OAuth Callback] Provider:', provider);

        // Determine which exchange endpoint to use
        let exchangeEndpoint: string;
        if (provider === 'google' || provider === 'gmail') {
          exchangeEndpoint = 'google-oauth-exchange';
        } else if (provider === 'microsoft' || provider === 'outlook') {
          exchangeEndpoint = 'microsoft-oauth-exchange';
        } else {
          throw new Error(`Unknown provider: ${provider}`);
        }

        // Find active server endpoint
        setMessage('Connecting to server...');
        const activeEndpoint = await findActiveEndpoint();
        
        if (!activeEndpoint) {
          throw new Error('Email server not available. Please ensure the Edge Function is deployed.');
        }

        console.log('[OAuth Callback] Using endpoint:', activeEndpoint);

        // Exchange code for tokens
        setMessage('Exchanging authorization code...');

        const supabaseUrl = `https://${projectId}.supabase.co`;
        const exchangeUrl = `${supabaseUrl}/functions/v1/${activeEndpoint}/${exchangeEndpoint}`;

        const response = await fetch(exchangeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            code,
            state,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Token exchange failed');
        }

        console.log('[OAuth Callback] Successfully exchanged code for tokens');
        setStatus('success');
        setMessage(`Successfully connected ${data.account?.email || 'account'}!`);

        // Notify parent window
        postMessageToOpener({ 
          type: 'oauth-success', 
          account: data.account,
          provider: provider 
        });

        // Close window after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (err: any) {
        console.error('[OAuth Callback] Error:', err);
        setStatus('error');
        setMessage(err.message || 'Authentication failed');
        postMessageToOpener({ type: 'oauth-error', error: err.message });
      }
    };

    handleOAuthCallback();
  }, []);

  function postMessageToOpener(message: any) {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(message, window.location.origin);
        console.log('[OAuth Callback] Posted message to opener:', message);
      } catch (error) {
        console.error('[OAuth Callback] Failed to post message:', error);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800">Authenticating...</h2>
              <p className="text-gray-600 text-center">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">Success!</h2>
              <p className="text-gray-600 text-center">{message}</p>
              <p className="text-sm text-gray-500">This window will close automatically...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-800">Authentication Failed</h2>
              <p className="text-gray-600 text-center">{message}</p>
              <button
                onClick={() => window.close()}
                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to find active Edge Function endpoint
async function findActiveEndpoint(): Promise<string> {
  const supabaseUrl = `https://${projectId}.supabase.co`;
  
  const candidates = [
    'make-server-8405be07',
    'server',
    'make-server',
  ];

  for (const candidate of candidates) {
    try {
      const healthUrl = `${supabaseUrl}/functions/v1/${candidate}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[OAuth Callback] Found active endpoint: ${candidate}`);
        return candidate;
      }
    } catch (error) {
      console.log(`[OAuth Callback] Endpoint ${candidate} not available:`, error);
    }
  }

  return '';
}
