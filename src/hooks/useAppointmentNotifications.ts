import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import type { User } from '../App';

export function useAppointmentNotifications(user: User) {
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = useNotificationPreferences(user);

  useEffect(() => {
    // If notifications are disabled, set count to 0 and stop
    if (!preferences.appointments) {
      setAppointmentCount(0);
      setIsLoading(false);
      return;
    }

    if (user) {
      loadAppointmentCount();
      
      // Set up real-time subscription for appointment updates
      const supabase = createClient();
      const channel = supabase
        .channel('appointment-notifications')
        // Listen for INSERT and UPDATE where the user is the owner
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            filter: `owner_id=eq.${user.id}`,
          },
          () => {
            loadAppointmentCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `owner_id=eq.${user.id}`,
          },
          () => {
            loadAppointmentCount();
          }
        )
        // Listen for ANY DELETE because we can't filter by owner_id on delete
        // (owner_id is not present in the delete payload without REPLICA IDENTITY FULL)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'appointments',
          },
          () => {
            loadAppointmentCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, preferences.appointments]);

  const loadAppointmentCount = async () => {
    if (!preferences.appointments) return;

    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Count upcoming appointments for the user
      // We want appointments owned by the user that start in the future
      const now = new Date().toISOString();
      
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gt('start_time', now);

      if (error) {
        console.error('Error counting appointments:', error);
        return;
      }

      setAppointmentCount(count || 0);
    } catch (error) {
      console.error('Failed to load appointment count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { appointmentCount: preferences.appointments ? appointmentCount : 0, isLoading };
}
