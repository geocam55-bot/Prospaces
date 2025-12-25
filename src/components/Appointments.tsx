import { useState, useEffect } from 'react';
import { appointmentsAPI } from '../utils/api';
import { CalendarAccountSetup } from './CalendarAccountSetup';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Plus, Trash2, Clock, MapPin, Calendar as CalendarIcon, MoreVertical, Link2, RefreshCw, Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  location: string;
  contact_id?: string;
  owner_id?: string;
  organization_id: string;
  created_at: string;
  created_by?: string;
  calendar_event_id?: string; // Identifies synced calendar events
  calendar_provider?: string; // e.g., 'google', 'microsoft'
  status?: string; // e.g., 'scheduled', 'cancelled'
  attendees?: string;
}

interface AppointmentsProps {
  user: User;
}

export function Appointments({ user }: AppointmentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Calendar sync state
  const [isCalendarSetupOpen, setIsCalendarSetupOpen] = useState(false);
  const [calendarAccounts, setCalendarAccounts] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
  });

  // Load appointments on mount
  useEffect(() => {
    loadAppointments();
    loadCalendarAccounts();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const calendarConnected = urlParams.get('calendar_connected');
    const email = urlParams.get('email');
    const errorMessage = urlParams.get('message');
    
    if (calendarConnected === 'success' && email) {
      toast.success('Calendar connected!', {
        description: `${email} has been successfully connected`
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload accounts
      loadCalendarAccounts();
    } else if (calendarConnected === 'error') {
      toast.error('Failed to connect calendar', {
        description: errorMessage || 'An error occurred during connection'
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await appointmentsAPI.getAll();
      setAppointments(response.appointments || []);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine date and time into ISO timestamps
      const startDateTime = new Date(`${newAppointment.date}T${newAppointment.startTime}`);
      const endDateTime = new Date(`${newAppointment.date}T${newAppointment.endTime}`);
      
      const appointmentData = {
        title: newAppointment.title,
        description: newAppointment.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: newAppointment.location,
      };
      
      await appointmentsAPI.create(appointmentData);
      await loadAppointments(); // Reload appointments from server
      
      setNewAppointment({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      await appointmentsAPI.delete(id);
      await loadAppointments(); // Reload appointments from server
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      alert('Failed to delete appointment. Please try again.');
    }
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(a.start_time);
    const dateB = new Date(b.start_time);
    return dateA.getTime() - dateB.getTime();
  });

  // Helper to format date/time from ISO timestamp
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const loadCalendarAccounts = async () => {
    const client = createClient();
    try {
      // Nylas uses email_accounts table for both email and calendar
      const { data, error } = await client
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('connected', true);
      if (error) {
        console.error('Error fetching calendar accounts:', error);
      } else {
        console.log('[Appointments] Loaded calendar accounts:', data?.map(a => ({
          id: a.id,
          email: a.email,
          provider: a.provider,
          hasNylasGrant: !!a.nylas_grant_id
        })));
        setCalendarAccounts(data || []);
      }
    } catch (error) {
      console.error('Failed to load calendar accounts:', error);
    }
  };

  const handleSyncCalendar = async () => {
    if (calendarAccounts.length === 0) {
      toast.error('No calendar accounts connected');
      return;
    }

    setIsSyncing(true);
    try {
      const supabase = createClient();
      
      // Sync with each connected calendar account
      for (const account of calendarAccounts) {
        try {
          // Call Nylas calendar sync Edge Function
          const { data, error } = await supabase.functions.invoke('nylas-sync-calendar', {
            body: {
              accountId: account.id,
            }
          });
          
          if (error) {
            console.error('[Sync] Error syncing account:', error);
            toast.error(`Failed to sync ${account.provider} calendar`, {
              description: error.message || 'Please ensure Edge Functions are deployed'
            });
            continue;
          }

          if (!data?.success) {
            toast.error(`Failed to sync ${account.provider} calendar`, {
              description: data?.error || 'Sync operation was not successful'
            });
            continue;
          }

          // Nylas sync response format: { success, syncedCount, calendarsCount, lastSync }
          console.log('[Sync] Calendar sync result for', account.email, ':', {
            success: data.success,
            syncedCount: data.syncedCount,
            calendarsCount: data.calendarsCount,
            lastSync: data.lastSync,
            error: data.error
          });
          
          toast.success(`Synced ${account.provider} calendar!`, {
            description: `${data.syncedCount || 0} new event(s) imported`
          });
        } catch (accountError: any) {
          console.error('[Sync] Error syncing account:', accountError);
          toast.error(`Failed to sync ${account.provider} calendar`, {
            description: accountError.message || 'Please ensure Edge Functions are deployed'
          });
        }
      }
      
      // Reload appointments to show newly imported ones
      await loadAppointments();
      await loadCalendarAccounts(); // Refresh last sync time
      
      // Debug: Check if appointments exist with calendar_event_id
      const { data: allCalendarAppts } = await supabase
        .from('appointments')
        .select('id, title, organization_id, calendar_event_id, calendar_provider')
        .not('calendar_event_id', 'is', null);
      
      console.log('[Sync Debug] All calendar appointments in database:', allCalendarAppts);
      console.log('[Sync Debug] Current user organization:', user.organizationId);
      console.log('[Sync Debug] Appointments loaded in UI:', appointments.length);
      
    } catch (error: any) {
      console.error('Failed to sync calendar:', error);
      toast.error('Failed to sync calendar', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">
            {calendarAccounts.length > 0 
              ? 'Calendar synced appointments and manual entries'
              : 'Schedule and manage your meetings'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {calendarAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncCalendar}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Sync Calendar</>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCalendarSetupOpen(true)}
          >
            <Link2 className="h-4 w-4 mr-2" />
            {calendarAccounts.length > 0 ? 'Manage Calendars' : 'Connect Calendar'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule New Appointment</DialogTitle>
                <DialogDescription>
                  Create a new appointment with date, time, and location details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newAppointment.title}
                    onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                    placeholder="Meeting title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAppointment.description}
                    onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
                    rows={3}
                    placeholder="Meeting details..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newAppointment.startTime}
                      onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newAppointment.endTime}
                      onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newAppointment.location}
                    onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                    placeholder="Meeting location"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">Add Appointment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading appointments...</div>
          ) : sortedAppointments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No appointments scheduled yet.</p>
              <p className="text-sm mt-2">Click "Add Appointment" to create your first one.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAppointments.map((appointment) => {
                const startDate = new Date(appointment.start_time);
                const isUpcoming = startDate > new Date();
                
                return (
                  <div
                    key={appointment.id}
                    className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-3 min-w-[70px]">
                      <span className="text-2xl text-blue-600">
                        {startDate.getDate()}
                      </span>
                      <span className="text-xs text-blue-600">
                        {startDate.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                          {appointment.description && (
                            <p className="text-sm text-gray-600 mt-1">{appointment.description}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                        </div>
                        {appointment.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isUpcoming && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                            Upcoming
                          </span>
                        )}
                        {appointment.calendar_event_id && appointment.calendar_provider && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Synced from {appointment.calendar_provider === 'google' ? 'Google' : appointment.calendar_provider === 'microsoft' ? 'Outlook' : appointment.calendar_provider}
                          </span>
                        )}
                        {appointment.attendees && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                            {appointment.attendees.split(',').length} attendee(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCalendarSetupOpen} onOpenChange={setIsCalendarSetupOpen}>
        <CalendarAccountSetup
          isOpen={isCalendarSetupOpen}
          onClose={() => setIsCalendarSetupOpen(false)}
          onAccountAdded={loadCalendarAccounts}
          existingAccounts={calendarAccounts}
        />
      </Dialog>
    </div>
  );
}