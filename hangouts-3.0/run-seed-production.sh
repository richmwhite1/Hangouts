#!/bin/bash

# Script to seed December & January events in production database
# This script helps you run the seed script with the production DATABASE_URL

echo "🌱 December & January Events Seeder for Production"
echo "=================================================="
echo ""

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
    echo ""
    echo "Option 1: Using Railway CLI (Recommended)"
    echo "  This will automatically use your production DATABASE_URL"
    echo ""
    read -p "Do you want to use Railway CLI? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Running seed script via Railway CLI..."
        railway run node seed-december-january-events.js
        exit $?
    fi
fi

# Option 2: Manual DATABASE_URL
echo ""
echo "Option 2: Using DATABASE_URL environment variable"
echo ""
echo "To get your DATABASE_URL:"
echo "1. Go to Railway Dashboard: https://railway.app"
echo "2. Select your project"
echo "3. Click on PostgreSQL database service"
echo "4. Go to 'Variables' tab"
echo "5. Copy the DATABASE_URL value"
echo ""
read -p "Enter your DATABASE_URL (or press Enter to exit): " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required. Exiting."
    exit 1
fi

echo ""
echo "🚀 Running seed script with provided DATABASE_URL..."
export DATABASE_URL
node seed-december-january-events.js




