# Quick Start: Testing Guest Onboarding Flow

This is a condensed version of the testing guide to help you quickly verify the guest onboarding improvements.

---

## ⚡ Quick Test (5 minutes)

### Test the Happy Path

1. **Create a Public Hangout** (if needed)
   ```bash
   # Use the app to create a hangout with:
   - Privacy Level: PUBLIC
   - Title: "Test Friday Drinks"
   - Date: This Friday
   - Location: "Murphy's Pub"
   ```

2. **Get the Public URL**
   - Navigate to the hangout
   - Copy URL, replace `/hangout/` with `/hangouts/public/`
   - Example: `http://localhost:3000/hangouts/public/abc123`

3. **Test Guest View** (Incognito Window)
   ```
   - Open Chrome Incognito
   - Paste public URL
   - Verify you see hangout details WITHOUT signing in
   - Check participant count is shown
   - Check "Sign Up Free" button is visible
   ```

4. **Test Sign-In Context**
   ```
   - Click "Sign Up Free" button
   - Verify redirect to /signin
   - CHECK: Hangout context card appears above Clerk component
   - CHECK: Shows hangout title, date, location
   - CHECK: Shows participant avatars
   - CHECK: Shows "You'll be automatically added" message
   ```

5. **Test Auto-Join**
   ```
   - Click "Sign up" in Clerk component
   - Create new account (use temporary email)
   - Watch for success toast: "🎉 You've joined the hangout!"
   - Verify redirect to /hangout/[id] after 2 seconds
   - Check you're now listed as a participant
   ```

---

## ✅ Success Checklist

### Public Viewing
- [ ] Page loads without authentication
- [ ] All details visible (title, date, location, participants)
- [ ] "Sign Up Free" button prominent
- [ ] Social proof (participant count, avatars)

### Sign-In Context
- [ ] Context card displays above Clerk component
- [ ] Hangout title shown
- [ ] Event details (date, location, participant count)
- [ ] Participant avatars (up to 5 + overflow)
- [ ] "You'll be automatically added" banner

### Auto-Join
- [ ] Success toast appears
- [ ] Toast says "🎉 You've joined the hangout!"
- [ ] 2-second delay before redirect
- [ ] Redirects to `/hangout/[id]`
- [ ] User shown in participants list

---

## 🔍 What Changed

### 1. Enhanced Sign-In Page
**File**: `src/app/sign-in/[[...rest]]/sign-in-client.tsx`

**Before**: Generic message "Sign in to join the hangout"

**After**: 
- Full hangout context card with title, details, and participant avatars
- Social proof builds trust
- Clear expectation: "You'll be automatically added"

### 2. Robust Auto-Join
**File**: `src/hooks/use-auto-join.ts`

**Before**: Single retry, basic error handling

**After**:
- Exponential backoff retry logic (3 attempts for token, 2 for join)
- Status tracking ('idle' | 'joining' | 'success' | 'error')
- Clear toast notifications for every state
- Handles network errors, token timing issues, already-joined cases
- Automatic redirect with delay

---

## 🐛 Common Issues & Fixes

### Issue: "Hangout not found"
**Cause**: Hangout is not PUBLIC
**Fix**: Change privacy level to PUBLIC in database

### Issue: Sign-in page doesn't show context
**Cause**: Redirect URL not preserved or hangout not found
**Fix**: Check browser console for fetch errors, verify public API endpoint works

### Issue: Auto-join doesn't fire
**Cause**: Not on public hangout page or already a participant
**Fix**: Ensure you're signing in from `/hangouts/public/[id]` URL

### Issue: Toast doesn't appear
**Cause**: Toast library not imported or configured
**Fix**: Verify `sonner` package installed, check `layout.tsx` has `<Toaster />`

---

## 📊 Where to Monitor

### Browser Console
- Watch for any errors during sign-in
- Check network tab for API calls
- Look for auto-join POST request to `/api/hangouts/[id]/join`

### Database
After successful auto-join, verify:
```sql
-- Check user created
SELECT * FROM users WHERE email = 'your-test-email@example.com';

-- Check participant added
SELECT * FROM content_participants 
WHERE user_id = [new-user-id] AND content_id = [hangout-id];

-- Check RSVP created (if applicable)
SELECT * FROM rsvps 
WHERE user_id = [new-user-id] AND content_id = [hangout-id];
```

### Logs
- Check terminal for auto-join logs
- Look for "Auto-join successful" message
- Watch for retry attempts if network slow

---

## 📝 Full Documentation

For comprehensive testing scenarios, see:
- **`GUEST_ONBOARDING_TESTING_GUIDE.md`** - 10 detailed test scenarios
- **`GUEST_ONBOARDING_AUDIT_REPORT.md`** - Complete audit findings
- **`IMPLEMENTATION_SUMMARY.md`** - All changes and technical details

---

## 🚀 Next Steps

1. **Test locally** using steps above
2. **Test in staging** with production Clerk keys
3. **Monitor metrics** after deployment:
   - Conversion rate (target >25%)
   - Auto-join success rate (target 100%)
   - Time to conversion (target <60 seconds)

4. **Iterate** based on data and user feedback

---

*Quick Start Guide*
*Last Updated: January 28, 2025*





