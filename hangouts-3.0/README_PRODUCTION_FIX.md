# Production Issue: Users Not Showing Up

## The Problem

You reported that in production:
1. ✅ Users CAN sign in with Clerk
2. ❌ Top right shows generic "User" instead of name and picture
3. ❌ Profile page doesn't show anything
4. ❌ Nothing loading on events, discovery, or hangouts pages

## Root Cause Analysis

### The Flow (How It Should Work)
```
User signs in → Clerk authenticates → App creates user in database → User data displays
```

### What's Happening
```
User signs in → Clerk authenticates → ⚠️ User NOT created in database → No data displays
```

### Why Users Aren't Being Created

The app tries to create users automatically in 3 ways:

1. **Clerk Webhooks** (`/api/webhooks/clerk`)
   - Requires: `CLERK_WEBHOOK_SECRET` environment variable
   - Status: Likely not configured or webhook not set up in Clerk dashboard

2. **Auto-sync on API calls** (`getClerkApiUser()` function)
   - Triggers when user makes any API call
   - Status: May be failing silently due to:
     - Database connection issues
     - Schema mismatch (missing `clerkId` field)
     - Validation errors

3. **Manual sync** (what we're about to do)
   - Uses sync script to force create all users
   - Status: This is our fix!

## The Fix (Step by Step)

### Step 1: Check Current State

Run this to see what's in your production database:
```bash
# Get your production DATABASE_URL from Railway
railway login
railway link  # Select your Hangouts project

# Check content
railway run node check-production-content.js
```

This will show you:
- How many users exist
- How many have Clerk IDs
- What content (hangouts/events) exists
- What's public vs private

### Step 2: Sync Clerk Users

Run the automated fix script:
```bash
./fix-production-users.sh
```

**What it does:**
- Connects to your production database
- Fetches ALL users from Clerk (everyone who has signed up)
- For each Clerk user:
  - Creates them in the database if they don't exist
  - Updates their info if they do exist
  - Sets proper name, avatar, email from Clerk
- Shows you a summary of changes

**You'll need:**
- Production `DATABASE_URL` (script can get from Railway CLI)
- `CLERK_SECRET_KEY` (get from Clerk dashboard)

### Step 3: Verify It Worked

1. Visit your app: https://hangouts-production-adc4.up.railway.app
2. Sign in with Clerk
3. Check:
   - ✅ Your name and avatar appear in top right
   - ✅ Profile page shows your info
   - ✅ Pages load content

### Step 4: Fix for the Future (Configure Webhooks)

To ensure new users are automatically synced going forward:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your production instance
3. Go to "Webhooks" → "Add Endpoint"
4. Configure:
   - **Endpoint URL**: `https://hangouts-production-adc4.up.railway.app/api/webhooks/clerk`
   - **Events**: Select:
     - ✅ `user.created`
     - ✅ `user.updated`
     - ✅ `user.deleted`
5. Copy the "Signing Secret" (starts with `whsec_`)
6. Add to Railway environment variables:
   ```
   CLERK_WEBHOOK_SECRET=whsec_your_secret_here
   ```
7. Redeploy your app in Railway

Now when users sign up, Clerk will notify your app and users will be automatically created!

## Why Events/Discovery/Hangouts Are Empty

Even after syncing users, you might still see empty pages because:

1. **No Content Created Yet**
   - Users need to actually create hangouts/events
   - OR you need to seed sample content

2. **Content Isn't Public**
   - If content is PRIVATE or FRIENDS_ONLY, it won't show on discovery
   - Make sure some content has `privacyLevel: 'PUBLIC'`

3. **Creator IDs Don't Match**
   - Content might have been created before users were synced
   - Creator IDs might not match any real users

To check this, run:
```bash
railway run node check-production-content.js
```

## Quick Commands Reference

```bash
# Check what's in the database
railway run node check-production-content.js

# Sync all Clerk users
./fix-production-users.sh

# Or do it manually
railway run node diagnose-and-fix-production.js

# Check Railway logs for errors
railway logs

# Connect to production database
railway run psql $DATABASE_URL
```

## Files Involved

### Backend (Server-Side)
- `src/lib/clerk-auth.ts` → `getClerkApiUser()` function that auto-creates users
- `src/app/api/auth/me/route.ts` → Returns current user info
- `src/app/api/webhooks/clerk/route.ts` → Handles Clerk webhook events
- `src/lib/db.ts` → Database connection logic

### Frontend (Client-Side)
- `src/hooks/use-profile.ts` → Fetches user profile data
- `src/components/navigation.tsx` → Displays user name/avatar in top right
- `src/app/page.tsx` → Homepage that should show content

### Database
- `prisma/schema.prisma` → User model (must have `clerkId` field)
- Production PostgreSQL on Railway

## Still Having Issues?

If after running the sync script you still see problems:

1. **Check Railway Logs**
   ```bash
   railway logs --follow
   ```
   Look for errors in `/api/auth/me` or `/api/feed-simple`

2. **Verify Prisma Schema**
   ```bash
   railway run npx prisma db push
   ```
   This ensures the database schema matches your code

3. **Test Specific Endpoints**
   ```bash
   # Test auth endpoint
   curl https://hangouts-production-adc4.up.railway.app/api/health
   
   # Test public content
   curl https://hangouts-production-adc4.up.railway.app/api/public/content?limit=5
   ```

4. **Check Environment Variables**
   Make sure Railway has:
   - `DATABASE_URL` (PostgreSQL connection)
   - `CLERK_SECRET_KEY` (Clerk secret key)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Clerk publishable key)
   - `NODE_ENV=production`

## Questions?

If you're stuck, check:
- Railway deployment logs
- Browser console for frontend errors
- Network tab to see which API calls are failing

The most common issues are:
1. Users not in database → Run sync script
2. No content in database → Create some content or seed it
3. Database connection issues → Check `DATABASE_URL` and Railway database status

