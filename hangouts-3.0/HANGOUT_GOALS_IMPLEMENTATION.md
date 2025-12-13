# Hangout Goals Implementation Summary

## Overview
Implemented a comprehensive hangout goal enforcement system that automatically reminds users when they haven't hung out with friends based on their desired frequency settings.

## Features Implemented

### 1. Hangout Frequency API Endpoint
**File**: `src/app/api/friends/[id]/frequency/route.ts`
- Created `PUT /api/friends/[id]/frequency` endpoint
- Allows users to set desired hangout frequency for each friendship
- Validates frequency values: `MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUALLY`, `SOMETIMES`, or `null`
- Updates the `desiredHangoutFrequency` field in the `Friendship` model

### 2. Relationship Reminder Service
**File**: `src/lib/services/relationship-reminder-service.ts`
- **Frequency Thresholds**:
  - `MONTHLY`: 30 days
  - `QUARTERLY`: 90 days
  - `SEMI_ANNUAL`: 180 days
  - `ANNUALLY`: 365 days
  - `SOMETIMES`: 90 days (gentle reminder)

- **Smart Reminder Logic**:
  - Calculates days since last successful hangout (both users RSVP'd YES)
  - Sends reminder when threshold is exceeded
  - Prevents duplicate notifications (7-day cooldown)
  - Tracks hangout history using `friend-relationship-service`

- **Notification Content**:
  - Personalized messages with friend's name
  - Shows days since last hangout or days since friendship began
  - Includes actionable data for creating new hangouts

### 3. Automated Reminder Scheduler
**File**: `src/lib/services/notification-scheduler.ts`
- Integrated `checkRelationshipReminders()` into notification scheduler
- Runs daily to check all friendships with frequency goals
- Sends reminders automatically when thresholds are exceeded

### 4. Manual Trigger Endpoint
**File**: `src/app/api/cron/relationship-reminders/route.ts`
- Created `GET /api/cron/relationship-reminders` endpoint
- Allows manual triggering of relationship reminder checks
- Supports optional authorization via `CRON_SECRET` environment variable
- Returns statistics: checked, sent, errors

### 5. Visual Goal Indicators
**File**: `src/components/hangout-goal-indicator.tsx`
- Created reusable component to display hangout goal status
- **Status Types**:
  - **Good** (green): More than 20% of time remaining
  - **Warning** (orange): Less than 20% of time remaining
  - **Overdue** (red): Past the threshold
  - **Neutral** (blue): No hangouts yet, shows goal

- **Display Format**:
  - Shows days remaining until reminder
  - Shows days overdue if past threshold
  - Includes appropriate icons (CheckCircle, Clock, AlertTriangle)

### 6. UI Integration
**Files Modified**:
- `src/app/friends/page.tsx`
- `src/components/profile-friends-list.tsx`

**Changes**:
- Added `HangoutGoalIndicator` component to friend cards
- Displays goal status below the frequency selector
- Shows visual feedback for each friendship's status

## Database Schema
The existing `Friendship` model already includes:
```prisma
model Friendship {
  id                      String            @id @default(cuid())
  userId                  String
  friendId                String
  status                  FriendshipStatus  @default(ACTIVE)
  desiredHangoutFrequency HangoutFrequency? // ← Used for goals
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt
  // ... relations
}

enum HangoutFrequency {
  MONTHLY
  QUARTERLY
  SEMI_ANNUAL
  ANNUALLY
  SOMETIMES
}
```

## How It Works

### Setting a Goal
1. User navigates to Friends page
2. Selects desired frequency from dropdown next to friend's name
3. Frontend calls `PUT /api/friends/[friendId]/frequency`
4. Database updates `desiredHangoutFrequency` field
5. Visual indicator appears showing goal status

### Reminder Triggers
1. **Automated (Daily)**:
   - Notification scheduler runs `sendRelationshipReminders()`
   - Checks all friendships with frequency goals
   - Calculates days since last hangout using `getHangoutStats()`
   - Sends notifications when thresholds exceeded

2. **Manual (On-Demand)**:
   - Call `GET /api/cron/relationship-reminders`
   - Useful for testing or manual triggers
   - Can be integrated with external cron services (Railway, Vercel Cron, etc.)

### Notification Content
Example notification:
```
Title: "Time to reconnect with Alice Johnson"
Message: "You haven't hung out with Alice Johnson since Jan 15, 2025. 
         It's been 45 days - time to plan something!"
```

## Testing

### Manual Test
```bash
# Trigger relationship reminders manually
curl http://localhost:3000/api/cron/relationship-reminders

# Response:
{
  "success": true,
  "message": "Relationship reminders processed",
  "data": {
    "checked": 5,
    "sent": 2,
    "errors": 0
  }
}
```

### Visual Test
1. Navigate to `/friends`
2. Set a hangout goal for a friend (e.g., "Monthly")
3. Visual indicator appears showing status
4. If no hangouts exist, shows "Goal: monthly" in blue
5. If hangouts exist, shows days remaining or overdue

## Future Enhancements

### Potential Improvements
1. **User Preferences**:
   - Allow users to set quiet hours for reminders
   - Customize reminder frequency (e.g., remind 3 days before threshold)
   - Enable/disable reminders per friendship

2. **Smart Scheduling**:
   - Suggest optimal hangout times based on past patterns
   - Integration with calendar availability
   - Group hangout suggestions when multiple friends are overdue

3. **Gamification**:
   - Streak tracking for maintaining hangout goals
   - Badges for consistent friend connections
   - Leaderboard for most active friend groups

4. **Analytics**:
   - Dashboard showing friendship health metrics
   - Trends over time (improving/declining connections)
   - Insights on which friends need attention

5. **Rich Notifications**:
   - Push notification action buttons ("Plan Hangout", "Snooze")
   - In-app notification center integration
   - Email digest of overdue friendships

## Files Created
- `src/app/api/friends/[id]/frequency/route.ts`
- `src/app/api/cron/relationship-reminders/route.ts`
- `src/components/hangout-goal-indicator.tsx`
- `HANGOUT_GOALS_IMPLEMENTATION.md` (this file)

## Files Modified
- `src/lib/services/notification-scheduler.ts`
- `src/app/friends/page.tsx`
- `src/components/profile-friends-list.tsx`

## Dependencies
- Existing `friend-relationship-service.ts` for hangout stats
- Existing `notification-triggers.ts` for sending notifications
- Existing `Friendship` model with `desiredHangoutFrequency` field
- Existing notification system infrastructure

## Notes
- Reminders only sent for ACTIVE friendships
- 7-day cooldown prevents notification spam
- Only counts "successful" hangouts (both users RSVP'd YES)
- Scheduler can be disabled in development by not setting `ENABLE_SCHEDULER=true`
- Manual trigger endpoint useful for testing and external cron integration





