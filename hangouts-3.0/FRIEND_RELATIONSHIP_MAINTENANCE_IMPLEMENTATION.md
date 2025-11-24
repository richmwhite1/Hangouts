# Friend Relationship Maintenance Features - Implementation Complete

## Overview
Enhanced the friend relationship tracking system by adding friends list display on user's own profile, frequency settings for relationship maintenance, and automated notifications when too much time has passed since last hangout.

## What Was Implemented

### 1. Database Schema Changes

**File**: `hangouts-3.0/prisma/schema.prisma`

- ✅ Added `desiredHangoutFrequency` field to `Friendship` model (optional)
- ✅ Created `HangoutFrequency` enum with values:
  - `MONTHLY` - ~30 days
  - `QUARTERLY` - ~90 days
  - `SEMI_ANNUAL` - ~180 days
  - `ANNUALLY` - ~365 days
  - `SOMETIMES` - ~90 days (gentle reminders)
- ✅ Added index on `desiredHangoutFrequency` for efficient querying
- ✅ Added `RELATIONSHIP_REMINDER` to `NotificationType` enum

**Migration File**: `prisma/migrations/20250102120000_add_friendship_frequency/migration.sql`

### 2. API Endpoints

#### `/api/friends/[id]/frequency` (NEW)
- PATCH endpoint to update `desiredHangoutFrequency` for a friendship
- Validates frequency enum value
- Returns updated friendship with stats
- Handles both directions of friendship (userId/friendId)

#### `/api/friends` (Enhanced)
- Now includes `desiredHangoutFrequency` in response for each friend
- Already includes hangout stats (last hangout date, total hangouts, invite counts)

### 3. Business Logic Services

#### Relationship Reminder Service
**File**: `src/lib/services/relationship-reminder-service.ts`

Functions:
- `getFrequencyThresholdDays(frequency)` - Returns days threshold for frequency
- `shouldSendReminder(userId, friendId, frequency, lastHangoutDate)` - Determines if reminder needed
- `checkRelationshipReminders()` - Checks all friendships and sends reminders

**Logic**:
- For each friendship with frequency setting:
  - Gets last hangout date from stats
  - Calculates days since last hangout
  - Compares against frequency threshold
  - Checks if notification sent recently (within 7 days)
  - Creates notification if threshold exceeded and no recent notification

#### Relationship Reminder Processor
**File**: `src/lib/services/relationship-reminder-processor.ts`

- Runs daily (86400000 ms = 24 hours) by default
- Calls `checkRelationshipReminders()` on schedule
- Integrated with existing `ReminderProcessor` to start/stop together
- Provides status and manual trigger methods

### 4. UI Components

#### Friends Tab on Own Profile
**File**: `src/app/profile/[username]/page.tsx` (modified)

- ✅ Added "Friends" tab (only visible when viewing own profile)
- ✅ Displays all friends with:
  - Friend avatar, name, username
  - Last hangout date (formatted: "Last: 2 weeks ago" or "Never")
  - Total hangouts count
  - Frequency setting dropdown
  - Link to friend's profile

#### Frequency Selector Component
**File**: `src/components/friend-frequency-selector.tsx` (new)

- Dropdown component with frequency options
- Options: Monthly, Quarterly, Semi-Annual, Annually, Sometimes, None
- Calls PATCH `/api/friends/[id]/frequency` on change
- Shows current selection with icon
- Toast notifications for success/error

#### Profile Friends List Component
**File**: `src/components/profile-friends-list.tsx` (new)

- Reusable component to display friends with stats
- Each friend card shows:
  - Avatar (clickable to profile)
  - Name and username (clickable to profile)
  - Last hangout date (relative format)
  - Total hangouts count
  - Frequency selector
- Handles loading and empty states
- Fetches friends using `/api/friends` endpoint

### 5. Notification System

#### Notification Type
- Added `RELATIONSHIP_REMINDER` to `NotificationType` enum
- Added default preferences (inApp: true, push: true, email: false)

#### Notification Content
- **Title**: "Time to reconnect with [Friend Name]"
- **Message**: 
  - If has last hangout: "You haven't hung out with [Friend Name] since [date]. It's been [X] days - time to plan something!"
  - If no last hangout: "You haven't hung out with [Friend Name] yet. It's been [X] days since you became friends - time to plan your first hangout!"
- **Data includes**:
  - `friendId`
  - `friendName`
  - `lastHangoutDate`
  - `daysSinceLastHangout`
  - `desiredFrequency`
  - `thresholdDays`

### 6. Integration

**File**: `src/lib/services/reminder-processor.ts` (modified)

- Relationship reminder processor starts automatically when reminder processor starts
- Stops automatically when reminder processor stops
- Runs daily checks for relationship reminders

## Testing the Features

### 1. Test Friends List on Profile
1. Navigate to your own profile (`/profile/[your-username]`)
2. Click on "Friends" tab
3. Verify all friends are displayed with:
   - Avatar, name, username
   - Last hangout date
   - Total hangouts count
   - Frequency selector dropdown

### 2. Test Frequency Setting
1. On your profile's Friends tab, select a frequency for a friend
2. Verify dropdown updates
3. Verify toast notification appears
4. Refresh page and verify frequency persists

### 3. Test Relationship Reminders
1. Set a frequency for a friend (e.g., Monthly)
2. Wait for threshold to be exceeded (or manually trigger check)
3. Verify notification is created
4. Verify notification appears in notifications list
5. Verify notification includes friend name and days since last hangout

### 4. Test Existing Features
1. Visit a friend's profile
2. Verify "Hangouts Together" section shows stats
3. Click "Together" tab to see shared hangouts
4. Verify hangout cards display correctly with activity indicators

## Files Created/Modified

### Created
- `src/app/api/friends/[id]/frequency/route.ts` - Frequency update endpoint
- `src/lib/services/relationship-reminder-service.ts` - Reminder logic
- `src/lib/services/relationship-reminder-processor.ts` - Scheduled processor
- `src/components/friend-frequency-selector.tsx` - Frequency dropdown
- `src/components/profile-friends-list.tsx` - Friends list component
- `prisma/migrations/20250102120000_add_friendship_frequency/migration.sql` - Migration

### Modified
- `prisma/schema.prisma` - Added frequency field, enum, and notification type
- `src/app/api/friends/route.ts` - Include frequency in response
- `src/app/profile/[username]/page.tsx` - Added Friends tab
- `src/lib/notification-triggers.ts` - Added RELATIONSHIP_REMINDER type
- `src/lib/services/reminder-processor.ts` - Integrated relationship processor

## Next Steps

### 1. Run Database Migration
```bash
cd hangouts-3.0
npx prisma migrate dev
# Or for production:
npx prisma migrate deploy
```

### 2. Test Locally
1. Start dev server: `npm run dev`
2. Navigate to your profile
3. Test friends list display
4. Test frequency setting updates
5. Test relationship reminders (manually trigger or wait)

### 3. Manual Reminder Testing
To test reminders without waiting:
```typescript
import { RelationshipReminderProcessor } from '@/lib/services/relationship-reminder-processor'
// In a test script or API endpoint
await RelationshipReminderProcessor.triggerCheck()
```

## Technical Notes

### Frequency Thresholds
- **MONTHLY**: 30 days
- **QUARTERLY**: 90 days
- **SEMI_ANNUAL**: 180 days
- **ANNUALLY**: 365 days
- **SOMETIMES**: 90 days (gentle reminder)

### Duplicate Prevention
- Checks for notifications sent within last 7 days
- Prevents spam by filtering recent notifications in code
- Only sends one reminder per friend per 7-day period

### Performance
- Relationship reminder processor runs daily (not every minute)
- Efficient querying with indexes on `desiredHangoutFrequency`
- Limits notification checks to recent ones (50 most recent)

## Known Limitations

1. **JSON Filtering**: Prisma's JSON filtering is limited, so we filter notifications in code
2. **Bidirectional Friendships**: Frequency is stored per direction (user sets frequency for their view of friendship)
3. **Manual Testing**: Reminders run daily, so testing requires manual trigger or waiting




