#!/bin/bash

echo "🔧 Production User Sync Fix"
echo "=============================="
echo ""
echo "This script will:"
echo "1. Connect to your production database"
echo "2. Fetch all users from Clerk"
echo "3. Sync them to the database with proper names and avatars"
echo ""

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI detected"
    echo ""
    echo "Getting DATABASE_URL from Railway..."
    DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null)
    
    if [ -z "$DATABASE_URL" ]; then
        echo "⚠️  Could not get DATABASE_URL from Railway CLI"
        echo "Please enter it manually:"
        read -p "DATABASE_URL: " DATABASE_URL
    else
        echo "✅ Got DATABASE_URL from Railway"
    fi
else
    echo "⚠️  Railway CLI not found"
    echo ""
    echo "To get your DATABASE_URL:"
    echo "1. Go to https://railway.app/dashboard"
    echo "2. Open your project"
    echo "3. Go to Variables tab"
    echo "4. Copy the DATABASE_URL value"
    echo ""
    read -p "Paste DATABASE_URL here: " DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required"
    exit 1
fi

# Export environment variables
export DATABASE_URL="$DATABASE_URL"

# Check if CLERK_SECRET_KEY is set
if [ -z "$CLERK_SECRET_KEY" ]; then
    echo ""
    echo "CLERK_SECRET_KEY not found in environment"
    echo "Please enter it:"
    read -sp "CLERK_SECRET_KEY: " CLERK_SECRET_KEY
    echo ""
    export CLERK_SECRET_KEY="$CLERK_SECRET_KEY"
fi

echo ""
echo "🚀 Running sync script..."
echo ""

node diagnose-and-fix-production.js

echo ""
echo "✅ Done! Check the output above for results."
echo ""
echo "Next steps:"
echo "1. Visit your app: https://hangouts-production-adc4.up.railway.app"
echo "2. Sign in with Clerk"
echo "3. Your name and avatar should now appear"
echo "4. Events, hangouts, and discovery pages should now load data"

