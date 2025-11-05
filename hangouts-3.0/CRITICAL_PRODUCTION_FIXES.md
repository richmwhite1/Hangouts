# Critical Production Fixes - Status Field Removal

## Issue
Production was returning **500 Internal Server Error** on all feed endpoints because the database schema doesn't have a `status` field on the `content` table, but the code was trying to query it.

## Root Cause
Multiple API endpoints were querying `content.status` which doesn't exist in the Prisma schema:
- `/api/public/content`
- `/api/feed-simple`  
- `/api/events`
- `/api/hangouts`
- `/api/content`
- And several public detail pages

## Fixes Applied ✅

### Files Modified (10 total)
1. `src/app/api/public/content/route.ts` - Removed `status: 'PUBLISHED'` from query
2. `src/app/api/feed-simple/route.ts` - Removed `status: 'PUBLISHED'` from queries
3. `src/app/api/events/route.ts` - Removed status from query AND create operations
4. `src/app/api/hangouts/route.ts` - Removed status from create operation
5. `src/app/api/content/route.ts` - Removed status from create operation
6. `src/app/api/events/save/route.ts` - Removed status from scrape/save operation
7. `src/app/api/hangouts/public/[id]/route.ts` - Removed status from query
8. `src/app/api/events/public/[id]/route.ts` - Removed status from query
9. `src/app/api/auth/me/route.ts` - Handle unauthenticated users
10. `src/lib/db.ts` - Support both PostgreSQL and SQLite

### What Was Changed

**Before** (Broken):
```typescript
const whereBase: any = {
  status: 'PUBLISHED',  // ❌ This field doesn't exist!
  OR: [
    { isPublic: true },
    { privacyLevel: 'PUBLIC' }
  ]
}
```

**After** (Fixed):
```typescript
const whereBase: any = {
  OR: [
    { isPublic: true },
    { privacyLevel: 'PUBLIC' }
  ]
}
```

## Deployment Status

### Commits Pushed
- **Commit 1**: `56ffcac` - Database connection fixes
- **Commit 2**: `36c8ae3` - Remove all status field references

### Railway Deployment
Code has been pushed to `main` branch. Railway should automatically:
1. Detect the push
2. Pull latest code
3. Install dependencies
4. Generate Prisma client
5. Build the app
6. Deploy to production

**Expected deployment time**: 2-3 minutes

## Testing After Deployment

### Critical Endpoints to Test
```bash
# Homepage feed (unauthenticated)
curl https://plans.up.railway.app/api/feed-simple?type=discover

# Public content
curl https://plans.up.railway.app/api/public/content?limit=6

# Auth check (should return null for unauth users)
curl https://plans.up.railway.app/api/auth/me

# Events list
curl https://plans.up.railway.app/api/events
```

### Expected Results
- ✅ 200 status codes (not 500)
- ✅ Returns JSON with success: true
- ✅ Returns content array (may be empty if no data)
- ✅ No "status field" errors

## Remaining Production Setup

### If Endpoints Return Empty Data
If all endpoints work but return no content, you need to seed the production database:

```bash
# Option 1: Seed via Railway CLI
railway run npm run db:seed:production

# Option 2: Create content manually
# Sign in to production app and create hangouts/events through UI
```

### Database Connection Verification
The database connection logic now correctly:
- ✅ Uses PostgreSQL in production (DATABASE_URL with postgresql://)
- ✅ Uses SQLite locally (DATABASE_URL with file:)
- ✅ Logs connection type for debugging

### Environment Variables to Verify in Railway
Ensure these are set:
- `DATABASE_URL` - PostgreSQL connection (set by Railway Postgres service)
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `NODE_ENV=production`

## Summary

### What Was Broken
- ❌ Homepage wouldn't load feed
- ❌ Events page wouldn't load
- ❌ Discovery page wouldn't work
- ❌ All feed endpoints returned 500 errors
- ❌ Database connection logic didn't support PostgreSQL

### What Is Now Fixed
- ✅ Database connection supports both PostgreSQL and SQLite
- ✅ All `status` field references removed from content queries
- ✅ All API endpoints should work without 500 errors
- ✅ Unauthenticated users handled gracefully
- ✅ Code pushed to GitHub for Railway deployment

### Next Steps
1. **Wait 2-3 minutes** for Railway to complete deployment
2. **Test production endpoints** - should all return 200 status
3. **Check if data exists** - if empty, seed the database
4. **Test in browser** - homepage, events, discovery pages should work

## Testing Commands

```bash
# Test all critical endpoints
echo "Testing public content..."
curl -s "https://plans.up.railway.app/api/public/content?limit=3" | python3 -m json.tool | head -20

echo "Testing feed..."
curl -s "https://plans.up.railway.app/api/feed-simple?type=discover" | python3 -m json.tool | head -20

echo "Testing auth..."
curl -s "https://plans.up.railway.app/api/auth/me" | python3 -m json.tool

echo "Testing events..."
curl -s "https://plans.up.railway.app/api/events?limit=3" | python3 -m json.tool | head -20
```

All should return `"success": true` and no 500 errors.

