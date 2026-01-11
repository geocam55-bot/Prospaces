## Quote Status Tracking Fix

I identified two issues preventing the Quote status from updating to "Viewed":
1.  **Public Page:** The server endpoint that renders the Quote HTML (`/public/view`) was *fetching* the data but not *updating* the status.
2.  **Tracking Pixel:** The tracking code was trying to update a `read_at` column in the database that doesn't exist, causing the "Viewed" update to fail silently.

### The Fix
I updated the server logic (`/supabase/functions/server/index.tsx`) to:
1.  **Automatically mark the quote as "Viewed"** whenever the Public Quote page is loaded.
2.  **Fix the tracking pixel** and link click handlers to correctly update the status in both the database (so you see it in the UI) and the internal tracking system.

### Instructions
1.  **Refresh your browser**.
2.  Send a test quote to yourself (or open an existing public link).
3.  View the page.
4.  Check the **Bids/Quotes** tab—the status should now update to **"Viewed"**.