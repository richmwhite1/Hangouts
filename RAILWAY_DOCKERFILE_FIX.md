# Railway Dockerfile Build Error Fix

## Problem
Railway is trying to use Docker instead of Nixpacks, and there's a Dockerfile with a syntax error:
```
Build Failed: build daemon returned an error < failed to solve: dockerfile parse error on line 12: ENV names can not be blank >
```

## Root Cause
Railway is configured to use **NIXPACKS** (see `railway.json`), but Railway might be:
1. Auto-detecting a Dockerfile and using it instead
2. Railway dashboard settings were changed to use Docker
3. There's a hidden or auto-generated Dockerfile

## Solution

### Option 1: Force Railway to Use Nixpacks (Recommended)

1. **In Railway Dashboard:**
   - Go to your **app service**
   - Click **"Settings"** tab
   - Scroll to **"Build"** section
   - Set **"Builder"** to **"Nixpacks"** (not Docker)
   - Save changes

2. **Verify railway.json:**
   - Make sure `railway.json` has `"builder": "NIXPACKS"` (it does)
   - This file should be in your repository root

3. **Remove any Dockerfile:**
   - If there's a Dockerfile in your repo, either:
     - Delete it (if you want to use Nixpacks)
     - Or fix the syntax error (if you want to use Docker)

### Option 2: Fix the Dockerfile (If You Want to Use Docker)

If Railway is using a Dockerfile, find it and fix line 12. The error says there's an `ENV` statement with a blank name.

**Common issues:**
```dockerfile
# ❌ Wrong - blank ENV name
ENV = "value"

# ❌ Wrong - missing variable name
ENV "value"

# ✅ Correct
ENV VARIABLE_NAME="value"
```

**To find the Dockerfile:**
1. Check your repository root
2. Check `hangouts-3.0/` directory
3. Check Railway's auto-generated files

### Option 3: Ensure Nixpacks is Used

1. **Check Railway Service Settings:**
   - App service → Settings → Build
   - Builder should be "Nixpacks"
   - If it's "Docker", change it to "Nixpacks"

2. **Verify nixpacks.toml exists:**
   - Should be in repository root
   - Contains build configuration

3. **Redeploy:**
   - After changing builder to Nixpacks, trigger a new deployment

## Quick Fix Steps

1. **Go to Railway Dashboard:**
   - Your project → App service → Settings

2. **Check Build Settings:**
   - Look for "Builder" or "Build Method"
   - Change to "Nixpacks" if it's set to "Docker"

3. **Verify Files:**
   - `railway.json` should have `"builder": "NIXPACKS"`
   - `nixpacks.toml` should exist in root

4. **Redeploy:**
   - Trigger a new deployment
   - Railway should now use Nixpacks instead of Docker

## Why This Happened

Railway might have:
- Auto-detected a Dockerfile and switched to Docker builder
- Had its settings changed manually in the dashboard
- Generated a Dockerfile during a previous deployment

## Verification

After fixing, check the build logs:
- Should see "Using Nixpacks builder" or similar
- Should NOT see Docker build commands
- Build should use commands from `nixpacks.toml`
