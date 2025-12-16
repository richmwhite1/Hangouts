# Guest Onboarding Testing Guide
*For: Plans Hangout Application*
*Version: 1.0*

---

## Overview

This guide provides step-by-step instructions for testing the complete guest-to-user conversion flow. Follow these scenarios to verify that all improvements are working correctly and the viral growth mechanics are optimized.

---

## Prerequisites

### Test Environment Setup

1. **Local Development Server**
   ```bash
   cd hangouts-3.0
   npm run dev
   ```
   Server should be running at `http://localhost:3000`

2. **Test Database**
   - Ensure you have at least one PUBLIC hangout in the database
   - Have 2-3 test user accounts ready
   - One test user should have created the public hangout

3. **Browsers**
   - Chrome (regular window for authenticated testing)
   - Chrome Incognito (for guest testing)
   - Safari or Firefox (for cross-browser verification)

4. **Test Accounts**
   - **Existing User**: `test-user-1@example.com`
   - **New User Email**: `new-guest-user@example.com`
   - **Google Account**: Use a real Google account for OAuth testing

---

## Test Scenario 1: Guest Views Public Hangout

**Objective**: Verify guests can view all hangout details without signing in

### Steps:

1. **Open Incognito Browser**
   - Open Chrome Incognito window
   - Clear all cookies and cache

2. **Navigate to Public Hangout**
   - Get public hangout URL from database or app
   - Example: `http://localhost:3000/hangouts/public/[hangout-id]`
   - Paste URL and press Enter

3. **Verify Page Loads**
   - [ ] Page loads without authentication requirement
   - [ ] No redirect to sign-in page
   - [ ] Loading spinner appears briefly

### Expected Results:

✅ **Hangout Details Visible:**
- [ ] Hangout title displayed prominently
- [ ] Description shown (if present)
- [ ] Event date and time formatted correctly
- [ ] Location displayed with map pin icon
- [ ] "X people going" count shown
- [ ] Creator name visible

✅ **Social Proof Elements:**
- [ ] Participant avatars displayed (up to 5)
- [ ] "+N more" indicator if >5 participants
- [ ] Public badge visible
- [ ] Calendar export buttons available

✅ **Guest Call-to-Action:**
- [ ] "Sign Up Free" button prominent and visible
- [ ] Benefits list displayed (5 items with checkmarks)
- [ ] "Already have an account?" link present
- [ ] Privacy notice at bottom

✅ **Visual Design:**
- [ ] Dark theme consistent
- [ ] Mobile responsive layout
- [ ] Icons load correctly
- [ ] Images display properly

### Screenshot Checklist:
- [ ] Full page view
- [ ] Guest CTA section
- [ ] Participant avatars
- [ ] Event details card

---

## Test Scenario 2: Guest Sign-In Flow with Context

**Objective**: Verify hangout context is displayed during sign-in

### Steps:

1. **From Public Hangout Page (Incognito)**
   - Click "Sign Up Free" button

2. **Verify Redirect**
   - [ ] Browser redirects to `/signin?redirect_url=...`
   - [ ] redirect_url parameter contains public hangout URL
   - [ ] URL encoding is correct

3. **Check Sign-In Page**
   - [ ] Page loads successfully
   - [ ] Loading spinner shows while fetching context

### Expected Results:

✅ **Hangout Context Card:**
- [ ] Card appears above Clerk sign-in component
- [ ] "You're joining" header displayed
- [ ] Hangout title shown (24px, bold, white)
- [ ] Description shown (truncated if >100 chars)

✅ **Event Details Section:**
- [ ] Date and time with calendar icon (blue)
- [ ] Location with map pin icon (green)
- [ ] Participant count with users icon (purple)
- [ ] All text is readable and properly formatted

✅ **Participant Avatars:**
- [ ] Up to 5 avatars displayed
- [ ] Avatars overlap slightly (-space-x-2)
- [ ] Border around each avatar
- [ ] "+N" badge if >5 participants
- [ ] Fallback initials for users without avatars

✅ **Success Message:**
- [ ] Blue banner with sparkle emoji
- [ ] Text: "You'll be automatically added after signing in"
- [ ] Banner has rounded corners and subtle border

✅ **Clerk Sign-In Component:**
- [ ] Displays below context card
- [ ] Dark theme applied correctly
- [ ] Email/password fields visible
- [ ] Social login buttons present (Google, etc.)

### Screenshot Checklist:
- [ ] Full sign-in page with context card
- [ ] Context card close-up
- [ ] Participant avatars detail
- [ ] Success message banner

---

## Test Scenario 3: New User Sign-Up & Auto-Join

**Objective**: Verify new users are automatically added to hangout

### Steps:

1. **From Sign-In Page**
   - Use hangout context sign-in page from Scenario 2

2. **Create New Account**
   - Click "Sign up" in Clerk component
   - Enter new email: `new-guest-user-[timestamp]@example.com`
   - Enter name: "New Test User"
   - Enter password: "TestPass123!"
   - Click "Continue"

3. **Monitor Network Tab**
   - Open Chrome DevTools → Network tab
   - Watch for API calls

### Expected Results:

✅ **Account Creation:**
- [ ] Clerk creates account successfully
- [ ] No errors in console
- [ ] Network shows successful auth requests

✅ **Auto-Join Attempt:**
- [ ] Network shows POST to `/api/hangouts/[id]/join`
- [ ] Authorization header includes Bearer token
- [ ] Response status: 200 OK
- [ ] Response body includes success message

✅ **Toast Notifications:**
- [ ] Success toast appears: "🎉 You've joined the hangout!"
- [ ] Description: "Redirecting you to the full experience..."
- [ ] Toast duration: ~4 seconds
- [ ] Toast has proper styling (dark theme)

✅ **Redirect to Hangout:**
- [ ] After 2-second delay, browser redirects
- [ ] New URL: `/hangout/[id]` (authenticated route)
- [ ] User is now logged in
- [ ] Full hangout page loads

✅ **Database Verification:**
- [ ] New user record created in `users` table
- [ ] Participant record created in `content_participants` table
- [ ] `userId` matches new user ID
- [ ] `joinedAt` timestamp is recent
- [ ] RSVP record created (if applicable)

### Screenshot Checklist:
- [ ] Successful toast notification
- [ ] Network tab showing join API call
- [ ] Redirected hangout page
- [ ] User shown in participants list

---

## Test Scenario 4: Existing User Login & Auto-Join

**Objective**: Verify existing users are auto-joined when logging in from public link

### Steps:

1. **Sign Out (if signed in)**
   - Click user menu → Sign Out
   - Clear cookies

2. **Navigate to Public Hangout (Incognito)**
   - Open public hangout URL
   - Click "Sign Up Free" (will show login option)

3. **Sign In with Existing Account**
   - Click "Sign in" in Clerk component
   - Enter existing email: `test-user-1@example.com`
   - Enter password
   - Click "Continue"

### Expected Results:

✅ **Login Success:**
- [ ] Authentication completes
- [ ] No errors in console
- [ ] Token received and stored

✅ **Auto-Join Process:**
- [ ] POST to `/api/hangouts/[id]/join` fires
- [ ] Returns 200 OK
- [ ] Toast notification shows success

✅ **User Experience:**
- [ ] "🎉 You've joined the hangout!" toast
- [ ] 2-second delay before redirect
- [ ] Redirects to authenticated hangout page
- [ ] User sees full features (RSVP, vote, chat)

### Screenshot Checklist:
- [ ] Login screen with context
- [ ] Success toast
- [ ] Authenticated hangout page

---

## Test Scenario 5: Auto-Join Edge Cases

**Objective**: Test error handling and retry logic

### Sub-Test 5A: User Already in Hangout

**Steps:**
1. User is already a participant
2. Navigate to public URL (logged out)
3. Sign in

**Expected:**
- [ ] System detects existing participation
- [ ] Toast: "Welcome back! You're already part of this hangout"
- [ ] Redirects to hangout page
- [ ] No duplicate participant record created

### Sub-Test 5B: Network Error During Join

**Steps:**
1. Throttle network to "Slow 3G" in DevTools
2. Navigate to public hangout
3. Sign in

**Expected:**
- [ ] Auto-join attempts with retry
- [ ] Shows loading state
- [ ] Retries up to 2 times with exponential backoff
- [ ] Success after retry OR clear error message
- [ ] If fails: "Connection issue - Please check your internet"

### Sub-Test 5C: Token Not Immediately Available

**Steps:**
1. Sign in from public hangout
2. Monitor console logs

**Expected:**
- [ ] Auto-join waits for token
- [ ] Retries token acquisition up to 3 times
- [ ] Exponential backoff (500ms, 1000ms, 2000ms)
- [ ] Eventually gets token and joins
- [ ] No failed join attempts

### Sub-Test 5D: Server Error (500)

**Steps:**
1. Temporarily break join API endpoint
2. Attempt sign-in and join

**Expected:**
- [ ] Retries up to 2 times
- [ ] Shows error toast after retries exhausted
- [ ] Clear message: "Couldn't join automatically"
- [ ] Description: "Click 'Join Hangout' to try again"
- [ ] User can manually join

---

## Test Scenario 6: Privacy Controls

**Objective**: Verify privacy levels are properly enforced

### Sub-Test 6A: PUBLIC Hangout (Guest Access)

**Steps:**
1. Create PUBLIC hangout
2. Access via public URL (logged out)

**Expected:**
- [ ] Full details visible without login
- [ ] All participants shown
- [ ] Can view description, location, time
- [ ] Guest CTA displayed

### Sub-Test 6B: FRIENDS_ONLY Hangout (Guest Access)

**Steps:**
1. Create FRIENDS_ONLY hangout
2. Access via `/hangouts/public/[id]` (logged out)

**Expected:**
- [ ] Page returns 404 or privacy error
- [ ] OR shows limited preview with "Sign in to see if you can join"
- [ ] Full details not visible to guests

### Sub-Test 6C: PRIVATE Hangout (Guest Access)

**Steps:**
1. Create PRIVATE hangout
2. Access via public URL (logged out)

**Expected:**
- [ ] Returns 404 or "Hangout not found"
- [ ] No details leaked
- [ ] Cannot bypass with URL manipulation

### Sub-Test 6D: FRIENDS_ONLY - Friend Can Join

**Steps:**
1. User A creates FRIENDS_ONLY hangout
2. User B (friend of User A) signs in from public link

**Expected:**
- [ ] Friend relationship verified
- [ ] User B auto-joins successfully
- [ ] Full access granted

### Sub-Test 6E: FRIENDS_ONLY - Non-Friend Cannot Join

**Steps:**
1. User A creates FRIENDS_ONLY hangout
2. User C (NOT friend of User A) signs in

**Expected:**
- [ ] Join fails with appropriate error
- [ ] Message: "Ask [creator] to invite you"
- [ ] User not added to participants

---

## Test Scenario 7: Cross-Browser & Mobile Testing

**Objective**: Ensure consistent experience across platforms

### Desktop Browsers:

**Chrome:**
- [ ] All scenarios pass
- [ ] Clerk OAuth works
- [ ] Auto-join successful

**Firefox:**
- [ ] Public viewing works
- [ ] Sign-in flow works
- [ ] Auto-join works
- [ ] Toasts display correctly

**Safari:**
- [ ] No WebKit-specific issues
- [ ] Cookies and tokens persist
- [ ] Auto-join completes

### Mobile Browsers:

**iOS Safari:**
- [ ] Touch interactions work
- [ ] Modal displays correctly
- [ ] Redirects work smoothly
- [ ] Avatars render properly

**Android Chrome:**
- [ ] Responsive layout good
- [ ] Form inputs accessible
- [ ] Auto-join successful
- [ ] Toasts visible

---

## Test Scenario 8: Performance & UX

**Objective**: Verify speed and user experience quality

### Metrics to Check:

**Page Load Times:**
- [ ] Public hangout loads in < 2 seconds
- [ ] Sign-in page loads in < 1 second
- [ ] Context fetch completes in < 500ms
- [ ] Images lazy-load properly

**Auto-Join Timing:**
- [ ] Total time from sign-in to redirect: < 5 seconds
- [ ] Join API call: < 1 second
- [ ] Toast visible for full 4 seconds
- [ ] Redirect delay: exactly 2 seconds

**Visual Feedback:**
- [ ] Loading spinners show immediately
- [ ] No layout shift during load
- [ ] Smooth transitions
- [ ] No flash of unstyled content

---

## Test Scenario 9: Error Recovery

**Objective**: Test graceful degradation and error handling

### Test Cases:

**Hangout Not Found:**
- [ ] Navigate to `/hangouts/public/invalid-id`
- [ ] Shows 404 error page
- [ ] Clear message: "Hangout not found"
- [ ] Option to go home

**Network Offline:**
- [ ] Disconnect internet
- [ ] Try to load public hangout
- [ ] Shows appropriate error
- [ ] Retry button available

**API Error:**
- [ ] Simulate 500 error
- [ ] Error toast appears
- [ ] Retry mechanism works
- [ ] Clear instructions provided

---

## Test Scenario 10: Social Proof Elements

**Objective**: Verify social proof enhances conversion

### Check for:

**On Public Page:**
- [ ] Participant count prominently displayed
- [ ] Participant avatars visible
- [ ] "X people going" messaging
- [ ] Creator name shown

**On Sign-In Page:**
- [ ] Hangout context card includes participants
- [ ] Avatar stack displayed
- [ ] "+N more" indicator
- [ ] "You'll be automatically added" builds confidence

**Optional Enhancements (Future):**
- [ ] Recent activity feed ("Sarah joined 5m ago")
- [ ] "Trending" badge if popular
- [ ] "X% said yes" RSVP percentage
- [ ] "Filling fast" urgency indicator

---

## Success Criteria Summary

### Must Pass (Critical):
- ✅ All Scenario 1-4 test cases
- ✅ Privacy controls (Scenario 6)
- ✅ Auto-join works reliably (Scenario 3-4)
- ✅ Error handling (Scenario 5)

### Should Pass (Important):
- ✅ Cross-browser compatibility (Scenario 7)
- ✅ Performance metrics met (Scenario 8)
- ✅ Error recovery works (Scenario 9)

### Nice to Have:
- ✅ Social proof enhancements (Scenario 10)
- ✅ Mobile UX polished
- ✅ Fast load times

---

## Reporting Issues

### If Test Fails:

1. **Document the Failure:**
   - Scenario number
   - Expected result
   - Actual result
   - Screenshots
   - Console errors
   - Network requests

2. **Check Console:**
   - Any error messages?
   - Warning logs?
   - Failed network requests?

3. **Verify Fix:**
   - Fix the issue
   - Re-run the test
   - Verify in multiple browsers
   - Check edge cases

---

## Conversion Metrics to Track

Once all tests pass, monitor these metrics:

### Funnel Metrics:
- **Link Click → Page View**: Should be ~100%
- **Page View → Sign-Up Click**: Target >30%
- **Sign-Up Click → Account Created**: Target >80%
- **Account Created → Auto-Join Success**: Target 100%
- **Overall Conversion**: Link Click → Joined: Target >25%

### Time Metrics:
- **Link Click → Page Load**: < 2 seconds
- **Page Load → CTA Click**: Varies (user decision)
- **CTA Click → Sign-In Page**: < 1 second
- **Sign-In → Account Created**: Varies (user entry)
- **Account Created → Auto-Join Complete**: < 3 seconds
- **Total Time**: Link Click → Joined: Target < 60 seconds

### Quality Metrics:
- **Auto-Join Success Rate**: 100%
- **Error Rate**: < 1%
- **Retry Success Rate**: > 95%
- **Cross-Browser Consistency**: > 99%

---

## Appendix: Testing Tools

### Recommended Tools:

1. **Chrome DevTools**
   - Network tab for API monitoring
   - Console for error checking
   - Application tab for cookies/storage
   - Lighthouse for performance

2. **Database Client**
   - Verify records created
   - Check timestamps
   - Validate relationships

3. **Screenshot Tool**
   - Document test results
   - Compare visual consistency
   - Share with team

4. **Postman/Insomnia**
   - Test API endpoints directly
   - Verify response formats
   - Check error responses

---

*End of Testing Guide*












