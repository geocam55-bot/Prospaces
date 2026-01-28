import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

export function LandingPageDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/debug/landing-pages`);
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landing Page Diagnostic</h1>
            <p className="text-gray-600 mt-1">Debug tool to inspect landing pages in the database</p>
          </div>
          <Button onClick={runDiagnostic} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {loading && !result && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading landing pages...</p>
            </CardContent>
          </Card>
        )}

        {result?.error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800">{result.error}</p>
            </CardContent>
          </Card>
        )}

        {result && !result.error && (
          <>
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.totalPages > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  Database Summary
                </CardTitle>
                <CardDescription>Current state of landing pages in the KV store</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{result.totalPages}</div>
                    <div className="text-sm text-blue-700">Total Pages</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">{result.pagesWithSlugs}</div>
                    <div className="text-sm text-green-700">Pages with Slugs</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-900">{result.pagesWithoutSlugs}</div>
                    <div className="text-sm text-yellow-700">Pages without Slugs</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Slugs */}
            {result.availableSlugs && result.availableSlugs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Slugs</CardTitle>
                  <CardDescription>Slugs that will work in /landing/[slug] URLs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.availableSlugs.map((slug: string) => (
                      <a
                        key={slug}
                        href={`/landing/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-80 transition-opacity"
                      >
                        <Badge variant="default" className="text-sm py-1 px-3 cursor-pointer">
                          {slug}
                        </Badge>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Pages */}
            {result.pages && result.pages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>All Pages</CardTitle>
                  <CardDescription>Detailed view of all landing pages in the database</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.pages.map((page: any) => (
                      <div key={page.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">{page.name || 'Untitled Page'}</h3>
                              {page.slug ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                  /{page.slug}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                  No Slug Set
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                              <div>
                                <span className="text-gray-500">ID:</span>{' '}
                                <span className="font-mono text-xs text-gray-700">{page.id}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Organization:</span>{' '}
                                <span className="font-mono text-xs text-gray-700">{page.organizationId}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Created:</span>{' '}
                                <span className="text-gray-700">{page.createdAt ? new Date(page.createdAt).toLocaleDateString() : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Has Content:</span>{' '}
                                <span className="text-gray-700">{page.hasContent ? '✓ Yes' : '✗ No'}</span>
                              </div>
                            </div>
                          </div>

                          {page.slug && (
                            <a
                              href={`/landing/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline">
                                View Public Page
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {result.totalPages === 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    No Landing Pages Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-800 mb-4">
                    No landing pages were found in the database. To fix the 404 error:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-yellow-900">
                    <li>Go to <strong>Marketing → Landing Pages</strong></li>
                    <li>Create or select your landing page (e.g., "WinterBlast")</li>
                    <li>Go to the <strong>Settings</strong> tab</li>
                    <li>Set the <strong>Page Slug</strong> field to "WinterBlast" (without the slash)</li>
                    <li>Save the page</li>
                    <li>The page will then be accessible at <code className="bg-yellow-100 px-2 py-1 rounded">/landing/WinterBlast</code></li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Pages Without Slugs Warning */}
            {result.pagesWithoutSlugs > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-800">
                    {result.pagesWithoutSlugs} page{result.pagesWithoutSlugs > 1 ? 's' : ''} found without slugs. 
                    These pages cannot be accessed publicly. To fix:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-900 mt-3">
                    <li>Open the page in the Landing Page Builder</li>
                    <li>Go to the Settings tab</li>
                    <li>Set a unique slug (e.g., "WinterBlast")</li>
                    <li>Save the page</li>
                  </ol>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Debug Info */}
        {result && (
          <Card className="bg-gray-800 text-gray-100">
            <CardHeader>
              <CardTitle className="text-gray-100">Debug Info</CardTitle>
              <CardDescription className="text-gray-400">Raw server response</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-x-auto bg-gray-900 p-4 rounded border border-gray-700">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
