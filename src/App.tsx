import { useState, useEffect } from 'react';
import { createClient } from './utils/supabase/client.ts';
import { initializePermissions } from './utils/permissions';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Tasks } from './components/Tasks';
import { Opportunities } from './components/Opportunities';
import { Bids } from './components/Bids';
import { Notes } from './components/Notes';
import { Appointments } from './components/Appointments';
import { Documents } from './components/Documents';
import { Email } from './components/Email';
import { Marketing } from './components/Marketing';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { ManagerDashboard } from './components/ManagerDashboard';
import { Users } from './components/Users';
import { Tenants } from './components/Tenants';
import { Settings } from './components/Settings';
import { Security } from './components/Security';
import { ImportExport } from './components/ImportExport';
import { ScheduledJobs } from './components/ScheduledJobs';
import { BackgroundImportManager } from './components/BackgroundImportManager';
import { AITaskSuggestions } from './components/AITaskSuggestions';
import { ProjectWizards } from './components/ProjectWizards';
import { ThemeProvider } from './components/ThemeProvider';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'manager' | 'admin' | 'super_admin';
  full_name?: string;
  avatar_url?: string;
  organization_id?: string;
  // Add camelCase alias for components
  organizationId?: string;
}

export interface Organization {
  id: string;
  name: string;
  ai_suggestions_enabled?: boolean;
  appointments_enabled?: boolean;
  documents_enabled?: boolean;
  marketing_enabled?: boolean;
  inventory_enabled?: boolean;
  import_export_enabled?: boolean;
  project_wizards_enabled?: boolean;
}

const supabase = createClient();

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentView, setCurrentView] = useState('landing');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setUser(null);
        setOrganization(null);
        setCurrentView('landing');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profile) {
        // IMPORTANT: Don't load user data if they need to change password
        // The Login component will handle showing the change password dialog
        if (profile.needs_password_change) {
          console.log('⏸️ User needs to change password - not loading user data yet');
          setLoading(false);
          return;
        }

        // Load user preferences to get profile picture
        let avatarUrl = profile.avatar_url;
        try {
          const { data: userPrefs } = await supabase
            .from('user_preferences')
            .select('profile_picture')
            .eq('user_id', profile.id)
            .eq('organization_id', profile.organization_id)
            .single();
          
          if (userPrefs?.profile_picture) {
            avatarUrl = userPrefs.profile_picture;
          }
        } catch (prefError) {
          console.log('No user preferences found, using profile avatar_url');
        }

        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          full_name: profile.full_name || profile.name,
          avatar_url: avatarUrl,
          organization_id: profile.organization_id,
          // Add camelCase alias for components
          organizationId: profile.organization_id,
        });

        // Initialize permissions for this user's role
        await initializePermissions(profile.role);

        // Load organization if user has one
        if (profile.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

          if (org) {
            setOrganization(org);
          }
        }

        // Set default view based on user role
        // SUPER_ADMIN starts on Organizations page, others on Dashboard
        setCurrentView(profile.role === 'super_admin' ? 'tenants' : 'dashboard');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setCurrentView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return currentView === 'login' ? (
      <Login onLogin={(user, token) => {
        setUser(user);
        setCurrentView('dashboard');
      }} />
    ) : (
      <LandingPage onGetStarted={() => setCurrentView('login')} />
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider userId={user?.id}>
        <Toaster />
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-background)' }}>
          <Navigation
            user={user}
            organization={organization}
            currentView={currentView}
            onNavigate={setCurrentView}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-auto lg:ml-64" style={{ background: 'var(--color-background-secondary)' }}>
            <OfflineIndicator />
            <PWAInstallPrompt />

            <div className="pt-14 sm:pt-16 lg:pt-16">
              {currentView === 'dashboard' && <Dashboard user={user} organization={organization} onNavigate={setCurrentView} />}
              {currentView === 'ai-suggestions' && <AITaskSuggestions user={user} />}
              {currentView === 'contacts' && <Contacts user={user} />}
              {currentView === 'tasks' && <Tasks user={user} />}
              {currentView === 'opportunities' && <Opportunities user={user} />}
              {currentView === 'bids' && <Bids user={user} />}
              {currentView === 'notes' && <Notes user={user} />}
              {currentView === 'appointments' && <Appointments user={user} />}
              {currentView === 'documents' && <Documents user={user} />}
              {currentView === 'email' && <Email user={user} />}
              {currentView === 'marketing' && <Marketing user={user} />}
              {currentView === 'inventory' && <Inventory user={user} />}
              {currentView === 'reports' && <Reports user={user} organization={organization} />}
              {currentView === 'team-dashboard' && <ManagerDashboard user={user} organization={organization} />}
              {currentView === 'users' && <Users user={user} />}
              {currentView === 'tenants' && <Tenants user={user} />}
              {currentView === 'settings' && <Settings user={user} onUserUpdate={setUser} />}
              {currentView === 'security' && <Security user={user} />}
              {currentView === 'import-export' && <ImportExport user={user} onNavigate={setCurrentView} />}
              {currentView === 'project-wizards' && <ProjectWizards user={user} />}
              {currentView === 'scheduled-jobs' && <ScheduledJobs user={user} onNavigate={setCurrentView} />}
              {currentView === 'background-imports' && <BackgroundImportManager user={user} onNavigate={setCurrentView} />}
            </div>
          </main>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;