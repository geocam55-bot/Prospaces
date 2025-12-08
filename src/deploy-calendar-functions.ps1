# PowerShell script to deploy Calendar Sync Edge Functions

Write-Host "🚀 Deploying ProSpaces CRM Calendar Sync Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

Write-Host "✅ Supabase CLI ready" -ForegroundColor Green
Write-Host ""

# Deploy calendar-oauth-init function
Write-Host "📤 Deploying calendar-oauth-init..." -ForegroundColor Yellow
supabase functions deploy calendar-oauth-init --no-verify-jwt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ calendar-oauth-init deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy calendar-oauth-init" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Deploy calendar-oauth-callback function
Write-Host "📤 Deploying calendar-oauth-callback..." -ForegroundColor Yellow
supabase functions deploy calendar-oauth-callback --no-verify-jwt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ calendar-oauth-callback deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy calendar-oauth-callback" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Deploy calendar-sync function
Write-Host "📤 Deploying calendar-sync..." -ForegroundColor Yellow
supabase functions deploy calendar-sync
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ calendar-sync deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy calendar-sync" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "🎉 All calendar sync Edge Functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Add OAuth credentials to Supabase Dashboard → Edge Functions → Secrets"
Write-Host "2. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
Write-Host "3. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET"
Write-Host "4. Set CALENDAR_REDIRECT_URI=https://pro-spaces.vercel.app/auth/callback"
Write-Host ""
Write-Host "📖 See CALENDAR_OAUTH_PRODUCTION_SETUP.md for detailed instructions" -ForegroundColor Cyan
