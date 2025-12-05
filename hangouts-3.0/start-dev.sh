#!/bin/bash

# Hangouts 3.0 Development Setup Script
# This script sets up the environment for local development with PostgreSQL

echo "🚀 Setting up Hangouts 3.0 Development Environment..."

# Set environment variables for PostgreSQL (local development)
export DATABASE_URL="postgresql://richardwhite@localhost:5432/hangouts_dev"
export DIRECT_URL="postgresql://richardwhite@localhost:5432/hangouts_dev"
export NODE_ENV="development"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_Z2FtZS1wYW5nb2xpbi03Mi5jbGVyay5hY2NvdW50cy5kZXYk"
export CLERK_SECRET_KEY="sk_test_dTCC06GobHynWAAINGoIR8hFpm7vNwuaaYzcin0BOH"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_API_URL="http://localhost:3000"
export PORT=3000

echo "📊 Database URL: $DATABASE_URL"
echo "🔐 Clerk Key: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:0:20}..."

# Kill any existing Next.js processes
echo "🔄 Stopping existing processes..."
pkill -f "next dev" || true
sleep 2

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🔍 Testing database connection..."
npx prisma db pull --print || echo "⚠️ Database connection test failed, but continuing..."

# Start the development server
echo "🚀 Starting development server on port 3000..."
npm run dev