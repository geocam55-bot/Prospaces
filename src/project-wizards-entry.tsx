import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectWizardsShell } from './components/project-wizards/ProjectWizardsShell';
import { SpaceAccessNotice } from './components/SpaceAccessNotice';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { createClient } from './utils/supabase/client';
import { canAccessSpace, initializePermissions } from './utils/permissions';
import type { User, UserRole } from './App';
import type { Session } from '@supabase/supabase-js';
import { DesktopOnlyAccess } from './components/DesktopOnlyAccess';
import './index.css';

function ProjectWizardsApp() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAccessDeniedMessage(null);
        setLoading(false);
        return;
      }
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return;
      }
      setSession(session);
      if (session?.user) {
        loadProfile(session);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (session: Session) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role, organization_id, name, avatar_url')
        .eq('id', session.user.id)
        .single() as { data: any };

      if (profile) {
        if (profile.organization_id) {
          localStorage.setItem('currentOrgId', profile.organization_id);
        }

        await initializePermissions(profile.role);

        if (!canAccessSpace('design', profile.role as UserRole, 'view')) {
          setUser(null);
          setAccessDeniedMessage('You are signed in, but your account does not currently have access to Design Space. Please choose another space or contact your administrator if you need access.');
          setLoading(false);
          return;
        }

        setAccessDeniedMessage(null);

        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role as UserRole,
          full_name: profile.name,
          avatar_url: profile.avatar_url,
          organization_id: profile.organization_id,
          organizationId: profile.organization_id,
        });
      }
    } catch {
      // Profile load failed
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (loggedInUser: User, _token: string) => {
    await initializePermissions(loggedInUser.role);
    if (loggedInUser.organizationId || loggedInUser.organization_id) {
      const orgId = loggedInUser.organizationId || loggedInUser.organization_id;
      if (orgId) localStorage.setItem('currentOrgId', orgId);
    }
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    setSession(null);
  };

  if (isMobile) {
    return <DesktopOnlyAccess spaceName="Design Space" accentColorClass="bg-indigo-600" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading Project Wizards...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Toaster />
        <SpaceAccessNotice
          spaceName="Design Space"
          accentColorClass="bg-indigo-600"
          mode={accessDeniedMessage ? 'access-denied' : 'login-required'}
          message={accessDeniedMessage || undefined}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider userId={user.id}>
        <Toaster />
        <ProjectWizardsShell user={user} onLogout={handleLogout} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<ProjectWizardsApp />);
