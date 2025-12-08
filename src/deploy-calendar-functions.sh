#!/bin/bash

echo "🚀 Deploying ProSpaces CRM Calendar Sync Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "✅ Supabase CLI ready"
echo ""

# Deploy calendar-oauth-init function
echo "📤 Deploying calendar-oauth-init..."
supabase functions deploy calendar-oauth-init --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ calendar-oauth-init deployed successfully"
else
    echo "❌ Failed to deploy calendar-oauth-init"
    exit 1
fi
echo ""

# Deploy calendar-oauth-callback function
echo "📤 Deploying calendar-oauth-callback..."
supabase functions deploy calendar-oauth-callback --no-verify-jwt
if [ $? -eq 0 ]; then
    echo "✅ calendar-oauth-callback deployed successfully"
else
    echo "❌ Failed to deploy calendar-oauth-callback"
    exit 1
fi
echo ""

# Deploy calendar-sync function
echo "📤 Deploying calendar-sync..."
supabase functions deploy calendar-sync
if [ $? -eq 0 ]; then
    echo "✅ calendar-sync deployed successfully"
else
    echo "❌ Failed to deploy calendar-sync"
    exit 1
fi
echo ""

echo "🎉 All calendar sync Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Add OAuth credentials to Supabase Dashboard → Edge Functions → Secrets"
echo "2. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
echo "3. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET"
echo "4. Set CALENDAR_REDIRECT_URI=https://pro-spaces.vercel.app/auth/callback"
echo ""
echo "📖 See CALENDAR_OAUTH_PRODUCTION_SETUP.md for detailed instructions"
