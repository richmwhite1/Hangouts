# Railway DATABASE_URL Not Set - Critical Fix Needed

## ⚠️ CRITICAL ISSUE

Your production deployment is failing because `DATABASE_URL` is **NOT SET** in Railway.

The error message shows:
```
"Database not configured"
"DATABASE_URL environment variable is not set"
```

## 🔧 IMMEDIATE FIX REQUIRED

### Step 1: Verify Database Service Exists

1. Go to your Railway project dashboard
2. Look for a service named **"main"** (or similar)
3. Click on it
4. **Verify it's a PostgreSQL database** - it should say "PostgreSQL" or "Database"

### Step 2: Link Database to Your App Service

**This is the critical step that's missing:**

1. Go to your **app service** (the one that's running your code, not "main")
2. Click **"Settings"** tab
3. Scroll down to **"Connected Services"** section
4. **Check if "main" (or your database service) is listed**
5. **If it's NOT listed:**
   - Click **"Connect Service"** button
   - Select your database service (probably "main")
   - Railway will automatically add `DATABASE_URL` after connecting

### Step 3: Verify DATABASE_URL is Set

1. In your **app service**, go to **"Variables"** tab
2. Look for `DATABASE_URL` in the list
3. **If it's missing:**
   - The database service is not properly linked
   - Go back to Step 2 and connect the services
4. **If it exists:**
   - Click on it to see its value
   - It should start with `postgresql://` or `postgres://`
   - If it's empty or wrong, unlink and relink the database service

### Step 4: Redeploy

After linking the database service:

1. Railway should automatically redeploy
2. Or manually trigger: App service → Deployments → Redeploy

## 🎯 Quick Checklist

- [ ] Database service exists in Railway (probably named "main")
- [ ] Database service is a PostgreSQL database
- [ ] Database service is **connected** to your app service
- [ ] `DATABASE_URL` appears in app service Variables tab
- [ ] `DATABASE_URL` starts with `postgresql://` or `postgres://`
- [ ] App service has been redeployed after linking

## ❓ Why This Happens

Railway requires you to **explicitly link** the database service to your app service. Just having both services in the same project isn't enough - they must be **connected**.

When you connect them:
- Railway automatically creates `DATABASE_URL` environment variable
- The variable contains the connection string to your PostgreSQL database
- Your app can then connect to the database

## 🔍 How to Verify It's Fixed

After linking and redeploying:

1. Try creating a hangout again
2. The "Database not configured" error should be gone
3. Check Railway logs - should see successful database connections
4. Visit `https://plans.up.railway.app/api/health/db` - should return `{"status":"healthy","database":"connected"}`

## 📝 Note

The error message has been updated to be more helpful for production, but the real fix is **linking the database service to your app service in Railway**.
