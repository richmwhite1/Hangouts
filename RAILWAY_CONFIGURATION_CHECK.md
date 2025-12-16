# Railway Configuration Verification

## ✅ What You've Done Correctly

1. **Added `NODE_ENV=production`** - ✅ Correct! This is required for production
2. **Added `PORT`** - ✅ Good! Railway usually sets this automatically, but setting it manually ensures it's correct
3. **Saw "main" in Connected Services** - ✅ This is likely your database service (Railway allows custom names)

## 🔍 Verification Steps

### Step 1: Verify "main" is Your Database

1. In your Railway project, click on the service named **"main"**
2. Check the service type - it should say **"PostgreSQL"** or **"Database"**
3. If it's a PostgreSQL database, you're all set!

### Step 2: Verify DATABASE_URL is Set

1. Go to your **app service** (not "main")
2. Click on **"Variables"** tab
3. Look for `DATABASE_URL` in the list
4. **Click on `DATABASE_URL`** to see its value
5. It should look like:
   ```
   postgresql://postgres:password@hostname:port/railway
   ```
6. **Important:** It MUST start with `postgresql://` or `postgres://`

### Step 3: If DATABASE_URL is Missing or Wrong

If `DATABASE_URL` is missing or doesn't start with `postgresql://`:

1. Go to your **app service** → **"Settings"** → **"Connected Services"**
2. Make sure **"main"** (or your database service) is listed
3. If it's not listed:
   - Click **"Connect Service"**
   - Select your database service (probably "main")
4. Railway should automatically add `DATABASE_URL` after connecting

### Step 4: Verify All Required Variables

In your app service → **"Variables"** tab, you should have:

| Variable | Status | Notes |
|----------|--------|-------|
| `DATABASE_URL` | ✅ Should exist | Auto-set by Railway, starts with `postgresql://` |
| `NODE_ENV` | ✅ You added | Should be `production` |
| `PORT` | ✅ You added | Can be `3000`, `8080`, or Railway's default |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ⚠️ Check | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | ⚠️ Check | Your Clerk secret key |

## 🚀 Next Steps

1. **Verify DATABASE_URL format:**
   - If it exists and starts with `postgresql://`, you're good!
   - If it's missing or wrong format, reconnect the database service

2. **Redeploy:**
   - Railway should auto-redeploy after variable changes
   - Or manually trigger: App service → Deployments → Redeploy

3. **Test:**
   - After redeploy, try creating a hangout
   - The "DATABASE_URL" error should be gone

## ❓ Common Questions

**Q: Is "main" the right database service?**  
A: Yes, if it's a PostgreSQL database. Railway allows custom service names. Check that it shows "PostgreSQL" as the type.

**Q: Should I set PORT manually?**  
A: It's fine either way. Railway usually sets it automatically, but setting it manually ensures it's correct. Common values: `3000` or `8080`.

**Q: What if DATABASE_URL is still missing?**  
A: Make sure the database service ("main") is connected to your app service. Go to app service → Settings → Connected Services and verify "main" is listed.

**Q: What PORT should I use?**  
A: Railway will set a PORT automatically, but you can override it. The app uses `process.env.PORT || 8080`, so either value works. Check your `package.json` start script to see what it defaults to.
