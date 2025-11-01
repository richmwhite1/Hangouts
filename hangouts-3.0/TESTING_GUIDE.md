# Testing Guide for New Features

## 🧪 How to Test All Implemented Features

This guide will help you verify that all the new features are working correctly.

---

## 1. Discovery Page Tabs (All/Trending/For You)

### Where to Find It
1. Sign in to the app
2. Navigate to **Discover** page (bottom navigation)

### What You Should See
- **Three tabs at the top**: "All", "🔥 Trending", "✨ For You"
- Tabs should be styled with purple background when active
- Content should change when you click different tabs

### How to Test
1. Click "All" tab → Shows all public events and hangouts
2. Click "🔥 Trending" tab → Shows most popular content (sorted by views/RSVPs/shares)
3. Click "✨ For You" tab → Shows personalized recommendations
   - If you're a new user, you'll see a message: "We're learning your preferences..."
   - After interacting with events (RSVPs, saves), recommendations improve

### Expected Behavior
- ✅ Tabs are visible and clickable
- ✅ Content switches when clicking tabs
- ✅ Trending shows popular events first
- ✅ For You shows personalized content or fallback message

---

## 2. Account Deletion

### Where to Find It
1. Sign in to the app
2. Go to **Profile** page (bottom navigation)
3. Click the **pencil icon** (Edit Profile)
4. Scroll to the bottom to find **"Danger Zone"**

### What You Should See
- Red "Danger Zone" section at bottom
- Warning text about what will be deleted
- "Delete My Account" button (red)

### How to Test
1. Click "Delete My Account" button
2. A modal should appear with:
   - Warning message
   - Checkbox: "I understand this action cannot be undone"
   - "Keep my account" button (gray)
   - "Delete permanently" button (red, disabled until checkbox is checked)
3. Check the checkbox → "Delete permanently" button becomes enabled
4. Click "Keep my account" → Modal closes, nothing happens
5. To actually test deletion:
   - Check the checkbox
   - Click "Delete permanently"
   - You should be signed out
   - Account is marked for deletion (30-day grace period)

### Expected Behavior
- ✅ Danger Zone visible in profile settings
- ✅ Modal appears with confirmation
- ✅ Checkbox must be checked to enable delete button
- ✅ Account is soft-deleted (not immediately removed)
- ✅ User is signed out after deletion

### To Verify Deletion in Database
```bash
cd hangouts-3.0
npx prisma studio
# Check User table for deletedAt and scheduledDeletionDate fields
```

---

## 3. Welcome Onboarding Tour

### Where to Find It
The tour auto-starts for new users. To test it:

**Option A: Create a new account**
1. Sign out
2. Create a brand new account
3. Tour should auto-start on first page load

**Option B: Reset onboarding for existing account**
```bash
cd hangouts-3.0
npx prisma studio
# Find your user in the User table
# Set hasCompletedOnboarding = false
# Refresh the app
```

### What You Should See
- Dark overlay with spotlight effect
- Welcome message in a card
- Progress dots (1 of 5, 2 of 5, etc.)
- "Next" and "Back" buttons
- "Don't show again" checkbox at bottom

### Tour Steps
1. **Welcome** - Introduction to Plans
2. **Discover** - How to find events
3. **Events** - Browse upcoming events
4. **Create** - How to create hangouts
5. **Complete** - Final message

### How to Test
1. Click "Next" → Moves to next step
2. Click "Back" → Goes to previous step
3. Press **ESC** key → Skips tour
4. Press **Arrow keys** → Navigate steps
5. Check "Don't show again" → Tour won't show again
6. Complete all steps → Tour marks as complete in database

### Expected Behavior
- ✅ Tour auto-starts for new users
- ✅ Spotlight highlights target elements
- ✅ Progress dots show current step
- ✅ Keyboard navigation works
- ✅ "Don't show again" persists choice

---

## 4. Calendar Sync Enhancements

### Where to Find It
1. Navigate to any **Event** page
2. Look for calendar export buttons (Google, Apple, Outlook)

### What You Should See
- **Reminder options** section with checkboxes:
  - 1 hour before
  - 1 day before
  - 1 week before
- Three calendar buttons: Google Calendar, Apple Calendar, Outlook
- Timezone display at bottom (e.g., "Times in America/Los_Angeles")
- iOS devices should see ✨ next to Apple Calendar

### How to Test
1. Select reminder options (check 1 or more boxes)
2. Click "Google Calendar" button
   - Should download an .ics file
   - Button should show "Added! ✓" briefly
   - Success toast should appear
3. Open the .ics file in your calendar app
4. Verify:
   - Event details are correct
   - Reminders are set (check calendar app settings)
   - Timezone is correct

### Expected Behavior
- ✅ Reminder checkboxes are visible and functional
- ✅ Calendar buttons download .ics file
- ✅ Success feedback appears (button state + toast)
- ✅ ICS file includes reminders (VALARM)
- ✅ Timezone is auto-detected and correct

---

## 5. Trending Algorithm

### Where to Find It
1. Sign in to the app
2. Go to **Discover** page
3. Click **"🔥 Trending"** tab

### What You Should See
- Events sorted by popularity
- Most popular events appear first
- Events with more views/RSVPs/shares rank higher

### How to Test
1. View several events (click on them)
2. RSVP to some events
3. Wait 15 minutes (cache refresh)
4. Go back to Trending tab
5. Events you interacted with should rank higher

### Scoring Formula
- Views: 30% weight
- RSVPs: 40% weight
- Shares: 20% weight
- Engagement: 10% weight
- Time decay: -10% per day

### Expected Behavior
- ✅ Popular events appear first
- ✅ Recently active events rank higher
- ✅ Old events gradually drop in ranking
- ✅ Cache updates every 15 minutes

### To Verify in Database
```bash
cd hangouts-3.0
npx prisma studio
# Check content table for viewCount and shareCount fields
```

---

## 6. Personalized Recommendations

### Where to Find It
1. Sign in to the app
2. Go to **Discover** page
3. Click **"✨ For You"** tab

### What You Should See
**For New Users:**
- Message: "We're learning your preferences. Interact with events to get better recommendations!"
- Fallback to trending content

**For Active Users:**
- Personalized event recommendations
- Events similar to ones you've interacted with
- Events from similar users

### How to Build Your Profile
1. RSVP to 5-10 events
2. Save some events
3. View events in specific categories
4. Attend events at certain times/locations
5. Wait 30 minutes (cache refresh)
6. Check "For You" tab again

### Recommendation Algorithm
- Learns from your RSVPs, saves, views
- Finds similar users (collaborative filtering)
- Recommends events similar users liked
- Considers location, time, price preferences

### Expected Behavior
- ✅ New users see message + trending fallback
- ✅ Active users see personalized recommendations
- ✅ Recommendations improve over time
- ✅ Cache updates every 30 minutes

---

## 7. Recurring Events API

### Where to Find It
Currently **API-only** (UI form not yet added to create modal)

### How to Test with API
```bash
# Create a recurring event
curl -X POST http://localhost:3000/api/events/recurring \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "eventData": {
      "title": "Weekly Team Meeting",
      "description": "Recurring team sync",
      "startTime": "2025-11-03T10:00:00Z",
      "endTime": "2025-11-03T11:00:00Z",
      "location": "Office",
      "isPublic": true
    },
    "recurrencePattern": {
      "frequency": "WEEKLY",
      "interval": 1,
      "daysOfWeek": [1, 3, 5],
      "endDate": "2025-12-31T23:59:59Z"
    }
  }'

# Get all instances of a recurring event
curl http://localhost:3000/api/events/recurring?parentId=EVENT_ID

# Delete entire series
curl -X DELETE http://localhost:3000/api/events/recurring?parentId=EVENT_ID&type=all

# Delete future instances only
curl -X DELETE http://localhost:3000/api/events/recurring?parentId=EVENT_ID&type=future&fromDate=2025-11-15
```

### Supported Patterns
- **Daily**: Every N days
- **Weekly**: Specific days (Mon, Wed, Fri)
- **Monthly**: Specific day of month (e.g., 15th)

### Expected Behavior
- ✅ Creates parent event + instances
- ✅ All instances linked via parentEventId
- ✅ RRULE stored in recurrenceRule field
- ✅ Can delete all or future instances
- ✅ Instances appear in event lists

### To Verify in Database
```bash
cd hangouts-3.0
npx prisma studio
# Check content table for:
# - isRecurring = true
# - recurrenceRule (RRULE format)
# - parentEventId (for instances)
```

---

## 8. Advanced Filters (Basic Version)

### Where to Find It
1. Go to **Discover** or **Events** page
2. Click the **filter icon** (funnel) next to search bar

### What You Should See
- Category filter (All, Music, Sports, Food, etc.)
- Tags filter (concert, festival, workshop, etc.)
- Price range (min/max inputs)
- Date range (start/end dates)
- Location filter (zip code + distance)

### How to Test
1. Select a category → Content filters to that category
2. Select tags → Content must have those tags
3. Set price range → Only events within range show
4. Set date range → Only events in date range show
5. Enter zip code + distance → Only nearby events show

### Expected Behavior
- ✅ Filters work correctly
- ✅ Multiple filters combine (AND logic)
- ✅ "Clear All" button resets all filters
- ✅ Filter count badge shows active filters

---

## 🐛 Troubleshooting

### Features Not Visible?
1. **Clear browser cache**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Restart dev server**: 
   ```bash
   cd hangouts-3.0
   npm run dev
   ```
3. **Check if signed in**: Some features only visible to authenticated users
4. **Check database**: Run `npx prisma studio` to verify data

### Database Schema Out of Sync?
```bash
cd hangouts-3.0
npx prisma db push
npx prisma generate
npm run dev
```

### API Errors?
1. Check browser console (F12) for errors
2. Check server logs in terminal
3. Verify environment variables are set
4. Test API endpoints with curl/Postman first

---

## ✅ Feature Checklist

Use this checklist to verify all features:

### Discovery Tabs
- [ ] "All" tab visible and working
- [ ] "🔥 Trending" tab visible and working
- [ ] "✨ For You" tab visible and working (when signed in)
- [ ] Content switches when clicking tabs
- [ ] Recommendation message shows for new users

### Account Deletion
- [ ] Danger Zone visible in profile settings
- [ ] Confirmation modal appears
- [ ] Checkbox required to enable delete button
- [ ] User signed out after deletion
- [ ] Database shows deletedAt timestamp

### Onboarding Tour
- [ ] Tour auto-starts for new users
- [ ] Spotlight effect highlights elements
- [ ] Progress dots show current step
- [ ] Keyboard navigation works
- [ ] "Don't show again" persists

### Calendar Sync
- [ ] Reminder options visible
- [ ] Calendar buttons download .ics file
- [ ] Success feedback appears
- [ ] ICS includes reminders
- [ ] Timezone is correct

### Trending
- [ ] Popular events appear first
- [ ] View counts increment
- [ ] Cache refreshes every 15 minutes

### Recommendations
- [ ] New users see fallback message
- [ ] Active users see personalized content
- [ ] Recommendations improve over time

### Recurring Events
- [ ] API creates event series
- [ ] Instances linked to parent
- [ ] Can delete all or future instances
- [ ] RRULE format is valid

---

## 📞 Need Help?

If something isn't working:
1. Check this guide first
2. Look at browser console for errors
3. Check server logs in terminal
4. Verify database schema is up to date
5. Test API endpoints directly with curl

For detailed implementation info, see `FEATURE_IMPLEMENTATION_SUMMARY.md`

