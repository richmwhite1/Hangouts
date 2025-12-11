# Production Database Cleanup Instructions

## Overview

This cleanup addresses data architecture issues where:
- Events appear on plans page but not discover page
- Many hangouts/events won't open due to broken records
- Content with non-published status (DRAFT, ARCHIVED, DELETED) is invisible

## What This Cleanup Does

1. **Identifies and deletes broken content**:
   - Records missing required fields (title, startTime, endTime, creator)
   - Orphaned records (creator user no longer exists)

2. **Deletes non-published content**:
   - All content with status DRAFT, ARCHIVED, or DELETED
   - Cleans up related records (RSVPs, participants, comments, polls, photos)

3. **Updates application logic**:
   - Discover page now shows both hangouts AND events
   - Plans feed only shows content user has interacted with
   - All visible content has PUBLISHED status

## Before Running Cleanup

### 1. Backup Production Database
```bash
# Create a backup of your production database
# Instructions depend on your database provider (Railway, Vercel, etc.)
```

### 2. Deploy Updated Code First
Deploy the following changes to production BEFORE running cleanup:
- `src/app/api/discover/route.ts` - Now supports contentType filtering
- `src/app/api/feed/route.ts` - Plans feed excludes public content
- `src/components/discovery-page-server.tsx` - Added tabs for filtering

### 3. Verify Environment Variables
Ensure these are set in production:
- `DATABASE_URL` - Points to production database
- `NODE_ENV=production`

## Running the Cleanup

### Option 1: Interactive Script (Recommended)
```bash
# Run the interactive cleanup script
NODE_ENV=production ./scripts/production-cleanup.sh
```

The script will:
1. Analyze what will be deleted (safe preview)
2. Ask for confirmation
3. Execute the cleanup if approved

### Option 2: Manual Execution
If you prefer to run scripts individually:

```bash
# First, preview what will be deleted
NODE_ENV=production REPORT_ONLY=true node scripts/cleanup-broken-content.js
NODE_ENV=production REPORT_ONLY=true node scripts/cleanup-draft-content.js

# Then execute the actual cleanup
NODE_ENV=production FORCE_DELETE=true node scripts/cleanup-broken-content.js
NODE_ENV=production FORCE_DELETE=true node scripts/cleanup-draft-content.js
```

## Expected Results

After cleanup, you should see:
- ✅ All public hangouts and events visible on discover page
- ✅ Content only appears in plans feed when user has interacted with it
- ✅ All visible content has PUBLISHED status
- ✅ Users can filter discover page by All/Hangouts/Events
- ✅ Marking interest or being invited moves content to plans feed

## Monitoring After Cleanup

1. **Test the application**:
   - Visit discover page - should show both hangouts and events
   - Visit plans page - should only show user's relevant content
   - Try filtering discover page with tabs

2. **Monitor for issues**:
   - Check application logs for errors
   - Monitor database performance
   - Watch for user reports of missing content

3. **Rollback plan**:
   - Keep database backup for at least 7 days
   - Have previous deployment ready to rollback if needed

## Troubleshooting

### If cleanup fails:
1. Check database connection and permissions
2. Verify all environment variables are set
3. Ensure scripts have execute permissions

### If application breaks after cleanup:
1. Check for foreign key constraint errors
2. Verify API responses are working
3. Rollback to previous deployment if needed

## Files Modified

### Database Cleanup Scripts
- `scripts/cleanup-broken-content.js` - Deletes incomplete records
- `scripts/cleanup-draft-content.js` - Deletes non-published records
- `scripts/production-cleanup.sh` - Interactive cleanup runner

### API Changes
- `src/app/api/discover/route.ts` - Added contentType filtering
- `src/app/api/feed/route.ts` - Removed public content from plans feed

### UI Changes
- `src/components/discovery-page-server.tsx` - Added content type tabs

## Support

If you encounter issues:
1. Check the script output for error messages
2. Review database logs for constraint violations
3. Contact development team with full error logs
