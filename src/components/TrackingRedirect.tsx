import React, { useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function TrackingRedirect() {
  useEffect(() => {
    const trackAndRedirect = async () => {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url');
      const id = params.get('id');
      const orgId = params.get('orgId');
      const type = params.get('type') || 'quote';

      if (!url) {
        document.body.innerHTML = 'Invalid tracking link: Missing destination URL';
        return;
      }

      // If we have tracking data, log it
      if (id && orgId) {
        try {
          await fetch(`https://${projectId}.supabase.co/functions/v1/server/make-server-8405be07/public/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              type: 'click',
              entityType: type,
              entityId: id,
              orgId: orgId,
              url: url,
              userAgent: navigator.userAgent
            })
          });
        } catch (error) {
          console.error('Tracking error:', error);
          // Continue to redirect even if tracking fails
        }
      }

      // Redirect
      window.location.replace(url);
    };

    trackAndRedirect();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600 font-medium">Redirecting...</p>
    </div>
  );
}
