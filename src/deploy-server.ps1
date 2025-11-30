Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploying Server Function to Supabase" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with:" -ForegroundColor Yellow
    Write-Host "  scoop install supabase" -ForegroundColor Yellow
    Write-Host "  OR" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Supabase login status..."
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: supabase login" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Deploy the server function
Write-Host "Deploying server function..." -ForegroundColor Cyan
Write-Host ""

supabase functions deploy server

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "The Users API is now live!" -ForegroundColor Green
    Write-Host "Refresh your browser to see the changes." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "❌ Deployment Failed" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error above and try again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
