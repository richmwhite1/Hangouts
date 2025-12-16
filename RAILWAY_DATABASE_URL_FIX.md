# Railway DATABASE_URL Configuration Fix

## Problem
Production deployment is failing with error:
```
the URL must start with the protocol `postgresql://` or `postgres://`
```

This means `DATABASE_URL` in Railway is either:
1. Not set
2. Set to an empty string
3. Set to an invalid format

## Solution

### Step 1: Verify PostgreSQL Service is Linked

1. Go to your Railway project dashboard
2. Check if you have a **PostgreSQL** service
3. If you don't have one:
   - Click **"New"** → **"Database"** → **"Add PostgreSQL"**
   - Railway will automatically create a PostgreSQL database

### Step 2: Link PostgreSQL to Your App Service

1. In your Railway project, you should see:
   - Your app service (e.g., "hangouts-3.0" or "web")
   - Your PostgreSQL service (e.g., "Postgres")

2. **Link the services:**
   - Click on your **app service**
   - Go to the **"Variables"** tab
   - Look for `DATABASE_URL` in the list
   - If it's not there, Railway should automatically add it when services are linked
   - If it exists but is empty or wrong, delete it and Railway will recreate it

3. **Verify the link:**
   - In your app service, go to **"Settings"** → **"Connected Services"**
   - You should see your database service listed (it might be named "Postgres", "PostgreSQL", "main", or another custom name)
   - **Note:** Railway allows custom service names, so "main" is fine if that's what you named your database service
   - If no database service is listed, click **"Connect Service"** and select your database service
   - **To verify it's PostgreSQL:** Click on the connected service and check that it shows "PostgreSQL" as the database type

### Step 3: Verify DATABASE_URL Format

The `DATABASE_URL` should look like:
```
postgresql://postgres:password@hostname:port/railway
```

**Important:** It MUST start with `postgresql://` or `postgres://`

### Step 4: Check Environment Variables

In your Railway app service:

1. Go to **"Variables"** tab
2. Verify these variables exist:
   - `DATABASE_URL` - Should be automatically set by Railway when database is linked (starts with `postgresql://`)
     - **Important:** If you see `DATABASE_URL`, click on it to verify it starts with `postgresql://` or `postgres://`
     - If it's missing or empty, the database service might not be properly linked
   - `NODE_ENV=production` - **You added this, which is correct!**
   - `PORT` - Railway usually sets this automatically, but it's fine to set it manually (e.g., `PORT=3000` or `PORT=8080`)
     - **You added this, which is good!** The app will use whatever PORT is set
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
   - `CLERK_SECRET_KEY` - Your Clerk secret key

### Step 5: Redeploy

After fixing the database connection:

1. Railway should automatically redeploy
2. Or manually trigger a redeploy:
   - Go to your app service
   - Click **"Deployments"** tab
   - Click **"Redeploy"** on the latest deployment

## Troubleshooting

### If DATABASE_URL is still not set:

1. **Unlink and relink the database:**
   - In your app service → Settings → Connected Services
   - Disconnect the PostgreSQL service
   - Reconnect it

2. **Check Railway logs:**
   - Go to your app service → "Deployments" → Latest deployment → "Logs"
   - Look for database connection errors

3. **Verify PostgreSQL service is running:**
   - Go to your PostgreSQL service
   - Check that it shows "Active" status
   - If not, restart it

### If DATABASE_URL format is wrong:

1. **Don't manually set DATABASE_URL** - Railway should set it automatically
2. If you manually set it, delete it and let Railway recreate it
3. Make sure you're linking to a PostgreSQL service, not another database type

### If you see "User not found in database":

This is now fixed! The app will automatically create users when they first try to:
- Create a hangout
- Upload an image
- Perform any authenticated action

The error should no longer appear after fixing the DATABASE_URL issue.

## Verification

After fixing, test by:

1. **Check health endpoint:**
   ```
   curl https://your-app.railway.app/healthz
   ```
   Should return: `{"status":"ok","service":"running",...}`

2. **Check database health:**
   ```
   curl https://your-app.railway.app/api/health/db
   ```
   Should return: `{"status":"healthy","database":"connected",...}`

3. **Try creating a hangout:**
   - Sign in to your app
   - Try to create a new hangout
   - Should work without "User not found" or "DATABASE_URL" errors

## Code Changes Made

The following improvements were made to handle database issues better:

1. **Upload endpoint** (`src/app/api/upload/route.ts`):
   - Now automatically creates users if they don't exist
   - Better error messages for database configuration issues

2. **Database client** (`src/lib/db.ts`):
   - Better validation of DATABASE_URL format
   - Production-specific error messages
   - Clearer guidance on what to check in Railway

3. **Hangouts endpoint** (`src/app/api/hangouts/route.ts`):
   - Improved error messages for production vs development
   - Better guidance on Railway configuration
