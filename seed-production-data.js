const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');

// Generate unique ID
function generateId() {
  return randomBytes(16).toString('hex');
}

const prisma = new PrismaClient();

// Sample users data
const users = [
  {
    email: 'alice@example.com',
    username: 'alice',
    name: 'Alice Johnson',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'bob@example.com',
    username: 'bob',
    name: 'Bob Smith',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'charlie@example.com',
    username: 'charlie',
    name: 'Charlie Brown',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'diana@example.com',
    username: 'diana',
    name: 'Diana Prince',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'eve@example.com',
    username: 'eve',
    name: 'Eve Wilson',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'frank@example.com',
    username: 'frank',
    name: 'Frank Miller',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
  }
];

// Sample events data
const events = [
  {
    title: 'Salt Lake City Food Festival',
    description: 'Join us for the biggest food festival in Salt Lake City! Featuring local restaurants, food trucks, and live music.',
    location: 'Liberty Park, Salt Lake City, UT',
    startDate: new Date('2025-10-15T18:00:00Z'),
    endDate: new Date('2025-10-15T22:00:00Z'),
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    maxParticipants: 100,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Utah Jazz vs Lakers Game',
    description: 'Watch the Utah Jazz take on the Los Angeles Lakers at Vivint Arena. Great seats available!',
    location: 'Vivint Arena, Salt Lake City, UT',
    startDate: new Date('2025-10-20T19:00:00Z'),
    endDate: new Date('2025-10-20T22:00:00Z'),
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
    maxParticipants: 50,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Hiking in Big Cottonwood Canyon',
    description: 'Beautiful fall hike in Big Cottonwood Canyon. Moderate difficulty, perfect for all skill levels.',
    location: 'Big Cottonwood Canyon, UT',
    startDate: new Date('2025-10-18T09:00:00Z'),
    endDate: new Date('2025-10-18T15:00:00Z'),
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    maxParticipants: 20,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Salt Lake City Art Walk',
    description: 'Explore local art galleries and meet talented artists in downtown Salt Lake City.',
    location: 'Downtown Salt Lake City, UT',
    startDate: new Date('2025-10-25T17:00:00Z'),
    endDate: new Date('2025-10-25T21:00:00Z'),
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    maxParticipants: 30,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Farmers Market Brunch',
    description: 'Fresh local produce and delicious brunch at the Salt Lake City Farmers Market.',
    location: 'Pioneer Park, Salt Lake City, UT',
    startDate: new Date('2025-10-19T10:00:00Z'),
    endDate: new Date('2025-10-19T13:00:00Z'),
    image: 'https://images.unsplash.com/photo-1488459716781-b6717f83f659?w=800&h=600&fit=crop',
    maxParticipants: 25,
    isPublic: true,
    source: 'MANUAL'
  }
];

// Sample hangouts data
const hangouts = [
  {
    title: 'Coffee & Coding Meetup',
    description: 'Join fellow developers for coffee and coding. Bring your laptop and work on projects together!',
    location: 'Blue Copper Coffee, Salt Lake City, UT',
    startDate: new Date('2025-10-16T10:00:00Z'),
    endDate: new Date('2025-10-16T12:00:00Z'),
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    maxParticipants: 15,
    isPublic: true,
    state: 'POLLING',
    options: [
      { text: 'Blue Copper Coffee', votes: 0 },
      { text: 'Publik Coffee', votes: 0 },
      { text: 'Coffee Garden', votes: 0 }
    ]
  },
  {
    title: 'Weekend Movie Night',
    description: 'Let\'s watch the latest blockbuster together! Vote on which movie to see.',
    location: 'Megaplex Theatres, Salt Lake City, UT',
    startDate: new Date('2025-10-17T19:00:00Z'),
    endDate: new Date('2025-10-17T22:00:00Z'),
    image: 'https://images.unsplash.com/photo-1489599804342-4b0b0a0b0b0b?w=800&h=600&fit=crop',
    maxParticipants: 20,
    isPublic: true,
    state: 'POLLING',
    options: [
      { text: 'Action Movie', votes: 0 },
      { text: 'Comedy Movie', votes: 0 },
      { text: 'Drama Movie', votes: 0 }
    ]
  },
  {
    title: 'Game Night at My Place',
    description: 'Board games, snacks, and good company! Bring your favorite games.',
    location: 'Private Residence, Salt Lake City, UT',
    startDate: new Date('2025-10-21T18:00:00Z'),
    endDate: new Date('2025-10-21T23:00:00Z'),
    image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop',
    maxParticipants: 12,
    isPublic: false,
    state: 'CONFIRMED',
    options: [
      { text: 'Board Games', votes: 5 },
      { text: 'Video Games', votes: 3 },
      { text: 'Card Games', votes: 2 }
    ]
  }
];

async function seedProductionData() {
  try {
    console.log('🌱 Starting production data seeding...');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: userData.email },
              { username: userData.username }
            ]
          }
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          createdUsers.push(existingUser);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            name: userData.name,
            password: hashedPassword,
            avatar: userData.avatar,
            isActive: true,
            isVerified: true,
            role: 'USER',
            lastSeen: new Date()
          }
        });

        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
        createdUsers.push(user);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Create friendships (everyone friends with everyone)
    console.log('🤝 Creating friendships...');
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        try {
          await prisma.friendship.create({
            data: {
              userId: createdUsers[i].id,
              friendId: createdUsers[j].id,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log(`✅ Created friendship: ${createdUsers[i].name} ↔ ${createdUsers[j].name}`);
        } catch (error) {
          console.log(`⚠️  Friendship already exists or error: ${error.message}`);
        }
      }
    }

    // Create events
    console.log('📅 Creating events...');
    const createdEvents = [];
    
    for (const eventData of events) {
      try {
        const creator = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        
        const event = await prisma.content.create({
          data: {
            id: generateId(),
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            startTime: eventData.startDate,
            endTime: eventData.endDate,
            image: eventData.image,
            type: 'EVENT',
            creatorId: creator.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log(`✅ Created event: ${eventData.title}`);
        createdEvents.push(event);
      } catch (error) {
        console.error(`❌ Error creating event ${eventData.title}:`, error.message);
      }
    }

    // Create hangouts
    console.log('🎉 Creating hangouts...');
    const createdHangouts = [];
    
    for (const hangoutData of hangouts) {
      try {
        const creator = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        
        const hangout = await prisma.content.create({
          data: {
            id: generateId(),
            title: hangoutData.title,
            description: hangoutData.description,
            location: hangoutData.location,
            startTime: hangoutData.startDate,
            endTime: hangoutData.endDate,
            image: hangoutData.image,
            type: 'HANGOUT',
            creatorId: creator.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Create poll
        if (hangoutData.options) {
          const options = hangoutData.options.map(option => ({
            text: option.text,
            votes: option.votes
          }));

          const poll = await prisma.polls.create({
            data: {
              id: generateId(),
              contentId: hangout.id,
              creatorId: creator.id,
              title: `${hangoutData.title} - Poll`,
              description: 'Vote on your preferred option',
              options: JSON.stringify(options),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        // Add some RSVPs
        const randomUsers = createdUsers
          .filter(u => u.id !== creator.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 5) + 2);

        for (const user of randomUsers) {
          const statuses = ['YES', 'MAYBE', 'NO'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await prisma.rsvp.create({
            data: {
              contentId: hangout.id,
              userId: user.id,
              status: status,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        console.log(`✅ Created hangout: ${hangoutData.title}`);
        createdHangouts.push(hangout);
      } catch (error) {
        console.error(`❌ Error creating hangout ${hangoutData.title}:`, error.message);
      }
    }

    console.log('🎉 Production data seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   📅 Events: ${createdEvents.length}`);
    console.log(`   🎉 Hangouts: ${createdHangouts.length}`);
    console.log(`   🤝 Friendships: ${createdUsers.length * (createdUsers.length - 1) / 2}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedProductionData();
