import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, LogOut, Building2, Sparkles, Mail } from 'lucide-react';
import type { User as UserType, Organization } from '../App';
import { useTheme } from './ThemeProvider';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useUnreadEmails } from '../hooks/useUnreadEmails';
import { Button } from './ui/button';

interface TopBarProps {
  user: UserType;
  organization: Organization | null;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export function TopBar({ user, organization, onNavigate, onLogout }: TopBarProps) {
  const { theme } = useTheme();
  const { suggestions } = useAISuggestions(user);
  const { unreadCount } = useUnreadEmails(user);
  
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

  return (
    <div 
      className="hidden lg:block fixed top-0 right-0 left-64 border-b z-40"
      style={{
        background: theme.colors.topBarBackground,
        color: theme.colors.topBarText,
        borderColor: theme.colors.border
      }}
    >
      <div className="flex items-center justify-end gap-4 px-6 py-3">
        {/* Email Icon */}
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => onNavigate('email')}
            title={`${unreadCount} Unread Emails`}
          >
            <Mail className="h-5 w-5 text-blue-600 animate-pulse" />
            <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </Button>
        )}

        {/* AI Suggestions Icon */}
        {suggestions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => onNavigate('ai-suggestions')}
            title={`${suggestions.length} AI Suggestions`}
          >
            <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            <span className="absolute top-0 right-0 h-4 w-4 text-[10px] flex items-center justify-center bg-red-500 text-white rounded-full">
              {suggestions.length > 9 ? '9+' : suggestions.length}
            </span>
          </Button>
        )}

        {/* Organization Info */}
        {organization && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.topBarText
            }}
          >
            {organization.logo ? (
              <img 
                src={organization.logo} 
                alt={`${organization.name} logo`}
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <div>
              <p className="text-xs opacity-70">Organization</p>
              <p className="text-sm font-medium">{organization.name}</p>
            </div>
          </div>
        )}

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <div 
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer"
              style={{
                color: theme.colors.topBarText
              }}
              onMouseEnter={(e) => {
                // Use a semi-transparent overlay for hover effect instead of cardHover
                // This maintains text readability across all themes
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="text-right">
                <p className="text-sm font-medium">{user.full_name || user.email || 'User'}</p>
                <p className="text-xs opacity-70">{user.role.replace('_', ' ')}</p>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url} alt={user.full_name || user.email || 'User'} />
                <AvatarFallback 
                  style={{ 
                    background: theme.colors.primary, 
                    color: theme.colors.primaryText 
                  }}
                >
                  {getInitials(user.full_name || user.email || '')}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                <p className="text-xs text-gray-500 font-normal mt-1">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('settings')}>
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
      </div>
    </div>
  );
}