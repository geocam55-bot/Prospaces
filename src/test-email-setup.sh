#!/bin/bash

# ProSpaces CRM - Email Setup Test Script
# Quick verification of email integration setup

echo ""
echo "🔍 ProSpaces CRM - Email Setup Checker"
echo "======================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check 1: Supabase CLI
echo -n "1. Supabase CLI installed... "
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "   Install: npm install -g supabase"
fi

# Check 2: Logged in
echo -n "2. Logged in to Supabase... "
if supabase projects list &> /dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "   Run: supabase login"
fi

# Check 3: Project linked
echo -n "3. Project linked... "
if [ -f ".supabase/config.toml" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "   Run: supabase link --project-ref usorqldwroecyxucmtuw"
fi

# Check 4: Nylas API key
echo -n "4. Nylas API key set... "
if supabase secrets list 2>&1 | grep -q "NYLAS_API_KEY"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${YELLOW}⚠️${NC}"
    echo "   Optional for IMAP, required for OAuth"
    echo "   Set: supabase secrets set NYLAS_API_KEY=your_key"
fi

# Check 5: Functions exist
echo -n "5. Function files exist... "
if [ -d "supabase/functions/nylas-connect" ] && [ -d "supabase/functions/nylas-callback" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "   Function files missing!"
fi

# Check 6: Functions deployed (if logged in)
if supabase projects list &> /dev/null; then
    echo -n "6. Functions deployed... "
    deployed=$(supabase functions list 2>&1)
    if echo "$deployed" | grep -q "nylas-connect"; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
        echo "   Run: ./deploy-email.sh"
    fi
fi

echo ""
echo "======================================="
echo ""

# Summary
if command -v supabase &> /dev/null && \
   supabase projects list &> /dev/null && \
   [ -f ".supabase/config.toml" ] && \
   supabase functions list 2>&1 | grep -q "nylas-connect"; then
    echo -e "${GREEN}🎉 All set! Email integration is active.${NC}"
    echo ""
    echo "Test it:"
    echo "  1. Go to Email module in your CRM"
    echo "  2. Click 'Add Account'"
    echo "  3. Try connecting with OAuth or IMAP"
else
    echo -e "${YELLOW}⚠️  Setup incomplete${NC}"
    echo ""
    echo "Quick fix:"
    echo "  Run: ./deploy-email.sh"
    echo ""
    echo "Or use IMAP/SMTP (works without deployment):"
    echo "  1. Go to Email module"
    echo "  2. Click 'Add Account' → IMAP/SMTP"
    echo "  3. Enter your email server settings"
fi

echo ""
