#!/bin/bash

# ProSpaces CRM - Email Integration Deployment Script
# This script deploys all Nylas Edge Functions to Supabase

set -e  # Exit on error

echo "🚀 ProSpaces CRM - Email Integration Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo ""
    echo "Please install Supabase CLI first:"
    echo ""
    echo "macOS/Linux:"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Windows (PowerShell):"
    echo "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    echo "  scoop install supabase"
    echo ""
    echo "npm (any OS):"
    echo "  npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo ""
    echo "Logging in..."
    supabase login
    echo ""
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"
echo ""

# Project reference
PROJECT_REF="usorqldwroecyxucmtuw"

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Project not linked${NC}"
    echo ""
    echo "Linking to project: $PROJECT_REF"
    supabase link --project-ref $PROJECT_REF
    echo ""
fi

echo -e "${GREEN}✅ Project linked${NC}"
echo ""

# Check for Nylas API key
echo -e "${BLUE}🔑 Checking Nylas API Key...${NC}"
if ! supabase secrets list | grep -q "NYLAS_API_KEY"; then
    echo -e "${YELLOW}⚠️  NYLAS_API_KEY not set${NC}"
    echo ""
    echo "You need a Nylas API key to enable email integration."
    echo ""
    echo "Options:"
    echo "  1. Get a free Nylas account at https://nylas.com"
    echo "  2. Use IMAP/SMTP instead (no Nylas needed)"
    echo ""
    read -p "Do you have a Nylas API key? (y/n): " has_key
    
    if [ "$has_key" = "y" ] || [ "$has_key" = "Y" ]; then
        read -p "Enter your Nylas API key: " nylas_key
        echo ""
        echo "Setting NYLAS_API_KEY secret..."
        supabase secrets set NYLAS_API_KEY="$nylas_key"
        echo -e "${GREEN}✅ API key set${NC}"
        echo ""
    else
        echo ""
        echo -e "${YELLOW}⚠️  Skipping Nylas API key setup${NC}"
        echo ""
        echo "Note: You can still deploy the functions and use IMAP/SMTP."
        echo "OAuth (Gmail/Outlook) won't work without a Nylas API key."
        echo ""
        read -p "Continue deployment without Nylas? (y/n): " continue_deploy
        
        if [ "$continue_deploy" != "y" ] && [ "$continue_deploy" != "Y" ]; then
            echo "Deployment cancelled."
            exit 0
        fi
    fi
else
    echo -e "${GREEN}✅ NYLAS_API_KEY is set${NC}"
    echo ""
fi

# Deploy functions
echo -e "${BLUE}📦 Deploying Edge Functions...${NC}"
echo ""

functions=("nylas-connect" "nylas-callback" "nylas-send-email" "nylas-sync-emails")

for func in "${functions[@]}"; do
    echo "Deploying $func..."
    if supabase functions deploy "$func"; then
        echo -e "${GREEN}✅ $func deployed${NC}"
    else
        echo -e "${RED}❌ Failed to deploy $func${NC}"
        exit 1
    fi
    echo ""
done

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Go to your ProSpaces CRM application"
echo "2. Navigate to Settings → Developer tab"
echo "3. Click 'Run Diagnostic Test' to verify deployment"
echo "4. Go to Email module and click 'Add Account'"
echo "5. Choose OAuth (Gmail) or IMAP/SMTP"
echo ""
echo "To view function logs:"
echo "  supabase functions logs nylas-connect --tail"
echo ""
echo "To verify deployment:"
echo "  supabase functions list"
echo ""
