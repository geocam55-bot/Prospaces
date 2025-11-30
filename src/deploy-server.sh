#!/bin/bash

echo "======================================"
echo "Deploying Server Function to Supabase"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  macOS/Linux: brew install supabase/tap/supabase"
    echo "  Windows:     scoop install supabase"
    echo "  npm:         npm install -g supabase"
    echo ""
    exit 1
fi

echo "✓ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null
then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Please run: supabase login"
    echo ""
    exit 1
fi

echo "✓ Logged in to Supabase"
echo ""

# Deploy the server function
echo "Deploying server function..."
echo ""

supabase functions deploy server

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✅ Deployment Successful!"
    echo "======================================"
    echo ""
    echo "The Users API is now live!"
    echo "Refresh your browser to see the changes."
    echo ""
else
    echo ""
    echo "======================================"
    echo "❌ Deployment Failed"
    echo "======================================"
    echo ""
    echo "Please check the error above and try again."
    echo ""
    exit 1
fi
