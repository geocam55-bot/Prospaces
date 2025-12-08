/**
 * Mock Calendar Sync Functions
 * 
 * These are stub functions that simulate calendar sync behavior for testing the UI.
 * Replace these with actual Google Calendar API / Microsoft Graph API calls in production.
 */

import { createClient } from './supabase/client';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  etag?: string;
}

export interface SyncResult {
  imported: number;
  exported: number;
  updated: number;
  deleted: number;
  errors: number;
  errorMessages?: string[];
}

/**
 * Mock function to simulate importing events from Google Calendar
 */
export async function importGoogleCalendarEvents(
  accountId: string,
  accessToken: string
): Promise<CalendarEvent[]> {
  console.log('[Mock] Importing from Google Calendar...', { accountId });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock calendar events
  const mockEvents: CalendarEvent[] = [
    {
      id: 'google_event_1',
      summary: 'Team Standup',
      description: 'Daily team sync meeting',
      start: {
        dateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(Date.now() + 86400000 + 1800000).toISOString(), // Tomorrow + 30 min
        timeZone: 'America/New_York'
      },
      location: 'Conference Room A',
      status: 'confirmed',
      etag: 'etag_123456'
    },
    {
      id: 'google_event_2',
      summary: 'Client Call - ABC Corp',
      description: 'Q4 review and planning',
      start: {
        dateTime: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(Date.now() + 172800000 + 3600000).toISOString(), // 2 days + 1 hour
        timeZone: 'America/New_York'
      },
      location: 'Zoom',
      status: 'confirmed',
      etag: 'etag_789012'
    }
  ];
  
  console.log('[Mock] Imported', mockEvents.length, 'events from Google Calendar');
  return mockEvents;
}

/**
 * Mock function to simulate importing events from Outlook Calendar
 */
export async function importOutlookCalendarEvents(
  accountId: string,
  accessToken: string
): Promise<CalendarEvent[]> {
  console.log('[Mock] Importing from Outlook Calendar...', { accountId });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock calendar events
  const mockEvents: CalendarEvent[] = [
    {
      id: 'outlook_event_1',
      summary: 'Project Review',
      description: 'Monthly project status review',
      start: {
        dateTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(Date.now() + 259200000 + 3600000).toISOString(), // 3 days + 1 hour
        timeZone: 'UTC'
      },
      location: 'Office Building B',
      status: 'confirmed',
      etag: 'outlook_etag_abc'
    }
  ];
  
  console.log('[Mock] Imported', mockEvents.length, 'events from Outlook Calendar');
  return mockEvents;
}

/**
 * Mock function to export a CRM appointment to Google Calendar
 */
export async function exportToGoogleCalendar(
  accountId: string,
  accessToken: string,
  appointment: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
  }
): Promise<string> {
  console.log('[Mock] Exporting to Google Calendar...', { accountId, appointment });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate mock event ID
  const eventId = `google_exported_${Date.now()}`;
  
  console.log('[Mock] Created Google Calendar event:', eventId);
  return eventId;
}

/**
 * Mock function to export a CRM appointment to Outlook Calendar
 */
export async function exportToOutlookCalendar(
  accountId: string,
  accessToken: string,
  appointment: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
  }
): Promise<string> {
  console.log('[Mock] Exporting to Outlook Calendar...', { accountId, appointment });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate mock event ID
  const eventId = `outlook_exported_${Date.now()}`;
  
  console.log('[Mock] Created Outlook Calendar event:', eventId);
  return eventId;
}

/**
 * Mock function to update an existing calendar event
 */
export async function updateCalendarEvent(
  provider: 'google' | 'outlook',
  accountId: string,
  accessToken: string,
  eventId: string,
  appointment: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
  }
): Promise<boolean> {
  console.log('[Mock] Updating calendar event...', { provider, eventId, appointment });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log('[Mock] Updated calendar event:', eventId);
  return true;
}

/**
 * Mock function to delete a calendar event
 */
export async function deleteCalendarEvent(
  provider: 'google' | 'outlook',
  accountId: string,
  accessToken: string,
  eventId: string
): Promise<boolean> {
  console.log('[Mock] Deleting calendar event...', { provider, eventId });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  console.log('[Mock] Deleted calendar event:', eventId);
  return true;
}

/**
 * Main two-way sync function
 * This orchestrates the entire sync process
 */
export async function performCalendarSync(
  userId: string,
  accountId: string,
  direction: 'import' | 'export' | 'bidirectional' = 'bidirectional'
): Promise<SyncResult> {
  const supabase = createClient();
  
  console.log('[Mock Sync] Starting calendar sync...', { userId, accountId, direction });
  
  const result: SyncResult = {
    imported: 0,
    exported: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
    errorMessages: []
  };
  
  try {
    // Get calendar account details
    const { data: account, error: accountError } = await supabase
      .from('calendar_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (accountError || !account) {
      console.error('[Mock Sync] Account not found');
      result.errors++;
      result.errorMessages?.push('Calendar account not found');
      return result;
    }
    
    const { provider, access_token, organization_id } = account;
    
    // IMPORT: Calendar → CRM
    if (direction === 'import' || direction === 'bidirectional') {
      console.log('[Mock Sync] Importing events from calendar...');
      
      // Fetch events from calendar
      const calendarEvents = provider === 'google'
        ? await importGoogleCalendarEvents(accountId, access_token || 'mock_token')
        : await importOutlookCalendarEvents(accountId, access_token || 'mock_token');
      
      // For each calendar event, check if it exists in CRM
      for (const event of calendarEvents) {
        // Check if mapping exists
        const { data: existingMapping } = await supabase
          .from('calendar_event_mappings')
          .select('appointment_id')
          .eq('external_event_id', event.id)
          .eq('calendar_account_id', accountId)
          .single();
        
        if (existingMapping) {
          // Update existing appointment
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              title: event.summary,
              description: event.description || '',
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              location: event.location || '',
            })
            .eq('id', existingMapping.appointment_id);
          
          if (updateError) {
            console.error('[Mock Sync] Error updating appointment:', updateError);
            result.errors++;
          } else {
            result.updated++;
          }
        } else {
          // Create new appointment
          const { data: newAppointment, error: createError } = await supabase
            .from('appointments')
            .insert({
              title: event.summary,
              description: event.description || '',
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              location: event.location || '',
              owner_id: userId,
              organization_id: organization_id,
            })
            .select()
            .single();
          
          if (createError || !newAppointment) {
            console.error('[Mock Sync] Error creating appointment:', createError);
            result.errors++;
          } else {
            // Create mapping
            await supabase.from('calendar_event_mappings').insert({
              appointment_id: newAppointment.id,
              calendar_account_id: accountId,
              organization_id: organization_id,
              external_event_id: event.id,
              external_event_etag: event.etag,
              sync_status: 'synced',
              sync_direction: 'calendar_to_crm',
            });
            
            result.imported++;
          }
        }
      }
    }
    
    // EXPORT: CRM → Calendar
    if (direction === 'export' || direction === 'bidirectional') {
      console.log('[Mock Sync] Exporting appointments to calendar...');
      
      // Get all appointments that aren't mapped yet
      const { data: unmappedAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organization_id)
        .not('id', 'in', 
          supabase
            .from('calendar_event_mappings')
            .select('appointment_id')
            .eq('calendar_account_id', accountId)
        );
      
      // For each unmapped appointment, create in calendar
      if (unmappedAppointments && unmappedAppointments.length > 0) {
        for (const appointment of unmappedAppointments) {
          try {
            const externalEventId = provider === 'google'
              ? await exportToGoogleCalendar(accountId, access_token || 'mock_token', appointment)
              : await exportToOutlookCalendar(accountId, access_token || 'mock_token', appointment);
            
            // Create mapping
            await supabase.from('calendar_event_mappings').insert({
              appointment_id: appointment.id,
              calendar_account_id: accountId,
              organization_id: organization_id,
              external_event_id: externalEventId,
              sync_status: 'synced',
              sync_direction: 'crm_to_calendar',
            });
            
            result.exported++;
          } catch (error) {
            console.error('[Mock Sync] Error exporting appointment:', error);
            result.errors++;
          }
        }
      }
    }
    
    // Update last sync time
    await supabase
      .from('calendar_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);
    
    // Log sync operation
    await supabase.from('calendar_sync_log').insert({
      calendar_account_id: accountId,
      user_id: userId,
      sync_type: 'manual',
      sync_direction: direction,
      events_imported: result.imported,
      events_exported: result.exported,
      events_updated: result.updated,
      events_deleted: result.deleted,
      errors: result.errors,
      status: result.errors > 0 ? 'partial' : 'success',
      error_details: result.errorMessages?.length ? { messages: result.errorMessages } : null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    
    console.log('[Mock Sync] Sync completed:', result);
    
  } catch (error: any) {
    console.error('[Mock Sync] Sync failed:', error);
    result.errors++;
    result.errorMessages?.push(error.message);
  }
  
  return result;
}

/**
 * Refresh OAuth token (mock)
 */
export async function refreshOAuthToken(
  provider: 'google' | 'outlook',
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  console.log('[Mock] Refreshing OAuth token...', { provider });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock refreshed token
  return {
    access_token: `mock_refreshed_token_${Date.now()}`,
    expires_in: 3600 // 1 hour
  };
}
