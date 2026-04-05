import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  MessageSquare,
  Lock,
  Send,
  Loader2,
  RefreshCw,
  Users,
  CheckCircle2,
  Plus,
  FileText,
  Search,
  Smile,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import {
  addPortalInternalNote,
  createCrmPortalMessage,
  createInternalChat,
  getCrmPortalMessages,
  getInternalChats,
  getPortalUsers,
  replyToPortalMessage,
  sendInternalChatMessage,
  updatePortalThreadStatus,
} from '../utils/portal-client';
import { tasksAPI, usersAPI } from '../utils/api';
import type { User as CrmUser } from '../App';

interface MessagingHubProps {
  user: CrmUser;
}

export function MessagingHub({ user }: MessagingHubProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [internalChats, setInternalChats] = useState<any[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedConversationType, setSelectedConversationType] = useState<'customer' | 'internal'>('internal');
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [internalChatMessage, setInternalChatMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatMembers, setNewChatMembers] = useState<string[]>([]);
  const [pendingDirectTarget, setPendingDirectTarget] = useState<any>(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Tracks whether the very first load has run yet — used in loadData to decide
  // whether to auto-select the first conversation or just refresh data silently.
  const initializedRef = useRef(false);

  // Ref used to scroll the message history to the bottom on new messages
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) || null,
    [messages, selectedMessageId]
  );

  const selectedChat = useMemo(
    () => internalChats.find((chat) => chat.id === selectedChatId) || null,
    [internalChats, selectedChatId]
  );

  const getAccessToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return session.access_token;
  };

  const syncCurrentUserPresence = async () => {
    try {
      const supabase = createClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser?.id) return;

      await (supabase as any)
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', sessionUser.id);
    } catch {
      // Presence sync is best-effort only
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      const [messagesData, usersData, internalData, staffData] = await Promise.all([
        getCrmPortalMessages(accessToken).catch(() => ({ messages: [] })),
        getPortalUsers(accessToken).catch(() => ({ portalUsers: [] })),
        getInternalChats(accessToken).catch(() => ({ chats: [] })),
        usersAPI.getAll().catch(() => []),
      ]);

      const nextMessages = messagesData.messages || [];
      const nextUsers = usersData.portalUsers || [];
      const nextChats = (internalData.chats || []).filter((chat: any) => canAccessInternalChat(chat));
      const nextStaff = Array.isArray((staffData as any)?.users)
        ? (staffData as any).users
        : Array.isArray(staffData)
          ? staffData
          : [];

      setMessages(nextMessages);
      setPortalUsers(nextUsers);
      setStaffUsers(nextStaff);

      // Merge server chats with local state so any optimistically-added chats
      // (created between now and the last server flush) are not wiped out by a
      // full replace.  If the server returned nothing, keep local state intact
      // to avoid clearing a just-created chat during the race window.
      setInternalChats(prev => {
        if (nextChats.length === 0) return prev;
        const serverMap = new Map(nextChats.map((c: any) => [c.id, c]));
        // Update existing chats and keep any local-only ones that haven't synced yet
        const merged = prev.map((c: any) => serverMap.has(c.id) ? serverMap.get(c.id) : c);
        const brandNew = nextChats.filter((c: any) => !prev.some((pc: any) => pc.id === c.id));
        return [...merged, ...brandNew];
      });

      const isFirstLoad = !initializedRef.current;
      if (isFirstLoad) {
        initializedRef.current = true;
        // On first load: auto-select the most recent conversation
        if (nextChats.length > 0) {
          setSelectedChatId(nextChats[0].id);
          setSelectedConversationType('internal');
        } else if (nextMessages.length > 0) {
          setSelectedMessageId(nextMessages[0].id);
          setSelectedConversationType('customer');
        }
      } else {
        // On background polls: use functional setters so we always read the
        // LIVE selection state, not the stale closure value.  Only change
        // selection if the currently-selected item has been deleted server-side.
        setSelectedChatId(currentId => {
          if (!currentId) return currentId;
          if (nextChats.length > 0 && !nextChats.some((c: any) => c.id === currentId)) {
            return nextChats[0]?.id || null;
          }
          return currentId;
        });
        setSelectedMessageId(currentId => {
          if (!currentId) return currentId;
          if (nextMessages.length > 0 && !nextMessages.some((m: any) => m.id === currentId)) {
            return nextMessages[0]?.id || null;
          }
          return currentId;
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load messaging hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refreshPresence = async () => {
      await syncCurrentUserPresence();
      await loadData();
    };

    refreshPresence();
    const interval = window.setInterval(refreshPresence, 10000);

    return () => window.clearInterval(interval);
  }, []);

  // Real-time subscription — instantly deliver messages from other users without waiting for the
  // next poll.  Listens to INSERT/UPDATE events on the kv_store table and patches local state for
  // any row whose key belongs to this org's internal-chat namespace.
  useEffect(() => {
    const orgId = user.organization_id || user.organizationId;
    if (!orgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`internal-chats-rt-${orgId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'kv_store_8405be07' },
        (payload: any) => {
          const key: string = payload.new?.key || payload.old?.key || '';
          if (!key.startsWith(`internal_chat:${orgId}:`)) return;

          if (payload.eventType === 'DELETE' || !payload.new?.value) {
            const chatId = key.split(':')[2];
            if (chatId) setInternalChats(prev => prev.filter(c => c.id !== chatId));
          } else {
            const chat = payload.new.value;
            if (!canAccessInternalChat(chat)) return;
            setInternalChats(prev => {
              const exists = prev.some(c => c.id === chat.id);
              return exists
                ? prev.map(c => (c.id === chat.id ? chat : c))
                : [...prev, chat];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.organization_id, user.organizationId]);

  // Auto-scroll the history to the bottom whenever the active conversation or its
  // message count changes (new messages arriving, switching to a different chat, etc.)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [
    selectedChatId,
    selectedMessageId,
    selectedChat?.messages?.length,
    // customerTimeline length is driven by replies array length
    selectedMessage?.replies?.length,
  ]);

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return '';
    const then = new Date(date).getTime();
    const now = Date.now();
    const mins = Math.floor((now - then) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const isRecentlyActive = (date?: string, minutes = 15) => {
    if (!date) return false;
    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= minutes * 60 * 1000;
  };

  const getAvatarFallback = (name?: string, email?: string) => {
    const source = (name || email || 'User').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  };

  const getAvatarToneClass = (name?: string, email?: string) => {
    const seed = `${name || ''}${email || ''}` || 'user';
    const palettes = [
      'bg-violet-100 text-violet-700',
      'bg-sky-100 text-sky-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-indigo-100 text-indigo-700',
    ];
    const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palettes[total % palettes.length];
  };

  const getTargetKey = (target: any) => `${target.kind}:${target.id || target.email || target.name}`;

  const canAccessInternalChat = (chat: any) => {
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    if (chat?.createdBy === user.id) return true;
    if (participants.length === 0) return true;

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    return participants.some((participant: any) => {
      if (participant?.kind === 'portal') return false;
      const participantEmail = (participant?.email || '').toLowerCase().trim();
      return participant?.id === user.id || (!!normalizedEmail && participantEmail === normalizedEmail);
    });
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setSending(true);
    try {
      const accessToken = await getAccessToken();
      await replyToPortalMessage(selectedMessage.id, selectedMessage.contactId, replyText.trim(), accessToken);
      toast.success('Customer reply sent');
      setReplyText('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedMessage || !internalNoteText.trim()) return;
    setSending(true);
    try {
      const accessToken = await getAccessToken();
      await addPortalInternalNote(selectedMessage.id, selectedMessage.contactId, internalNoteText.trim(), accessToken);
      toast.success('Internal note added');
      setInternalNoteText('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save internal note');
    } finally {
      setSending(false);
    }
  };

  const handleToggleResolved = async () => {
    if (!selectedMessage) return;
    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const nextStatus = selectedMessage.status === 'resolved' ? 'open' : 'resolved';
      await updatePortalThreadStatus(selectedMessage.id, selectedMessage.contactId, nextStatus, accessToken);
      toast.success(nextStatus === 'resolved' ? 'Conversation marked resolved' : 'Conversation reopened');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update conversation status');
    } finally {
      setSending(false);
    }
  };

  const handleCreateFollowUpTask = async () => {
    if (!selectedMessage) return;
    try {
      await tasksAPI.create({
        title: `Follow up: ${selectedMessage.subject}`,
        description: `Customer conversation follow-up for ${selectedMessage.contactName || selectedMessage.contactEmail || 'customer'}\n\n${selectedMessage.body}`,
        status: 'pending',
        priority: 'medium',
        assigned_to: user.id,
      });
      toast.success('Follow-up task created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleCreateInternalChat = async () => {
    const selectedMembers = staffUsers
      .filter((member: any) => member?.id)
      .map((member: any) => ({
        id: member.id,
        name: member.name || member.email || 'Member',
        email: member.email || '',
        kind: 'staff' as const,
      }))
      .filter((member: any) => newChatMembers.includes(`${member.kind}:${member.id}`));

    const derivedChatType = selectedMembers.length > 1 ? 'group' : selectedMembers.length === 1 ? 'direct' : 'general';
    const derivedTitle = newChatTitle.trim()
      || (derivedChatType === 'direct'
        ? selectedMembers[0]?.name
        : derivedChatType === 'group'
          ? `${selectedMembers[0]?.name || 'Group'} + ${selectedMembers.length - 1}`
          : 'New Team Chat');

    if (!derivedTitle) {
      toast.error('Please enter a chat title or choose a person');
      return;
    }

    const derivedContextType = derivedChatType === 'group'
      ? 'group'
      : derivedChatType === 'direct'
        ? `direct-${selectedMembers[0]?.kind || 'staff'}`
        : 'general';

    const derivedContextLabel = derivedChatType === 'group'
      ? selectedMembers.map((member: any) => member.name).join(', ')
      : derivedChatType === 'direct'
        ? `${selectedMembers[0]?.kind || 'staff'}:${selectedMembers[0]?.id || selectedMembers[0]?.email || derivedTitle}`
        : '';

    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const result = await createInternalChat(
        {
          title: derivedTitle,
          contextType: derivedContextType,
          contextLabel: derivedContextLabel,
          initialMessage: newChatMessage.trim(),
          chatType: derivedChatType,
          participants: selectedMembers,
        },
        accessToken
      );
      toast.success(derivedChatType === 'group' ? 'Saved group created' : 'Chat created');
      setShowNewChat(false);
      setNewChatTitle('');
      setNewChatMessage('');
      setNewChatMembers([]);
      // Show the new chat immediately without waiting for a full reload
      if (result?.chat) {
        setInternalChats(prev => {
          const exists = prev.some(c => c.id === result.chat.id);
          return exists
            ? prev.map(c => (c.id === result.chat.id ? result.chat : c))
            : [...prev, result.chat];
        });
      }
      if (result?.chat?.id) {
        setSelectedChatId(result.chat.id);
        setSelectedConversationType('internal');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create internal chat');
    } finally {
      setSending(false);
    }
  };

  const handleStartDirectChat = (target: any) => {
    if (target.kind === 'portal') {
      const existingThread = messages.find((message: any) => {
        return (
          (target.contactId && message.contactId === target.contactId) ||
          (target.email && (message.contactEmail === target.email || message.senderEmail === target.email))
        );
      });

      if (existingThread?.id) {
        setSelectedMessageId(existingThread.id);
        setSelectedConversationType('customer');
        setPendingDirectTarget(null);
        return;
      }

      setSelectedConversationType('customer');
      setPendingDirectTarget(target);
      setPendingMessage('');
      setSelectedChatId(null);
      setSelectedMessageId(null);
      return;
    }

    const targetKey = getTargetKey(target);
    const existingChat = internalChats.find((chat: any) => {
      return (
        (chat.contextType || '').startsWith('direct')
        && (chat.contextLabel === targetKey || chat.title === target.name)
      );
    });

    if (existingChat?.id) {
      setSelectedChatId(existingChat.id);
      setSelectedConversationType('internal');
      setPendingDirectTarget(null);
      return;
    }

    setSelectedConversationType('internal');
    setPendingDirectTarget(target);
    setPendingMessage('');
    setSelectedChatId(null);
    setSelectedMessageId(null);
  };

  const handleSendToPendingTarget = async () => {
    if (!pendingDirectTarget || !pendingMessage.trim()) return;

    const target = pendingDirectTarget;
    const messageText = pendingMessage.trim();
    const now = new Date().toISOString();
    setSending(true);

    if (target.kind === 'portal') {
      if (!target.contactId) {
        toast.error('This portal user is not linked to a contact yet');
        setSending(false);
        return;
      }

      const optimisticMessageId = `pending-portal-${Date.now()}`;
      const subject = `Message from ${user.full_name || user.email || 'Team'}`;
      const optimisticThread = {
        id: optimisticMessageId,
        type: 'customer',
        contactId: target.contactId,
        contactName: target.name,
        contactEmail: target.email || '',
        from: 'team',
        senderEmail: user.email || '',
        subject,
        body: messageText,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        replies: [],
        internalNotes: [],
        customerUnread: true,
      };

      setMessages(prev => [optimisticThread, ...prev.filter((message: any) => message.id !== optimisticMessageId)]);
      setSelectedMessageId(optimisticMessageId);
      setSelectedConversationType('customer');
      setSelectedChatId(null);
      setPendingDirectTarget(null);
      setPendingMessage('');

      try {
        const accessToken = await getAccessToken();
        const result = await createCrmPortalMessage(target.contactId, messageText, subject, accessToken);
        if (result?.message?.id) {
          setMessages(prev => [
            result.message,
            ...prev.filter((message: any) => message.id !== optimisticMessageId && message.id !== result.message.id),
          ]);
          setSelectedMessageId(result.message.id);
          setSelectedConversationType('customer');
        } else {
          await loadData();
        }
      } catch (err: any) {
        setMessages(prev => prev.filter((message: any) => message.id !== optimisticMessageId));
        setPendingDirectTarget(target);
        setPendingMessage(messageText);
        setSelectedMessageId(null);
        toast.error(err.message || 'Failed to send portal message');
      } finally {
        setSending(false);
      }
      return;
    }

    const optimisticChatId = `pending-${Date.now()}`;
    const optimisticChat = {
      id: optimisticChatId,
      title: target.name,
      chatType: 'direct',
      contextType: `direct-${target.kind}`,
      contextLabel: getTargetKey(target),
      participants: [{ id: target.id, name: target.name, email: target.email, kind: target.kind }],
      updatedAt: now,
      createdAt: now,
      messages: [
        {
          id: `pending-message-${Date.now()}`,
          senderId: user.id,
          senderName: user.full_name || user.email || 'Staff',
          body: messageText,
          createdAt: now,
        },
      ],
    };

    setSelectedConversationType('internal');
    setInternalChats(prev => [optimisticChat, ...prev.filter((chat: any) => chat.id !== optimisticChatId)]);
    setSelectedChatId(optimisticChatId);
    setSelectedMessageId(null);
    setPendingDirectTarget(null);
    setPendingMessage('');

    try {
      const accessToken = await getAccessToken();
      const result = await createInternalChat(
        {
          title: target.name,
          contextType: `direct-${target.kind}`,
          contextLabel: getTargetKey(target),
          chatType: 'direct',
          participants: [{ id: target.id, name: target.name, email: target.email, kind: target.kind }],
          initialMessage: messageText,
        },
        accessToken
      );

      if (result?.chat?.id) {
        setInternalChats(prev => [
          result.chat,
          ...prev.filter((chat: any) => chat.id !== optimisticChatId && chat.id !== result.chat.id),
        ]);
        setSelectedChatId(result.chat.id);
        setSelectedConversationType('internal');
      } else {
        await loadData();
      }
    } catch (err: any) {
      setInternalChats(prev => prev.filter((chat: any) => chat.id !== optimisticChatId));
      setPendingDirectTarget(target);
      setPendingMessage(messageText);
      setSelectedChatId(null);
      toast.error(err.message || 'Failed to start chat');
    } finally {
      setSending(false);
    }
  };

  const handleSendInternalChatMessage = async () => {
    if (!selectedChat || !internalChatMessage.trim()) return;
    const messageText = internalChatMessage.trim();
    const chatId = selectedChat.id;
    setSending(true);
    setInternalChatMessage(''); // Clear input immediately

    // Optimistic update — message appears in the bubble area right away
    const optimisticId = `opt-${Date.now()}`;
    setInternalChats(prev =>
      prev.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: [
                ...(c.messages || []),
                {
                  id: optimisticId,
                  senderId: user.id,
                  senderName: user.full_name || user.email || 'Staff',
                  body: messageText,
                  createdAt: new Date().toISOString(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    try {
      const accessToken = await getAccessToken();
      const result = await sendInternalChatMessage(chatId, messageText, accessToken);
      // Replace the optimistic entry with the authoritative server response
      if (result?.chat) {
        setInternalChats(prev => prev.map(c => (c.id === result.chat.id ? result.chat : c)));
      }
    } catch (err: any) {
      // Roll back the optimistic message and restore the text so the user can retry
      setInternalChats(prev =>
        prev.map(c =>
          c.id === chatId
            ? { ...c, messages: (c.messages || []).filter((m: any) => m.id !== optimisticId) }
            : c
        )
      );
      setInternalChatMessage(messageText);
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const customerTimeline = selectedMessage
    ? [
        {
          from: selectedMessage.from,
          body: selectedMessage.body,
          createdAt: selectedMessage.createdAt,
          senderName: selectedMessage.contactName || selectedMessage.senderEmail || 'Customer',
        },
        ...(selectedMessage.replies || []),
      ]
    : [];

  const unreadCustomerCount = messages.filter((message) => !message.read || message.customerUnread).length;
  const activePortalUsers = portalUsers.filter((portalUser: any) => portalUser.enabled !== false);
  const onlineStaffUsers = staffUsers.filter((staff: any) => {
    if (!staff?.id) return false;
    const lastSeen = staff.last_login || staff.lastLogin;
    if (staff.id === user.id) return true;
    return isRecentlyActive(lastSeen, 30);
  });
  const onlinePortalNow = activePortalUsers.filter((portalUser: any) =>
    portalUser.online || isRecentlyActive(portalUser.lastActiveAt || portalUser.lastLogin, 30)
  );
  const selectedPortalUser = selectedMessage
    ? activePortalUsers.find((portalUser: any) => {
        return (
          (portalUser.contactId && portalUser.contactId === selectedMessage.contactId) ||
          (portalUser.email && portalUser.email === (selectedMessage.contactEmail || selectedMessage.senderEmail))
        );
      })
    : null;

  const selectedConversation = selectedConversationType === 'customer' ? selectedMessage : selectedChat;

  const chatTargets = useMemo(() => {
    const staffTargets = staffUsers
      .filter((staff: any) => staff?.id && staff.id !== user.id)
      .map((staff: any) => ({
        id: staff.id,
        name: staff.name || staff.email || 'Staff',
        email: staff.email || '',
        subtitle: staff.role ? `${staff.role.replace(/_/g, ' ')}` : 'CRM Staff',
        kind: 'staff' as const,
        avatar_url: staff.avatar_url,
        online: isRecentlyActive(staff.last_login || staff.lastLogin, 30),
      }));

    const portalTargets = activePortalUsers.map((portalUser: any) => ({
      id: portalUser.contactId || portalUser.email,
      contactId: portalUser.contactId || null,
      name: portalUser.name || portalUser.email || 'Portal User',
      email: portalUser.email || '',
      subtitle: portalUser.company || 'Customer Portal',
      kind: 'portal' as const,
      avatar_url: '',
      online: portalUser.online || isRecentlyActive(portalUser.lastActiveAt || portalUser.lastLogin, 30),
    }));

    const allTargets = [...staffTargets, ...portalTargets];
    const query = chatSearch.trim().toLowerCase();

    return allTargets.filter((target) => {
      if (!query) return true;
      return `${target.name} ${target.email} ${target.subtitle}`.toLowerCase().includes(query);
    });
  }, [staffUsers, activePortalUsers, chatSearch, user.id]);

  const filteredInternalChats = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return internalChats;
    return internalChats.filter((chat: any) => {
      return `${chat.title} ${chat.contextLabel || ''} ${chat.chatType || ''}`.toLowerCase().includes(query);
    });
  }, [internalChats, chatSearch]);

  const groupChatTargets = useMemo(
    () => chatTargets.filter((target) => target.kind === 'staff'),
    [chatTargets]
  );

  const unifiedChats = useMemo(() => {
    const customerItems = messages.map((message: any) => {
      const latestReply = message.replies?.length ? message.replies[message.replies.length - 1] : null;
      const portalUser = activePortalUsers.find((portal: any) => {
        return (
          (portal.contactId && portal.contactId === message.contactId) ||
          (portal.email && portal.email === (message.contactEmail || message.senderEmail))
        );
      });

      return {
        kind: 'customer' as const,
        id: message.id,
        title: message.contactName || message.contactEmail || 'Customer',
        subtitle: message.subject || 'Customer chat',
        preview: latestReply ? `${latestReply.senderName || 'Team'}: ${latestReply.body}` : message.body,
        updatedAt: latestReply?.createdAt || message.createdAt,
        unread: !!message.customerUnread,
        online: !!(portalUser?.online || isRecentlyActive(portalUser?.lastActiveAt || portalUser?.lastLogin, 30)),
        badge: message.status === 'resolved' ? 'Resolved' : 'Customer',
      };
    });

    const internalItems = internalChats.map((chat: any) => {
      const lastMessage = chat.messages?.length ? chat.messages[chat.messages.length - 1] : null;
      const isGroupChat = chat.chatType === 'group' || chat.contextType === 'group';
      const isDirectChat = (chat.chatType === 'direct') || (chat.contextType || '').startsWith('direct');

      return {
        kind: 'internal' as const,
        id: chat.id,
        title: chat.title,
        subtitle: isGroupChat ? 'Saved group' : isDirectChat ? 'Direct message' : 'Team chat',
        preview: lastMessage?.body || chat.contextLabel || 'No messages yet',
        updatedAt: chat.updatedAt || chat.createdAt,
        unread: false,
        online: false,
        badge: isGroupChat ? 'Group' : isDirectChat ? 'DM' : 'Team',
      };
    });

    return [...internalItems, ...customerItems].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [internalChats, messages, activePortalUsers]);

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-0 overflow-hidden border border-slate-200 bg-[#f5f7fb] shadow-xl md:rounded-[28px] md:mx-4 md:mb-4">

      {/* ── LEFT SIDEBAR ── */}
      <div className={`relative flex w-full md:w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h1 className="text-[17px] font-bold text-slate-900">Message Space</h1>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-slate-700 hover:bg-slate-100"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-slate-700 hover:bg-slate-100"
              onClick={() => { setChatSearch(''); setShowNewChat(true); }}
              title="New chat or group"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Search"
              className="rounded-full border-0 bg-[#eef2f7] pl-9 text-slate-700 shadow-none focus-visible:ring-1 focus-visible:ring-violet-300"
            />
          </div>
        </div>

        {/* Conversation + People list */}
        <div className="flex-1 overflow-y-auto pb-14">

          {/* Loading skeleton */}
          {loading && unifiedChats.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Recent chats */}
          {unifiedChats.map((conv) => {
            const isSelected =
              conv.kind === selectedConversationType &&
              (conv.kind === 'customer'
                ? selectedMessageId === conv.id
                : selectedChatId === conv.id);

            return (
              <button
                key={`${conv.kind}-${conv.id}`}
                onClick={() => {
                  if (conv.kind === 'customer') {
                    setSelectedMessageId(conv.id);
                    setSelectedConversationType('customer');
                  } else {
                    setSelectedChatId(conv.id);
                    setSelectedConversationType('internal');
                  }
                  setMobileView('chat');
                }}
                className={`mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100 ${
                  isSelected ? 'bg-violet-50 ring-1 ring-violet-100' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                    <AvatarFallback className={getAvatarToneClass(conv.title, conv.subtitle)}>{getAvatarFallback(conv.title, conv.subtitle)}</AvatarFallback>
                  </Avatar>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate text-sm font-semibold text-foreground">{conv.title}</p>
                    <p className="shrink-0 text-[11px] text-muted-foreground">{formatTimeAgo(conv.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs text-muted-foreground flex-1">{conv.preview || 'send a message'}</p>
                    {conv.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Divider between chats and people */}
          {unifiedChats.length > 0 && chatTargets.length > 0 && (
            <div className="mx-3 my-1 border-t" />
          )}

          {/* People section */}
          {chatTargets.length > 0 && (
            <>
              <div className="px-4 pb-1 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">People</p>
              </div>
              {chatTargets.map((target) => (
                <button
                  key={getTargetKey(target)}
                  onClick={() => { handleStartDirectChat(target); setMobileView('chat'); }}
                  className="mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                      <AvatarImage src={target.avatar_url || undefined} alt={target.name} />
                      <AvatarFallback className={getAvatarToneClass(target.name, target.email)}>{getAvatarFallback(target.name, target.email)}</AvatarFallback>
                    </Avatar>
                    {target.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{target.name}</p>
                    <p className="truncate text-xs text-muted-foreground">send a message</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Empty state */}
          {!loading && unifiedChats.length === 0 && chatTargets.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            </div>
          )}
        </div>

        {/* New Group button — pinned at bottom of left pane */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-3 py-3">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-full border-violet-100 bg-white text-slate-900 hover:bg-violet-50"
            onClick={() => { setNewChatMembers([]); setNewChatTitle(''); setNewChatMessage(''); setShowNewChat(true); }}
          >
            <Users className="h-4 w-4" />
            New Group
          </Button>
        </div>
      </div>

      {/* ── RIGHT CHAT AREA ── */}
      <div className={`min-w-0 flex-1 flex-col bg-[#f5f7fb] ${mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}`}>

        {/* Pending new DM — person selected but no existing chat */}
        {pendingDirectTarget && !selectedConversation ? (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden h-8 w-8 shrink-0 rounded-full"
                onClick={() => setMobileView('sidebar')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={pendingDirectTarget.avatar_url || undefined} alt={pendingDirectTarget.name} />
                <AvatarFallback>{getAvatarFallback(pendingDirectTarget.name, pendingDirectTarget.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{pendingDirectTarget.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pendingDirectTarget.online ? 'Active now' : pendingDirectTarget.subtitle}
                </p>
              </div>
            </div>
            <div className="flex-1 bg-muted/10" />
            <div className="shrink-0 border-t bg-background px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-[24px] border bg-background px-4 py-2.5">
                  <input
                    type="text"
                    placeholder={`Message ${pendingDirectTarget.name}...`}
                    value={pendingMessage}
                    onChange={(e) => setPendingMessage(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendToPendingTarget();
                      }
                    }}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Smile className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                <Button
                  onClick={handleSendToPendingTarget}
                  disabled={sending || !pendingMessage.trim()}
                  className="shrink-0 gap-1.5 rounded-full px-4"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : !selectedConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f5f7fb] px-6 text-center">
            <div className="rounded-full bg-slate-200/70 p-8 shadow-inner">
              <MessageSquare className="h-14 w-14 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">Your Messages</p>
            <p className="max-w-sm text-base text-slate-500">
              Pick a person or saved group on the left to start chatting in Messenger Space.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden h-8 w-8 shrink-0 rounded-full"
                onClick={() => setMobileView('sidebar')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>
                  {selectedConversationType === 'customer' && selectedMessage
                    ? getAvatarFallback(selectedMessage.contactName, selectedMessage.contactEmail)
                    : selectedChat
                      ? getAvatarFallback(selectedChat.title)
                      : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {selectedConversationType === 'customer' && selectedMessage
                    ? selectedMessage.contactName || selectedMessage.contactEmail || 'Customer'
                    : selectedChat?.title || ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversationType === 'customer' && selectedPortalUser?.online
                    ? 'Active now'
                    : selectedConversationType === 'customer' && selectedMessage
                      ? `Last active ${formatTimeAgo(selectedPortalUser?.lastLogin || selectedMessage.createdAt)}`
                      : selectedChat
                        ? selectedChat.chatType === 'group' || selectedChat.contextType === 'group'
                          ? 'Saved group'
                          : (selectedChat.contextType || '').startsWith('direct')
                            ? 'Direct message'
                            : 'Team chat'
                        : ''}
                </p>
              </div>
              {/* Customer message actions */}
              {selectedConversationType === 'customer' && selectedMessage && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCreateFollowUpTask}
                    className="gap-1.5 rounded-full text-xs px-2 sm:px-3"
                    title="Create follow-up task"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Task</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedMessage.status === 'resolved' ? 'default' : 'outline'}
                    onClick={handleToggleResolved}
                    disabled={sending}
                    className="gap-1.5 rounded-full text-xs px-2 sm:px-3"
                    title={selectedMessage.status === 'resolved' ? 'Resolved' : 'Resolve'}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{selectedMessage.status === 'resolved' ? 'Resolved' : 'Resolve'}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* ── Message history ── */}
            <div className="flex-1 overflow-y-auto bg-muted/10 px-4 py-4">
              {selectedConversationType === 'customer' && selectedMessage ? (
                customerTimeline.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">No messages yet.</p>
                ) : (() => {
                  // Build grouped customer timeline so consecutive bubbles from the same sender
                  // share a visual cluster — only the first shows the name, only the last shows the time.
                  type CustomerPost = { from: string; body: string; createdAt: string; senderName?: string };
                  const groups: { sender: string; isCustomer: boolean; posts: CustomerPost[] }[] = [];
                  for (const post of customerTimeline as CustomerPost[]) {
                    const last = groups[groups.length - 1];
                    const sameWindow = last &&
                      last.sender === post.from &&
                      Math.abs(new Date(post.createdAt).getTime() - new Date(last.posts[last.posts.length - 1].createdAt).getTime()) < 3 * 60_000;
                    if (sameWindow) {
                      last.posts.push(post);
                    } else {
                      groups.push({ sender: post.from, isCustomer: post.from === 'customer', posts: [post] });
                    }
                  }
                  return (
                    <div className="space-y-3">
                      {groups.map((group, gi) => (
                        <div key={gi} className={`flex items-end gap-2 ${group.isCustomer ? 'justify-start' : 'justify-end'}`}>
                          {/* Avatar for incoming (customer) */}
                          {group.isCustomer && (
                            <div className="shrink-0 self-end mb-0.5">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px]">
                                  {getAvatarFallback(group.posts[0].senderName, undefined)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                          <div className={`flex min-w-0 flex-col gap-0.5 max-w-[72%] ${group.isCustomer ? 'items-start' : 'items-end'}`}>
                            {/* Sender label — shown once per group, for incoming only */}
                            {group.isCustomer && (
                              <p className="pl-1 text-[11px] font-semibold text-muted-foreground">
                                {group.posts[0].senderName || 'Customer'}
                              </p>
                            )}
                            {group.posts.map((post, pi) => {
                              const isFirst = pi === 0;
                              const isLast = pi === group.posts.length - 1;
                              return (
                                <div key={pi} className="flex flex-col">
                                  <div
                                    className={[
                                      'px-4 py-2 text-sm leading-5 shadow-sm',
                                      group.isCustomer
                                        ? 'bg-background border text-foreground'
                                        : 'bg-violet-600 text-white',
                                      // Messenger-style corner rounding:
                                      // top bubble: full top corners + outer bottom corner rounded
                                      // middle: nearly straight on the "thread" side
                                      // last: full bottom corners
                                      group.isCustomer
                                        ? isFirst && isLast ? 'rounded-[18px] rounded-tl-sm'
                                          : isFirst ? 'rounded-[18px] rounded-tl-sm rounded-bl-sm'
                                          : isLast ? 'rounded-[18px] rounded-tl-sm'
                                          : 'rounded-[18px] rounded-l-sm'
                                        : isFirst && isLast ? 'rounded-[18px] rounded-tr-sm'
                                          : isFirst ? 'rounded-[18px] rounded-tr-sm rounded-br-sm'
                                          : isLast ? 'rounded-[18px] rounded-tr-sm'
                                          : 'rounded-[18px] rounded-r-sm',
                                    ].join(' ')}
                                  >
                                    <p className="whitespace-pre-wrap">{post.body}</p>
                                  </div>
                                  {/* Timestamp — only under the last bubble in a group */}
                                  {isLast && (
                                    <p className={`mt-0.5 text-[11px] text-muted-foreground ${group.isCustomer ? 'pl-1' : 'text-right'}`}>
                                      {formatDate(post.createdAt)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {/* Avatar placeholder for outgoing — keeps spacing symmetric on mobile */}
                          {!group.isCustomer && <div className="w-7 shrink-0" />}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  );
                })()
              ) : selectedChat ? (
                (selectedChat.messages || []).length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                ) : (() => {
                  // Group consecutive messages from the same sender within a 3-minute window
                  type ChatMsg = { id: string; senderId: string; senderName?: string; body: string; createdAt: string };
                  const msgs: ChatMsg[] = selectedChat.messages || [];
                  const groups: { senderId: string; own: boolean; senderName: string; msgs: ChatMsg[] }[] = [];
                  for (const m of msgs) {
                    const last = groups[groups.length - 1];
                    const sameWindow = last &&
                      last.senderId === m.senderId &&
                      Math.abs(new Date(m.createdAt).getTime() - new Date(last.msgs[last.msgs.length - 1].createdAt).getTime()) < 3 * 60_000;
                    if (sameWindow) {
                      last.msgs.push(m);
                    } else {
                      groups.push({ senderId: m.senderId, own: m.senderId === user.id, senderName: m.senderName || 'Staff', msgs: [m] });
                    }
                  }
                  return (
                    <div className="space-y-3">
                      {groups.map((group, gi) => (
                        <div key={gi} className={`flex items-end gap-2 ${group.own ? 'justify-end' : 'justify-start'}`}>
                          {/* Avatar for incoming messages */}
                          {!group.own && (
                            <div className="shrink-0 self-end mb-0.5">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px]">
                                  {getAvatarFallback(group.senderName)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                          <div className={`flex min-w-0 flex-col gap-0.5 max-w-[72%] ${group.own ? 'items-end' : 'items-start'}`}>
                            {/* Sender name — once per incoming group */}
                            {!group.own && (
                              <p className="pl-1 text-[11px] font-semibold text-muted-foreground">
                                {group.senderName}
                              </p>
                            )}
                            {group.msgs.map((m, mi) => {
                              const isFirst = mi === 0;
                              const isLast = mi === group.msgs.length - 1;
                              return (
                                <div key={m.id} className="flex flex-col">
                                  <div
                                    className={[
                                      'px-4 py-2 text-sm leading-5 shadow-sm',
                                      group.own
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-background border text-foreground',
                                      group.own
                                        ? isFirst && isLast ? 'rounded-[18px] rounded-tr-sm'
                                          : isFirst ? 'rounded-[18px] rounded-tr-sm rounded-br-sm'
                                          : isLast ? 'rounded-[18px] rounded-tr-sm'
                                          : 'rounded-[18px] rounded-r-sm'
                                        : isFirst && isLast ? 'rounded-[18px] rounded-tl-sm'
                                          : isFirst ? 'rounded-[18px] rounded-tl-sm rounded-bl-sm'
                                          : isLast ? 'rounded-[18px] rounded-tl-sm'
                                          : 'rounded-[18px] rounded-l-sm',
                                    ].join(' ')}
                                  >
                                    <p className="whitespace-pre-wrap">{m.body}</p>
                                  </div>
                                  {/* Timestamp only under the last bubble in a group */}
                                  {isLast && (
                                    <p className={`mt-0.5 text-[11px] text-muted-foreground ${group.own ? 'text-right' : 'pl-1'}`}>
                                      {formatDate(m.createdAt)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {/* Spacer so outgoing bubbles don't hug the very edge */}
                          {group.own && <div className="w-7 shrink-0" />}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  );
                })()
              ) : null}
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t bg-background px-3 py-3">
              {selectedConversationType === 'customer' && selectedMessage ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-[24px] border bg-background px-4 py-2.5">
                      <input
                        type="text"
                        placeholder="Message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <Smile className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    <Button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="shrink-0 gap-1.5 rounded-full px-4"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </Button>
                  </div>
                  {/* Private notes — collapsible */}
                  <details className="mt-2.5 group">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      Private notes ({(selectedMessage.internalNotes || []).length})
                    </summary>
                    <div className="mt-2 space-y-2 rounded-xl bg-amber-50 p-2">
                      {(selectedMessage.internalNotes || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground p-1">No notes yet.</p>
                      ) : (
                        (selectedMessage.internalNotes || []).map((note: any) => (
                          <div key={note.id || `${note.createdAt}-${note.body}`} className="rounded-lg border bg-background p-2">
                            <p className="text-xs font-semibold text-foreground">{note.senderName || 'Staff'}</p>
                            <p className="mt-0.5 text-xs text-foreground">{note.body}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(note.createdAt)}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a private note..."
                          value={internalNoteText}
                          onChange={(e) => setInternalNoteText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddInternalNote(); }}
                          className="flex-1 rounded-full border bg-background px-3 py-1.5 text-xs outline-none focus:border-blue-400"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleAddInternalNote}
                          disabled={sending || !internalNoteText.trim()}
                          className="rounded-full text-xs"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </details>
                </>
              ) : selectedChat ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-[24px] border bg-background px-4 py-2.5">
                    <input
                      type="text"
                      placeholder="Message..."
                      value={internalChatMessage}
                      onChange={(e) => setInternalChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendInternalChatMessage();
                        }
                      }}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <Smile className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                  <Button
                    onClick={handleSendInternalChatMessage}
                    disabled={sending || !internalChatMessage.trim()}
                    className="shrink-0 gap-1.5 rounded-full px-4"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* ── NEW CHAT / GROUP DIALOG ── */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group Name</label>
              <Input
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Ex: Install Team, Pricing Strategy"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground">Choose People</label>
                <Badge variant="outline">{newChatMembers.length} selected</Badge>
              </div>
              <div className="max-h-[260px] space-y-1.5 overflow-y-auto rounded-2xl border p-2">
                {groupChatTargets.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No staff members available right now.</p>
                ) : (
                  groupChatTargets.map((target) => {
                    const targetKey = getTargetKey(target);
                    const selected = newChatMembers.includes(targetKey);
                    return (
                      <button
                        key={targetKey}
                        type="button"
                        onClick={() =>
                          setNewChatMembers((prev) =>
                            prev.includes(targetKey)
                              ? prev.filter((v) => v !== targetKey)
                              : [...prev, targetKey]
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition-colors ${
                          selected ? 'border-blue-300 bg-blue-50' : 'hover:bg-muted/60'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={target.avatar_url || undefined} alt={target.name} />
                            <AvatarFallback>{getAvatarFallback(target.name, target.email)}</AvatarFallback>
                          </Avatar>
                          {target.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{target.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{target.subtitle}</p>
                        </div>
                        <Badge
                          className={
                            selected
                              ? 'border-0 bg-blue-600 text-white'
                              : 'border-0 bg-slate-200 text-slate-700'
                          }
                        >
                          {selected ? 'Added' : target.kind === 'portal' ? 'Portal' : 'Staff'}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Opening Message (optional)</label>
              <Textarea
                rows={3}
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="Start the conversation…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowNewChat(false); setNewChatMembers([]); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInternalChat}
                disabled={sending}
                className="gap-2 rounded-full px-5"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {newChatMembers.length > 1 ? 'Save Group' : 'Create Chat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
