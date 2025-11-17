const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('crypto');

// Generate unique ID
function generateId() {
  return randomBytes(16).toString('hex');
}

// Check if we're connecting to production
const databaseUrl = process.env.DATABASE_URL || '';
const isProduction = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required!');
  console.error('');
  console.error('To seed production database, you need to:');
  console.error('1. Get your DATABASE_URL from Railway dashboard');
  console.error('2. Run: DATABASE_URL="postgresql://..." node seed-december-january-events.js');
  console.error('   OR use Railway CLI: railway run node seed-december-january-events.js');
  console.error('');
  console.error('See SEED_PRODUCTION_INSTRUCTIONS.md for detailed instructions.');
  process.exit(1);
}

if (isProduction) {
  console.log('🌐 Connecting to PRODUCTION database (Railway)...');
} else {
  console.log('⚠️  WARNING: DATABASE_URL does not appear to be a PostgreSQL connection string!');
  console.log('   Production database requires PostgreSQL (postgresql:// or postgres://)');
  process.exit(1);
}

const prisma = new PrismaClient();

// Beautiful events and hangouts for December and January
const contentItems = [
  // DECEMBER EVENTS
  {
    type: 'EVENT',
    title: 'Winter Wonderland Festival',
    description: 'Experience the magic of winter at our annual Winter Wonderland Festival! Featuring ice sculptures, holiday markets, live music, hot cocoa stations, and festive activities for the whole family. Don\'t miss the spectacular tree lighting ceremony at sunset.',
    location: 'Central Park, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'Central Park - Great Lawn',
    address: 'Central Park, New York, NY 10024',
    startTime: new Date('2024-12-15T16:00:00Z'),
    endTime: new Date('2024-12-15T22:00:00Z'),
    image: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 0,
    priceMax: 25,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  {
    type: 'EVENT',
    title: 'New Year\'s Eve Gala',
    description: 'Ring in the new year in style at our elegant New Year\'s Eve Gala! Enjoy a five-course dinner, premium open bar, live jazz band, and dancing until midnight. Includes champagne toast, party favors, and a stunning view of the fireworks display. Black tie optional.',
    location: 'Grand Ballroom, The Plaza Hotel, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'The Plaza Hotel - Grand Ballroom',
    address: '768 5th Ave, New York, NY 10019',
    startTime: new Date('2024-12-31T20:00:00Z'),
    endTime: new Date('2025-01-01T02:00:00Z'),
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 150,
    priceMax: 300,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  {
    type: 'EVENT',
    title: 'Holiday Jazz Concert Series',
    description: 'Celebrate the season with smooth jazz and holiday classics! Featuring renowned local musicians performing your favorite Christmas and winter songs. Cozy atmosphere with warm drinks and festive treats available. Perfect for a romantic evening or family outing.',
    location: 'Blue Note Jazz Club, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'Blue Note Jazz Club',
    address: '131 W 3rd St, New York, NY 10012',
    startTime: new Date('2024-12-20T19:30:00Z'),
    endTime: new Date('2024-12-20T22:30:00Z'),
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 35,
    priceMax: 75,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  {
    type: 'EVENT',
    title: 'Ice Skating Under the Stars',
    description: 'Glide across the ice under a canopy of twinkling lights! Our outdoor ice rink offers a magical winter experience with music, warm beverages, and festive decorations. Skate rentals available. Perfect for all skill levels - beginners welcome!',
    location: 'Bryant Park Ice Rink, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'Bryant Park',
    address: '1065 Avenue of the Americas, New York, NY 10018',
    startTime: new Date('2024-12-22T18:00:00Z'),
    endTime: new Date('2024-12-22T21:00:00Z'),
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 0,
    priceMax: 20,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  {
    type: 'EVENT',
    title: 'Holiday Food & Wine Tasting',
    description: 'Indulge in a curated selection of holiday-inspired dishes paired with exceptional wines from around the world. Expert sommeliers will guide you through each pairing. Includes appetizers, main courses, desserts, and a selection of premium wines. Limited seating available.',
    location: 'The Wine Bar, SoHo, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'The Wine Bar',
    address: '231 Mott St, New York, NY 10012',
    startTime: new Date('2024-12-18T19:00:00Z'),
    endTime: new Date('2024-12-18T22:00:00Z'),
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 85,
    priceMax: 125,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  
  // JANUARY EVENTS
  {
    type: 'EVENT',
    title: 'New Year Resolution Run',
    description: 'Start the year off right with our annual Resolution Run! Choose from 5K or 10K routes through scenic city parks. All participants receive a commemorative medal, t-shirt, and post-race refreshments. Proceeds benefit local charities. Walkers welcome!',
    location: 'Prospect Park, Brooklyn, NY',
    city: 'Brooklyn',
    state: 'NY',
    venue: 'Prospect Park',
    address: 'Prospect Park, Brooklyn, NY 11215',
    startTime: new Date('2025-01-05T09:00:00Z'),
    endTime: new Date('2025-01-05T12:00:00Z'),
    image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 30,
    priceMax: 50,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  {
    type: 'EVENT',
    title: 'Winter Art Gallery Opening',
    description: 'Discover stunning contemporary art at our exclusive winter gallery opening! Featuring works from emerging and established artists, live music, complimentary wine and hors d\'oeuvres. Meet the artists and explore thought-provoking installations. Free admission.',
    location: 'Chelsea Gallery District, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'Modern Art Gallery',
    address: '555 W 22nd St, New York, NY 10011',
    startTime: new Date('2025-01-12T18:00:00Z'),
    endTime: new Date('2025-01-12T21:00:00Z'),
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 0,
    priceMax: 0,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  {
    type: 'EVENT',
    title: 'Comedy Night: Fresh Start',
    description: 'Laugh your way into the new year! Featuring top comedians from Netflix, Comedy Central, and local favorites. Two hours of non-stop laughs in an intimate setting. Full bar and food menu available. 21+ event.',
    location: 'Comedy Cellar, Greenwich Village, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'Comedy Cellar',
    address: '117 MacDougal St, New York, NY 10012',
    startTime: new Date('2025-01-10T20:00:00Z'),
    endTime: new Date('2025-01-10T23:00:00Z'),
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    priceMin: 25,
    priceMax: 45,
    currency: 'USD',
    attendeeCount: 0,
    source: 'MANUAL'
  },
  
  // HANGOUTS
  {
    type: 'HANGOUT',
    title: 'Cozy Coffee & Book Exchange',
    description: 'Let\'s gather for warm drinks and swap our favorite books! Bring a book (or two) you\'ve loved and want to share, and discover new reads from others. Perfect way to spend a chilly December afternoon. All genres welcome!',
    location: 'Starbucks Reserve, Chelsea, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'Starbucks Reserve',
    address: '61 9th Ave, New York, NY 10011',
    startTime: new Date('2024-12-14T14:00:00Z'),
    endTime: new Date('2024-12-14T17:00:00Z'),
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    maxParticipants: 15,
    weatherEnabled: true
  },
  {
    type: 'HANGOUT',
    title: 'New Year Brunch & Goal Setting',
    description: 'Start 2025 with intention! Join us for a delicious brunch while we share our goals and aspirations for the new year. Great food, great company, and a supportive space to plan an amazing year ahead. All welcome!',
    location: 'The Smith, Midtown, New York, NY',
    city: 'New York',
    state: 'NY',
    venue: 'The Smith',
    address: '956 2nd Ave, New York, NY 10022',
    startTime: new Date('2025-01-04T11:00:00Z'),
    endTime: new Date('2025-01-04T14:00:00Z'),
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1200&h=800&fit=crop',
    status: 'PUBLISHED',
    privacyLevel: 'PUBLIC',
    maxParticipants: 20,
    weatherEnabled: false
  }
];

async function seedDecemberJanuaryEvents() {
  try {
    console.log('🌱 Starting December & January events seeding...');

    // Get an existing user to use as creator
    const users = await prisma.user.findMany({
      take: 1,
      where: {
        isActive: true
      }
    });

    if (users.length === 0) {
      console.error('❌ No users found in database. Please create at least one user first.');
      return;
    }

    const creator = users[0];
    console.log(`✅ Using creator: ${creator.name} (${creator.email})`);

    // Create events and hangouts
    console.log('📅 Creating events and hangouts...');
    const createdItems = [];
    
    for (const itemData of contentItems) {
      try {
        const content = await prisma.content.create({
          data: {
            id: generateId(),
            type: itemData.type,
            title: itemData.title,
            description: itemData.description,
            location: itemData.location,
            city: itemData.city,
            state: itemData.state,
            venue: itemData.venue,
            address: itemData.address,
            startTime: itemData.startTime,
            endTime: itemData.endTime,
            image: itemData.image,
            status: itemData.status,
            privacyLevel: itemData.privacyLevel,
            creatorId: creator.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Event-specific fields
            priceMin: itemData.priceMin,
            priceMax: itemData.priceMax,
            currency: itemData.currency,
            attendeeCount: itemData.attendeeCount,
            source: itemData.source,
            // Hangout-specific fields
            maxParticipants: itemData.maxParticipants,
            weatherEnabled: itemData.weatherEnabled
          }
        });

        console.log(`✅ Created ${itemData.type.toLowerCase()}: ${itemData.title}`);
        createdItems.push(content);
      } catch (error) {
        console.error(`❌ Error creating ${itemData.type.toLowerCase()} "${itemData.title}":`, error.message);
      }
    }

    console.log('🎉 December & January events seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   📅 Total created: ${createdItems.length}`);
    console.log(`   🎉 Events: ${createdItems.filter(c => c.type === 'EVENT').length}`);
    console.log(`   🏠 Hangouts: ${createdItems.filter(c => c.type === 'HANGOUT').length}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDecemberJanuaryEvents().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});

