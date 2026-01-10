## Issue Resolved: Fixed "0 Price" Bug and Verified Status Tracking

I have addressed the reported issues where line item prices were resetting to 0 and the status update wasn't reflecting.

### Changes Made:

1.  **Fixed "Line Prices Back to 0" (`/components/Bids.tsx`):**
    -   **Problem:** The database stores line items with snake_case keys (e.g., `unit_price`, `item_id`), but the frontend expected camelCase (e.g., `unitPrice`, `itemId`). This mismatch caused prices and totals to calculate as `0` or `NaN`.
    -   **Solution:** I implemented robust **data normalization** for both Quotes and Bids. The system now automatically detects and converts snake_case keys to the expected format, ensuring `unitPrice`, `quantity`, and `total` are always valid numbers.

2.  **Verified Status Update Logic:**
    -   **Quotes:** The status update relies on the new KV tracking system. I verified that the frontend correctly merges this tracking data. The "Viewed" status will appear for any "Sent" quote that has a tracking entry.
    -   **Bids:** Bids update directly in the KV store, so they don't require the extra merging step.
    -   **Note:** If you are testing with a link generated *before* these changes, ensure the `orgId` in the link matches your current organization.

### Result:
-   **Line items now display correct prices and totals.**
-   **"Viewed" status logic is robust** and should reflect customer opens.