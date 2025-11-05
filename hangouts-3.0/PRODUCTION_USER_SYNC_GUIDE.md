# Production User Sync Guide

## Problem
Users sign in with Clerk but:
- Top right shows generic "User" instead of name and picture
- Profile page is empty
- No events, hangouts, or content loading

## Root Cause
When users authenticate with Clerk, their user record must be created in the database. This should happen automatically via:
1. **Clerk Webhooks** (preferred) - when user.created event fires
2. **Auto-sync on first API call** - `getClerkApiUser()` creates user if not found
3. **Manual sync** - running sync script

**The issue**: Either webhooks aren't configured properly OR there's a database connection issue preventing auto-creation.

## Solution: Sync All Clerk Users to Production Database

### Method 1: Automated Script (Recommended)

Run this command:
```bash
./fix-production-users.sh
```

The script will:
- Prompt you for production DATABASE_URL (or get it from Railway CLI)
- Fetch all users from Clerk
- Create/update them in the production database
- Show a summary of changes

### Method 2: Manual via Railway CLI

```bash
# Install Railway CLI if you don't have it
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run the sync script with production env
railway run node diagnose-and-fix-production.js
```

### Method 3: Get DATABASE_URL and Run Locally

1. Get your production DATABASE_URL:
   - Go to https://railway.app/dashboard
   - Open your Hangouts project
   - Click on "Variables"
   - Copy the `DATABASE_URL` value (starts with `postgresql://`)

2. Run the sync script:
```bash
DATABASE_URL="postgresql://..." CLERK_SECRET_KEY="sk_live_..." node diagnose-and-fix-production.js
```

## What the Script Does

1. ✅ Tests database connection
2. ✅ Checks User table schema
3. ✅ Lists current users in database
4. ✅ Fetches all users from Clerk
5. ✅ For each Clerk user:
   - Finds existing user by clerkId or email
   - Updates existing user with Clerk data
   - OR creates new user with unique username
6. ✅ Verifies all users have clerkIds
7. ✅ Shows summary of changes

## Expected Output

```
🔍 Starting Production Diagnosis...

1️⃣  Testing database connection...
   ✅ Database connection successful

2️⃣  Checking User table schema...
   ✅ User table has 25 columns
   ✅ All required fields present

3️⃣  Checking existing users in database...
   📊 Found 6 users in database
   📊 2 have Clerk IDs

4️⃣  Fetching users from Clerk...
   📊 Found 8 users in Clerk

5️⃣  Syncing Clerk users to database...

   Processing: richard@example.com (user_abc123)
     ✅ Updated (DB ID: user_1)
   Processing: shannon@example.com (user_xyz789)
     ✨ Created (DB ID: user_7, Username: shannon)
   ...

📊 Sync Summary:
   Total Clerk users: 8
   Created: 2
   Updated: 6
   Errors: 0

6️⃣  Verification...
   ✅ All 8 active users have Clerk IDs

✅ Diagnosis and sync complete!
```

## After Running the Script

1. **Visit your production app**: https://hangouts-production-adc4.up.railway.app
2. **Sign in with Clerk**
3. **Verify**:
   - ✅ Your name and avatar appear in top right
   - ✅ Profile page shows your information
   - ✅ Events page loads content
   - ✅ Discovery page loads content
   - ✅ Hangouts page loads content

## Long-term Fix: Configure Clerk Webhooks

To ensure new users are automatically synced in the future:

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Navigate to Webhooks**
3. **Create Endpoint**:
   - URL: `https://hangouts-production-adc4.up.railway.app/api/webhooks/clerk`
   - Events: Select `user.created`, `user.updated`, `user.deleted`
4. **Add Webhook Secret to Railway**:
   - Copy the signing secret from Clerk
   - In Railway, add environment variable:
     ```
     CLERK_WEBHOOK_SECRET=whsec_your_secret_here
     ```
5. **Redeploy** your Railway app

With webhooks configured, new users will be automatically synced when they sign up!

## Troubleshooting

### "Cannot connect to database"
- Verify DATABASE_URL is correct
- Check if Railway database is running
- Try running: `railway run psql $DATABASE_URL -c "SELECT 1"`

### "CLERK_SECRET_KEY not found"
- Make sure you're using the production key (starts with `sk_live_`)
- Get it from: https://dashboard.clerk.com → API Keys

### "User already exists with that username"
- The script automatically handles this by appending numbers
- This is normal and expected

### Still not working?
1. Check Railway logs: `railway logs`
2. Look for errors in: `/api/auth/me` endpoint
3. Verify Prisma schema has `clerkId` field
4. Run: `railway run npx prisma db push` to sync schema

## Key Files

- `src/lib/clerk-auth.ts` - Auto-sync logic in `getClerkApiUser()`
- `src/app/api/auth/me/route.ts` - User info endpoint
- `src/app/api/webhooks/clerk/route.ts` - Webhook handler
- `src/hooks/use-profile.ts` - Frontend profile fetching
- `src/components/navigation.tsx` - Where user name/avatar displayed

