// Gmail SMTP email sender using native Deno TLS
// This version uses Deno's native TLS socket connection instead of external libraries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  from: string;
  smtpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
}

// Base64 encode helper
function base64Encode(str: string): string {
  return btoa(str);
}

// Simple SMTP client using native Deno TLS
async function sendEmailViaSMTP(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  console.log(`Connecting to ${config.host}:${config.port}...`);
  
  // Connect to SMTP server with TLS
  const conn = await Deno.connectTls({
    hostname: config.host,
    port: config.port,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Helper to read from socket
  async function readLine(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) throw new Error('Connection closed');
    return decoder.decode(buffer.subarray(0, n));
  }

  // Helper to send command
  async function sendCommand(cmd: string): Promise<string> {
    console.log(`> ${cmd.replace(config.password, '***')}`);
    await conn.write(encoder.encode(cmd + '\r\n'));
    const response = await readLine();
    console.log(`< ${response.trim()}`);
    return response;
  }

  try {
    // Read server greeting
    const greeting = await readLine();
    console.log(`< ${greeting.trim()}`);

    if (!greeting.startsWith('220')) {
      throw new Error(`SMTP greeting failed: ${greeting}`);
    }

    // Send EHLO
    const ehlo = await sendCommand(`EHLO ${config.host}`);
    if (!ehlo.startsWith('250')) {
      throw new Error(`EHLO failed: ${ehlo}`);
    }

    // Authenticate with AUTH LOGIN
    const authStart = await sendCommand('AUTH LOGIN');
    if (!authStart.startsWith('334')) {
      throw new Error(`AUTH LOGIN failed: ${authStart}`);
    }

    // Send username (base64 encoded)
    const userResponse = await sendCommand(base64Encode(config.username));
    if (!userResponse.startsWith('334')) {
      throw new Error(`Username authentication failed: ${userResponse}`);
    }

    // Send password (base64 encoded)
    const passResponse = await sendCommand(base64Encode(config.password));
    if (!passResponse.startsWith('235')) {
      throw new Error(`Password authentication failed: ${passResponse}`);
    }

    console.log('✅ Authentication successful');

    // Send MAIL FROM
    const mailFrom = await sendCommand(`MAIL FROM:<${config.from}>`);
    if (!mailFrom.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${mailFrom}`);
    }

    // Send RCPT TO
    const rcptTo = await sendCommand(`RCPT TO:<${config.to}>`);
    if (!rcptTo.startsWith('250')) {
      throw new Error(`RCPT TO failed: ${rcptTo}`);
    }

    // Send DATA command
    const dataCmd = await sendCommand('DATA');
    if (!dataCmd.startsWith('354')) {
      throw new Error(`DATA command failed: ${dataCmd}`);
    }

    // Build email content
    const date = new Date().toUTCString();
    const emailContent = [
      `From: ${config.from}`,
      `To: ${config.to}`,
      `Subject: ${config.subject}`,
      `Date: ${date}`,
      `Content-Type: text/plain; charset=utf-8`,
      '',
      config.body,
      '.',
    ].join('\r\n');

    // Send email content
    const dataResponse = await sendCommand(emailContent);
    if (!dataResponse.startsWith('250')) {
      throw new Error(`Email send failed: ${dataResponse}`);
    }

    console.log('✅ Email sent successfully');

    // Send QUIT
    await sendCommand('QUIT');

  } finally {
    conn.close();
  }
}

serve(async (req) => {
  // Handle CORS preflight - must return 200 with CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { to, subject, body, from, smtpConfig }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!to || !subject || !body || !smtpConfig) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, body, smtpConfig' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Incomplete SMTP configuration' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending email to ${to} from ${from || smtpConfig.username}`);

    // Send email via SMTP
    await sendEmailViaSMTP({
      host: smtpConfig.host,
      port: smtpConfig.port,
      username: smtpConfig.username,
      password: smtpConfig.password,
      from: from || smtpConfig.username,
      to: to,
      subject: subject,
      body: body,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email: {
          id: `email-${Date.now()}`,
          from: from || smtpConfig.username,
          to,
          subject,
          body,
          date: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Safely extract error message
    let errorMessage = 'Failed to send email';
    let errorDetails = 'Unknown error';
    
    if (error) {
      if (typeof error === 'string') {
        errorMessage = error;
        errorDetails = error;
      } else if (error.message) {
        errorMessage = error.message;
        errorDetails = error.toString();
      } else if (error.toString) {
        errorMessage = error.toString();
        errorDetails = error.toString();
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});