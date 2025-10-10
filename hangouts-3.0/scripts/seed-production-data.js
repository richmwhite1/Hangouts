#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

// Use production database URL from environment
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function clearProductionData() {
  console.log('🧹 Clearing existing production data...');
  try {
    // Delete in reverse order of dependencies
    await prisma.content_participants.deleteMany({});
    await prisma.hangout_task_assignments.deleteMany({});
    await prisma.hangout_tasks.deleteMany({});
    await prisma.message_reactions.deleteMany({});
    await prisma.message_attachments.deleteMany({});
    await prisma.messages.deleteMany({});
    await prisma.conversation_participants.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.poll_vote.deleteMany({});
    await prisma.polls.deleteMany({});
    await prisma.photo_comments.deleteMany({});
    await prisma.photo_likes.deleteMany({});
    await prisma.photo_tags.deleteMany({});
    await prisma.photos.deleteMany({});
    await prisma.comments.deleteMany({});
    await prisma.content_likes.deleteMany({});
    await prisma.content_reports.deleteMany({});
    await prisma.content_shares.deleteMany({});
    await prisma.event_image.deleteMany({});
    await prisma.event_save.deleteMany({});
    await prisma.event_tag.deleteMany({});
    await prisma.rsvp.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.friendship.deleteMany({});
    await prisma.friendRequest.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.securityLog.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Existing production data cleared.');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

async function createUsers() {
  console.log('👥 Creating 10 test users...');
  const usersData = [];
  
  for (let i = 0; i < 10; i++) {
    usersData.push({
      clerkId: `user_${faker.string.uuid()}`,
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.userName().toLowerCase(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      bio: faker.lorem.sentence(),
      location: faker.location.city(),
      website: faker.internet.url(),
      instagram: faker.internet.userName(),
      twitter: faker.internet.userName(),
      facebook: faker.internet.userName(),
      phoneNumber: faker.phone.number(),
      emailVerified: true,
      onboarded: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }

  const createdUsers = [];
  for (const userData of usersData) {
    try {
      const user = await prisma.user.create({ data: userData });
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
    }
  }

  return createdUsers;
}

async function createFriendships(users) {
  console.log('🤝 Creating friendships...');
  const friendships = [];
  
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i];
      const userB = users[j];

      try {
        await prisma.friendship.create({
          data: {
            user1Id: userA.id,
            user2Id: userB.id,
            status: 'ACCEPTED',
            createdAt: faker.date.past(),
            updatedAt: faker.date.recent(),
          },
        });
        friendships.push({ user1: userA.username, user2: userB.username });
      } catch (error) {
        console.error(`❌ Error creating friendship between ${userA.username} and ${userB.username}:`, error);
      }
    }
  }
  
  console.log(`✅ Created ${friendships.length} friendships`);
  return friendships;
}

async function createHangouts(users) {
  console.log('🎉 Creating 10 hangouts...');
  const createdHangouts = [];
  
  for (let i = 0; i < 10; i++) {
    const creator = users[faker.number.int({ min: 0, max: users.length - 1 })];
    const startTime = faker.date.soon({ days: 7 });
    const endTime = faker.date.soon({ days: 7, refDate: startTime });

    try {
      const hangout = await prisma.content.create({
        data: {
          type: 'HANGOUT',
          title: faker.lorem.words({ min: 2, max: 4 }),
          description: faker.lorem.paragraph(),
          image: faker.image.urlLoremFlickr({ category: 'party', width: 640, height: 480 }),
          location: faker.location.streetAddress(true),
          latitude: parseFloat(faker.location.latitude()),
          longitude: parseFloat(faker.location.longitude()),
          startTime: startTime,
          endTime: endTime,
          status: 'ACTIVE',
          privacyLevel: faker.helpers.arrayElement(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']),
          creatorId: creator.id,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
          venue: faker.company.name(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.stateAbbr(),
          zipCode: faker.location.zipCode(),
          maxParticipants: faker.number.int({ min: 5, max: 50 }),
          weatherEnabled: faker.datatype.boolean(),
          participants: {
            create: {
              userId: creator.id,
              rsvpStatus: 'YES',
              role: 'ORGANIZER',
              canEdit: true,
              createdAt: faker.date.past(),
              updatedAt: faker.date.recent(),
            },
          },
        },
      });
      createdHangouts.push(hangout);
      console.log(`✅ Created hangout: ${hangout.title}`);

      // Add some random participants
      const otherUsers = users.filter(u => u.id !== creator.id);
      const numParticipants = faker.number.int({ min: 0, max: Math.min(otherUsers.length, 5) });
      for (let k = 0; k < numParticipants; k++) {
        const participant = otherUsers[faker.number.int({ min: 0, max: otherUsers.length - 1 })];
        try {
          await prisma.content_participants.create({
            data: {
              contentId: hangout.id,
              userId: participant.id,
              rsvpStatus: faker.helpers.arrayElement(['YES', 'NO', 'MAYBE', 'PENDING']),
              role: 'PARTICIPANT',
              canEdit: false,
              createdAt: faker.date.past(),
              updatedAt: faker.date.recent(),
            },
          });
        } catch (error) {
          // Ignore unique constraint errors if user is already a participant
          if (!error.message.includes('Unique constraint failed')) {
            console.error(`❌ Error adding participant ${participant.username} to hangout ${hangout.title}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error creating hangout ${i}:`, error);
    }
  }

  return createdHangouts;
}

async function createEvents(users) {
  console.log('🎪 Creating 10 events...');
  const createdEvents = [];
  
  for (let i = 0; i < 10; i++) {
    const creator = users[faker.number.int({ min: 0, max: users.length - 1 })];
    const startTime = faker.date.soon({ days: 14 });
    const endTime = faker.date.soon({ days: 14, refDate: startTime });

    try {
      const event = await prisma.content.create({
        data: {
          type: 'EVENT',
          title: faker.lorem.words({ min: 3, max: 6 }),
          description: faker.lorem.paragraph(),
          image: faker.image.urlLoremFlickr({ category: 'event', width: 640, height: 480 }),
          location: faker.location.streetAddress(true),
          latitude: parseFloat(faker.location.latitude()),
          longitude: parseFloat(faker.location.longitude()),
          startTime: startTime,
          endTime: endTime,
          status: 'ACTIVE',
          privacyLevel: 'PUBLIC',
          creatorId: creator.id,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
          venue: faker.company.name(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.stateAbbr(),
          zipCode: faker.location.zipCode(),
          priceMin: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
          priceMax: faker.number.float({ min: 100, max: 500, precision: 0.01 }),
          currency: faker.finance.currencyCode(),
          ticketUrl: faker.internet.url(),
          attendeeCount: faker.number.int({ min: 50, max: 1000 }),
          externalEventId: faker.string.uuid(),
          source: faker.helpers.arrayElement(['EVENTBRITE', 'MEETUP', 'OTHER']),
        },
      });
      createdEvents.push(event);
      console.log(`✅ Created event: ${event.title}`);
    } catch (error) {
      console.error(`❌ Error creating event ${i}:`, error);
    }
  }

  return createdEvents;
}

async function main() {
  console.log('🚀 Starting production test data creation...');
  console.log('📊 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  try {
    // Clear existing data
    await clearProductionData();

    // Create users
    const users = await createUsers();
    if (users.length < 10) {
      console.error('❌ Insufficient users created. Aborting further data creation.');
      return;
    }

    // Create friendships
    const friendships = await createFriendships(users);

    // Create hangouts
    const hangouts = await createHangouts(users);

    // Create events
    const events = await createEvents(users);

    console.log('\n🎉 Production test data creation completed!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🎉 Hangouts: ${hangouts.length}`);
    console.log(`   🎪 Events: ${events.length}`);
    console.log(`   🤝 Friendships: ${friendships.length}`);
    
    console.log('\n📋 User Details:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (@${user.username}) - ${user.email}`);
    });

  } catch (error) {
    console.error('❌ Error in main process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
