#!/usr/bin/env node

/**
 * Create Realistic MVP Content Script
 * Creates realistic users, hangouts, and events for MVP testing
 */

const { PrismaClient } = require('@prisma/client');

const realisticUsers = [
  {
    clerkId: 'user_richmwhite',
    email: 'richmwhite@gmail.com',
    username: 'richmwhite',
    name: 'Rich White',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    bio: 'Tech entrepreneur and outdoor enthusiast. Love hiking, coding, and good coffee.',
    location: 'San Francisco, CA',
    zodiac: 'Leo',
    enneagram: 'Type 8 - The Challenger',
    bigFive: 'High Openness, High Conscientiousness',
    loveLanguage: 'Quality Time',
    favoriteActivities: 'Hiking, Coding, Coffee',
    favoritePlaces: 'Yosemite, Coffee Shops, Tech Meetups',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_rwhite',
    email: 'rwhite@victig.com',
    username: 'rwhite',
    name: 'Richard White',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    bio: 'Product manager and fitness enthusiast. Always up for a workout or adventure.',
    location: 'Austin, TX',
    zodiac: 'Aries',
    enneagram: 'Type 3 - The Achiever',
    bigFive: 'High Extraversion, High Conscientiousness',
    loveLanguage: 'Words of Affirmation',
    favoriteActivities: 'CrossFit, Product Strategy, Travel',
    favoritePlaces: 'Gym, Mountains, Tech Conferences',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_alice',
    email: 'alice@example.com',
    username: 'alice',
    name: 'Alice Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    bio: 'Designer and art lover. Passionate about creating beautiful experiences.',
    location: 'Portland, OR',
    zodiac: 'Libra',
    enneagram: 'Type 4 - The Individualist',
    bigFive: 'High Openness, High Agreeableness',
    loveLanguage: 'Acts of Service',
    favoriteActivities: 'Design, Art Galleries, Yoga',
    favoritePlaces: 'Museums, Parks, Design Studios',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_bob',
    email: 'bob@example.com',
    username: 'bob',
    name: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    bio: 'Software engineer and music producer. Love coding and making beats.',
    location: 'Seattle, WA',
    zodiac: 'Scorpio',
    enneagram: 'Type 5 - The Investigator',
    bigFive: 'High Openness, High Conscientiousness',
    loveLanguage: 'Physical Touch',
    favoriteActivities: 'Coding, Music Production, Gaming',
    favoritePlaces: 'Studio, Coffee Shops, Tech Meetups',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_charlie',
    email: 'charlie@example.com',
    username: 'charlie',
    name: 'Charlie Brown',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    bio: 'Marketing specialist and foodie. Always discovering new restaurants and cuisines.',
    location: 'New York, NY',
    zodiac: 'Gemini',
    enneagram: 'Type 7 - The Enthusiast',
    bigFive: 'High Extraversion, High Openness',
    loveLanguage: 'Gifts',
    favoriteActivities: 'Food Tours, Marketing, Social Media',
    favoritePlaces: 'Restaurants, Food Markets, Rooftops',
    isActive: true,
    isVerified: true,
    role: 'USER'
  }
];

const realisticHangouts = [
  {
    type: 'HANGOUT',
    title: 'Weekend Hiking Adventure',
    description: 'Join us for a beautiful hike in the mountains! We\'ll explore scenic trails, enjoy nature, and have a picnic lunch. Perfect for all skill levels.',
    location: 'Mountain Trail Park, CA',
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop'
  },
  {
    type: 'HANGOUT',
    title: 'Coffee & Code Session',
    description: 'Let\'s meet up for coffee and work on our projects together! Bring your laptop and let\'s build something amazing.',
    location: 'Blue Bottle Coffee, SF',
    startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop'
  },
  {
    type: 'HANGOUT',
    title: 'Game Night',
    description: 'Board games, video games, and snacks! We\'ll have everything from classic board games to the latest video games.',
    location: 'My Place, Austin',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
    privacyLevel: 'FRIENDS_ONLY',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop'
  },
  {
    type: 'HANGOUT',
    title: 'Art Gallery Tour',
    description: 'Explore the latest contemporary art exhibitions. We\'ll visit multiple galleries and discuss the pieces over dinner.',
    location: 'Downtown Art District, Portland',
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 hours later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop'
  },
  {
    type: 'HANGOUT',
    title: 'Food Truck Festival',
    description: 'Discover amazing food trucks and street food! We\'ll try different cuisines and share our favorites.',
    location: 'Food Truck Park, Seattle',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop'
  }
];

const realisticEvents = [
  {
    type: 'EVENT',
    title: 'Tech Meetup: AI & Machine Learning',
    description: 'Join us for an evening of AI and ML discussions, demos, and networking. Food and drinks provided.',
    location: 'Tech Hub, San Francisco',
    startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop'
  },
  {
    type: 'EVENT',
    title: 'Yoga in the Park',
    description: 'Morning yoga session in the beautiful park. All levels welcome. Bring your own mat!',
    location: 'Golden Gate Park, SF',
    startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop'
  },
  {
    type: 'EVENT',
    title: 'Wine Tasting Evening',
    description: 'Explore different wines from local vineyards. Perfect for wine enthusiasts and beginners alike.',
    location: 'Napa Valley Winery, CA',
    startTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
    endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    privacyLevel: 'PUBLIC',
    status: 'PUBLISHED',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop'
  }
];

async function createRealisticContent(prisma, dbName) {
  console.log(`\n🎨 Creating realistic content in ${dbName} database...`);
  
  try {
    // Create users
    const createdUsers = [];
    for (const userData of realisticUsers) {
      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: userData.email },
              { clerkId: userData.clerkId },
              { username: userData.username }
            ]
          }
        });

        if (existingUser) {
          console.log(`✅ User ${userData.email} already exists in ${dbName}`);
          createdUsers.push(existingUser);
          continue;
        }

        const user = await prisma.user.create({
          data: {
            ...userData,
            lastSeen: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log(`✅ Created user ${userData.email} in ${dbName}`);
        createdUsers.push(user);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email} in ${dbName}:`, error.message);
      }
    }

    // Create friendships between all users
    console.log(`\n🔗 Creating friendships in ${dbName}...`);
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        const user1 = createdUsers[i];
        const user2 = createdUsers[j];
        
        const existingFriendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId1: user1.id, userId2: user2.id },
              { userId1: user2.id, userId2: user1.id }
            ]
          }
        });

        if (!existingFriendship) {
          await prisma.friendship.create({
            data: {
              userId1: user1.id,
              userId2: user2.id,
              status: 'ACCEPTED',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log(`✅ Created friendship between ${user1.email} and ${user2.email}`);
        }
      }
    }

    // Create hangouts
    console.log(`\n🎉 Creating hangouts in ${dbName}...`);
    for (const hangoutData of realisticHangouts) {
      try {
        const creator = createdUsers[0]; // Use first user as creator
        
        const hangout = await prisma.content.create({
          data: {
            ...hangoutData,
            creatorId: creator.id
          }
        });
        
        // Add all users as participants
        for (const user of createdUsers) {
          await prisma.participant.create({
            data: {
              contentId: hangout.id,
              userId: user.id,
              role: user.id === creator.id ? 'HOST' : 'MEMBER',
              rsvpStatus: 'PENDING',
              canEdit: user.id === creator.id,
              invitedAt: new Date()
            }
          });
        }
        
        console.log(`✅ Created hangout "${hangout.title}"`);
      } catch (error) {
        console.error(`❌ Error creating hangout in ${dbName}:`, error.message);
      }
    }

    // Create events
    console.log(`\n🎪 Creating events in ${dbName}...`);
    for (const eventData of realisticEvents) {
      try {
        const creator = createdUsers[1]; // Use second user as creator
        
        const event = await prisma.content.create({
          data: {
            ...eventData,
            creatorId: creator.id
          }
        });
        
        // Add all users as participants
        for (const user of createdUsers) {
          await prisma.participant.create({
            data: {
              contentId: event.id,
              userId: user.id,
              role: user.id === creator.id ? 'HOST' : 'MEMBER',
              rsvpStatus: 'PENDING',
              canEdit: user.id === creator.id,
              invitedAt: new Date()
            }
          });
        }
        
        console.log(`✅ Created event "${event.title}"`);
      } catch (error) {
        console.error(`❌ Error creating event in ${dbName}:`, error.message);
      }
    }

    console.log(`\n✅ Realistic content creation completed in ${dbName}!`);
    return createdUsers;
    
  } catch (error) {
    console.error(`❌ Error creating realistic content in ${dbName}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting realistic MVP content creation...');
  
  try {
    // Create content in production database
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      const productionPrisma = new PrismaClient();
      
      await createRealisticContent(productionPrisma, 'production');
      
      await productionPrisma.$disconnect();
    } else {
      console.log('⚠️ No production DATABASE_URL found, skipping production database');
    }
    
    console.log('\n🎉 Realistic MVP content creation completed!');
    console.log('\n🎯 Next steps:');
    console.log('1. Deploy the fixed authentication');
    console.log('2. Test image uploads work');
    console.log('3. Test hangout creation with events');
    console.log('4. Verify all users can see each other');
    
  } catch (error) {
    console.error('❌ Error in realistic content creation:', error);
  }
}

main();
