## Quote Schema Fix

The error occurred because I tried to save the **Contact Name** and **Email** directly into the Quotes table, but the database is designed to only store the **Contact ID** (it looks up the name and email automatically from the Contacts table).

### The Fix
I have updated the **Deck Planner** (`SavedDeckDesigns.tsx`) to:
-   **Remove** `contact_name` and `contact_email` from the save operation.
-   **Keep** `contact_id`, which is the correct way to link the quote to the customer.

### Instructions
1.  **Refresh your browser**.
2.  Try saving the design with "Create Quote" again.
3.  It should now succeed without error.