import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { User, UserRole } from '../App';

interface MemberLoginProps {
  onLogin: (user: User, token: string) => void;
  onBack?: () => void;
}

export function MemberLogin({ onLogin, onBack }: MemberLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ user: User; token: string } | null>(null);

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    if (pendingUser) {
      onLogin(pendingUser.user, pendingUser.token);
      setPendingUser(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setIsResetLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setSuccessMessage('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError(`Failed to send reset email: ${err.message}`);
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Your email is not confirmed yet. Check your inbox for a confirmation link.');
        }
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password.');
        }
        throw new Error(signInError.message);
      }

      if (!signInData?.session || !signInData?.user) {
        throw new Error('Invalid server response.');
      }

      // Get user profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (profileError || !profile) {
        // Auto-create profile for new users
        const orgId = crypto.randomUUID();
        let orgIdToUse = orgId;

        try {
          const { data: org } = await supabase
            .from('organizations')
            .insert({
              id: orgId,
              name: `${signInData.user.email?.split('@')[0]}'s Organization`,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (org) orgIdToUse = org.id;
        } catch {
          // silently fail
        }

        const { data: newProfile, error: newProfileError } = await supabase
          .from('profiles')
          .insert({
            id: signInData.user.id,
            email: signInData.user.email || email,
            name: signInData.user.user_metadata?.name || email.split('@')[0],
            role: signInData.user.user_metadata?.role || 'standard_user',
            organization_id: orgIdToUse,
            status: 'active',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (newProfileError) {
          if (newProfileError.code === '23505') {
            // Duplicate - fetch existing
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', signInData.user.id)
              .single();
            profile = existingProfile;
          } else {
            throw new Error('Failed to create user profile. Please contact support.');
          }
        } else {
          profile = newProfile;
        }
      }

      if (!profile) {
        throw new Error('Could not load user profile.');
      }

      // Check if user needs to change password
      if (profile.needs_password_change) {
        const user: User = {
          id: signInData.user.id,
          email: signInData.user.email || email,
          role: (profile.role as UserRole) || 'standard_user',
          full_name: profile.name || 'User',
          organization_id: profile.organization_id,
          organizationId: profile.organization_id,
        };
        setPendingUser({ user, token: signInData.session.access_token });
        setShowChangePassword(true);
        setIsLoading(false);
        return;
      }

      // Load avatar — use profile.avatar_url directly (user_preferences table may not exist)
      let avatarUrl = profile.avatar_url;

      const user: User = {
        id: signInData.user.id,
        email: signInData.user.email || email,
        role: (profile.role as UserRole) || 'standard_user',
        full_name: profile.name || 'User',
        avatar_url: avatarUrl,
        organization_id: profile.organization_id,
        organizationId: profile.organization_id,
      };

      onLogin(user, signInData.session.access_token);
    } catch (err: any) {
      console.error('Member login error:', err);
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex light">
      {/* Left Panel - Branding / Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1765277789186-04b71a9afd40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwcmVub3ZhdGlvbiUyMGNvbnN0cnVjdGlvbiUyMG1vZGVybiUyMGludGVyaW9yfGVufDF8fHx8MTc3MTU4OTE2Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Home renovation construction"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/70 to-indigo-900/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-semibold tracking-tight">ProSpaces</span>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Welcome back,<br />
              <span className="text-blue-300">team member.</span>
            </h2>
            <p className="text-lg text-white/70 max-w-md leading-relaxed">
              Access your CRM dashboard, manage contacts, track bids, and collaborate with your team — all in one place.
            </p>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Secure access</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Lock className="h-4 w-4 text-blue-400" />
                <span>Encrypted</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} ProSpaces CRM. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12 sm:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900 tracking-tight">ProSpaces</span>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to home
              </button>
            )}
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Members Sign In
            </h1>
            <p className="mt-2 text-slate-500">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {successMessage && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-sm text-emerald-800">{successMessage}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="member-email" className="text-sm font-medium text-slate-700">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="member-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                    setSuccessMessage('');
                  }}
                  required
                  className="pl-10 h-12 rounded-xl border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-500/20 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="member-password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetLoading}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  {isResetLoading ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="member-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  required
                  className="pl-10 pr-12 h-12 rounded-xl border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-500/20 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="pt-4 text-center space-y-3">
            <div className="flex items-center gap-4 justify-center text-xs text-slate-400">
              <a href="?view=privacy-policy" className="hover:text-slate-600 transition-colors">
                Privacy Policy
              </a>
              <span className="text-slate-300">|</span>
              <a href="?view=terms-of-service" className="hover:text-slate-600 transition-colors">
                Terms of Service
              </a>
            </div>
            <p className="text-xs text-slate-400 lg:hidden">
              &copy; {new Date().getFullYear()} ProSpaces CRM
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      {showChangePassword && pendingUser && (
        <ChangePasswordDialog
          open={showChangePassword}
          onClose={handlePasswordChanged}
          userId={pendingUser.user.id}
        />
      )}
    </div>
  );
}