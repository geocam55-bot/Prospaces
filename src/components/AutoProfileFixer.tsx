import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

interface AutoProfileFixerProps {
  onSuccess: () => void;
}

export function AutoProfileFixer({ onSuccess }: AutoProfileFixerProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [needsFix, setNeedsFix] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTool, setShowTool] = useState(true); // Always show the tool initially
  const [autoFixAttempted, setAutoFixAttempted] = useState(false);

  useEffect(() => {
    checkProfilesTable();
  }, []);

  // Automatically attempt to fix when issue is detected
  useEffect(() => {
    if (needsFix && !autoFixAttempted && !isChecking) {
      console.log('[AutoProfileFixer] 🔧 Auto-fixing profiles issue...');
      setAutoFixAttempted(true);
      autoFixProfiles();
    }
  }, [needsFix, autoFixAttempted, isChecking]);

  const checkProfilesTable = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Check if profiles table exists and has data
      const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          setNeedsFix(true);
          setError('Profiles table does not exist');
        } else if (error.code === '42501') {
          // Permission error - might be RLS issue
          setNeedsFix(true);
          setError('Permission issue with profiles table');
        } else {
          setNeedsFix(true);
          setError(error.message);
        }
      } else {
        // Check if current user is in profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            setNeedsFix(true);
          } else {
            setNeedsFix(false);
          }
        }
      }
    } catch (err: any) {
      console.error('Error checking profiles:', err);
      setNeedsFix(true);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const autoFixProfiles = async () => {
    try {
      setIsFixing(true);
      setError(null);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        throw new Error('Not authenticated');
      }

      // Try to insert current user into profiles
      const profileData = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'standard_user',
        organization_id: user.user_metadata?.organizationId || null,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'id' });

      if (insertError) {
        // If insert fails, it's likely a table structure or RLS issue
        throw new Error(`Failed to sync profile: ${insertError.message}`);
      }

      toast.success('✅ Your profile has been synced successfully!');
      setNeedsFix(false);
      
      // Wait a bit then refresh
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err: any) {
      console.error('Auto-fix error:', err);
      setError(err.message);
      toast.error('Auto-fix failed. Please use manual SQL setup.');
    } finally {
      setIsFixing(false);
    }
  };

  if (isChecking) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-blue-900">Checking profiles table...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the tool if there's an issue OR if the user hasn't manually dismissed it
  if (!needsFix && !showTool) {
    return null;
  }

  // If no fix is needed but tool is visible, show success state
  if (!needsFix && showTool) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-green-900">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Profiles Table is Healthy
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTool(false)}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-green-300 bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Your profile is properly synced to the database. Everything looks good!
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={checkProfilesTable}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Re-check Profiles Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertCircle className="h-5 w-5" />
          Profiles Table Needs Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-300 bg-orange-100">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Issue detected:</strong> {error || 'Your profile is not synced to the database.'}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            onClick={autoFixProfiles}
            disabled={isFixing}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="lg"
          >
            {isFixing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Syncing Your Profile...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Auto-Fix Now (Quick Fix)
              </>
            )}
          </Button>

          <div className="text-sm text-orange-800 space-y-1">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Attempts to sync your profile to the database</li>
              <li>Creates profile entry from your auth data</li>
              <li>Takes 2-3 seconds</li>
            </ul>
          </div>

          {error && (
            <Alert className="border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">
                <strong>Note:</strong> If auto-fix fails, you'll need to run the manual SQL setup script.
                Click "Run Full Diagnostic" in the Profiles Sync Tool below for the SQL script.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
