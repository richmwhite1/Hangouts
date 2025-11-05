#!/bin/bash
# Fix dev server static files issue

echo "🔧 Fixing dev server..."

cd "$(dirname "$0")"

# Kill any running Node processes
echo "🛑 Stopping any running servers..."
pkill -f "next dev" || true
sleep 2

# Remove build cache
echo "🗑️  Removing build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Cache cleared. Now run: npm run dev"

