// CRITICAL: Import Three.js warning suppression FIRST, before any other imports
import './utils/suppressThreeWarnings';

import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { TopBar } from './components/TopBar';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Tasks } from './components/Tasks';
import { Appointments } from './components/Appointments';
import { Notes } from './components/Notes';
import { Email } from './components/Email';
import { Marketing } from './components/Marketing';
import { Inventory } from './components/Inventory';
import { Documents } from './components/Documents';
import { Users } from './components/Users';
import { Tenants } from './components/Tenants';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { Bids } from './components/Bids';
import { ManagerDashboard } from './components/ManagerDashboard';
import { Security } from './components/Security';
import { ImportExport } from './components/ImportExport';
import { ScheduledJobs } from './components/ScheduledJobs';
import { BackgroundImportManager } from './components/BackgroundImportManager';
import { AITaskSuggestions } from './components/AITaskSuggestions';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { KitchenPlanner } from './components/planners/KitchenPlanner';
import { DeckPlanner } from './components/planners/DeckPlanner';
import { GaragePlanner } from './components/planners/GaragePlanner';
import { ShedPlanner } from './components/planners/ShedPlanner';
import { RoofPlanner } from './components/planners/RoofPlanner';
import { ThemeProvider } from './components/ThemeProvider';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { FaviconGenerator } from './components/FaviconGenerator';
import { TrackingRedirect } from './components/TrackingRedirect';
import { PublicQuoteView } from './components/PublicQuoteView';
import { PublicLandingPage } from './components/marketing/PublicLandingPage';
import { LandingPageDebug } from './components/LandingPageDebug';
import { LandingPageDiagnostic } from './components/marketing/LandingPageDiagnostic';
import { LandingPageDiagnosticTest } from './components/marketing/LandingPageDiagnosticTest';
import { OAuthCallback } from './components/OAuthCallback';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { createClient } from './utils/supabase/client';
import { initializePermissions } from './utils/permissions';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { AdminFixUsers } from './components/AdminFixUsers';

export type UserRole = 'standard_user' | 'manager' | 'admin' | 'super_admin' | 'marketing';

export interface User {
  id: string;
  email: string;
  role: UserRole;
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  // Check if accessing favicon generator (no auth required)
  const urlParams = new URLSearchParams(window.location.search);
  const isFaviconGenerator = urlParams.get('view') === 'favicon-generator';
  const isTrackingRedirect = urlParams.get('view') === 'redirect';
  const isPublicQuote = urlParams.get('view') === 'public-quote';
  const isLandingPageDebug = urlParams.get('view') === 'landing-page-debug';
  const isLandingPageDiagnostic = urlParams.get('view') === 'landing-page-diagnostic';
  const isLandingPageDiagnosticTest = urlParams.get('view') === 'landing-page-diagnostic-test';
  const isFixLogin = urlParams.get('view') === 'fix-login';
  const isPrivacyPolicy = urlParams.get('view') === 'privacy-policy';
  const isTermsOfService = urlParams.get('view') === 'terms-of-service';
  
  // Check path-based routing for public landing pages
  const path = window.location.pathname;
  const isLandingPage = path.startsWith('/landing/');
  const landingPageSlug = isLandingPage ? path.split('/landing/')[1]?.split('?')[0] : null;
  const isOAuthCallback = path === '/oauth-callback';
  const isPrivacyPolicyPath = path === '/privacy-policy';
  const isTermsOfServicePath = path === '/terms-of-service';
  
  console.log('[App.tsx] Routing Debug:', {
    path,
    isLandingPage,
    landingPageSlug,
    isOAuthCallback,
    fullURL: window.location.href
  });
  
  // Also support query parameter routing: ?view=landing&slug=WinterBlast
  const isLandingPageQuery = urlParams.get('view') === 'landing';
  const landingPageQuerySlug = urlParams.get('slug');

  if (isOAuthCallback) {
    return <OAuthCallback />;
  }

  if (isLandingPage && landingPageSlug) {
    console.log('[App.tsx] Rendering PublicLandingPage with slug:', landingPageSlug);
    return <PublicLandingPage slug={landingPageSlug} />;
  }
  
  if (isLandingPageQuery && landingPageQuerySlug) {
    console.log('[App.tsx] Rendering PublicLandingPage (query) with slug:', landingPageQuerySlug);
    return <PublicLandingPage slug={landingPageQuerySlug} />;
  }

  if (isTrackingRedirect) {
    return <TrackingRedirect />;
  }

  if (isPublicQuote) {
    return <PublicQuoteView />;
  }

  if (isFaviconGenerator) {
    return <FaviconGenerator />;
  }

  if (isLandingPageDebug) {
    return <LandingPageDebug />;
  }

  if (isLandingPageDiagnostic) {
    return <LandingPageDiagnostic />;
  }

  if (isLandingPageDiagnosticTest) {
    return <LandingPageDiagnosticTest />;
  }

  if (isFixLogin) {
    return <AdminFixUsers />;
  }

  if (isPrivacyPolicy || isPrivacyPolicyPath) {
    return <PrivacyPolicy />;
  }

  if (isTermsOfService || isTermsOfServicePath) {
    return <TermsOfService />;
  }

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Session validation failed:", error.message);
        handleLogout();
        setLoading(false);
        return;
      }
      
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Clear state immediately
        setSession(null);
        setUser(null);
        setOrganization(null);
        setCurrentView('landing');
        setLoading(false);
        return;
      }

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

  // Periodically check if user needs to change password (in case admin resets while user is logged in)
  useEffect(() => {
    if (!user || !session) return;

    const checkPasswordChangeRequired = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('needs_password_change')
          .eq('id', user.id)
          .single();

        if (profile?.needs_password_change === true && !showChangePassword) {
          console.log('⚠️ Password change required detected!');
          setNeedsPasswordChange(true);
          setShowChangePassword(true);
        }
      } catch (error) {
        // Silently fail - this is just a background check
        console.debug('Background password check failed:', error);
      }
    };

    // Check immediately
    checkPasswordChangeRequired();

    // Then check every 30 seconds
    const interval = setInterval(checkPasswordChangeRequired, 30000);

    return () => clearInterval(interval);
  }, [user, session, showChangePassword]);

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      // Load user profile with needs_password_change field
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role, organization_id, manager_id, needs_password_change')
        .eq('id', supabaseUser.id)
        .single();

      if (profile) {
        // Check if user needs to change password
        console.log('🔐 Checking needs_password_change:', profile.needs_password_change);
        if (profile.needs_password_change === true) {
          console.log('⚠️ User needs to change password!');
          setNeedsPasswordChange(true);
          setShowChangePassword(true);
        }

        // Initialize permissions for this user's role BEFORE setting user state
        await initializePermissions(profile.role);

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
          full_name: profile.name,
          avatar_url: avatarUrl,
          organization_id: profile.organization_id,
          // Add camelCase alias for components
          organizationId: profile.organization_id,
        });

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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setUser(null);
      setOrganization(null);
      setCurrentView('landing');
      setSession(null);
    }
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
      <Login onLogin={async (user, token) => {
        // Initialize permissions for this user's role BEFORE setting user state
        await initializePermissions(user.role);
        
        // Load organization if user has one
        if (user.organizationId || user.organization_id) {
          const orgId = user.organizationId || user.organization_id;
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

          if (org) {
            setOrganization(org);
          }
        }
        
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
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <main 
            className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`} 
            style={{ background: 'var(--color-background-secondary)' }}
          >
            <OfflineIndicator />
            <PWAInstallPrompt />

            <div className="pt-14 sm:pt-16 lg:pt-16">
              {currentView === 'dashboard' && <Dashboard user={user} organization={organization} onNavigate={setCurrentView} />}
              {currentView === 'ai-suggestions' && <AITaskSuggestions user={user} />}
              {currentView === 'contacts' && <Contacts user={user} />}
              {currentView === 'tasks' && <Tasks user={user} />}
              {currentView === 'bids' && <Bids user={user} />}
              {currentView === 'notes' && <Notes user={user} />}
              {currentView === 'appointments' && <Appointments user={user} />}
              {currentView === 'documents' && <Documents user={user} />}
              {currentView === 'email' && <Email user={user} />}
              {currentView === 'marketing' && <Marketing user={user} accessToken={session?.access_token} />}
              {currentView === 'inventory' && <Inventory user={user} />}
              {currentView === 'reports' && <Reports user={user} organization={organization} />}
              {currentView === 'team-dashboard' && <ManagerDashboard user={user} organization={organization} />}
              {currentView === 'users' && <Users user={user} />}
              {currentView === 'tenants' && <Tenants user={user} />}
              {currentView === 'settings' && <Settings user={user} organization={organization} onUserUpdate={setUser} onOrganizationUpdate={setOrganization} />}
              {currentView === 'security' && <Security user={user} />}
              {currentView === 'import-export' && <ImportExport user={user} onNavigate={setCurrentView} />}
              {currentView === 'scheduled-jobs' && <ScheduledJobs user={user} onNavigate={setCurrentView} />}
              {currentView === 'background-imports' && <BackgroundImportManager user={user} onNavigate={setCurrentView} />}
              {currentView === 'kitchen-planner' && <KitchenPlanner user={user} />}
              {currentView === 'deck-planner' && <DeckPlanner user={user} />}
              {currentView === 'garage-planner' && <GaragePlanner user={user} />}
              {currentView === 'shed-planner' && <ShedPlanner user={user} />}
              {currentView === 'roof-planner' && <RoofPlanner user={user} />}
              {currentView === 'change-password' && <ChangePasswordDialog user={user} />}
            </div>
          </main>

          {/* Password Change Dialog - Shows when user needs to change temporary password */}
          {showChangePassword && user && (
            <ChangePasswordDialog
              open={showChangePassword}
              onClose={() => {
                setShowChangePassword(false);
                setNeedsPasswordChange(false);
                // Reload user data to ensure flag is cleared
                if (session?.user) {
                  loadUserData(session.user);
                }
              }}
              userId={user.id}
            />
          )}
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;