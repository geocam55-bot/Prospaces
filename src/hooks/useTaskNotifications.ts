import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

export function useTaskNotifications(user: User) {
  const [taskCount, setTaskCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTaskCount();
      
      // Set up real-time subscription for task updates
      const supabase = createClient();
      const channel = supabase
        .channel('task-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`,
          },
          () => {
            loadTaskCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadTaskCount = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Count pending tasks assigned to the user
      // We want tasks that are assigned to the user and NOT completed
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('status', 'completed');

      if (error) {
        console.error('Error counting tasks:', error);
        return;
      }

      setTaskCount(count || 0);
    } catch (error) {
      console.error('Failed to load task count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { taskCount, isLoading };
}
