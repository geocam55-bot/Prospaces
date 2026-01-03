import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { HardDrive, Database, Cloud, Lock, RefreshCw, Zap } from 'lucide-react';

export function PlannerDefaultsComparisonChart() {
  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="text-center">Before & After: Storage Migration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Before */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-3">Before Migration</Badge>
              <HardDrive className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="font-medium mt-3 text-gray-700">Browser localStorage</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span className="text-gray-600">Data lost when clearing browser cache</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span className="text-gray-600">Single device only</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span className="text-gray-600">No backup or recovery</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span className="text-gray-600">Limited storage space</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span className="text-gray-600">Not accessible to admins</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin-slow mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-600">Migrated</p>
            </div>
          </div>

          {/* After */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="default" className="mb-3 bg-green-600">After Migration</Badge>
              <Database className="h-12 w-12 mx-auto text-green-600" />
              <h3 className="font-medium mt-3 text-green-700">Database Storage</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700 font-medium">Data persists permanently</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700 font-medium">Access from any device</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700 font-medium">Automatic backup included</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700 font-medium">Unlimited storage capacity</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-700 font-medium">Admin oversight available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Benefits */}
        <div className="mt-8 pt-6 border-t grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <Cloud className="h-6 w-6 mx-auto text-blue-600" />
            <p className="text-xs font-medium text-gray-700">Cloud Synced</p>
            <p className="text-xs text-gray-500">Always up to date</p>
          </div>
          <div className="space-y-2">
            <Lock className="h-6 w-6 mx-auto text-blue-600" />
            <p className="text-xs font-medium text-gray-700">Secure</p>
            <p className="text-xs text-gray-500">User-isolated data</p>
          </div>
          <div className="space-y-2">
            <Zap className="h-6 w-6 mx-auto text-blue-600" />
            <p className="text-xs font-medium text-gray-700">Fast</p>
            <p className="text-xs text-gray-500">Optimized access</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
