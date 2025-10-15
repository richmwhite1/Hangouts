#!/bin/bash

# Production Deployment Script for Railway
# This script prepares the application for production deployment

set -e

echo "🚀 Starting production deployment preparation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed or not in PATH"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please initialize git first."
    exit 1
fi

echo "📦 Installing production dependencies..."
npm ci --only=production

echo "🔧 Building application..."
npm run build:production

echo "🧹 Cleaning up development files..."
# Remove development files that shouldn't be in production
find . -name "*.log" -type f -delete
find . -name "*.tmp" -type f -delete
find . -name ".DS_Store" -type f -delete
rm -rf logs/*.log 2>/dev/null || true

echo "🔍 Running production checks..."
# Check if build was successful
if [ ! -d ".next" ]; then
    echo "❌ Error: Build failed. .next directory not found."
    exit 1
fi

# Check if essential files exist
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found."
    exit 1
fi

echo "📝 Creating production README..."
cat > PRODUCTION_README.md << EOF
# Hangouts 3.0 - Production Deployment

## Environment Variables Required

\`\`\`bash
# Database
DATABASE_URL=your_database_url

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app-url.railway.app
NEXT_PUBLIC_API_URL=https://your-app-url.railway.app

# Optional
REDIS_URL=your_redis_url
SENTRY_DSN=your_sentry_dsn
\`\`\`

## Railway Deployment

1. Connect your GitHub repository to Railway
2. Set the environment variables in Railway dashboard
3. Deploy automatically on push to main branch

## Features Included

✅ Rich Open Graph previews for social sharing
✅ Enhanced guest experience for non-authenticated users
✅ Production-optimized Next.js configuration
✅ Security headers and CORS configuration
✅ Comprehensive sharing functionality
✅ Calendar integration for all events
✅ Mobile-responsive design

## Performance Optimizations

- SWC minification enabled
- Compression enabled
- Static file caching
- Bundle optimization
- Security headers configured

## Monitoring

- Winston logging configured
- Error tracking ready (Sentry)
- Performance monitoring ready

## Support

For issues or questions, please check the logs in Railway dashboard.
EOF

echo "✅ Production deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review PRODUCTION_README.md for environment variables"
echo "2. Commit and push changes to Git"
echo "3. Deploy to Railway"
echo ""
echo "🔗 Railway deployment URL: https://hangouts-production-adc4.up.railway.app"
echo ""
echo "📊 Features ready for production:"
echo "  ✅ Rich social sharing with Open Graph"
echo "  ✅ Enhanced guest experience"
echo "  ✅ Production optimizations"
echo "  ✅ Security headers"
echo "  ✅ Calendar integration"
echo "  ✅ Mobile responsive design"
