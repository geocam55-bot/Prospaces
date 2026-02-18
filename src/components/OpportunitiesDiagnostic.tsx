import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { ensureUserProfile } from '../utils/ensure-profile';

export function OpportunitiesDiagnostic() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostic = async () => {
    setIsChecking(true);
    const diagnosticResults: any = {
      timestamp: new Date().toISOString(),
      checks: [],
    };

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        diagnosticResults.checks.push({
          name: 'Authentication',
          status: 'error',
          message: 'No authenticated user',
        });
        setResults(diagnosticResults);
        setIsChecking(false);
        return;
      }

      diagnosticResults.checks.push({
        name: 'Authentication',
        status: 'success',
        message: `Logged in as ${user.email}`,
      });

      // Get profile
      const profile = await ensureUserProfile(user.id);
      diagnosticResults.userProfile = {
        email: profile.email,
        role: profile.role,
        organization_id: profile.organization_id,
        id: user.id,
      };

      diagnosticResults.checks.push({
        name: 'Profile',
        status: 'success',
        message: `Role: ${profile.role}, Org: ${profile.organization_id}`,
      });

      // Check ALL opportunities in database (no filtering)
      const { data: allOpportunities, error: allOppError } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (allOppError) {
        diagnosticResults.checks.push({
          name: 'All Opportunities Query',
          status: 'error',
          message: allOppError.message,
        });
      } else {
        diagnosticResults.checks.push({
          name: 'All Opportunities (Unfiltered)',
          status: 'info',
          message: `Total in database: ${allOpportunities?.length || 0}`,
        });
        diagnosticResults.allOpportunities = allOpportunities || [];
      }

      // Check opportunities filtered by organization
      const { data: orgOpportunities, error: orgOppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (orgOppError) {
        diagnosticResults.checks.push({
          name: 'Organization Opportunities',
          status: 'error',
          message: orgOppError.message,
        });
      } else {
        diagnosticResults.checks.push({
          name: 'Organization Opportunities',
          status: 'info',
          message: `In your org: ${orgOpportunities?.length || 0}`,
        });
        diagnosticResults.orgOpportunities = orgOpportunities || [];
      }

      // Check opportunities filtered by owner
      const { data: ownedOpportunities, error: ownedOppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedOppError) {
        diagnosticResults.checks.push({
          name: 'Owned Opportunities',
          status: 'error',
          message: ownedOppError.message,
        });
      } else {
        diagnosticResults.checks.push({
          name: 'Owned Opportunities (Your Filter)',
          status: profile.role === 'admin' || profile.role === 'manager' || profile.role === 'director' ? 'warning' : 'success',
          message: `Owned by you: ${ownedOpportunities?.length || 0}`,
        });
        diagnosticResults.ownedOpportunities = ownedOpportunities || [];
      }

      // Search for Larry's contact
      const { data: larryContact, error: larryError } = await supabase
        .from('contacts')
        .select('*')
        .ilike('email', '%larry.lee@ronaatlantic.ca%')
        .maybeSingle();

      if (larryError) {
        diagnosticResults.checks.push({
          name: 'Larry Contact Lookup',
          status: 'error',
          message: larryError.message,
        });
      } else if (!larryContact) {
        diagnosticResults.checks.push({
          name: 'Larry Contact Lookup',
          status: 'warning',
          message: 'Larry.Lee@ronaatlantic.ca not found in contacts',
        });
      } else {
        diagnosticResults.checks.push({
          name: 'Larry Contact Found',
          status: 'success',
          message: `ID: ${larryContact.id}, Owner: ${larryContact.owner_id}, Org: ${larryContact.organization_id}`,
        });
        diagnosticResults.larryContact = larryContact;

        // Check opportunities for Larry
        const { data: larryOpportunities, error: larryOppError } = await supabase
          .from('opportunities')
          .select('*')
          .eq('customer_id', larryContact.id)
          .order('created_at', { ascending: false });

        if (larryOppError) {
          diagnosticResults.checks.push({
            name: 'Larry Opportunities',
            status: 'error',
            message: larryOppError.message,
          });
        } else {
          diagnosticResults.checks.push({
            name: 'Larry Opportunities',
            status: 'info',
            message: `Total for Larry: ${larryOpportunities?.length || 0}`,
          });
          diagnosticResults.larryOpportunities = larryOpportunities || [];

          // Check which ones YOU own
          const youOwnCount = larryOpportunities?.filter(o => o.owner_id === user.id).length || 0;
          const othersOwnCount = (larryOpportunities?.length || 0) - youOwnCount;

          diagnosticResults.checks.push({
            name: 'Larry Opportunity Ownership',
            status: othersOwnCount > 0 ? 'warning' : 'success',
            message: `You own: ${youOwnCount}, Others own: ${othersOwnCount}`,
          });
        }
      }

      // RLS Policy Check
      diagnosticResults.checks.push({
        name: 'Filtering Logic',
        status: 'info',
        message: profile.role === 'admin' || profile.role === 'manager' || profile.role === 'director' 
          ? `⚠️ Your role (${profile.role}) sees ONLY opportunities where owner_id = ${user.id}`
          : `Your role sees all org opportunities`,
      });

    } catch (error: any) {
      diagnosticResults.checks.push({
        name: 'Diagnostic Error',
        status: 'error',
        message: error.message,
      });
    }

    setResults(diagnosticResults);
    setIsChecking(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Opportunities Diagnostic Tool</CardTitle>
          <p className="text-sm text-gray-600">
            Diagnose why opportunities aren't showing up after creation
          </p>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runDiagnostic} 
            disabled={isChecking}
            className="mb-6"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Diagnostic...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Run Diagnostic
              </>
            )}
          </Button>

          {results && (
            <div className="space-y-4">
              {/* User Info */}
              {results.userProfile && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold mb-2">👤 Your Profile</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Email:</strong> {results.userProfile.email}</p>
                    <p><strong>Role:</strong> {results.userProfile.role}</p>
                    <p><strong>User ID:</strong> {results.userProfile.id}</p>
                    <p><strong>Organization ID:</strong> {results.userProfile.organization_id}</p>
                  </div>
                </div>
              )}

              {/* Checks */}
              <div className="space-y-2">
                {results.checks.map((check: any, index: number) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border flex items-start gap-3 ${
                      check.status === 'success' ? 'bg-green-50 border-green-200' :
                      check.status === 'error' ? 'bg-red-50 border-red-200' :
                      check.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {check.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
                    {check.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    {check.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                    {check.status === 'info' && <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{check.name}</p>
                      <p className="text-sm text-gray-700">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Larry's Opportunities Detail */}
              {results.larryOpportunities && results.larryOpportunities.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-semibold mb-3">📊 Larry's Opportunities (Raw Data)</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.larryOpportunities.map((opp: any) => (
                      <div key={opp.id} className="bg-white p-3 rounded border text-sm">
                        <p><strong>Title:</strong> {opp.title}</p>
                        <p><strong>Owner ID:</strong> {opp.owner_id}</p>
                        <p><strong>Org ID:</strong> {opp.organization_id}</p>
                        <p><strong>Created:</strong> {new Date(opp.created_at).toLocaleString()}</p>
                        <p className={`font-semibold ${opp.owner_id === results.userProfile.id ? 'text-green-600' : 'text-red-600'}`}>
                          {opp.owner_id === results.userProfile.id ? '✅ You own this' : '❌ Someone else owns this'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                <h3 className="font-semibold mb-2">💡 Summary</h3>
                <div className="text-sm space-y-2">
                  <p>
                    <strong>Total opportunities in database:</strong>{' '}
                    {results.allOpportunities?.length || 0}
                  </p>
                  <p>
                    <strong>In your organization:</strong>{' '}
                    {results.orgOpportunities?.length || 0}
                  </p>
                  <p>
                    <strong>Owned by you (what you see):</strong>{' '}
                    {results.ownedOpportunities?.length || 0}
                  </p>
                  {results.userProfile?.role === 'admin' || results.userProfile?.role === 'manager' || results.userProfile?.role === 'director' ? (
                    <p className="text-yellow-700 font-semibold mt-3">
                      ⚠️ Your role ({results.userProfile.role}) uses STRICT filtering - you only see opportunities where owner_id matches your user ID.
                      If you create an opportunity for someone else's contact, it won't appear unless YOU are the owner.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}