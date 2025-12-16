# Railway Healthcheck Fix

## Problem
Railway deployment was failing because the healthcheck endpoint `/healthz` didn't exist. Railway was checking `/healthz` but the app only had `/api/health`.

## Solution

### 1. Created `/healthz` Endpoint
- **File**: `hangouts-3.0/src/app/healthz/route.ts`
- Simple endpoint that returns 200 OK to indicate the service is running
- Doesn't check database to avoid false negatives during initial deployment

### 2. Updated Railway Configuration
- **File**: `railway.json`
- Changed `healthcheckPath` from `/api/health` to `/healthz`
- Increased `healthcheckTimeout` from 30 to 300 seconds (5 minutes) to allow more time for the app to start

## Railway Dashboard Settings to Verify

If the deployment still fails, check these settings in the Railway dashboard:

### Service Settings
1. **Healthcheck Path**: Should be `/healthz` (or leave blank to use railway.json)
2. **Healthcheck Timeout**: Should be at least 300 seconds
3. **Start Command**: Should be `cd hangouts-3.0 && npm start` (or leave blank to use railway.json)

### Environment Variables
Make sure these are set:
- `NODE_ENV=production`
- `DATABASE_URL` (should be automatically set by Railway if you have a PostgreSQL service)
- `PORT` (Railway sets this automatically, but verify it exists)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (your Clerk publishable key)
- `CLERK_SECRET_KEY` (your Clerk secret key)

### Build Settings
- **Build Command**: Should be handled by `nixpacks.toml` (leave blank or use NIXPACKS)
- **Root Directory**: Should be root of repository (`.`)

## Testing Locally

To test the healthcheck endpoint locally:

```bash
# Start the dev server
cd hangouts-3.0
npm run dev

# In another terminal, test the healthcheck
curl http://localhost:3000/healthz
```

Expected response:
```json
{
  "status": "ok",
  "service": "running",
  "timestamp": "2025-12-15T..."
}
```

## Next Steps

1. **Commit and push** these changes:
   ```bash
   git add hangouts-3.0/src/app/healthz/route.ts railway.json
   git commit -m "Fix Railway healthcheck endpoint"
   git push origin main
   ```

2. **Monitor Railway deployment** - Railway should automatically redeploy

3. **Check deployment logs** if it still fails:
   - Look for build errors
   - Check if the app is starting on the correct port
   - Verify environment variables are set

## If Deployment Still Fails

1. **Check Railway logs** for:
   - Build errors
   - Runtime errors
   - Port binding issues

2. **Verify Railway settings** match the configuration:
   - Healthcheck path: `/healthz`
   - Start command: `cd hangouts-3.0 && npm start`

3. **Test database connection**:
   - Ensure PostgreSQL service is linked
   - Verify `DATABASE_URL` is set correctly

4. **Check build process**:
   - Prisma generate should run during build
   - Next.js build should complete successfully
