#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

// Use production database URL from environment
const prisma = new PrismaClient();

async function createUsers() {
  console.log('👥 Creating 10 test users...');
  const usersData = [];
  
  for (let i = 0; i < 10; i++) {
    usersData.push({
      clerkId: `user_${faker.string.uuid()}`,
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.username().toLowerCase(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      bio: faker.lorem.sentence(),
      location: faker.location.city(),
      website: faker.internet.url(),
      isVerified: true,
      isActive: true,
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

async function createSimpleHangouts(users) {
  console.log('🎉 Creating 5 simple hangouts...');
  const createdHangouts = [];
  
  for (let i = 0; i < 5; i++) {
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
          privacyLevel: 'PUBLIC',
          creatorId: creator.id,
          venue: faker.company.name(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          maxParticipants: faker.number.int({ min: 5, max: 50 }),
          weatherEnabled: faker.datatype.boolean(),
        },
      });
      createdHangouts.push(hangout);
      console.log(`✅ Created hangout: ${hangout.title}`);
    } catch (error) {
      console.error(`❌ Error creating hangout ${i}:`, error);
    }
  }

  return createdHangouts;
}

async function createSimpleEvents(users) {
  console.log('🎪 Creating 5 simple events...');
  const createdEvents = [];
  
  for (let i = 0; i < 5; i++) {
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
          venue: faker.company.name(),
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
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
    // Create users
    const users = await createUsers();
    if (users.length < 10) {
      console.error('❌ Insufficient users created. Aborting further data creation.');
      return;
    }

    // Create hangouts
    const hangouts = await createSimpleHangouts(users);

    // Create events
    const events = await createSimpleEvents(users);

    console.log('\n🎉 Production test data creation completed!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🎉 Hangouts: ${hangouts.length}`);
    console.log(`   🎪 Events: ${events.length}`);
    
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
