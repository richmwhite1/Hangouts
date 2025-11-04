#!/bin/bash
set -e

echo "🚀 Preparing for Railway deployment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Add all changes
echo "📦 Staging changes..."
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
  echo "✅ No changes to commit"
else
  echo "📝 Committing changes..."
  git commit -m "Production ready: Fix profile page, replace Joined with Events stat, fix stats API, remove unused imports"
fi

# Push to main branch
echo "🚀 Pushing to Git for Railway deployment..."
git push origin main

echo "✅ Deployment initiated on Railway!"


