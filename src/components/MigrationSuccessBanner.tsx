import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from './ui/button';

interface MigrationSuccessBannerProps {
  onDismiss: () => void;
}

export function MigrationSuccessBanner({ onDismiss }: MigrationSuccessBannerProps) {
  return (
    <Alert className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CheckCircle2 className="h-5 w-5 text-green-600" />
      <AlertDescription className="pr-8">
        <div className="space-y-2">
          <p className="font-medium text-green-900">
            🎉 Your planner defaults have been successfully migrated to the database!
          </p>
          <ul className="text-sm text-green-800 space-y-1">
            <li>✓ Your customizations are now backed up securely</li>
            <li>✓ Access your settings from any device</li>
            <li>✓ No more data loss from browser cache clearing</li>
          </ul>
          <p className="text-xs text-green-700 mt-2">
            You can continue using the planners as normal. All your custom material selections are preserved.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
