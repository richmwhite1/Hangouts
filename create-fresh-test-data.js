const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

// Fresh test hangouts with current timestamps
const freshHangouts = [
  {
    title: "Weekend Coffee Meetup",
    description: "Join us for a relaxing coffee meetup this weekend. We'll discuss books, life, and everything in between.",
    location: "Blue Bottle Coffee, Arts District",
    latitude: 34.0437,
    longitude: -118.2350,
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
    privacyLevel: "PUBLIC",
    type: "HANGOUT",
    image: "/placeholder-hangout.jpg",
    maxParticipants: 8,
    priceMin: 5,
    priceMax: 15,
    currency: "USD"
  },
  {
    title: "Beach Volleyball Tournament",
    description: "Competitive beach volleyball tournament with prizes for the winning team! All skill levels welcome.",
    location: "Santa Monica Beach, CA",
    latitude: 34.0195,
    longitude: -118.4912,
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    privacyLevel: "PUBLIC",
    type: "HANGOUT",
    image: "/placeholder-hangout.jpg",
    maxParticipants: 16,
    priceMin: 0,
    priceMax: 0,
    currency: "USD"
  },
  {
    title: "Art Gallery Opening",
    description: "Exclusive preview of the new contemporary art exhibition. Wine and cheese will be served.",
    location: "LACMA, Los Angeles, CA",
    latitude: 34.0522,
    longitude: -118.2437,
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    privacyLevel: "FRIENDS_ONLY",
    type: "HANGOUT",
    image: "/placeholder-hangout.jpg",
    maxParticipants: 12,
    priceMin: 20,
    priceMax: 20,
    currency: "USD"
  },
  {
    title: "Food Truck Festival",
    description: "Sample the best food trucks in the city! Live music and great company guaranteed.",
    location: "Various Food Truck Locations, Los Angeles, CA",
    latitude: 34.0522,
    longitude: -118.2437,
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 hours later
    privacyLevel: "PUBLIC",
    type: "HANGOUT",
    image: "/placeholder-hangout.jpg",
    maxParticipants: 20,
    priceMin: 15,
    priceMax: 40,
    currency: "USD"
  },
  {
    title: "Hiking Adventure",
    description: "Explore scenic trails and breathtaking views. This moderate hike is perfect for all fitness levels.",
    location: "Runyon Canyon Park, Los Angeles, CA",
    latitude: 34.1104,
    longitude: -118.3527,
    startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    privacyLevel: "PUBLIC",
    type: "HANGOUT",
    image: "/placeholder-hangout.jpg",
    maxParticipants: 10,
    priceMin: 0,
    priceMax: 0,
    currency: "USD"
  }
];

async function createFreshTestData() {
  try {
    console.log('Creating fresh test data...');
    
    // Get the first user from the database
    const user = await db.user.findFirst();
    
    if (!user) {
      console.error('No users found in database');
      return;
    }
    
    console.log('Found user:', user.username);
    
    // Create fresh hangouts
    for (const hangoutData of freshHangouts) {
      const hangout = await db.content.create({
        data: {
          id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'HANGOUT',
          title: hangoutData.title,
          description: hangoutData.description,
          location: hangoutData.location,
          latitude: hangoutData.latitude,
          longitude: hangoutData.longitude,
          startTime: hangoutData.startTime,
          endTime: hangoutData.endTime,
          privacyLevel: hangoutData.privacyLevel,
          creatorId: user.id,
          image: hangoutData.image,
          maxParticipants: hangoutData.maxParticipants,
          priceMin: hangoutData.priceMin,
          priceMax: hangoutData.priceMax,
          currency: hangoutData.currency,
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('Created hangout:', hangout.title);

      // Add creator as a participant
      await db.content_participants.create({
        data: {
          id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout.id,
          userId: user.id,
          role: 'CREATOR',
          canEdit: true,
          isMandatory: true,
          isCoHost: false,
          invitedAt: new Date(),
          joinedAt: new Date()
        }
      });
    }

    console.log('✅ Successfully created fresh test data!');
    console.log('- 5 new hangouts with current timestamps');
    console.log('- All hangouts are published and ready to view');

  } catch (error) {
    console.error('Error creating fresh test data:', error);
  } finally {
    await db.$disconnect();
  }
}

createFreshTestData();

