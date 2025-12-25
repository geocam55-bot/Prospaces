import { useState, useEffect, Suspense, lazy } from 'react';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { Navigation } from './components/Navigation';
import { TopBar } from './components/TopBar';
import { ThemeProvider } from './components/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { authAPI, setAccessToken, securityAPI, tenantsAPI } from './utils/api';
import { initializePermissions, clearPermissions, canView } from './utils/permissions';
import { createClient } from './utils/supabase/client';
import { syncCurrentUserProfile, syncUserProfile } from './utils/sync-profile';
import { FullCRMDatabaseSetup } from './components/FullCRMDatabaseSetup';
import { ForceTailwindClasses } from './force-tailwind-classes';
// import { initializeMobileApp, isMobileApp } from './src/mobile-utils';

// Lazy load all page components for faster initial load
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const AITaskSuggestions = lazy(() => import('./components/AITaskSuggestions').then(m => ({ default: m.AITaskSuggestions })));
const Contacts = lazy(() => import('./components/Contacts').then(m => ({ default: m.Contacts })));
const Tasks = lazy(() => import('./components/Tasks').then(m => ({ default: m.Tasks })));
const Appointments = lazy(() => import('./components/Appointments').then(m => ({ default: m.Appointments })));
const Bids = lazy(() => import('./components/Bids').then(m => ({ default: m.Bids })));
const Opportunities = lazy(() => import('./components/Opportunities').then(m => ({ default: m.Opportunities })));
const Notes = lazy(() => import('./components/Notes').then(m => ({ default: m.Notes })));
const Users = lazy(() => import('./components/Users').then(m => ({ default: m.Users })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Email = lazy(() => import('./components/Email').then(m => ({ default: m.Email })));
const Marketing = lazy(() => import('./components/Marketing').then(m => ({ default: m.Marketing })));
const Inventory = lazy(() => import('./components/Inventory').then(m => ({ default: m.Inventory })));
const Tenants = lazy(() => import('./components/Tenants').then(m => ({ default: m.Tenants })));
const Security = lazy(() => import('./components/Security').then(m => ({ default: m.Security })));
const ImportExport = lazy(() => import('./components/ImportExport').then(m => ({ default: m.ImportExport })));
const ScheduledJobs = lazy(() => import('./components/ScheduledJobs').then(m => ({ default: m.ScheduledJobs })));
const Documents = lazy(() => import('./components/Documents').then(m => ({ default: m.Documents })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const AdminFixUsers = lazy(() => import('./components/AdminFixUsers').then(m => ({ default: m.AdminFixUsers })));

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'marketing' | 'standard_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  managerId?: string;
  profilePicture?: string;
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  ai_suggestions_enabled?: boolean;
  marketing_enabled?: boolean;
  inventory_enabled?: boolean;
  import_export_enabled?: boolean;
  documents_enabled?: boolean;
}

export interface AppState {
  currentUser: User | null;
  currentOrganization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
    currentOrganization: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null); // null = checking, true = ready, false = needs setup
  const [showLandingPage, setShowLandingPage] = useState(true); // Show landing page on startup

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
    
    // Production: Debug utilities disabled
    // Uncomment the following in development environment only:
    /*
    setTimeout(() => {
      import('./utils/debug-users').catch(() => {});
      import('./utils/diagnose-super-admin').catch(() => {});
      import('./utils/check-user-org').catch(() => {});
      import('./utils/diagnose-login').catch(() => {});
    }, 5000);
    */
  }, []);

  // Check database tables after authentication
  useEffect(() => {
    if (appState.isAuthenticated && appState.currentUser) {
      // ⚡ Reduced delay from 1000ms to 200ms for faster startup
      setTimeout(() => {
        checkDatabaseTables();
      }, 200);
    }
  }, [appState.isAuthenticated]);

  // Load organization data when user is authenticated
  useEffect(() => {
    if (appState.isAuthenticated && appState.currentUser) {
      // ⚡ Reduced delay from 500ms to 100ms for faster startup
      setTimeout(() => {
        loadOrganization();
      }, 100);
    }
  }, [appState.isAuthenticated, appState.currentUser?.id]); // Only re-run when user ID changes

  // Reload organization data when viewing the tenants module (in case logo was updated)
  useEffect(() => {
    if (currentView === 'tenants' && appState.isAuthenticated && appState.currentUser) {
      // Reload organization after a short delay to ensure backend has updated
      const timeoutId = setTimeout(() => {
        loadOrganization();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [currentView]);

  const checkSession = async () => {
    try {
      // Try to get session from localStorage
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        // No token found - skip API call and show login immediately
        setAppState({
          currentUser: null,
          currentOrganization: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }
      
      setAccessToken(storedToken);
      
      // ⚡ Reduced timeout to 2s for faster startup - if backend is slow, show login faster
      const sessionCheckTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 2000); // 2 second timeout (reduced from 5s)
      });
      
      const sessionCheckPromise = authAPI.getSession();
      
      try {
        const result = await Promise.race([sessionCheckPromise, sessionCheckTimeout]);
        const { user } = result as any;
        
        if (user) {
          // Load profile picture from localStorage
          const profilePicture = localStorage.getItem(`profile_picture_${user.id}`);
          
          const userWithProfile = {
            ...user,
            profilePicture: profilePicture || user.profilePicture,
          };
          
          setAppState({
            currentUser: userWithProfile,
            currentOrganization: {
              id: user.organizationId || 'default',
              name: 'ProSpaces CRM',
              ai_suggestions_enabled: false, // Will be updated by loadOrganization()
              marketing_enabled: true,
              inventory_enabled: true,
              import_export_enabled: true,
              documents_enabled: true,
              // Logo can be added later via Organizations module
            },
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Load permissions for the user's role (non-blocking)
          initializePermissions(user.role).then(() => {
            setPermissionsReady(true);
          }).catch(err => {
            console.warn('Permissions init failed:', err);
            setPermissionsReady(true); // Still set ready even on error
          });
          
          // Sync user profile to database after successful session check (non-blocking)
          // This is a non-critical background operation - errors are silently logged
          setTimeout(() => {
            syncCurrentUserProfile().catch(() => {});
          }, 100);
          
          return;
        }
      } catch (timeoutError) {
        // ⚡ If timeout, immediately show login - don't try background validation
        // This gives users faster access to login screen if backend is slow
        console.warn('⚠️ Session check timed out - showing login screen');
        
        // Clear the token so we don't keep trying
        localStorage.removeItem('access_token');
        setAccessToken(null);
      }
    } catch (error) {
      console.error('❌ Session check failed:', error);
      localStorage.removeItem('access_token');
      setAccessToken(null);
      clearPermissions();
    }
    
    setAppState({
      currentUser: null,
      currentOrganization: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const checkDatabaseTables = async () => {
    try {
      const supabase = createClient();
      // Try to query the contacts table - if it fails, database setup is needed
      const { error } = await supabase
        .from('contacts')
        .select('id')
        .limit(1);
      
      if (error) {
        // PGRST205 = table not found in schema cache
        // 42P01 = table does not exist
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          setDatabaseReady(false);
        } else {
          // Log unexpected errors
          console.error('Database check failed:', error);
        }
      } else {
        setDatabaseReady(true);
      }
    } catch (error) {
      console.error('Database check error:', error);
      setDatabaseReady(false);
    }
  };

  const loadOrganization = async () => {
    const currentUser = appState.currentUser;
    if (!currentUser?.organizationId) return;

    try {
      // Query Supabase directly to get organization/tenant data including logo
      const supabase = createClient();
      const { data: org, error } = await supabase
        .from('organizations')
        .select('id, name, logo')
        .eq('id', currentUser.organizationId)
        .single();

      if (error) {
        console.error('❌ loadOrganization - Error:', error);
        // Don't throw - use defaults instead
        return;
      }

      if (org) {
        // If the name looks like an auto-generated ID (starts with "org-"), use default name
        const displayName = org.name && !org.name.startsWith('org-') ? org.name : 'ProSpaces CRM';
        
        // Try to get feature flags, but use defaults if columns don't exist
        let featureFlags = {
          ai_suggestions_enabled: false,
          marketing_enabled: true,
          inventory_enabled: true,
          import_export_enabled: true,
          documents_enabled: true,
        };
        
        try {
          const { data: orgFeatures } = await supabase
            .from('organizations')
            .select('ai_suggestions_enabled, marketing_enabled, inventory_enabled, import_export_enabled, documents_enabled')
            .eq('id', currentUser.organizationId)
            .single();
          
          if (orgFeatures) {
            featureFlags = {
              ai_suggestions_enabled: orgFeatures.ai_suggestions_enabled ?? false,
              marketing_enabled: orgFeatures.marketing_enabled ?? true,
              inventory_enabled: orgFeatures.inventory_enabled ?? true,
              import_export_enabled: orgFeatures.import_export_enabled ?? true,
              documents_enabled: orgFeatures.documents_enabled ?? true,
            };
          }
        } catch (featureError) {
          // Feature columns don't exist yet - use defaults
          console.log('ℹ️ Using default feature flags (columns not yet created)');
        }
        
        setAppState(prev => ({
          ...prev,
          currentUser: prev.currentUser ? {
            ...prev.currentUser,
            organizationName: displayName,
          } : prev.currentUser,
          currentOrganization: {
            id: org.id,
            name: displayName,
            logo: org.logo, // Include the logo from the organization record
            ...featureFlags,
          },
        }));
      }
    } catch (error) {
      // Silently fail - organization was already set from user data in checkSession
      // This is fine - we use defaults
      console.log('ℹ️ Using default organization settings');
    }
  };

  const handleLogin = async (user: User, token: string) => {
    localStorage.setItem('access_token', token);
    setAccessToken(token);
    
    // Initialize permissions based on user role (async now)
    await initializePermissions(user.role);
    setPermissionsReady(true);
    
    setAppState({
      currentUser: user,
      currentOrganization: {
        id: user.organizationId || 'default',
        name: 'ProSpaces CRM',
        ai_suggestions_enabled: false, // Will be updated by loadOrganization()
        marketing_enabled: true,
        inventory_enabled: true,
        import_export_enabled: true,
        documents_enabled: true,
        // Logo can be added later via Organizations module
      },
      isAuthenticated: true,
      isLoading: false,
    });
    
    // Set default view based on role
    // SUPER_ADMIN defaults to Organizations view since they don't have access to org-specific modules
    setCurrentView(user.role === 'super_admin' ? 'tenants' : 'dashboard');
  };

  const handleLogout = async () => {
    try {
      await authAPI.signout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('access_token');
    setAccessToken(null);
    clearPermissions();
    setAppState({
      currentUser: null,
      currentOrganization: null,
      isAuthenticated: false,
      isLoading: false,
    });
    setCurrentView('dashboard');
  };

  const handleUserUpdate = (updatedUser: User) => {
    setAppState(prev => ({
      ...prev,
      currentUser: updatedUser,
    }));
  };

  const handleDatabaseSetupComplete = () => {
    setDatabaseReady(true);
  };

  if (appState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent absolute top-0 left-1/2 -translate-x-1/2"></div>
          </div>
          <h2 className="text-xl text-gray-800 mb-2">ProSpaces CRM</h2>
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!appState.isAuthenticated || !appState.currentUser) {
    // Show landing page first, then login when user clicks "Get Started"
    if (showLandingPage) {
      return <LandingPage onGetStarted={() => setShowLandingPage(false)} />;
    }
    return <Login onLogin={handleLogin} />;
  }

  // Show loading while checking database
  if (databaseReady === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Checking database...</p>
        </div>
      </div>
    );
  }

  // Show database setup if needed
  if (databaseReady === false) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <FullCRMDatabaseSetup onComplete={handleDatabaseSetupComplete} />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'contacts':
        return <Contacts user={appState.currentUser} />;
      case 'tasks':
        return <Tasks user={appState.currentUser} />;
      case 'appointments':
        return <Appointments user={appState.currentUser} />;
      case 'opportunities':
        return <Opportunities user={appState.currentUser} />;
      case 'bids':
        return <Bids user={appState.currentUser} />;
      case 'notes':
        return <Notes user={appState.currentUser} />;
      case 'documents':
        return <Documents user={appState.currentUser} />;
      case 'email':
        return <Email user={appState.currentUser} />;
      case 'marketing':
        return <Marketing user={appState.currentUser} />;
      case 'inventory':
        return <Inventory user={appState.currentUser} />;
      case 'tenants':
        return <Tenants user={appState.currentUser} />;
      case 'users':
        return <Users user={appState.currentUser} />;
      case 'security':
        return <Security user={appState.currentUser} />;
      case 'import-export':
        return <ImportExport user={appState.currentUser} onNavigate={setCurrentView} />;
      case 'scheduled-jobs':
        return <ScheduledJobs user={appState.currentUser} />;
      case 'reports':
        return <Reports user={appState.currentUser} />;
      case 'settings':
        return <Settings user={appState.currentUser} onUserUpdate={handleUserUpdate} />;
      case 'team-dashboard':
        return <ManagerDashboard user={appState.currentUser} onNavigate={setCurrentView} />;
      case 'ai-suggestions':
        return <AITaskSuggestions user={appState.currentUser} onNavigate={setCurrentView} />;
      case 'admin-fix-users':
        return <AdminFixUsers />;
      default:
        return <Dashboard user={appState.currentUser} onNavigate={setCurrentView} />;
    }
  };

  return (
    <ThemeProvider userId={appState.currentUser?.id}>
      <ForceTailwindClasses />
      <div className="min-h-screen bg-gray-50">
        <TopBar
          user={appState.currentUser}
          organization={appState.currentOrganization}
          onNavigate={setCurrentView}
          onLogout={handleLogout}
        />
        <Navigation
          user={appState.currentUser}
          organization={appState.currentOrganization}
          currentView={currentView}
          onNavigate={setCurrentView}
          onLogout={handleLogout}
        />
        <main className="lg:pl-64 lg:pt-16">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            }>
              <ErrorBoundary>
                {renderView()}
              </ErrorBoundary>
            </Suspense>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}