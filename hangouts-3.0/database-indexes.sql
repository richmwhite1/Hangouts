-- Database Performance Optimization Indexes
-- Run this script to add indexes that will significantly improve query performance

-- Content table indexes
CREATE INDEX IF NOT EXISTS idx_content_creator_id ON content(creatorId);
CREATE INDEX IF NOT EXISTS idx_content_start_time ON content(startTime);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_privacy_level ON content(privacyLevel);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(createdAt);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type, status);
CREATE INDEX IF NOT EXISTS idx_content_creator_type ON content(creatorId, type);
CREATE INDEX IF NOT EXISTS idx_content_privacy_type ON content(privacyLevel, type);

-- Content participants indexes
CREATE INDEX IF NOT EXISTS idx_content_participants_user_id ON content_participants(userId);
CREATE INDEX IF NOT EXISTS idx_content_participants_content_id ON content_participants(contentId);
CREATE INDEX IF NOT EXISTS idx_content_participants_role ON content_participants(role);

-- Polls and voting indexes
CREATE INDEX IF NOT EXISTS idx_polls_content_id ON polls(contentId);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON pollVotes(userId);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON pollVotes(pollId);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON pollVotes(optionId);

-- RSVP indexes
CREATE INDEX IF NOT EXISTS idx_rsvp_user_id ON rsvp(userId);
CREATE INDEX IF NOT EXISTS idx_rsvp_content_id ON rsvp(contentId);
CREATE INDEX IF NOT EXISTS idx_rsvp_status ON rsvp(status);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(contentId);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(userId);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(createdAt);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversationId);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(userId);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(createdAt);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notification(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notification(isRead);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notification(createdAt);

-- Friends indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(userId);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friendId);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(isActive);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(lastSeen);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_content_id ON photos(contentId);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(userId);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(createdAt);

-- Event tags indexes
CREATE INDEX IF NOT EXISTS idx_event_tags_content_id ON eventTags(contentId);
CREATE INDEX IF NOT EXISTS idx_event_tags_tag ON eventTags(tag);

-- Content likes indexes
CREATE INDEX IF NOT EXISTS idx_content_likes_content_id ON content_likes(contentId);
CREATE INDEX IF NOT EXISTS idx_content_likes_user_id ON content_likes(userId);

-- Content shares indexes
CREATE INDEX IF NOT EXISTS idx_content_shares_content_id ON content_shares(contentId);
CREATE INDEX IF NOT EXISTS idx_content_shares_user_id ON content_shares(userId);

-- Event saves indexes
CREATE INDEX IF NOT EXISTS idx_event_saves_content_id ON eventSaves(contentId);
CREATE INDEX IF NOT EXISTS idx_event_saves_user_id ON eventSaves(userId);

-- Analyze tables to update statistics
ANALYZE content;
ANALYZE content_participants;
ANALYZE polls;
ANALYZE pollVotes;
ANALYZE rsvp;
ANALYZE comments;
ANALYZE messages;
ANALYZE notification;
ANALYZE friendships;
ANALYZE users;
ANALYZE photos;
ANALYZE eventTags;
ANALYZE content_likes;
ANALYZE content_shares;
ANALYZE eventSaves;

-- Display index creation results
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
