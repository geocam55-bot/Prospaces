#!/bin/bash

# ProSpaces CRM - Quick Deploy to Vercel Script
# This script helps you deploy your app to Vercel quickly

set -e

echo "🚀 ProSpaces CRM - Vercel Deployment Script"
echo "==========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found!"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed!"
    echo ""
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating .env file from template..."
    cp .env.example .env 2>/dev/null || echo "Note: Please create .env file manually"
    echo ""
fi

echo "🔐 Logging into Vercel..."
vercel login

echo ""
echo "📦 Starting deployment..."
echo ""

# Deploy to preview
echo "Deploying to preview environment..."
vercel

echo ""
echo "✅ Preview deployment complete!"
echo ""
echo "📝 Now let's add environment variables..."
echo ""

# Prompt for environment variables
echo "Do you want to add environment variables now? (y/n)"
read -r add_env

if [ "$add_env" = "y" ]; then
    echo ""
    echo "Adding VITE_SUPABASE_PROJECT_ID..."
    echo "Default: usorqldwroecyxucmtuw"
    vercel env add VITE_SUPABASE_PROJECT_ID
    
    echo ""
    echo "Adding VITE_SUPABASE_ANON_KEY..."
    vercel env add VITE_SUPABASE_ANON_KEY
    
    echo ""
    echo "Adding VITE_SUPABASE_URL..."
    echo "Default: https://usorqldwroecyxucmtuw.supabase.co"
    vercel env add VITE_SUPABASE_URL
    
    echo ""
    echo "✅ Environment variables added!"
fi

echo ""
echo "🚀 Ready to deploy to production?"
echo "This will make your app live at your production URL."
echo "Deploy to production? (y/n)"
read -r deploy_prod

if [ "$deploy_prod" = "y" ]; then
    echo ""
    echo "🌍 Deploying to production..."
    vercel --prod
    echo ""
    echo "🎉 Production deployment complete!"
else
    echo ""
    echo "ℹ️  Skipping production deployment."
    echo "Run 'vercel --prod' when you're ready to deploy to production."
fi

echo ""
echo "==========================================="
echo "✅ Deployment script complete!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your Vercel dashboard: https://vercel.com/dashboard"
echo "2. Update Supabase Auth URLs with your Vercel URL"
echo "3. Test your deployed application"
echo ""
echo "📚 Full guide: See VERCEL_DEPLOYMENT_GUIDE.md"
echo "==========================================="
