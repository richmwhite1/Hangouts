#!/usr/bin/env node

/**
 * Production Test Data Creator
 * Creates 10 real users, 10 hangouts, and 10 events for production testing
 */

const { PrismaClient } = require('@prisma/client');

// Production database connection
const productionDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const users = [
  {
    clerkId: 'user_alex_johnson',
    email: 'alex.johnson@example.com',
    username: 'alexjohnson',
    name: 'Alex Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_sarah_chen',
    email: 'sarah.chen@example.com',
    username: 'sarahchen',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_mike_rodriguez',
    email: 'mike.rodriguez@example.com',
    username: 'mikerodriguez',
    name: 'Mike Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_emma_wilson',
    email: 'emma.wilson@example.com',
    username: 'emmawilson',
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_david_kim',
    email: 'david.kim@example.com',
    username: 'davidkim',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_lisa_garcia',
    email: 'lisa.garcia@example.com',
    username: 'lisagarcia',
    name: 'Lisa Garcia',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_james_brown',
    email: 'james.brown@example.com',
    username: 'jamesbrown',
    name: 'James Brown',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_olivia_taylor',
    email: 'olivia.taylor@example.com',
    username: 'oliviataylor',
    name: 'Olivia Taylor',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_ryan_martinez',
    email: 'ryan.martinez@example.com',
    username: 'ryanmartinez',
    name: 'Ryan Martinez',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  },
  {
    clerkId: 'user_sophia_anderson',
    email: 'sophia.anderson@example.com',
    username: 'sophiaanderson',
    name: 'Sophia Anderson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true,
    isVerified: true,
    role: 'USER'
  }
];

const hangouts = [
  {
    title: 'Coffee & Catch Up',
    description: 'Let\'s grab coffee and catch up on life! Perfect for a casual morning meetup.',
    location: 'Blue Bottle Coffee',
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
    privacyLevel: 'FRIENDS_ONLY',
    maxParticipants: 6
  },
  {
    title: 'Weekend Hiking Adventure',
    description: 'Join us for a beautiful hike in the mountains! Bring water and snacks.',
    location: 'Mount Tamalpais State Park',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
    privacyLevel: 'PUBLIC',
    maxParticipants: 12
  },
  {
    title: 'Game Night',
    description: 'Board games, snacks, and good company! Bring your favorite games.',
    location: 'Alex\'s Apartment',
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    privacyLevel: 'FRIENDS_ONLY',
    maxParticipants: 8
  },
  {
    title: 'Beach Volleyball',
    description: 'Sun, sand, and volleyball! All skill levels welcome.',
    location: 'Ocean Beach',
    startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'PUBLIC',
    maxParticipants: 16
  },
  {
    title: 'Cooking Class',
    description: 'Learn to make authentic Italian pasta from scratch!',
    location: 'Culinary Institute',
    startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'PUBLIC',
    maxParticipants: 10
  },
  {
    title: 'Movie Night',
    description: 'Watching the latest blockbuster! Popcorn and drinks provided.',
    location: 'Sarah\'s House',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'FRIENDS_ONLY',
    maxParticipants: 6
  },
  {
    title: 'Yoga in the Park',
    description: 'Morning yoga session in the beautiful park. Bring your own mat!',
    location: 'Golden Gate Park',
    startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 minutes later
    privacyLevel: 'PUBLIC',
    maxParticipants: 20
  },
  {
    title: 'Book Club Meeting',
    description: 'Discussing this month\'s book: "The Seven Husbands of Evelyn Hugo"',
    location: 'Local Library',
    startTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
    privacyLevel: 'PUBLIC',
    maxParticipants: 15
  },
  {
    title: 'Wine Tasting',
    description: 'Exploring local wines and learning about different varietals.',
    location: 'Napa Valley Winery',
    startTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    privacyLevel: 'FRIENDS_ONLY',
    maxParticipants: 8
  },
  {
    title: 'Photography Walk',
    description: 'Capture the beauty of the city! All camera types welcome.',
    location: 'Mission District',
    startTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: 'PUBLIC',
    maxParticipants: 12
  }
];

const events = [
  {
    title: 'Tech Conference 2024',
    description: 'The biggest tech conference of the year! Featuring industry leaders and cutting-edge innovations.',
    venue: 'Moscone Center',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    category: 'Technology',
    price: { min: 299, max: 599, currency: '$' }
  },
  {
    title: 'Jazz Festival',
    description: 'Three days of amazing jazz performances from local and international artists.',
    venue: 'Golden Gate Park',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
    category: 'Music',
    price: { min: 45, max: 120, currency: '$' }
  },
  {
    title: 'Food Truck Festival',
    description: 'Sample delicious food from 50+ food trucks! Family-friendly event.',
    venue: 'Pier 39',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
    category: 'Food',
    price: { min: 0, max: 0, currency: '$' }
  },
  {
    title: 'Art Gallery Opening',
    description: 'Contemporary art exhibition featuring local artists. Wine and cheese reception.',
    venue: 'SFMOMA',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // 22 days from now
    category: 'Art',
    price: { min: 25, max: 25, currency: '$' }
  },
  {
    title: 'Marathon',
    description: 'Annual city marathon! Join as a runner or cheer on the participants.',
    venue: 'Embarcadero',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    category: 'Sports',
    price: { min: 75, max: 75, currency: '$' }
  },
  {
    title: 'Comedy Show',
    description: 'Stand-up comedy night featuring top comedians from the Bay Area.',
    venue: 'Cobb\'s Comedy Club',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
    category: 'Entertainment',
    price: { min: 20, max: 40, currency: '$' }
  },
  {
    title: 'Farmers Market',
    description: 'Fresh local produce, artisanal goods, and live music every Saturday.',
    venue: 'Ferry Building',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    category: 'Shopping',
    price: { min: 0, max: 0, currency: '$' }
  },
  {
    title: 'Wine & Cheese Tasting',
    description: 'Curated selection of wines paired with artisanal cheeses.',
    venue: 'Wine Country Tours',
    city: 'Napa',
    startDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
    category: 'Food',
    price: { min: 85, max: 85, currency: '$' }
  },
  {
    title: 'Dance Workshop',
    description: 'Learn salsa dancing from professional instructors! No experience needed.',
    venue: 'Dance Studio SF',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000), // 19 days from now
    category: 'Education',
    price: { min: 35, max: 35, currency: '$' }
  },
  {
    title: 'Flea Market',
    description: 'Vintage finds, antiques, and unique treasures from local vendors.',
    venue: 'Alemany Flea Market',
    city: 'San Francisco',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    category: 'Shopping',
    price: { min: 0, max: 0, currency: '$' }
  }
];

async function clearProductionData() {
  console.log('🧹 Clearing existing production data...');
  
  try {
    // Delete in reverse order of dependencies
    await productionDb.content_participants.deleteMany();
    await productionDb.content_likes.deleteMany();
    await productionDb.content_shares.deleteMany();
    await productionDb.comments.deleteMany();
    await productionDb.messages.deleteMany();
    await productionDb.content.deleteMany();
    await productionDb.friendship.deleteMany();
    await productionDb.friendRequest.deleteMany();
    await productionDb.user.deleteMany();
    
    console.log('✅ Production data cleared');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  const createdUsers = [];
  for (const userData of users) {
    try {
      const user = await productionDb.user.create({
        data: {
          ...userData,
          password: null, // Clerk users don't need passwords
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }
  
  return createdUsers;
}

async function createFriendships(users) {
  console.log('🤝 Creating friendships...');
  
  let friendshipCount = 0;
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      
      try {
        await productionDb.friendship.createMany({
          data: [
            {
              userId: user1.id,
              friendId: user2.id,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        });
        friendshipCount++;
        console.log(`✅ Created friendship: ${user1.name} ↔ ${user2.name}`);
      } catch (error) {
        console.error(`❌ Error creating friendship:`, error.message);
      }
    }
  }
  
  console.log(`✅ Created ${friendshipCount} friendships`);
}

async function createHangouts(users) {
  console.log('🎉 Creating hangouts...');
  
  const createdHangouts = [];
  for (let i = 0; i < hangouts.length; i++) {
    const hangoutData = hangouts[i];
    const creator = users[i % users.length]; // Cycle through users as creators
    
    try {
      const hangout = await productionDb.content.create({
        data: {
          id: `hangout_${i + 1}`,
          type: 'HANGOUT',
          title: hangoutData.title,
          description: hangoutData.description,
          location: hangoutData.location,
          startTime: hangoutData.startTime,
          endTime: hangoutData.endTime,
          privacyLevel: hangoutData.privacyLevel,
          creatorId: creator.id,
          status: 'PUBLISHED',
          maxParticipants: hangoutData.maxParticipants,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      createdHangouts.push(hangout);
      console.log(`✅ Created hangout: ${hangout.title} by ${creator.name}`);
      
      // Add creator as participant
      await productionDb.content_participants.create({
        data: {
          contentId: hangout.id,
          userId: creator.id,
          rsvpStatus: 'YES',
          role: 'CREATOR',
          canEdit: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Add 2-4 random participants
      const participantCount = Math.floor(Math.random() * 3) + 2; // 2-4 participants
      const shuffledUsers = users.filter(u => u.id !== creator.id).sort(() => 0.5 - Math.random());
      
      for (let j = 0; j < participantCount && j < shuffledUsers.length; j++) {
        const participant = shuffledUsers[j];
        const rsvpStatuses = ['YES', 'MAYBE', 'PENDING'];
        const rsvpStatus = rsvpStatuses[Math.floor(Math.random() * rsvpStatuses.length)];
        
        await productionDb.content_participants.create({
          data: {
            contentId: hangout.id,
            userId: participant.id,
            rsvpStatus: rsvpStatus,
            role: 'PARTICIPANT',
            canEdit: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
    } catch (error) {
      console.error(`❌ Error creating hangout ${hangoutData.title}:`, error.message);
    }
  }
  
  return createdHangouts;
}

async function createEvents(users) {
  console.log('🎪 Creating events...');
  
  const createdEvents = [];
  for (let i = 0; i < events.length; i++) {
    const eventData = events[i];
    const creator = users[i % users.length]; // Cycle through users as creators
    
    try {
      const event = await productionDb.content.create({
        data: {
          id: `event_${i + 1}`,
          type: 'EVENT',
          title: eventData.title,
          description: eventData.description,
          venue: eventData.venue,
          city: eventData.city,
          startTime: eventData.startDate,
          endTime: new Date(eventData.startDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
          privacyLevel: 'PUBLIC',
          creatorId: creator.id,
          status: 'PUBLISHED',
          priceMin: eventData.price.min,
          priceMax: eventData.price.max,
          currency: eventData.price.currency,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      createdEvents.push(event);
      console.log(`✅ Created event: ${event.title} by ${creator.name}`);
      
    } catch (error) {
      console.error(`❌ Error creating event ${eventData.title}:`, error.message);
    }
  }
  
  return createdEvents;
}

async function main() {
  console.log('🚀 Starting production test data creation...');
  
  try {
    // Clear existing data
    await clearProductionData();
    
    // Create users
    const users = await createUsers();
    
    // Create friendships
    await createFriendships(users);
    
    // Create hangouts
    const hangouts = await createHangouts(users);
    
    // Create events
    const events = await createEvents(users);
    
    console.log('\n🎉 Production test data creation completed!');
    console.log(`📊 Summary:`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🎉 Hangouts: ${hangouts.length}`);
    console.log(`   🎪 Events: ${events.length}`);
    console.log(`   🤝 Friendships: ${users.length * (users.length - 1) / 2}`);
    
  } catch (error) {
    console.error('❌ Error in production test data creation:', error);
  } finally {
    await productionDb.$disconnect();
  }
}

main();
