import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import {
  MessageSquare,
  Plus,
  Send,
  Clock,
  User,
  Users,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { sendPortalMessage, markMessageRead } from '../../utils/portal-client';
import { toast } from 'sonner@2.0.3';

interface PortalMessagesProps {
  messages: any[];
  onRefresh: () => void;
}

export function PortalMessages({ messages, onRefresh }: PortalMessagesProps) {
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setSending(true);
    try {
      await sendPortalMessage(subject.trim(), body.trim());
      toast.success('Message sent!');
      setSubject('');
      setBody('');
      setShowNewMessage(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg);
    // Mark as read if there's an unread team reply for the customer
    if (msg.customerUnread) {
      try {
        await markMessageRead(msg.id);
        onRefresh();
      } catch {
        // silently fail
      }
    }
  };

  if (selectedMessage) {
    const allPosts = [
      { from: selectedMessage.from, body: selectedMessage.body, createdAt: selectedMessage.createdAt, senderEmail: selectedMessage.senderEmail },
      ...(selectedMessage.replies || []),
    ];

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Messages
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
            <p className="text-xs text-slate-400">{formatDate(selectedMessage.createdAt)}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allPosts.map((post: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex ${post.from === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      post.from === 'customer'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-900 rounded-bl-md'
                    }`}
                  >
                    {post.from !== 'customer' && post.senderName && (
                      <p className="text-xs font-medium text-slate-500 mb-1">{post.senderName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                    <p className={`text-xs mt-1 ${post.from === 'customer' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Messages</h2>
          <p className="text-slate-500 text-sm mt-1">Communicate with your service provider</p>
        </div>
        <Button onClick={() => setShowNewMessage(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No messages yet</h3>
            <p className="text-sm text-slate-400 mt-1">
              Send a message to your service provider to get started.
            </p>
            <Button onClick={() => setShowNewMessage(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Send First Message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map((msg: any) => {
            const isUnread = msg.customerUnread === true;
            const latestReply = msg.replies?.length > 0 ? msg.replies[msg.replies.length - 1] : null;
            const previewText = latestReply
              ? `${latestReply.senderName || 'Team'}: ${latestReply.body}`
              : msg.body;

            return (
              <Card
                key={msg.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${isUnread ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}`}
                onClick={() => handleSelectMessage(msg)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        msg.from === 'customer' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {msg.from === 'customer' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Users className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {msg.subject}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{previewText}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {msg.replies?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {msg.replies.length + 1}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatDate(latestReply?.createdAt || msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              New Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="msg-subject">Subject</Label>
              <Input
                id="msg-subject"
                placeholder="What is this regarding?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-body">Message</Label>
              <Textarea
                id="msg-body"
                placeholder="Type your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}