#!/bin/bash

# Production Database Cleanup Script
# This script safely cleans up broken and draft content from production database

set -e

echo "🚨 PRODUCTION DATABASE CLEANUP SCRIPT"
echo "======================================"
echo ""

# Check if we're in production
if [[ "$NODE_ENV" != "production" ]]; then
    echo "❌ This script should only be run in production environment!"
    echo "Set NODE_ENV=production and ensure DATABASE_URL points to production database."
    exit 1
fi

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ DATABASE_URL environment variable is not set!"
    exit 1
fi

echo "📊 STEP 1: Analyzing current database state..."
echo "==============================================="

# Create a backup reminder
echo "⚠️  IMPORTANT: Make sure you have a recent database backup before proceeding!"
echo ""
read -p "Have you backed up the production database? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Please backup the database first, then run this script again."
    exit 1
fi

echo ""
echo "🔍 STEP 2: Running analysis (REPORT_ONLY mode)..."
echo "=================================================="

# First run in report-only mode to show what would be deleted
echo "Running cleanup-broken-content.js in REPORT_ONLY mode..."
REPORT_ONLY=true node scripts/cleanup-broken-content.js

echo ""
echo "Running cleanup-draft-content.js in REPORT_ONLY mode..."
REPORT_ONLY=true node scripts/cleanup-draft-content.js

echo ""
echo "📋 STEP 3: Review the analysis above"
echo "====================================="
echo "Review the output above carefully. This shows what will be permanently deleted."
echo ""
read -p "Do you want to proceed with the actual cleanup? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "ℹ️  Cleanup cancelled. No changes were made."
    exit 0
fi

echo ""
echo "🗑️  STEP 4: Executing cleanup..."
echo "================================"

# Run the actual cleanup
echo "Running cleanup-broken-content.js..."
FORCE_DELETE=true node scripts/cleanup-broken-content.js

echo ""
echo "Running cleanup-draft-content.js..."
FORCE_DELETE=true node scripts/cleanup-draft-content.js

echo ""
echo "✅ STEP 5: Cleanup completed!"
echo "=============================="
echo "The following changes were made to production:"
echo "- Deleted all broken/incomplete content records"
echo "- Deleted all draft/archived/deleted content records"
echo "- Cleaned up related records (RSVPs, participants, comments, etc.)"
echo ""
echo "Next steps:"
echo "1. Test the application to ensure everything works correctly"
echo "2. Monitor for any issues in the coming hours"
echo "3. Consider running the updated discover and feed APIs"
echo ""
echo "🎉 Production cleanup completed successfully!"


