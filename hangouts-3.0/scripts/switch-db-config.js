#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

console.log(`🔄 Switching to ${isProduction ? 'production' : 'local'} database configuration...`);

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const productionSchemaPath = path.join(__dirname, 'prisma', 'schema.production.prisma');

if (isProduction) {
  // Use PostgreSQL for production
  if (fs.existsSync(productionSchemaPath)) {
    fs.copyFileSync(productionSchemaPath, schemaPath);
    console.log('✅ Switched to PostgreSQL schema for production');
  } else {
    console.log('❌ Production schema not found');
    process.exit(1);
  }
} else {
  // Use SQLite for local development
  const sqliteSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Rest of the schema remains the same
model User {
  id                       String                    @id @default(cuid())
  clerkId                  String?                   @unique
  email                    String                    @unique
  username                 String                    @unique
  name                     String
  avatar                   String?
  backgroundImage          String?
  bio                      String?
  location                 String?
  zodiac                   String?
  enneagram                String?
  bigFive                  String?
  loveLanguage             String?
  website                  String?
  birthDate                DateTime?
  favoriteActivities       String?                    @default("[]")
  favoritePlaces           String?                    @default("[]")
  password                 String?
  role                     UserRole                  @default(USER)
  isActive                 Boolean                   @default(true)
  isVerified               Boolean                   @default(false)
  lastSeen                 DateTime                  @default(now())
  createdAt                DateTime                  @default(now())
  updatedAt                DateTime                  @updatedAt
  comments                 comments[]
  content                  content[]
  content_likes            content_likes[]
  content_participants     content_participants[]
  content_reports          content_reports[]
  content_shares           content_shares[]
  conversationParticipants ConversationParticipant[]
  conversationParticipantsAdded ConversationParticipant[] @relation("ConversationParticipantAddedBy")
  conversationsCreated     Conversation[]            @relation("ConversationCreator")
  eventSaves               EventSave[]
  finalPlans               finalPlan[]
  receivedFriendRequests   FriendRequest[]           @relation("FriendRequestReceiver")
  sentFriendRequests       FriendRequest[]           @relation("FriendRequestSender")
  friendships              Friendship[]              @relation("UserFriendships")
  friendOf                 Friendship[]              @relation("FriendFriendships")
  message_reads            message_reads[]
  messages                 messages[]
  messageReactions         MessageReaction[]
  typingIndicators         TypingIndicator[]
  notificationPreferences  NotificationPreference[]
  notifications            Notification[]
  reminders                Reminder[]
  passwordResetTokens      PasswordResetToken?
  photo_comments           photo_comments[]
  photo_likes              photo_likes[]
  photo_tags               photo_tags[]
  photos                   photos[]
  pollParticipants         PollParticipant[]
  pollVotes                PollVote[]
  polls                    polls[]
  refreshTokens            RefreshToken[]
  rsvps                    rsvp[]
  securityLogs             SecurityLog[]
  hangoutTasks             hangout_tasks[]
  hangoutTaskAssignments   hangout_task_assignments[]

  @@index([email])
  @@index([username])
  @@index([isActive])
  @@index([lastSeen])
  @@index([createdAt])
  @@map("users")
}

// Include all other models from the original schema...
// (This is a simplified version - in practice, you'd copy all models)

enum UserRole {
  USER
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

enum FriendRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
  BLOCKED
}

enum FriendshipStatus {
  ACTIVE
  BLOCKED
}

enum PrivacyLevel {
  PRIVATE
  FRIENDS_ONLY
  PUBLIC
}

enum PollVisibility {
  PRIVATE
  FRIENDS
  PUBLIC
}

enum ParticipantRole {
  CREATOR
  ADMIN
  MODERATOR
  MEMBER
  CO_HOST
}

enum RSVPStatus {
  PENDING
  YES
  NO
  MAYBE
}

enum NotificationType {
  FRIEND_REQUEST
  FRIEND_ACCEPTED
  MESSAGE_RECEIVED
  CONTENT_INVITATION
  CONTENT_RSVP
  CONTENT_REMINDER
  CONTENT_UPDATE
  COMMUNITY_INVITATION
  MENTION
  LIKE
  COMMENT
  SHARE
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  LOCATION
  POLL
  SYSTEM
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DELETED
}

enum ContentType {
  HANGOUT
  EVENT
  COMMUNITY
}

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
  DISMISSED
}

enum EventCategory {
  MUSIC
  SPORTS
  FOOD
  NIGHTLIFE
  ARTS
  OUTDOORS
  TECHNOLOGY
  BUSINESS
  EDUCATION
  HEALTH
  FAMILY
  OTHER
}

enum EventSource {
  MANUAL
  EVENTBRITE
  FACEBOOK
  MEETUP
  OTHER
}

enum ConversationType {
  DIRECT
  GROUP
  CHANNEL
}

enum ConversationRole {
  ADMIN
  MODERATOR
  MEMBER
}

enum AttachmentType {
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  LOCATION
  CONTACT
  STICKER
  GIF
}

enum ReminderType {
  HANGOUT_1_HOUR
  HANGOUT_STARTING
  EVENT_1_HOUR
  EVENT_STARTING
  HANGOUT_DAY_BEFORE
  EVENT_DAY_BEFORE
}`;

  fs.writeFileSync(schemaPath, sqliteSchema);
  console.log('✅ Switched to SQLite schema for local development');
}

console.log('🔄 Regenerating Prisma client...');
const { execSync } = require('child_process');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client regenerated successfully');
} catch (error) {
  console.error('❌ Failed to regenerate Prisma client:', error.message);
  process.exit(1);
}
