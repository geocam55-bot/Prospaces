import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { emailAPI } from '../utils/api';
import { projectId } from '../utils/supabase/info';

interface EmailQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any; // Using any for now to be flexible with Quote/Bid types
  onSuccess: () => void;
}

export function EmailQuoteDialog({ open, onOpenChange, quote, onSuccess }: EmailQuoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open && quote) {
      loadAccounts();
      
      // Pre-fill form
      setTo(quote.contactEmail || '');
      setSubject(`Quote #${quote.quoteNumber} from ${quote.organizationName || 'ProSpaces'}`);
      setBody(`Dear ${quote.contactName},\n\nYour quote #${quote.quoteNumber} is ready for review.\n\nTo view your complete quote, including pricing and details, please click the link below.\n\nBest regards,\nProSpaces Team`);
    }
  }, [open, quote]);

  const generateQuoteHtml = (quote: any) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    // Simplified HTML that only shows basic info, forcing user to click link for details
    return `
      <div style="margin-top: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; font-family: sans-serif; max-width: 600px;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
          <h2 style="margin: 0; color: #333;">Quote #${quote.quoteNumber || quote.title}</h2>
          <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="padding: 30px 20px; text-align: center; background-color: #fff;">
          <p style="font-size: 16px; line-height: 1.5; color: #555; margin-bottom: 0;">
            This quote includes <strong>${quote.lineItems?.length || 0} item(s)</strong>.
            <br/>
            Total Value: <strong>${formatCurrency(quote.total)}</strong>
          </p>
        </div>
      </div>
    `;
  };

  const loadAccounts = async () => {
    try {
      const { accounts } = await emailAPI.getAccounts();
      setAccounts(accounts);
      if (accounts.length > 0) {
        // Try to find default or just pick first
        setSelectedAccount(accounts[0].id);
      }
    } catch (error) {
      console.error('Failed to load email accounts:', error);
      toast.error('Failed to load email accounts');
    }
  };

  const handleSend = async () => {
    if (!selectedAccount) {
      toast.error('Please select an email account');
      return;
    }

    if (!to) {
      toast.error('Please enter a recipient email');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) throw new Error('Account not found');

      // Construct HTML body with quote details
      const quoteHtml = generateQuoteHtml(quote);

      // Tracking Setup
      const appUrl = window.location.origin;
      const orgId = quote.organization_id || quote.organizationId || account.organization_id;
      const quoteId = quote.id;
      
      // 1. View Online Link (for Click tracking)
      // We route through the frontend to handle auth headers securely
      // Use query parameters instead of path parameters to avoid 404s on static host
      const type = quote.quoteNumber ? 'quote' : 'bid'; // Simple heuristic
      const targetUrl = `${appUrl}/?view=public-quote&id=${quoteId}&orgId=${orgId}&type=${type}`;
      const encodedTargetUrl = encodeURIComponent(targetUrl);
      const trackingLinkUrl = `${appUrl}/?view=redirect&url=${encodedTargetUrl}&id=${quoteId}&orgId=${orgId}&type=${type}`;
      
      // 2. Tracking Pixel (Disabled for now as it requires auth headers which email clients can't send)
      // const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;
      // const trackingPixelUrl = `${baseUrl}/track/open?id=${quoteId}&orgId=${orgId}&type=quote`;
      // const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;
      
      const viewOnlineLink = `
        <div style="margin-top: 30px; text-align: center;">
            <a href="${trackingLinkUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: sans-serif; display: inline-block;">View Quote Online</a>
        </div>
      `;

      const fullHtmlBody = `
        <div style="font-family: Arial, sans-serif;">
          <div style="white-space: pre-wrap;">${body.replace(/\n/g, '<br/>')}</div>
          ${quoteHtml}
          ${viewOnlineLink}
        </div>
      `;

      // Use consolidated server send endpoint
      const { getServerHeaders } = await import('../utils/server-headers');
      const { projectId: pid } = await import('../utils/supabase/info');
      const sendHeaders = await getServerHeaders();
      const sendRes = await fetch(
        `https://${pid}.supabase.co/functions/v1/make-server-8405be07/email-send`,
        {
          method: 'POST',
          headers: sendHeaders,
          body: JSON.stringify({
            accountId: selectedAccount,
            to: to.trim(),
            subject: subject.trim(),
            body: fullHtmlBody,
          }),
        }
      );
      const sendData = await sendRes.json();
      
      if (!sendRes.ok || !sendData.success) {
        throw new Error(sendData.error || `Send failed with status ${sendRes.status}`);
      }

      toast.success('Email sent successfully');

      // Record the email in the local database as sent
      await emailAPI.sendEmail({
        account_id: selectedAccount,
        message_id: crypto.randomUUID(), // Generate a UUID as the message ID
        from_email: account.email,
        to_email: to,
        subject,
        body: fullHtmlBody, // Save the full HTML body
        is_read: true,
        is_starred: false,
        folder: 'sent',
        received_at: new Date().toISOString(),
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Failed to send email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col bg-white">
        <DialogHeader>
          <DialogTitle>Email Quote</DialogTitle>
          <DialogDescription>
            Send this quote to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto px-1">
          <div className="grid gap-2">
            <Label htmlFor="account">From Account</Label>
            {accounts.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    No email accounts connected. Please connect an account in the Email tab first.
                </div>
            ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                    {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                        {acc.email} ({acc.provider})
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quote Subject"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || accounts.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Quote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
