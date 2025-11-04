# Home Feed Diagnosis

## Issue
The home feed is not showing hangouts and events that the user has created, been invited to, or shown interest in.

## Database Status
✅ **Database has content** - Confirmed 16 items total:
- 12 Hangouts
- 4 Events
- All are PUBLISHED status

## Your User Data
**Username:** tedsticklemonster  
**Email:** tedsticklemonster@gmail.com  
**Clerk ID:** user_33qY8y9vcUMgysddPRz7D1DFTia  
**Database ID:** cmha3k8v00003jpbjkpc21ezh

**Your Hangouts:**
1. "logo discussion" (hangout_1761688516264_flioy2ils)
2. "Discover your ikigai" (hangout_1761694484254_w670m2kog)

## API Logic (Correct)
The `/api/feed-simple` endpoint correctly queries for:
```javascript
WHERE status = 'PUBLISHED' AND (
  creatorId = userId OR
  content_participants.userId = userId OR
  rsvps.userId = userId AND rsvps.status IN ('YES', 'MAYBE', 'NO')
)
```

## Debug Steps Added
I've added console logging to the feed API that will show:

1. **🔑 Clerk auth result** - Shows your Clerk user ID
2. **👤 Database user** - Shows the database user lookup (id, username, email)
3. **🎯 Final userId** - Shows the userId used in the query
4. **🔍 Querying with whereClause** - Shows the exact database query
5. **📊 Found content** - Shows the results (count and items)

## How to Diagnose

### Step 1: Open the App
Go to http://localhost:3000

### Step 2: Check Browser Console
Look for these logs:
```
🔑 Token received: YES
📥 Response status: 200
📥 Response data: { success: true, data: { content: [...] } }
```

### Step 3: Check Terminal (npm run dev)
Look for these server-side logs:
```
🔑 Feed API - Clerk auth result: { clerkUserId: 'user_33qY8y...' }
👤 Feed API - Database user: { userId: 'cmha3k8v...', username: 'tedsticklemonster', email: '...' }
🎯 Feed API - Final userId for query: cmha3k8v00003jpbjkpc21ezh
🔍 Feed API - Querying with whereClause: { ... }
📊 Feed API - Found content: { count: 2, total: 2, items: [...] }
```

## Possible Issues

### Issue 1: User ID Mismatch
**Symptom:** Logs show different userId than `cmha3k8v00003jpbjkpc21ezh`  
**Cause:** Clerk user not properly synced to database  
**Fix:** The `getClerkApiUser()` function should auto-create/update the user

### Issue 2: No Results from Query
**Symptom:** Logs show `count: 0` but database has hangouts  
**Cause:** Query whereClause is incorrect  
**Fix:** Check the whereClause in logs against the database schema

### Issue 3: Frontend Not Receiving Data
**Symptom:** API returns data but browser shows empty feed  
**Cause:** Frontend not parsing response correctly  
**Fix:** Check browser console for the response structure

### Issue 4: Authentication Failing
**Symptom:** No userId in logs or "Authentication required" error  
**Cause:** Clerk token not being sent or invalid  
**Fix:** Check token in browser console logs

## Quick Fix Test
Run this to verify database connection:
```bash
node debug-home-feed.js
```

This will show exactly what each user should see on their home feed.

## Expected Result
When working correctly, you should see:
- Browser shows 2 hangout cards
- API logs show `count: 2`
- Cards display "logo discussion" and "Discover your ikigai"






