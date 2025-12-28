import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Building2, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { authAPI } from '../utils/api';
import { createClient } from '../utils/supabase/client';
import type { User, UserRole } from '../App';
import { CompleteDatabaseSetup } from './CompleteDatabaseSetup';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [invitationToken, setInvitationToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin'); // Changed default to signin
  const [showSuperUserSetup, setShowSuperUserSetup] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true); // Show quick start by default
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false); // Show database setup
  const [lastSignUpAttempt, setLastSignUpAttempt] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ user: User; token: string } | null>(null);

  const handleResendConfirmationEmail = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setIsResendingEmail(true);
    setError('');

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('✅ Confirmation email sent! Please check your inbox and spam folder.');
    } catch (err: any) {
      console.error('Resend email error:', err);
      setError(`Failed to resend confirmation email: ${err.message}`);
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    if (pendingUser) {
      onLogin(pendingUser.user, pendingUser.token);
      setPendingUser(null);
    }
  };

  const handleCreateSuperUser = async () => {
    setError('');
    setIsLoading(true);

    const superUserEmail = 'admin@prospaces.com';
    const superUserPassword = 'ProSpaces2024!';
    const superUserName = 'ProSpaces Super Admin';

    try {
      const supabase = createClient();
      
      // Try to sign in first (in case account already exists)
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: superUserEmail,
        password: superUserPassword,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // Account doesn't exist, create it
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: superUserEmail,
          password: superUserPassword,
          options: {
            data: {
              name: superUserName,
              role: 'super_admin',
            }
          }
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        // After signup, sign in
        const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
          email: superUserEmail,
          password: superUserPassword,
        });

        if (newSignInError) {
          throw new Error(newSignInError.message);
        }

        signInData = newSignInData;
      } else if (signInError) {
        throw new Error(signInError.message);
      }

      // Get or create profile
      if (signInData?.session && signInData?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .single();

        let userProfile = profile;

        if (profileError || !profile) {
          // Create profile if it doesn't exist
          
          // First, create or get organization
          const orgId = crypto.randomUUID();
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              id: orgId,
              name: 'ProSpaces CRM',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (orgError && !orgError.message.includes('duplicate')) {
            console.error('Organization creation error:', orgError);
          }

          const { data: newProfile, error: newProfileError } = await supabase
            .from('profiles')
            .insert({
              id: signInData.user.id,
              email: superUserEmail,
              name: superUserName,
              role: 'super_admin',
              organization_id: org?.id || orgId,
              status: 'active',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (newProfileError) {
            console.error('Profile creation error:', newProfileError);
          }

          userProfile = newProfile;
        }

        // Map to User object
        const user: User = {
          id: signInData.user.id,
          email: signInData.user.email || superUserEmail,
          name: userProfile?.name || superUserName,
          role: (userProfile?.role as UserRole) || 'super_admin',
          organizationId: userProfile?.organization_id || 'default',
        };

        onLogin(user, signInData.session.access_token);
      } else {
        setError('Failed to create session. Please try manual sign up.');
      }
    } catch (err: any) {
      console.error('Super user creation error:', err);
      setError(err.message || 'Failed to create super user. Please try manual sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      console.log('🔐 Attempting sign in for:', email);
      
      // Use direct Supabase Auth instead of Edge Function
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Check if this is an email confirmation error
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('EMAIL_NOT_CONFIRMED');
        }
        
        // Check if this is an "Invalid login credentials" error
        if (signInError.message.includes('Invalid login credentials')) {
          // Check if user exists in profiles table (regardless of Auth status)
          try {
            const { data: existingProfile, error: profileCheckError } = await supabase
              .from('profiles')
              .select('id, email, email_confirmed')
              .eq('email', email)
              .maybeSingle();
            
            if (existingProfile) {
              if (!existingProfile.email_confirmed) {
                throw new Error('EMAIL_NOT_CONFIRMED');
              } else {
                throw new Error('INVALID_CREDENTIALS');
              }
            }
          } catch (checkError: any) {
            if (checkError.message === 'EMAIL_NOT_CONFIRMED' || checkError.message === 'INVALID_CREDENTIALS') {
              throw checkError;
            }
          }
          
          throw new Error('INVALID_CREDENTIALS');
        }
        
        throw new Error(signInError.message);
      }

      if (!signInData?.session || !signInData?.user) {
        throw new Error('Invalid response from server');
      }

      console.log('✅ Sign in successful!')

      // Get user profile from database
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      console.log('📋 Profile fetched:', profile);
      console.log('🔐 needs_password_change value:', profile?.needs_password_change);
      console.log('🔐 needs_password_change type:', typeof profile?.needs_password_change);

      // If profile doesn't exist, create it automatically
      if (profileError || !profile) {
        console.log('Profile not found, creating automatically...');
        
        // Create organization for new user
        const orgId = crypto.randomUUID();
        let orgIdToUse = orgId;
        
        try {
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              id: orgId,
              name: `${signInData.user.email?.split('@')[0]}'s Organization`,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (orgError) {
            // Check if it's an RLS policy error
            if (orgError.code === '42501') {
              console.log('⚠️ RLS policy blocking organization creation. Using fallback org ID.');
            } else if (!orgError.message.includes('duplicate')) {
              console.log('Organization creation issue:', orgError.message);
            }
          } else if (org) {
            orgIdToUse = org.id;
            console.log('✅ Organization created:', org);
          }
        } catch (orgCreationError) {
          console.log('Organization creation skipped. Using fallback org ID.');
        }

        // Create the profile
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
          // If profile already exists (duplicate email), fetch it instead
          if (newProfileError.code === '23505') {
            console.log('Profile already exists (duplicate email), fetching existing profile...');
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', signInData.user.email || email)
              .single();
            
            if (fetchError || !existingProfile) {
              console.error('Failed to fetch existing profile:', fetchError);
              throw new Error('Failed to retrieve user profile. Please try again or contact support.');
            }
            
            // Check if the profile ID matches the auth user ID
            if (existingProfile.id !== signInData.user.id) {
              console.warn('⚠️ Profile ID mismatch detected!');
              console.warn('Auth User ID:', signInData.user.id);
              console.warn('Profile User ID:', existingProfile.id);
              console.warn('Attempting to fix by updating profile ID...');
              
              // Try to update the profile ID to match the auth user
              const { data: fixedProfile, error: fixError } = await supabase
                .from('profiles')
                .update({
                  id: signInData.user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('email', signInData.user.email || email)
                .select()
                .single();
              
              if (fixError) {
                console.error('❌ Failed to fix profile ID:', fixError);
                console.log('⚠️ Continuing with existing profile to allow login');
                // Use existing profile but with correct auth ID for the session
                profile = {
                  ...existingProfile,
                  id: signInData.user.id, // Use auth ID for session
                };
              } else {
                console.log('✅ Profile ID fixed successfully');
                profile = fixedProfile;
              }
            } else {
              profile = existingProfile;
              console.log('✅ Using existing profile:', profile);
            }
          } else if (newProfileError.code === 'PGRST205' || newProfileError.code === '23503') {
            // Check if it's a database structure error
            console.error('❌ Database structure error creating profile:', newProfileError);
            setShowDatabaseSetup(true);
            throw new Error('Failed to create user profile. Please try again or contact support.');
          } else {
            // Log the full error details for debugging
            console.error('❌ Error creating profile:', newProfileError);
            console.error('Error code:', newProfileError.code);
            console.error('Error message:', newProfileError.message);
            console.error('Error details:', newProfileError.details);
            console.error('Error hint:', newProfileError.hint);
            throw new Error(`Failed to create user profile: ${newProfileError.message || 'Unknown error'}. Please try again or contact support.`);
          }
        } else {
          profile = newProfile;
          console.log('✅ Profile created successfully:', profile);
        }
      }

      // Check if user needs to change password
      if (profile.needs_password_change) {
        console.log('⚠️ User needs to change password');
        console.log('🔄 Setting up Change Password dialog...');
        const user: User = {
          id: signInData.user.id,
          email: signInData.user.email || email,
          name: profile.name || 'User',
          role: (profile.role as UserRole) || 'standard_user',
          organizationId: profile.organization_id || 'default',
        };
        console.log('👤 Pending user object:', user);
        setPendingUser({ user, token: signInData.session.access_token });
        console.log('🎬 Setting showChangePassword to TRUE');
        setShowChangePassword(true);
        console.log('⏸️ Setting loading to FALSE');
        setIsLoading(false);
        console.log('🛑 RETURNING EARLY - Should NOT call onLogin');
        return;
      }

      // Map to User object
      const user: User = {
        id: signInData.user.id,
        email: signInData.user.email || email,
        name: profile.name || 'User',
        role: (profile.role as UserRole) || 'standard_user',
        organizationId: profile.organization_id || 'default',
      };

      onLogin(user, signInData.session.access_token);
    } catch (err: any) {
      console.error('Sign in error:', err);
      
      // Handle specific error types
      if (err.message === 'EMAIL_NOT_CONFIRMED') {
        setError('⚠️ EMAIL CONFIRMATION REQUIRED: Please check your email inbox (and spam folder) for a confirmation link. You must click the link before you can sign in. Click the "Resend Confirmation Email" button below if you need a new link.');
        setIsLoading(false);
        return;
      }
      
      if (err.message === 'INVALID_CREDENTIALS') {
        setError('⚠️ SIGN IN FAILED: This usually means your email requires confirmation OR your password is incorrect.\n\n🔍 TROUBLESHOOTING:\n\n1️⃣ If you just signed up: Check your email for a confirmation link (check spam folder too)\n\n2️⃣ If you confirmed your email already: Your password might be wrong - try typing it carefully\n\n3️⃣ If you need a new confirmation email: Click the "Resend Confirmation Email" button below\n\n4️⃣ If you haven\'t signed up yet: Click the "Sign Up" tab to create an account\n\n💡 TIP: Most users see this error because they haven\'t confirmed their email yet!');
        setIsLoading(false);
        return;
      }
      
      if (err.message === 'EMAIL_NOT_CONFIRMED_OR_WRONG_PASSWORD') {
        setError('⚠️ SIGN IN FAILED: This usually means your email requires confirmation OR your password is incorrect.\n\n🔍 TROUBLESHOOTING:\n\n1️⃣ If you just signed up: Check your email for a confirmation link (check spam folder too)\n\n2️⃣ If you confirmed your email already: Your password might be wrong - try typing it carefully\n\n3️⃣ If you need a new confirmation email: Click the "Resend Confirmation Email" button below\n\n4️⃣ If you haven\'t signed up yet: Click the "Sign Up" tab to create an account\n\n💡 TIP: Most users see this error because they haven\'t confirmed their email yet!');
        setIsLoading(false);
        return;
      }
      
      // Provide more helpful error messages
      let errorMessage = 'Sign in failed. Please check your credentials.';
      
      if (err.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Connection timeout. The server is taking too long to respond. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Verify invitation token first
      if (!invitationToken.trim()) {
        throw new Error('Invitation code is required. Please enter the invitation code you received.');
      }

      // Check if invitation exists and is valid
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', invitationToken.trim())
        .eq('status', 'pending')
        .single();

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation code. Please check your invitation email and try again.');
      }

      // Verify the invitation email matches
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error('This invitation was sent to a different email address. Please use the email address that received the invitation.');
      }
      
      // Use direct Supabase Auth instead of Edge Function
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: invitation.role || 'USER',
          }
        }
      });

      if (signUpError) {
        // Check for rate limiting error
        if (signUpError.message.includes('request this after') || signUpError.message.includes('seconds')) {
          throw new Error('Please wait a moment before trying to sign up again. Supabase has rate limiting to prevent abuse.');
        }
        
        // Check for duplicate email
        if (signUpError.message.includes('already been registered') || signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please use the "Sign In" tab to log in, or use a different email address.');
        }
        
        throw new Error(signUpError.message);
      }

      if (!signUpData?.user) {
        throw new Error('Failed to create account');
      }

      // Use the organization from the invitation
      const orgIdToUse = invitation.organization_id;

      // Create profile for new user with organization from invitation
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          email: email,
          name: name,
          role: invitation.role || 'USER',
          organization_id: orgIdToUse,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      let userProfile = newProfile;

      if (profileError) {
        // If profile already exists (duplicate id or email), fetch it instead
        if (profileError.code === '23505') {
          console.log('Profile already exists during sign-up, fetching it...');
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signUpData.user.id)
            .single();
          
          if (fetchError || !existingProfile) {
            console.error('Failed to fetch existing profile:', fetchError);
            // Try fetching by email as fallback
            const { data: profileByEmail, error: emailFetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .single();
            
            if (!emailFetchError && profileByEmail) {
              userProfile = profileByEmail;
              console.log('✅ Using existing profile (found by email):', userProfile);
            }
          } else {
            userProfile = existingProfile;
            console.log('✅ Using existing profile (found by id):', userProfile);
          }
        }
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      // After signup, automatically sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.log('========================================');
        console.log('🔍 SIGNUP COMPLETED BUT AUTO-SIGNIN FAILED');
        console.log('Error message:', signInError.message);
        console.log('Error name:', signInError.name);
        console.log('This usually means EMAIL CONFIRMATION is required');
        console.log('========================================');
        
        // Check if it's an email confirmation error
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          console.log('✅ Confirmed: Email confirmation is required');
          setSuccessMessage('✅ Account created! 📧 Please check your email inbox (and spam folder) for a confirmation link. You must click the link before you can sign in.');
          setActiveTab('signin');
          setIsLoading(false);
          return;
        }
        
        // Check if it's invalid credentials (this is the most common case when email confirmation is required)
        if (signInError.message.includes('Invalid login credentials')) {
          console.log('✅ Signup successful but cannot sign in yet - email confirmation likely required');
          setSuccessMessage('✅ Account created! 📧 IMPORTANT: Your Supabase project requires email confirmation. Check your email inbox (and spam folder) for a confirmation link. You MUST click the link before you can sign in.');
          setActiveTab('signin');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Signup successful but sign-in failed for another reason');
        setSuccessMessage('✅ Account created! Please check your email for a confirmation link, then try signing in.');
        setActiveTab('signin');
        setIsLoading(false);
        return;
      }

      if (!signInData?.session || !signInData?.user) {
        setError('Account created but sign in failed. Please try signing in manually.');
        setActiveTab('signin');
        return;
      }

      // Map to User object
      const user: User = {
        id: signInData.user.id,
        email: signInData.user.email || email,
        name: userProfile?.name || name,
        role: (userProfile?.role as UserRole) || (invitation.role as UserRole) || 'USER',
        organizationId: userProfile?.organization_id || orgIdToUse,
      };

      onLogin(user, signInData.session.access_token);
    } catch (err: any) {
      console.error('Sign up error:', err);
      
      // Check if it's a duplicate email error
      if (err.message && (err.message.includes('already been registered') || err.message.includes('already registered'))) {
        setError('This email is already registered. Try a different email or sign in with your existing account.');
      } else {
        setError(err.message || 'Sign up failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 px-4 py-8 light">
      <div className="absolute inset-0 bg-black/10"></div>
      
      <div className="w-full max-w-4xl space-y-6 relative z-10">
        {showDatabaseSetup && <CompleteDatabaseSetup />}
        
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-5xl text-white">ProSpaces CRM</h1>
          </div>
          <p className="text-xl text-white/90">
            Complete solution for sales, marketing, and project management
          </p>
        </div>
        
        <Card className="w-full max-w-md mx-auto border-0 shadow-2xl">
          <CardContent className="pt-6">
            <Alert className="bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200 mb-6">
              <Info className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-xs text-gray-700">
                <strong>Sign Up:</strong> New user registration requires an invitation code. Contact your organization administrator to receive an invitation.
              </AlertDescription>
            </Alert>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  {successMessage && (
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSuccessMessage(''); // Clear success message when user starts typing
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setSuccessMessage(''); // Clear success message when user starts typing
                      }}
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {error}
                        {error.includes('Invalid login credentials') && (
                          <div className="mt-2 space-y-1">
                            <strong className="block">Troubleshooting:</strong>
                            <ul className="text-xs list-disc list-inside space-y-1">
                              <li>Double-check your email and password</li>
                              <li>If you haven't signed up yet, use the "Sign Up" tab</li>
                              <li>If you recently signed up, check your email for confirmation link</li>
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  
                  {error && error.includes('SIGN IN FAILED') && (
                    <div className="pt-2">
                      <Button 
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleResendConfirmationEmail}
                        disabled={isResendingEmail || !email}
                      >
                        {isResendingEmail ? 'Sending...' : '📧 Resend Confirmation Email'}
                      </Button>
                      {!email && (
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Please enter your email address first
                        </p>
                      )}
                    </div>
                  )}
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500">At least 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-invitation">Invitation Code</Label>
                    <Input
                      id="signup-invitation"
                      type="text"
                      placeholder="Enter your invitation code"
                      value={invitationToken}
                      onChange={(e) => setInvitationToken(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>

                <Alert className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200">
                  <Info className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-xs text-gray-700">
                    <strong>Note:</strong> If you see a rate limiting error, please wait 30 seconds before trying again. If you get an "email already registered" error, use the Sign In tab instead.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center text-white/80 text-sm">
          © 2025 ProSpaces CRM. All rights reserved.
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