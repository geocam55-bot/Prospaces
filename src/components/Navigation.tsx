import { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronRight,
  ChefHat,
  Hammer,
  Warehouse,
  Home,
  Triangle,
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
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useUnreadEmails } from '../hooks/useUnreadEmails';
import { useBidNotifications } from '../hooks/useBidNotifications';
import { useTaskNotifications } from '../hooks/useTaskNotifications';
import { useAppointmentNotifications } from '../hooks/useAppointmentNotifications';

interface NavigationProps {
  user: UserType;
  organization: Organization | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export function Navigation({ user, organization, currentView, onNavigate, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { suggestions } = useAISuggestions(user);
  const { unreadCount } = useUnreadEmails(user);
  const { unreadCount: unreadBidsCount, markAsRead: markBidsRead } = useBidNotifications(user);
  const { taskCount } = useTaskNotifications(user);
  const { appointmentCount } = useAppointmentNotifications(user);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'opportunities': false,
    'email': false,
    'admin': false,
    'project-wizards': false,
  });

  // Toggle submenu expansion
  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Base navigation items with submenu structure
  const baseNavItems = user.role !== 'super_admin' ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    // Only show AI Suggestions if enabled for the organization
    ...(organization?.ai_suggestions_enabled ? [{ id: 'ai-suggestions', label: 'AI Suggestions', icon: Sparkles }] : []),
    { id: 'contacts', label: 'Contacts', icon: Users },
    { 
      id: 'opportunities', 
      label: 'Opportunities', 
      icon: Target,
      hasSubmenu: true,
      submenu: [
        { id: 'bids', label: 'Bids', icon: FileText },
      ]
    },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    // Show Appointments for all users (including Admin for calendar sync testing)
    { 
      id: 'email', 
      label: 'Email', 
      icon: Mail,
      hasSubmenu: true,
      submenu: [
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        ...(organization?.appointments_enabled !== false ? [{ id: 'appointments', label: 'Appointments', icon: Calendar }] : []),
      ]
    },
    // Only show Documents if enabled for the organization
    ...(organization?.documents_enabled !== false ? [{ id: 'documents', label: 'Documents', icon: Folder }] : []),
    // Only show Marketing if enabled for the organization
    ...(organization?.marketing_enabled !== false ? [{ id: 'marketing', label: 'Marketing', icon: TrendingUp }] : []),
    // Only show Inventory if enabled for the organization
    ...(organization?.inventory_enabled !== false ? [{ id: 'inventory', label: 'Inventory', icon: Package }] : []),
    // Only show Project Wizards if enabled for the organization
    ...(organization?.project_wizards_enabled !== false ? [{ 
      id: 'project-wizards', 
      label: 'Project Wizards', 
      icon: Wand2,
      hasSubmenu: true,
      submenu: [
        { id: 'kitchen-planner', label: 'Kitchen Planner', icon: ChefHat },
        { id: 'deck-planner', label: 'Deck Planner', icon: Hammer },
        { id: 'garage-planner', label: 'Garage Planner', icon: Warehouse },
        { id: 'shed-planner', label: 'Shed Planner', icon: Home },
        { id: 'roof-planner', label: 'Roof Planner', icon: Triangle },
      ]
    }] : []),
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ] : [];

  // Manager/Admin specific items (team dashboard - hidden from SUPER_ADMIN)
  const managerNavItems = 
    (user.role === 'manager' || user.role === 'admin') && user.role !== 'super_admin'
      ? [{ id: 'team-dashboard', label: 'Team Dashboard', icon: UsersRound }]
      : [];

  // Build Admin submenu items based on role
  const buildAdminSubmenu = () => {
    const submenuItems = [];
    
    if (user.role === 'super_admin') {
      submenuItems.push(
        { id: 'tenants', label: 'Organizations', icon: Building2 },
        { id: 'users', label: 'Users', icon: UserCog },
        { id: 'security', label: 'Security', icon: Shield }
      );
    } else if (user.role === 'admin') {
      submenuItems.push(
        { id: 'users', label: 'Users', icon: UserCog },
        { id: 'security', label: 'Security', icon: Shield }
      );
      // Only show Import/Export if enabled for the organization
      if (organization?.import_export_enabled !== false) {
        submenuItems.push({ id: 'import-export', label: 'Import/Export', icon: Upload });
      }
    }
    
    // Add Settings for all users
    submenuItems.push({ id: 'settings', label: 'Settings', icon: Settings });
    
    return submenuItems;
  };

  // Admin menu with submenu
  const adminNavItems = (user.role === 'super_admin' || user.role === 'admin')
    ? [{
        id: 'admin',
        label: 'Admin',
        icon: UserCog,
        hasSubmenu: true,
        submenu: buildAdminSubmenu()
      }]
    : [
        // For non-admin users, just show Settings as a standalone item
        { id: 'settings', label: 'Settings', icon: Settings }
      ];

  // Combine and filter based on permissions
  const navItems = [
    ...baseNavItems,
    ...managerNavItems,
    ...adminNavItems,
  ].filter(item => canView(item.id, user.role)); // Filter based on permissions

  // Auto-expand parent menu when child is active
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.submenu) {
        const hasActiveChild = item.submenu.some((sub: any) => sub.id === currentView);
        if (hasActiveChild && !expandedMenus[item.id]) {
          setExpandedMenus(prev => ({
            ...prev,
            [item.id]: true
          }));
        }
      }
    });
  }, [currentView]);

  const handleNavClick = (view: string) => {
    if (view === 'bids') {
      markBidsRead();
    }
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  // Render navigation item (with or without submenu)
  const renderNavItem = (item: any, isSubmenuItem = false) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    const isExpanded = expandedMenus[item.id];
    const hasActiveChild = item.submenu?.some((sub: any) => sub.id === currentView);

    if (item.hasSubmenu) {
      return (
        <div key={item.id}>
          <div className="relative">
            {/* For Admin menu and Project Wizards, make entire button toggle (no navigation). For others, split between navigate and toggle */}
            {(item.id === 'admin' || item.id === 'project-wizards') ? (
              <button
                onClick={() => toggleSubmenu(item.id)}
                className={`w-full group flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                  isSubmenuItem ? 'pl-6' : ''
                }`}
                style={{
                  backgroundColor: hasActiveChild ? theme.colors.navActive : 'transparent',
                  color: theme.colors.navText,
                }}
                onMouseEnter={(e) => {
                  if (!hasActiveChild) {
                    e.currentTarget.style.backgroundColor = theme.colors.navHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasActiveChild) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-center">
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" 
                    style={{ opacity: hasActiveChild ? 1 : 0.7 }}
                  />
                  {item.label}
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" style={{ opacity: 0.7 }} />
                ) : (
                  <ChevronRight className="h-4 w-4" style={{ opacity: 0.7 }} />
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full group flex items-center pr-8 px-3 py-2 text-sm rounded-md transition-colors ${
                    isSubmenuItem ? 'pl-6' : ''
                  }`}
                  style={{
                    backgroundColor: (isActive || hasActiveChild) ? theme.colors.navActive : 'transparent',
                    color: theme.colors.navText,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !hasActiveChild) {
                      e.currentTarget.style.backgroundColor = theme.colors.navHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !hasActiveChild) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" 
                    style={{ opacity: (isActive || hasActiveChild) ? 1 : 0.7 }}
                  />
                  {item.label}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubmenu(item.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label={isExpanded ? 'Collapse submenu' : 'Expand submenu'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" style={{ opacity: 0.7 }} />
                  ) : (
                    <ChevronRight className="h-4 w-4" style={{ opacity: 0.7 }} />
                  )}
                </button>
              </>
            )}
          </div>
          {isExpanded && item.submenu && (
            <div className="mt-1 space-y-1">
              {item.submenu.map((subItem: any) => renderNavItem(subItem, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
          isSubmenuItem ? 'pl-11' : ''
        }`}
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
    // Check main items
    const item = navItems.find(item => item.id === view);
    if (item) return item.label;
    
    // Check submenu items
    for (const navItem of navItems) {
      if (navItem.submenu) {
        const subItem = navItem.submenu.find((sub: any) => sub.id === view);
        if (subItem) return subItem.label;
      }
    }
    
    return 'Dashboard';
  };

  // Get page icon based on current view
  const getPageIcon = (view: string) => {
    // Check main items
    const item = navItems.find(item => item.id === view);
    if (item) return item.icon;
    
    // Check submenu items
    for (const navItem of navItems) {
      if (navItem.submenu) {
        const subItem = navItem.submenu.find((sub: any) => sub.id === view);
        if (subItem) return subItem.icon;
      }
    }
    
    return LayoutDashboard;
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
          <div className="flex items-center gap-1">
            {/* AI Suggestions Icon */}
            {suggestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => handleNavClick('ai-suggestions')}
                title={`${suggestions.length} AI Suggestions`}
              >
                <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {suggestions.length > 9 ? '9+' : suggestions.length}
                </span>
              </Button>
            )}

            {/* Bid Notifications Icon */}
            {unreadBidsCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => handleNavClick('bids')}
                title={`${unreadBidsCount} Bid Updates`}
              >
                <FileText className="h-4 w-4 text-orange-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadBidsCount > 9 ? '9+' : unreadBidsCount}
                </span>
              </Button>
            )}

            {/* Task Notifications Icon */}
            {taskCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => handleNavClick('tasks')}
                title={`${taskCount} Pending Tasks`}
              >
                <CheckSquare className="h-4 w-4 text-green-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {taskCount > 9 ? '9+' : taskCount}
                </span>
              </Button>
            )}

            {/* Appointment Notifications Icon */}
            {appointmentCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => handleNavClick('appointments')}
                title={`${appointmentCount} Upcoming Appointments`}
              >
                <Calendar className="h-4 w-4 text-purple-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {appointmentCount > 9 ? '9+' : appointmentCount}
                </span>
              </Button>
            )}

            {/* Email Icon */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => handleNavClick('email')}
                title={`${unreadCount} Unread Emails`}
              >
                <Mail className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Button>
            )}

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
            {navItems.map((item) => renderNavItem(item))}
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
                {navItems.map((item) => renderNavItem(item))}
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
            {/* AI Suggestions Icon */}
            {suggestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleNavClick('ai-suggestions')}
                title={`${suggestions.length} AI Suggestions`}
              >
                <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
                <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {suggestions.length > 9 ? '9+' : suggestions.length}
                </span>
              </Button>
            )}

            {/* Bid Notifications Icon */}
            {unreadBidsCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleNavClick('bids')}
                title={`${unreadBidsCount} Bid Updates`}
              >
                <FileText className="h-5 w-5 text-orange-600 animate-pulse" />
                <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadBidsCount > 9 ? '9+' : unreadBidsCount}
                </span>
              </Button>
            )}

            {/* Task Notifications Icon */}
            {taskCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleNavClick('tasks')}
                title={`${taskCount} Pending Tasks`}
              >
                <CheckSquare className="h-5 w-5 text-green-600 animate-pulse" />
                <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {taskCount > 9 ? '9+' : taskCount}
                </span>
              </Button>
            )}

            {/* Appointment Notifications Icon */}
            {appointmentCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleNavClick('appointments')}
                title={`${appointmentCount} Upcoming Appointments`}
              >
                <Calendar className="h-5 w-5 text-purple-600 animate-pulse" />
                <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {appointmentCount > 9 ? '9+' : appointmentCount}
                </span>
              </Button>
            )}

            {/* Email Icon */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleNavClick('email')}
                title={`${unreadCount} Unread Emails`}
              >
                <Mail className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Button>
            )}

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