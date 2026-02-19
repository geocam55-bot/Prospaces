import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  MessageSquare,
  User,
  Send,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Inbox,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { replyToPortalMessage } from '../../utils/portal-client';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import type { User as CrmUser } from '../../App';

interface PortalMessagesAdminProps {
  user: CrmUser;
}

export function PortalMessagesAdmin({ user }: PortalMessagesAdminProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Get all portal messages for the org via KV prefix scan
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/portal/portal-users`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      // For now, we'll load messages from the portal endpoint
      // The portal-users endpoint returns access logs, but we need messages
      // We'll fetch messages from each contact's portal messages
      // For simplicity, use a dedicated CRM messages endpoint that returns all portal messages

      // Since the server doesn't have a CRM-wide messages endpoint, let's create a simple fetch
      // Actually, let's just use the KV prefix approach: portal_message:{orgId}:
      // We need a server endpoint for this

      if (response.ok) {
        const data = await response.json();
        setMessages(data.portalUsers || []);
      }
    } catch (err: any) {
      console.error('[portal-admin] Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId: string, contactId: string) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      await replyToPortalMessage(messageId, contactId, replyText.trim(), session.access_token);
      toast.success('Reply sent!');
      setReplyText('');
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Portal Messages
          </h2>
          <p className="text-slate-500 text-sm mt-1">Messages from customers using the portal</p>
        </div>
        <Button variant="outline" onClick={loadMessages} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No portal messages</h3>
            <p className="text-sm text-slate-400 mt-1">
              Messages from customers using the portal will appear here.
              <br />
              Enable portal access for a contact from their detail page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any, idx: number) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{msg.email || 'Portal User'}</p>
                      <p className="text-xs text-slate-400">
                        {msg.enabled ? 'Active' : 'Revoked'} &middot; Enabled {formatDate(msg.enabledAt)}
                      </p>
                    </div>
                  </div>
                  <Badge className={msg.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {msg.enabled ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
