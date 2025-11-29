# ProSpaces CRM - Email Integration Deployment Script (Windows)
# This script deploys all Nylas Edge Functions to Supabase

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 ProSpaces CRM - Email Integration Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Supabase CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI first:"
    Write-Host ""
    Write-Host "Windows (PowerShell - Run as Admin):"
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    Write-Host "  scoop install supabase"
    Write-Host ""
    Write-Host "Or using npm:"
    Write-Host "  npm install -g supabase"
    exit 1
}

# Check if user is logged in
try {
    $null = supabase projects list 2>&1
    Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  Not logged in to Supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Logging in..."
    supabase login
    Write-Host ""
    Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
    Write-Host ""
}

# Project reference
$PROJECT_REF = "usorqldwroecyxucmtuw"

# Check if project is linked
if (!(Test-Path ".supabase/config.toml")) {
    Write-Host "⚠️  Project not linked" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Linking to project: $PROJECT_REF"
    supabase link --project-ref $PROJECT_REF
    Write-Host ""
}

Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

# Check for Nylas API key
Write-Host "🔑 Checking Nylas API Key..." -ForegroundColor Blue
$secrets = supabase secrets list 2>&1 | Out-String

if (!($secrets -match "NYLAS_API_KEY")) {
    Write-Host "⚠️  NYLAS_API_KEY not set" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You need a Nylas API key to enable email integration."
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  1. Get a free Nylas account at https://nylas.com"
    Write-Host "  2. Use IMAP/SMTP instead (no Nylas needed)"
    Write-Host ""
    
    $hasKey = Read-Host "Do you have a Nylas API key? (y/n)"
    
    if ($hasKey -eq "y" -or $hasKey -eq "Y") {
        $nylasKey = Read-Host "Enter your Nylas API key"
        Write-Host ""
        Write-Host "Setting NYLAS_API_KEY secret..."
        supabase secrets set "NYLAS_API_KEY=$nylasKey"
        Write-Host "✅ API key set" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "⚠️  Skipping Nylas API key setup" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Note: You can still deploy the functions and use IMAP/SMTP."
        Write-Host "OAuth (Gmail/Outlook) won't work without a Nylas API key."
        Write-Host ""
        
        $continueDeploy = Read-Host "Continue deployment without Nylas? (y/n)"
        
        if ($continueDeploy -ne "y" -and $continueDeploy -ne "Y") {
            Write-Host "Deployment cancelled."
            exit 0
        }
    }
} else {
    Write-Host "✅ NYLAS_API_KEY is set" -ForegroundColor Green
    Write-Host ""
}

# Deploy functions
Write-Host "📦 Deploying Edge Functions..." -ForegroundColor Blue
Write-Host ""

$functions = @("nylas-connect", "nylas-callback", "nylas-send-email", "nylas-sync-emails")

foreach ($func in $functions) {
    Write-Host "Deploying $func..."
    
    try {
        supabase functions deploy $func
        Write-Host "✅ $func deployed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "1. Go to your ProSpaces CRM application"
Write-Host "2. Navigate to Settings → Developer tab"
Write-Host "3. Click 'Run Diagnostic Test' to verify deployment"
Write-Host "4. Go to Email module and click 'Add Account'"
Write-Host "5. Choose OAuth (Gmail) or IMAP/SMTP"
Write-Host ""
Write-Host "To view function logs:"
Write-Host "  supabase functions logs nylas-connect --tail"
Write-Host ""
Write-Host "To verify deployment:"
Write-Host "  supabase functions list"
Write-Host ""
