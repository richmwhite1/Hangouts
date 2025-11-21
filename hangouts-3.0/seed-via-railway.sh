#!/bin/bash

# Script to seed December & January events using Railway CLI
# This script helps you link the service and run the seed script

echo "🌱 December & January Events Seeder via Railway CLI"
echo "=================================================="
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if project is linked
if ! railway status &> /dev/null; then
    echo "⚠️  Project not linked. Please run: railway link"
    exit 1
fi

echo "📋 Current Railway status:"
railway status
echo ""

# Check if service is linked
SERVICE_LINKED=$(railway status 2>&1 | grep -i "Service:" | grep -v "None")
if [ -z "$SERVICE_LINKED" ]; then
    echo "⚠️  No service linked. You need to link a service to get DATABASE_URL."
    echo ""
    echo "To link a service, run:"
    echo "   railway service"
    echo ""
    echo "Then select your app service (the one that has DATABASE_URL)"
    echo ""
    echo "After linking, run this script again:"
    echo "   ./seed-via-railway.sh"
    exit 1
fi

echo "✅ Service linked"
echo ""
echo "🚀 Running seed script via Railway..."
echo ""

# Run the seed script via Railway
railway run node seed-december-january-events.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Seed script completed successfully!"
    echo "🎉 Check https://plans.up.railway.app/ to see your new events!"
else
    echo ""
    echo "❌ Seed script failed. Check the error messages above."
    exit 1
fi




