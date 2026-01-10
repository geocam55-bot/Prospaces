## Issue Resolved: Fixed Quote Status Update and Errors

I have fixed the "PGRST204" errors and ensured the "Viewed" status displays correctly.

### Changes Made:

1.  **Backend Fixes (`/supabase/functions/server/index.tsx`):**
    -   **Stopped Errors:** Removed the code trying to update the non-existent `read_at` column in the `quotes` database table. This eliminates the "Could not find column" errors.
    -   **Implemented KV Tracking:** Replaced the database update with a high-performance Key-Value store update. View events are now saved to a dedicated `tracking_status` index.
    -   **New Endpoint:** Added a `GET /quotes/tracking-status` endpoint to securely retrieve the view status of all quotes for your organization.

2.  **Frontend Updates:**
    -   **API Integration:** Updated `utils/quotes-client.ts` and `utils/api.ts` to fetch the tracking data from the new server endpoint.
    -   **Dashboard Logic (`Bids.tsx`):**
        -   The dashboard now fetches the tracking status alongside your quotes.
        -   It intelligently merges the `readAt` timestamp from the tracking system into your quotes.
        -   Quotes that are "Sent" but have a `readAt` timestamp now automatically display as **"Viewed"** (Indigo badge).

### Result:
-   **No more errors** when customers open quotes.
-   **"Viewed" status now works** instantly when the dashboard refreshes.
-   **Filter works:** You can now filter by "Viewed" in the quote list.