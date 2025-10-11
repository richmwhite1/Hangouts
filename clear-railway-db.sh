#!/bin/bash

# Clear Railway PostgreSQL Database
echo "🚀 Connecting to Railway PostgreSQL database..."

# Get the DATABASE_URL from Railway
DATABASE_URL=$(railway variables --json | jq -r '.DATABASE_URL')

if [ "$DATABASE_URL" = "null" ] || [ -z "$DATABASE_URL" ]; then
    echo "❌ Could not get DATABASE_URL from Railway"
    exit 1
fi

echo "📊 Database URL: ${DATABASE_URL:0:50}..."

# Connect to the database and clear all data
echo "🗑️  Clearing all data from Railway database..."

# Create a SQL script to clear all tables
cat << 'EOF' > clear_railway_db.sql
-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all tables (in reverse dependency order)
DELETE FROM "content_participants";
DELETE FROM "content_likes";
DELETE FROM "content_shares";
DELETE FROM "content_reports";
DELETE FROM "comments";
DELETE FROM "messages";
DELETE FROM "message_reads";
DELETE FROM "photos";
DELETE FROM "photo_comments";
DELETE FROM "photo_likes";
DELETE FROM "photo_tags";
DELETE FROM "rsvps";
DELETE FROM "event_saves";
DELETE FROM "hangout_tasks";
DELETE FROM "hangout_task_assignments";
DELETE FROM "poll_votes";
DELETE FROM "notifications";
DELETE FROM "notification_preferences";
DELETE FROM "refresh_tokens";
DELETE FROM "friend_requests";
DELETE FROM "friendships";
DELETE FROM "content";
DELETE FROM "users";

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences
SELECT setval('"users_id_seq"', 1, false);
SELECT setval('"content_id_seq"', 1, false);
SELECT setval('"friendships_id_seq"', 1, false);
SELECT setval('"friend_requests_id_seq"', 1, false);
SELECT setval('"notifications_id_seq"', 1, false);
SELECT setval('"comments_id_seq"', 1, false);
SELECT setval('"messages_id_seq"', 1, false);
SELECT setval('"photos_id_seq"', 1, false);
SELECT setval('"rsvps_id_seq"', 1, false);
SELECT setval('"hangout_tasks_id_seq"', 1, false);
SELECT setval('"hangout_task_assignments_id_seq"', 1, false);
SELECT setval('"poll_votes_id_seq"', 1, false);

-- Show final counts
SELECT 'Users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'Content' as table_name, COUNT(*) as count FROM "content"
UNION ALL
SELECT 'Friendships' as table_name, COUNT(*) as count FROM "friendships"
UNION ALL
SELECT 'Friend Requests' as table_name, COUNT(*) as count FROM "friend_requests"
UNION ALL
SELECT 'Comments' as table_name, COUNT(*) as count FROM "comments"
UNION ALL
SELECT 'Messages' as table_name, COUNT(*) as count FROM "messages"
UNION ALL
SELECT 'Photos' as table_name, COUNT(*) as count FROM "photos"
UNION ALL
SELECT 'RSVPs' as table_name, COUNT(*) as count FROM "rsvps"
UNION ALL
SELECT 'Notifications' as table_name, COUNT(*) as count FROM "notifications";

EOF

echo "📝 Executing database cleanup..."
psql "$DATABASE_URL" -f clear_railway_db.sql

# Clean up the temporary SQL file
rm clear_railway_db.sql

echo "✅ Railway database cleared successfully!"
echo "🎉 Ready for fresh start with real users!"
