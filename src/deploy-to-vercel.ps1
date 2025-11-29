# ProSpaces CRM - Quick Deploy to Vercel Script (Windows PowerShell)
# This script helps you deploy your app to Vercel quickly

Write-Host "🚀 ProSpaces CRM - Vercel Deployment Script" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found!" -ForegroundColor Red
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
    Write-Host ""
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
    } else {
        Write-Host "Note: Please create .env file manually" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "🔐 Logging into Vercel..." -ForegroundColor Cyan
vercel login

Write-Host ""
Write-Host "📦 Starting deployment..." -ForegroundColor Cyan
Write-Host ""

# Deploy to preview
Write-Host "Deploying to preview environment..." -ForegroundColor Yellow
vercel

Write-Host ""
Write-Host "✅ Preview deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Now let's add environment variables..." -ForegroundColor Cyan
Write-Host ""

# Prompt for environment variables
$addEnv = Read-Host "Do you want to add environment variables now? (y/n)"

if ($addEnv -eq "y") {
    Write-Host ""
    Write-Host "Adding VITE_SUPABASE_PROJECT_ID..." -ForegroundColor Yellow
    Write-Host "Default: usorqldwroecyxucmtuw" -ForegroundColor Gray
    vercel env add VITE_SUPABASE_PROJECT_ID
    
    Write-Host ""
    Write-Host "Adding VITE_SUPABASE_ANON_KEY..." -ForegroundColor Yellow
    vercel env add VITE_SUPABASE_ANON_KEY
    
    Write-Host ""
    Write-Host "Adding VITE_SUPABASE_URL..." -ForegroundColor Yellow
    Write-Host "Default: https://usorqldwroecyxucmtuw.supabase.co" -ForegroundColor Gray
    vercel env add VITE_SUPABASE_URL
    
    Write-Host ""
    Write-Host "✅ Environment variables added!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Ready to deploy to production?" -ForegroundColor Cyan
Write-Host "This will make your app live at your production URL." -ForegroundColor Yellow
$deployProd = Read-Host "Deploy to production? (y/n)"

if ($deployProd -eq "y") {
    Write-Host ""
    Write-Host "🌍 Deploying to production..." -ForegroundColor Yellow
    vercel --prod
    Write-Host ""
    Write-Host "🎉 Production deployment complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ℹ️  Skipping production deployment." -ForegroundColor Yellow
    Write-Host "Run 'vercel --prod' when you're ready to deploy to production." -ForegroundColor Gray
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment script complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit your Vercel dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Update Supabase Auth URLs with your Vercel URL" -ForegroundColor White
Write-Host "3. Test your deployed application" -ForegroundColor White
Write-Host ""
Write-Host "📚 Full guide: See VERCEL_DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
