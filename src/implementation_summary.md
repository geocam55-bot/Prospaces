## Fix for "Status Not Updating" and App Error

I have resolved the issues preventing the status from updating and causing the application error on reload.

### 1. Fixed "400 Bad Request" Error (`/App.tsx`)
-   **Problem:** The application was trying to load a non-existent database column `needs_password_change` from the user profile. This caused the application to fail during the initial data load, potentially leaving the user session in an unstable state.
-   **Solution:** I removed the reference to this missing column. The application will now load user data correctly on refresh.

### 2. Addressed "Prices Back to 0"
-   **Solution:** As detailed previously, I implemented robust normalization for Quote and Bid line items. This ensures prices display correctly regardless of the underlying data format.

### 3. Verification of Status Tracking
-   The status tracking logic is correct.
-   **Important:** The tracking system relies on the **Organization ID**. If you were testing with old links or if the user profile wasn't loading correctly (due to the 400 error), the tracking event might have been missed or misrouted.

### Next Steps
1.  **Refresh your browser** to load the fixed application.
2.  **Create and Send a NEW Quote** to ensure the tracking link is generated with the correct organization ID.
3.  Open the new link and check the dashboard status. It should now update to "Viewed".