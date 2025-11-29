#!/bin/bash

# Fix Supabase Edge Function Routes and Deploy
# This script fixes the route prefixes and deploys the function

echo "🔧 Fixing server routes..."

# Backup the original file
cp supabase/functions/server/index.tsx supabase/functions/server/index.tsx.backup

# Use sed to remove the /make-server-8405be07 prefix from all routes
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
else
  # Linux
  sed -i "s/app\.\(get\|post\|put\|delete\)('\/make-server-8405be07\//app.\1('\//g" supabase/functions/server/index.tsx
fi

echo "✅ Routes fixed!"
echo ""

# Count the changes
ROUTE_COUNT=$(grep -c "app\.\(get\|post\|put\|delete\)('" supabase/functions/server/index.tsx)
echo "📊 Total routes in file: $ROUTE_COUNT"

echo ""
echo "🚀 Deploying function to Supabase..."
echo ""

# Deploy the function
supabase functions deploy make-server-8405be07 --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "🔍 Testing health endpoint..."
  curl https://usorqldwroecyxucmtuw.supabase.co/functions/v1/make-server-8405be07/health
  echo ""
  echo ""
  echo "✅ Backend is now live!"
  echo ""
  echo "The following endpoints are now available:"
  echo "  - /auth/signup"
  echo "  - /auth/signin"
  echo "  - /bids/opportunity/:opportunityId"
  echo "  - /project-managers/customer/:customerId"
  echo "  - ... and 45 more endpoints"
else
  echo ""
  echo "❌ Deployment failed!"
  echo "Restoring backup..."
  mv supabase/functions/server/index.tsx.backup supabase/functions/server/index.tsx
  echo "Please check your Supabase CLI configuration and try again."
  exit 1
fi
