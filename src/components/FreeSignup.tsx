import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { signupFree } from '../utils/subscription-client';
import { createClient } from '../utils/supabase/client';
import { getAuthRedirectUrl } from '../utils/auth-redirect';
import { requestPasswordResetEmail } from '../utils/auth-client';
import { Logo } from './Logo';

interface FreeSignupProps {
  onSignupSuccess?: (result: { email: string; message: string }) => void;
  onBack?: () => void;
}

export function FreeSignup({ onSignupSuccess, onBack }: FreeSignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Password validation
  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (!/[a-z]/.test(pwd)) return { valid: false, message: 'Password must contain lowercase letters' };
    if (!/[A-Z]/.test(pwd)) return { valid: false, message: 'Password must contain uppercase letters' };
    if (!/[0-9]/.test(pwd)) return { valid: false, message: 'Password must contain numbers' };
    if (!/[!@#$%&*]/.test(pwd)) return { valid: false, message: 'Password must contain special characters (!@#$%&*)' };
    return { valid: true, message: '' };
  };

  const validateForm = (): boolean => {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email is not valid');
      return false;
    }

    if (!password.trim()) {
      setError('Password is required');
      return false;
    }

    const pwdValidation = validatePassword(password);
    if (!pwdValidation.valid) {
      setError(pwdValidation.message);
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!firstName.trim()) {
      setError('First name is required');
      return false;
    }

    if (!lastName.trim()) {
      setError('Last name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const normalizedEmail = email.toLowerCase().trim();

    setIsLoading(true);
    setError('');

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const resolvedOrganizationName = organizationName.trim() || fullName;

      const result = await signupFree({
        email: normalizedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organizationName: resolvedOrganizationName,
      });

      if (result.success === false) {
        setError(result.message || 'Failed to create free account. Please try again.');
        return;
      }

      const nextMessage = result.message || 'Account created successfully. You can sign in now with your email and password.';
      const nextEmail = result.email?.trim() || normalizedEmail;

      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName('');
      setLastName('');
      setOrganizationName('');
      setSubmittedEmail(nextEmail);

      if (onSignupSuccess) {
        onSignupSuccess({
          email: nextEmail,
          message: nextMessage,
        });
        return;
      }

      setSuccessMessage(nextMessage);
      setShowSuccess(true);
    } catch (err: any) {
      const nextError = err?.message || 'Failed to create free account. Please try again.';

      // If the account already exists, route to login with context instead of
      // leaving the user blocked on the signup form.
      if (onSignupSuccess && /already exists/i.test(nextError)) {
        let recoveryMessage = 'This email already has an account. Sign in below or reset your password.';

        try {
          const redirectTo = getAuthRedirectUrl('/');
          const redirectPath = new URL(redirectTo).pathname || '/';
          await requestPasswordResetEmail(normalizedEmail, redirectPath);
          recoveryMessage = 'This email already has an account. We sent a password reset email from ProSpaces CRM, then you can sign in.';
        } catch {
          // Keep the fallback guidance message when reset email fails.
        }

        onSignupSuccess({
          email: normalizedEmail,
          message: recoveryMessage,
        });
        return;
      }

      setError(nextError);
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-700">Welcome to ProSpaces!</CardTitle>
            <CardDescription className="text-base">Account created successfully</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Next steps:</p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex gap-2">
                  <span className="text-blue-600">1.</span>
                  <span>Check your email at <strong>{submittedEmail}</strong> for a confirmation link</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">2.</span>
                  <span>Click the confirmation link to activate your account</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">3.</span>
                  <span>Return to the sign-in page and use the password you created</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">4.</span>
                  <span>Enjoy your 15-day free trial!</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 space-y-2">
              {successMessage && (
                <p className="text-sm text-center text-slate-600">{successMessage}</p>
              )}
              <p className="text-xs text-slate-500 text-center">
                After 15 days, you'll be able to choose a permanent plan.
              </p>
              <Button 
                onClick={() => setShowSuccess(false)}
                className="w-full"
                variant="default"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <Logo size="sm" className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Create free trial account</CardTitle>
          <CardDescription>Get 15 days of free access to ProSpaces</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
              <p className="text-xs text-slate-500">We'll send your confirmation email here</p>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name (optional)</Label>
              <Input
                id="orgName"
                placeholder="Acme Contractors"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={isLoading}
                autoComplete="organization"
              />
              <p className="text-xs text-slate-500">If left blank, we&apos;ll use your name.</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 chars, uppercase, number, special char"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="text-xs text-slate-500">
                At least 8 characters with uppercase, lowercase, number, and special character (!@#$%&*)
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create free trial account'}
            </Button>

            {/* Terms Link */}
            <p className="text-xs text-center text-slate-500">
              By creating an account, you agree to our{' '}
              <a href="?view=terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="?view=privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
