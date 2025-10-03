const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

// Generate unique ID
function generateId() {
  return randomBytes(16).toString('hex');
}

// Additional users with unique profile images
const additionalUsers = [
  {
    email: 'grace@example.com',
    username: 'grace',
    name: 'Grace Chen',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'marcus@example.com',
    username: 'marcus',
    name: 'Marcus Rodriguez',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'sophia@example.com',
    username: 'sophia',
    name: 'Sophia Williams',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'james@example.com',
    username: 'james',
    name: 'James Thompson',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'olivia@example.com',
    username: 'olivia',
    name: 'Olivia Davis',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'ethan@example.com',
    username: 'ethan',
    name: 'Ethan Martinez',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'ava@example.com',
    username: 'ava',
    name: 'Ava Anderson',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'noah@example.com',
    username: 'noah',
    name: 'Noah Taylor',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'isabella@example.com',
    username: 'isabella',
    name: 'Isabella Garcia',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
  },
  {
    email: 'liam@example.com',
    username: 'liam',
    name: 'Liam Wilson',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  }
];

// Additional events with beautiful images
const additionalEvents = [
  {
    title: 'Sunset Photography Workshop',
    description: 'Learn professional photography techniques while capturing stunning Utah sunsets. Bring your camera and creativity!',
    location: 'Antelope Island State Park, Syracuse, UT',
    startDate: new Date('2025-10-22T17:00:00Z'),
    endDate: new Date('2025-10-22T20:00:00Z'),
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    maxParticipants: 15,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Farm-to-Table Cooking Class',
    description: 'Master the art of cooking with fresh, local ingredients. Includes wine pairing and take-home recipes.',
    location: 'The Copper Onion, Salt Lake City, UT',
    startDate: new Date('2025-10-24T18:00:00Z'),
    endDate: new Date('2025-10-24T21:00:00Z'),
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    maxParticipants: 12,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Live Jazz & Wine Tasting',
    description: 'Enjoy smooth jazz music paired with curated wines from local Utah vineyards. Sophisticated evening out.',
    location: 'The Red Door, Salt Lake City, UT',
    startDate: new Date('2025-10-26T19:00:00Z'),
    endDate: new Date('2025-10-26T23:00:00Z'),
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    maxParticipants: 25,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Rock Climbing Adventure',
    description: 'Beginner-friendly rock climbing at Little Cottonwood Canyon. All equipment provided. No experience necessary!',
    location: 'Little Cottonwood Canyon, UT',
    startDate: new Date('2025-10-28T09:00:00Z'),
    endDate: new Date('2025-10-28T15:00:00Z'),
    image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&h=600&fit=crop',
    maxParticipants: 8,
    isPublic: true,
    source: 'MANUAL'
  },
  {
    title: 'Artisan Market & Craft Fair',
    description: 'Discover unique handmade crafts, art, and local products. Support local artists and makers.',
    location: 'Liberty Park, Salt Lake City, UT',
    startDate: new Date('2025-10-30T10:00:00Z'),
    endDate: new Date('2025-10-30T16:00:00Z'),
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
    maxParticipants: 100,
    isPublic: true,
    source: 'MANUAL'
  }
];

// Additional hangouts with beautiful images
const additionalHangouts = [
  {
    title: 'Mountain Biking Trail Ride',
    description: 'Hit the trails! Intermediate mountain biking adventure through scenic Utah landscapes.',
    location: 'Millcreek Canyon, Salt Lake City, UT',
    startDate: new Date('2025-10-23T08:00:00Z'),
    endDate: new Date('2025-10-23T12:00:00Z'),
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=600&fit=crop',
    maxParticipants: 10,
    isPublic: true,
    state: 'POLLING',
    options: [
      { text: 'Millcreek Canyon', votes: 0 },
      { text: 'Big Cottonwood Canyon', votes: 0 },
      { text: 'Little Cottonwood Canyon', votes: 0 }
    ]
  },
  {
    title: 'Pottery & Wine Night',
    description: 'Get creative with clay while sipping wine! Perfect for beginners. Take home your masterpiece.',
    location: 'Clay Arts Utah, Salt Lake City, UT',
    startDate: new Date('2025-10-25T18:30:00Z'),
    endDate: new Date('2025-10-25T21:30:00Z'),
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
    maxParticipants: 12,
    isPublic: true,
    state: 'CONFIRMED',
    options: [
      { text: 'Hand-building', votes: 4 },
      { text: 'Wheel throwing', votes: 6 },
      { text: 'Glazing techniques', votes: 2 }
    ]
  },
  {
    title: 'Stargazing & Hot Chocolate',
    description: 'Escape the city lights for an evening of stargazing. Bring blankets and warm drinks!',
    location: 'Antelope Island State Park, Syracuse, UT',
    startDate: new Date('2025-10-27T19:00:00Z'),
    endDate: new Date('2025-10-27T23:00:00Z'),
    image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=600&fit=crop',
    maxParticipants: 20,
    isPublic: true,
    state: 'POLLING',
    options: [
      { text: 'Antelope Island', votes: 0 },
      { text: 'Cedar Breaks', votes: 0 },
      { text: 'Spiral Jetty', votes: 0 }
    ]
  },
  {
    title: 'Sushi Making Workshop',
    description: 'Learn the art of sushi making from a professional chef. Includes sake tasting and take-home ingredients.',
    location: 'Takashi, Salt Lake City, UT',
    startDate: new Date('2025-10-29T18:00:00Z'),
    endDate: new Date('2025-10-29T21:00:00Z'),
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=600&fit=crop',
    maxParticipants: 8,
    isPublic: false,
    state: 'CONFIRMED',
    options: [
      { text: 'Nigiri', votes: 3 },
      { text: 'Maki rolls', votes: 5 },
      { text: 'Sashimi', votes: 2 }
    ]
  },
  {
    title: 'Yoga & Meditation Retreat',
    description: 'Morning yoga session followed by guided meditation in a peaceful outdoor setting.',
    location: 'Red Butte Garden, Salt Lake City, UT',
    startDate: new Date('2025-10-31T07:00:00Z'),
    endDate: new Date('2025-10-31T10:00:00Z'),
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
    maxParticipants: 15,
    isPublic: true,
    state: 'POLLING',
    options: [
      { text: 'Hatha Yoga', votes: 0 },
      { text: 'Vinyasa Flow', votes: 0 },
      { text: 'Yin Yoga', votes: 0 }
    ]
  }
];

async function seedAdditionalData() {
  try {
    console.log('🌱 Starting additional data seeding...');

    // Create additional users
    console.log('👥 Creating additional users...');
    const createdUsers = [];
    
    for (const userData of additionalUsers) {
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

    // Create friendships between new users and existing users
    console.log('🤝 Creating friendships...');
    const allUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'richmwhite@yahoo.com', // Your account
            'alice@example.com',
            'bob@example.com',
            'charlie@example.com',
            ...additionalUsers.map(u => u.email)
          ]
        }
      }
    });

    // Make everyone friends with everyone (simplified approach)
    for (let i = 0; i < allUsers.length; i++) {
      for (let j = i + 1; j < allUsers.length; j++) {
        try {
          await prisma.friendship.create({
            data: {
              userId: allUsers[i].id,
              friendId: allUsers[j].id,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log(`✅ Created friendship: ${allUsers[i].name} ↔ ${allUsers[j].name}`);
        } catch (error) {
          // Friendship might already exist, that's okay
        }
      }
    }

    // Create additional events
    console.log('📅 Creating additional events...');
    const createdEvents = [];
    
    for (const eventData of additionalEvents) {
      try {
        const creator = allUsers[Math.floor(Math.random() * allUsers.length)];
        
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
            status: 'PUBLISHED',
            privacyLevel: 'PUBLIC',
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

    // Create additional hangouts
    console.log('🎉 Creating additional hangouts...');
    const createdHangouts = [];
    
    for (const hangoutData of additionalHangouts) {
      try {
        const creator = allUsers[Math.floor(Math.random() * allUsers.length)];
        
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
            status: 'PUBLISHED',
            privacyLevel: hangoutData.isPublic ? 'PUBLIC' : 'FRIENDS_ONLY',
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
        const randomUsers = allUsers
          .filter(u => u.id !== creator.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 5) + 2);

        for (const user of randomUsers) {
          const statuses = ['YES', 'MAYBE', 'NO'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          try {
            await prisma.rsvp.create({
              data: {
                contentId: hangout.id,
                userId: user.id,
                status: status,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          } catch (error) {
            // RSVP might already exist
          }
        }

        console.log(`✅ Created hangout: ${hangoutData.title}`);
        createdHangouts.push(hangout);
      } catch (error) {
        console.error(`❌ Error creating hangout ${hangoutData.title}:`, error.message);
      }
    }

    console.log('🎉 Additional data seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   👥 New users: ${createdUsers.length}`);
    console.log(`   📅 New events: ${createdEvents.length}`);
    console.log(`   🎉 New hangouts: ${createdHangouts.length}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedAdditionalData();
