import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { getCrmPortalMessages } from '../utils/portal-client';
import type { User } from '../App';

export interface Suggestion {
  id: string;
  type: 'follow_up' | 'deadline' | 'inactive' | 'engagement' | 'opportunity' | 'task';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: number; // 1-100
  urgency: number; // 1-100
  score: number; // Combined priority score
  actionType: 'call' | 'email' | 'meeting' | 'review' | 'update';
  relatedEntity: {
    type: 'bid' | 'opportunity' | 'contact' | 'task' | 'appointment';
    id: string;
    name: string;
  };
  daysInactive?: number;
  potentialValue?: number;
  suggestedAction: string;
  context: string;
  createdAt: Date;
}

export interface DailyMetrics {
  totalSuggestions: number;
  criticalActions: number;
  potentialRevenue: number;
  avgDaysInactive: number;
  topPriority: Suggestion | null;
}

export function useAISuggestions(user: User) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAISuggestions();
      
      // Poll for updates every 5 minutes
      const intervalId = setInterval(loadAISuggestions, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const loadAISuggestions = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Fetch all relevant data - FILTERED BY USER
      // ... (fetch logic remains the same)
      const [bidsResult, quotesResult, opportunitiesResult, contactsResult, tasksResult, appointmentsResult] = await Promise.all([
        supabase.from('bids').select('*').eq('organization_id', user.organizationId).eq('created_by', user.id),
        supabase.from('quotes').select('*').eq('organization_id', user.organizationId).eq('created_by', user.id),
        supabase.from('opportunities').select('*').eq('organization_id', user.organizationId).eq('owner_id', user.id),
        supabase.from('contacts').select('*').eq('organization_id', user.organizationId).eq('owner_id', user.id),
        supabase.from('tasks').select('*').eq('organization_id', user.organizationId).eq('owner_id', user.id),
        supabase.from('appointments').select('*').eq('organization_id', user.organizationId).eq('owner_id', user.id),
      ]);

      const bids = bidsResult.data || [];
      const quotes = quotesResult.data || [];
      const opportunities = opportunitiesResult.data || [];
      const contacts = contactsResult.data || [];
      const tasks = tasksResult.data || [];
      const appointments = appointmentsResult.data || [];

      // Fetch portal messages for the org (non-blocking — OK if it fails)
      let portalMessages: any[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const pmData = await getCrmPortalMessages(session.access_token);
          portalMessages = pmData.messages || [];
        }
      } catch (pmErr) {
        // Portal messages are optional — don't break AI suggestions if this fails
        console.debug('[ai-suggestions] Portal messages fetch skipped:', pmErr);
      }

      const generatedSuggestions: Suggestion[] = [];

      // Helper functions
      const getDaysSince = (dateString: string): number => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      };

      const getDaysUntil = (dateString: string): number => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      };

      const calculateImpact = (value: number, daysInactive: number): number => {
        const valueScore = Math.min(100, (value / 10000) * 50); // $10k = 50 points
        const decayFactor = Math.max(0.5, 1 - (daysInactive / 100)); // Max 50% decay
        return Math.round(valueScore * decayFactor);
      };

      // 1. ANALYZE BIDS & QUOTES FOR FOLLOW-UPS
      [...bids, ...quotes].forEach(bid => {
        const daysInactive = getDaysSince(bid.updated_at || bid.created_at);
        const status = (bid.status || '').toLowerCase();
        const value = parseFloat(bid.total || bid.amount || 0);

        // Follow up on submitted/sent bids with no response
        if ((status === 'submitted' || status === 'sent') && daysInactive >= 5) {
          generatedSuggestions.push({
            id: `bid-followup-${bid.id}`,
            type: 'follow_up',
            title: `Follow up on ${bid.title}`,
            description: `Bid submitted ${daysInactive} days ago with no response`,
            priority: daysInactive > 10 ? 'critical' : daysInactive > 7 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(100, daysInactive * 8),
            score: 0,
            actionType: 'call',
            relatedEntity: {
              type: 'bid',
              id: bid.id,
              name: bid.title
            },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Call to discuss ${bid.title} — last contact was ${daysInactive} days ago.`,
            context: `Potential value: $${value.toLocaleString()}. Status: ${bid.status}.`,
            createdAt: new Date()
          });
        }

        // Re-engagement for rejected bids
        if (status === 'rejected' && daysInactive >= 30 && daysInactive <= 90) {
          generatedSuggestions.push({
            id: `bid-reengage-${bid.id}`,
            type: 'engagement',
            title: `Re-engage on previously rejected bid: ${bid.title}`,
            description: `Rejected ${daysInactive} days ago — time to reconnect with updated offering`,
            priority: 'medium',
            impact: calculateImpact(value * 0.7, daysInactive),
            urgency: 60,
            score: 0,
            actionType: 'email',
            relatedEntity: {
              type: 'bid',
              id: bid.id,
              name: bid.title
            },
            daysInactive,
            potentialValue: value * 0.7,
            suggestedAction: `Send updated proposal for ${bid.title} with revised pricing or terms.`,
            context: `Original value: $${value.toLocaleString()}. Consider 30% discount or new features.`,
            createdAt: new Date()
          });
        }

        // Draft bids stuck for too long
        if (status === 'draft' && daysInactive >= 7) {
          generatedSuggestions.push({
            id: `bid-draft-${bid.id}`,
            type: 'deadline',
            title: `Complete draft bid: ${bid.title}`,
            description: `Draft has been inactive for ${daysInactive} days`,
            priority: daysInactive > 14 ? 'high' : 'medium',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(100, daysInactive * 6),
            score: 0,
            actionType: 'update',
            relatedEntity: {
              type: 'bid',
              id: bid.id,
              name: bid.title
            },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Finalize and submit ${bid.title} to maintain momentum.`,
            context: `Estimated value: $${value.toLocaleString()}. Review and submit soon.`,
            createdAt: new Date()
          });
        }
      });

      // 2. ANALYZE OPPORTUNITIES
      opportunities.forEach(opp => {
        const daysInactive = getDaysSince(opp.updated_at || opp.created_at);
        const status = (opp.status || '').toLowerCase();
        const value = parseFloat(opp.value || 0);

        // Stuck opportunities
        if ((status === 'prospecting' || status === 'qualification' || status === 'proposal') && daysInactive >= 10) {
          generatedSuggestions.push({
            id: `opp-stuck-${opp.id}`,
            type: 'inactive',
            title: `Review stalled opportunity: ${opp.name || 'Unnamed Opportunity'}`,
            description: `Status stuck at '${opp.status}' for ${daysInactive} days`,
            priority: daysInactive > 20 ? 'critical' : 'high',
            impact: calculateImpact(value, daysInactive),
            urgency: Math.min(100, daysInactive * 7),
            score: 0,
            actionType: 'review',
            relatedEntity: {
              type: 'opportunity',
              id: opp.id,
              name: opp.name || 'Unnamed Opportunity'
            },
            daysInactive,
            potentialValue: value,
            suggestedAction: `Update status or schedule follow-up for ${opp.name || 'this opportunity'}.`,
            context: `Potential value: $${value.toLocaleString()}. Last updated ${daysInactive} days ago.`,
            createdAt: new Date()
          });
        }

        // Opportunities nearing close date
        if (opp.close_date) {
          const daysUntilClose = getDaysUntil(opp.close_date);
          if (daysUntilClose <= 7 && daysUntilClose >= 0 && status !== 'won' && status !== 'lost') {
            generatedSuggestions.push({
              id: `opp-closing-${opp.id}`,
              type: 'deadline',
              title: `Opportunity closing soon: ${opp.name || 'Unnamed Opportunity'}`,
              description: `Close date in ${daysUntilClose} days`,
              priority: daysUntilClose <= 2 ? 'critical' : 'high',
              impact: calculateImpact(value, 0),
              urgency: Math.max(80, 100 - daysUntilClose * 5),
              score: 0,
              actionType: 'call',
              relatedEntity: {
                type: 'opportunity',
                id: opp.id,
                name: opp.name || 'Unnamed Opportunity'
              },
              potentialValue: value,
              suggestedAction: `Final push on ${opp.name || 'this opportunity'} — close date is approaching!`,
              context: `Value: $${value.toLocaleString()}. Close date: ${new Date(opp.close_date).toLocaleDateString()}.`,
              createdAt: new Date()
            });
          }
        }
      });

      // 3. ANALYZE TASKS
      tasks.forEach(task => {
        const daysOverdue = task.dueDate ? getDaysSince(task.dueDate) : 0;
        const status = (task.status || '').toLowerCase();

        // Overdue tasks
        if (daysOverdue > 0 && status !== 'completed') {
          generatedSuggestions.push({
            id: `task-overdue-${task.id}`,
            type: 'deadline',
            title: `Overdue task: ${task.title}`,
            description: `Task is ${daysOverdue} days overdue`,
            priority: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
            impact: task.priority === 'high' ? 80 : task.priority === 'medium' ? 60 : 40,
            urgency: Math.min(100, daysOverdue * 10),
            score: 0,
            actionType: 'update',
            relatedEntity: {
              type: 'task',
              id: task.id,
              name: task.title
            },
            suggestedAction: `Complete overdue task: ${task.title}`,
            context: `Priority: ${task.priority}. Overdue by ${daysOverdue} days.`,
            createdAt: new Date()
          });
        }

        // Upcoming high-priority tasks
        if (task.dueDate && status !== 'completed') {
          const daysUntilDue = getDaysUntil(task.dueDate);
          if (daysUntilDue <= 2 && daysUntilDue >= 0 && task.priority === 'high') {
            generatedSuggestions.push({
              id: `task-upcoming-${task.id}`,
              type: 'deadline',
              title: `Upcoming high-priority task: ${task.title}`,
              description: `Due in ${daysUntilDue} days`,
              priority: 'high',
              impact: 75,
              urgency: 85,
              score: 0,
              actionType: 'update',
              relatedEntity: {
                type: 'task',
                id: task.id,
                name: task.title
              },
              suggestedAction: `Focus on ${task.title} — due soon!`,
              context: `Priority: ${task.priority}. Due: ${new Date(task.dueDate).toLocaleDateString()}.`,
              createdAt: new Date()
            });
          }
        }
      });

      // 4. ANALYZE CONTACTS FOR INACTIVE ENGAGEMENT
      contacts.forEach(contact => {
        const daysInactive = getDaysSince(contact.updated_at || contact.created_at);

        // High-value contacts with no recent interaction
        if (contact.status === 'active' && daysInactive >= 30) {
          generatedSuggestions.push({
            id: `contact-inactive-${contact.id}`,
            type: 'inactive',
            title: `Re-engage with ${contact.name}`,
            description: `No interaction for ${daysInactive} days`,
            priority: daysInactive > 60 ? 'high' : 'medium',
            impact: 65,
            urgency: Math.min(80, daysInactive * 2),
            score: 0,
            actionType: 'email',
            relatedEntity: {
              type: 'contact',
              id: contact.id,
              name: contact.name
            },
            daysInactive,
            suggestedAction: `Send check-in email to ${contact.name} at ${contact.company || 'their company'}.`,
            context: `Last contact: ${daysInactive} days ago. Keep relationship warm.`,
            createdAt: new Date()
          });
        }
      });

      // 5. ANALYZE PORTAL MESSAGES — Unread customer messages need prompt attention
      portalMessages.forEach((msg: any) => {
        const isUnread = !msg.read && msg.from === 'customer';
        const hasNoReply = !msg.replies || msg.replies.length === 0 ||
          msg.replies[msg.replies.length - 1]?.from === 'customer';

        if (isUnread || hasNoReply) {
          const hoursSinceSent = (Date.now() - new Date(msg.createdAt).getTime()) / (1000 * 60 * 60);
          const daysSinceSent = Math.floor(hoursSinceSent / 24);
          const customerName = msg.contactName || msg.senderEmail || 'A customer';

          generatedSuggestions.push({
            id: `portal-msg-${msg.id}`,
            type: 'follow_up',
            title: `Reply to portal message from ${customerName}`,
            description: isUnread
              ? `Unread message: "${msg.subject}" — sent ${daysSinceSent > 0 ? daysSinceSent + ' days' : Math.round(hoursSinceSent) + ' hours'} ago`
              : `Awaiting your reply: "${msg.subject}"`,
            priority: hoursSinceSent > 48 ? 'critical' : hoursSinceSent > 12 ? 'high' : 'medium',
            impact: 85, // Customer messages are high-impact — they already took the initiative
            urgency: Math.min(100, Math.round(hoursSinceSent * 2)),
            score: 0,
            actionType: 'email',
            relatedEntity: {
              type: 'contact',
              id: msg.contactId || msg.id,
              name: customerName,
            },
            suggestedAction: `Open Customer Portal admin and reply to "${msg.subject}" from ${customerName}.`,
            context: `${msg.contactCompany ? `Company: ${msg.contactCompany}. ` : ''}Subject: ${msg.subject}. ${isUnread ? 'Message has not been read yet.' : 'Customer is waiting for your response.'}`,
            createdAt: new Date(msg.createdAt),
          });
        }
      });

      // 6. CALCULATE SCORES AND SORT
      generatedSuggestions.forEach(suggestion => {
        suggestion.score = (suggestion.impact * 0.6) + (suggestion.urgency * 0.4);
      });

      generatedSuggestions.sort((a, b) => b.score - a.score);

      // Calculate metrics
      const criticalCount = generatedSuggestions.filter(s => s.priority === 'critical').length;
      const totalRevenue = generatedSuggestions.reduce((sum, s) => sum + (s.potentialValue || 0), 0);
      const avgInactive = generatedSuggestions.filter(s => s.daysInactive).reduce((sum, s) => sum + (s.daysInactive || 0), 0) / 
                          Math.max(1, generatedSuggestions.filter(s => s.daysInactive).length);

      setMetrics({
        totalSuggestions: generatedSuggestions.length,
        criticalActions: criticalCount,
        potentialRevenue: totalRevenue,
        avgDaysInactive: Math.round(avgInactive),
        topPriority: generatedSuggestions[0] || null
      });

      setSuggestions(generatedSuggestions);

    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      setSuggestions([]);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { suggestions, metrics, isLoading, refresh: loadAISuggestions };
}