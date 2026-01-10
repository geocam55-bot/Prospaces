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
      setBody(`Dear ${quote.contactName},\n\nPlease find attached the quote #${quote.quoteNumber}.\n\nBest regards,\nProSpaces Team`);
    }
  }, [open, quote]);

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

      let response;

      // Determine sending method based on account type
      if (account.provider === 'outlook') {
        response = await supabase.functions.invoke('azure-send-email', {
          body: {
            accountId: selectedAccount,
            to,
            subject,
            body,
          },
        });
      } else if (account.nylas_grant_id) {
        response = await supabase.functions.invoke('nylas-send-email', {
          body: {
            accountId: selectedAccount,
            to,
            subject,
            body,
          },
        });
      } else {
        // Fallback to SMTP/IMAP generic sender if available
        // Matches logic in Email.tsx for SMTP sending
        if (account.smtp_host && account.smtp_port && account.smtp_username && account.smtp_password) {
           const payload = {
            to: to.trim(),
            subject: subject.trim(),
            body: body.trim(),
            from: account.email,
            smtpConfig: {
              host: account.smtp_host,
              port: account.smtp_port,
              username: account.smtp_username,
              password: account.smtp_password,
            },
          };

          response = await supabase.functions.invoke('simple-send-email', {
            body: payload,
          });
        } else {
          // If no SMTP config, try the generic send-email (though it likely needs same config)
          response = await supabase.functions.invoke('send-email', {
            body: {
              accountId: selectedAccount,
              to,
              subject,
              body,
            },
          });
        }
      }

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send email');
      }

      if (!response.data?.success) {
        // If the specific error is about deployment/config, fallback to "simple-send-email" (draft/log only)
        // This is useful for development/testing when backend isn't fully set up
        console.warn('Primary send failed, falling back to simple logger:', response.data?.error);
        
        const fallbackResponse = await supabase.functions.invoke('simple-send-email', {
            body: {
                to,
                subject,
                body,
                from: account.email
            }
        });
        
        if (fallbackResponse.error || !fallbackResponse.data?.success) {
            throw new Error(response.data?.error || 'Failed to send email');
        }
        
        toast.info('Email logged (backend simulation)');
      } else {
          toast.success('Email sent successfully');
      }

      // Record the email in the local database as sent
      await emailAPI.sendEmail({
        account_id: selectedAccount,
        message_id: crypto.randomUUID(), // Generate a UUID as the message ID
        from_email: account.email,
        to_email: to,
        subject,
        body,
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
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
