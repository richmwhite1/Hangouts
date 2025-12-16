# Railway Nixpacks Build Error Fix

## Problem
Railway is using Nixpacks correctly, but then trying to load a Dockerfile and failing with:
```
Build Failed: build daemon returned an error < failed to solve: dockerfile parse error on line 12: ENV names can not be blank >
```

## Root Cause
The `[variables]` section in `nixpacks.toml` might be causing Railway to generate an invalid Dockerfile internally. Railway converts Nixpacks configuration to a Dockerfile, and the variables section might be creating a malformed ENV statement.

## Solution Applied

### Fixed nixpacks.toml
Removed the `[variables]` section since `NODE_ENV=production` is already set in the build command:

**Before:**
```toml
[phases.build]
cmds = [
  "cd hangouts-3.0 && npx prisma generate --schema=./prisma/schema.prisma",
  "cd hangouts-3.0 && NODE_ENV=production npm run build"
]

[variables]
NODE_ENV = "production"  # ← This was causing the issue

[start]
cmd = "cd hangouts-3.0 && npm start"
```

**After:**
```toml
[phases.build]
cmds = [
  "cd hangouts-3.0 && npx prisma generate --schema=./prisma/schema.prisma",
  "cd hangouts-3.0 && NODE_ENV=production npm run build"
]

# Variables section removed - NODE_ENV is set in build command above
# Environment variables should be set in Railway dashboard instead

[start]
cmd = "cd hangouts-3.0 && npm start"
```

## Why This Works

1. **NODE_ENV is already set** in the build command, so the `[variables]` section was redundant
2. **Environment variables** should be set in Railway dashboard, not in nixpacks.toml
3. **Removing the variables section** prevents Railway from generating invalid ENV statements

## Next Steps

1. **Commit and push the fix:**
   ```bash
   git add nixpacks.toml
   git commit -m "Fix nixpacks.toml - remove variables section causing Dockerfile parse error"
   git push origin main
   ```

2. **Verify Railway Settings:**
   - App service → Settings → Build
   - Builder should be "Nixpacks"
   - Railway should auto-redeploy

3. **Set Environment Variables in Railway:**
   - Go to app service → Variables tab
   - Set `NODE_ENV=production` (if not already set)
   - Set other required variables (DATABASE_URL, Clerk keys, etc.)

## Alternative: If Issue Persists

If the build still fails, try:

1. **Check Railway Dashboard:**
   - Ensure builder is set to "Nixpacks" (not Docker)
   - Clear any cached build settings

2. **Verify nixpacks.toml syntax:**
   - Make sure there are no blank lines in variable sections
   - Ensure all TOML syntax is correct

3. **Check for hidden Dockerfile:**
   - Railway might be detecting a Dockerfile somewhere
   - Make sure no Dockerfile exists in the repository

## Expected Behavior After Fix

- Railway should use Nixpacks to build
- Build should complete successfully
- No Dockerfile parse errors
- Application should deploy and start correctly
