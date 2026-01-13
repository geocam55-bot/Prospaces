import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

export function useUnreadEmails(user: User) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      
      // Set up real-time subscription for email updates
      const supabase = createClient();
      const channel = supabase
        .channel('unread-emails-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'emails',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Fetch latest emails to count unread, matching Email.tsx logic
      // We fetch the data and filter in memory to avoid SQL/Null folder filtering issues
      const { data, error } = await supabase
        .from('emails')
        .select('is_read, folder')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading unread emails:', error);
        return;
      }

      if (data) {
        const count = data.filter(email => {
          // Check if unread (false or null)
          const isUnread = email.is_read === false || email.is_read === null;
          
          // Check folder
          // We exclude system folders that shouldn't contribute to notification count
          const folder = (email.folder || '').toLowerCase();
          const isExcluded = ['sent', 'trash', 'spam', 'drafts'].includes(folder);
          
          return isUnread && !isExcluded;
        }).length;
        
        console.log('Unread emails count (JS calculated):', count);
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to load unread emails count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { unreadCount, isLoading, refresh: loadUnreadCount };
}