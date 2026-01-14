import { useState, useEffect } from 'react';
import { settingsAPI } from '../utils/api';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  taskAssignments: boolean;
  appointments: boolean;
  bids: boolean;
}

export function useNotificationPreferences(user: User | null) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    taskAssignments: true,
    appointments: true,
    bids: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
      
      // Subscribe to changes in user_preferences
      const supabase = createClient();
      const channel = supabase
        .channel('user-preferences-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_preferences',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              const newPrefs = payload.new as any;
              setPreferences({
                email: newPrefs.notifications_email ?? true,
                push: newPrefs.notifications_push ?? true,
                taskAssignments: newPrefs.notifications_task_assignments ?? true,
                appointments: newPrefs.notifications_appointments ?? true,
                bids: newPrefs.notifications_bids ?? true,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.organizationId) return;

    try {
      setIsLoading(true);
      const data = await settingsAPI.getUserPreferences(user.id, user.organizationId);
      
      if (data) {
        setPreferences({
          email: data.notifications_email ?? true,
          push: data.notifications_push ?? true,
          taskAssignments: data.notifications_task_assignments ?? true,
          appointments: data.notifications_appointments ?? true,
          bids: data.notifications_bids ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { preferences, isLoading, refresh: loadPreferences };
}
