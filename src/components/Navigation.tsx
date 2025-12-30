import { useState } from 'react';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  FileText,
  StickyNote,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  Mail,
  TrendingUp,
  Package,
  Shield,
  User,
  Upload,
  Target,
  Folder,
  UsersRound,
  BarChart3,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import type { User as UserType } from '../App';
import type { Organization } from '../App';
import { canView } from '../utils/permissions';
import { useTheme } from './ThemeProvider';

interface NavigationProps {
  user: UserType;
  organization: Organization | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export function Navigation({ user, organization, currentView, onNavigate, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Base navigation items (organization-specific - hidden from SUPER_ADMIN and filtered for ADMIN)
  const baseNavItems = user.role !== 'super_admin' ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    // Only show AI Suggestions if enabled for the organization
    ...(organization?.ai_suggestions_enabled ? [{ id: 'ai-suggestions', label: 'AI Suggestions', icon: Sparkles }] : []),
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'bids', label: 'Bids', icon: FileText },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    // Show Appointments for all users (including Admin for calendar sync testing)
    ...(organization?.appointments_enabled !== false ? [{ id: 'appointments', label: 'Appointments', icon: Calendar }] : []),
    // Only show Documents if enabled for the organization
    ...(organization?.documents_enabled !== false ? [{ id: 'documents', label: 'Documents', icon: Folder }] : []),
    // Show Email for all authenticated users
    { id: 'email', label: 'Email', icon: Mail },
    // Only show Marketing if enabled for the organization
    ...(organization?.marketing_enabled !== false ? [{ id: 'marketing', label: 'Marketing', icon: TrendingUp }] : []),
    // Only show Inventory if enabled for the organization
    ...(organization?.inventory_enabled !== false ? [{ id: 'inventory', label: 'Inventory', icon: Package }] : []),
    // Only show Project Wizards if enabled for the organization
    ...(organization?.project_wizards_enabled !== false ? [{ id: 'project-wizards', label: 'Project Wizards', icon: Wand2 }] : []),
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ] : [];

  // Manager/Admin specific items (team dashboard - hidden from SUPER_ADMIN)
  const managerNavItems = 
    (user.role === 'manager' || user.role === 'admin') && user.role !== 'super_admin'
      ? [{ id: 'team-dashboard', label: 'Team Dashboard', icon: UsersRound }]
      : [];

  // Admin items (SUPER_ADMIN only sees Organizations and Users, not Import/Export)
  const adminNavItems = user.role === 'super_admin' 
    ? [
        { id: 'tenants', label: 'Organizations', icon: Building2 },
        { id: 'users', label: 'Users', icon: UserCog },
        { id: 'security', label: 'Security', icon: Shield },
      ]
    : (user.role === 'admin' 
      ? [
          { id: 'users', label: 'Users', icon: UserCog },
          { id: 'security', label: 'Security', icon: Shield },
          // Only show Import/Export if enabled for the organization
          ...(organization?.import_export_enabled !== false ? [{ id: 'import-export', label: 'Import/Export', icon: Upload }] : []),
        ]
      : []);

  // Settings (available to all)
  const settingsItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Combine and filter based on permissions
  const navItems = [
    ...baseNavItems,
    ...managerNavItems,
    ...adminNavItems,
    ...settingsItems,
  ].filter(item => canView(item.id, user.role)); // Filter based on permissions

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const { theme } = useTheme();

  // Get page title based on current view
  const getPageTitle = (view: string) => {
    const item = navItems.find(item => item.id === view);
    return item?.label || 'Dashboard';
  };

  // Get page icon based on current view
  const getPageIcon = (view: string) => {
    const item = navItems.find(item => item.id === view);
    return item?.icon || LayoutDashboard;
  };

  return (
    <>
      {/* Mobile header */}
      <div 
        className="lg:hidden fixed top-0 left-0 right-0 border-b z-50"
        style={{
          background: theme.colors.navBackground,
          color: theme.colors.navText,
          borderColor: theme.colors.border
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">ProSpaces CRM</span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {getInitials(user.full_name || user.email || '')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                    <p className="text-xs text-gray-500 font-normal mt-1">{user.email || 'No email'}</p>
                  </div>
                </DropdownMenuLabel>
                {organization && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-gray-200 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-normal">Organization</p>
                          <p className="text-sm font-medium">{organization.name}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavClick('settings')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div 
          className="flex flex-col flex-grow border-r pt-5 pb-4 overflow-y-auto"
          style={{
            background: theme.colors.navBackground,
            color: theme.colors.navText,
            borderColor: theme.colors.border
          }}
        >
          <div className="flex items-center flex-shrink-0 px-4 gap-2">
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-600"
            >
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold" style={{ color: theme.colors.navText }}>
              ProSpaces CRM
            </span>
          </div>
          
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="w-full group flex items-center px-3 py-2 text-sm rounded-md transition-colors"
                  style={{
                    backgroundColor: isActive ? theme.colors.navActive : 'transparent',
                    color: theme.colors.navText,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = theme.colors.navHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" 
                    style={{ opacity: isActive ? 1 : 0.7 }}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900 bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="fixed inset-y-0 left-0 w-64"
            style={{
              background: theme.colors.navBackground,
              color: theme.colors.navText
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full pt-16 pb-4">
              <nav className="flex-1 px-2 space-y-1 mt-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className="w-full group flex items-center px-3 py-2 text-sm rounded-md transition-colors"
                      style={{
                        backgroundColor: isActive ? theme.colors.navActive : 'transparent',
                        color: theme.colors.navText,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = theme.colors.navHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" 
                        style={{ opacity: isActive ? 1 : 0.7 }}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop header */}
      <div className="hidden lg:block fixed top-0 left-64 right-0 border-b bg-white dark:bg-slate-900 z-40 h-16 shadow-sm">
        <div className="flex items-center justify-between h-full px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = getPageIcon(currentView);
              return <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
            })()}
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {getPageTitle(currentView)}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {organization && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{organization.name}</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-offset-2 ring-transparent hover:ring-blue-500 transition-all">
                  <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getInitials(user.full_name || user.email || '')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                    <p className="text-xs text-gray-500 font-normal mt-1">{user.email || 'No email'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavClick('settings')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}