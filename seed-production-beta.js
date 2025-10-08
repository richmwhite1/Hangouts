const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const db = new PrismaClient()

// Real user data for beta testing
const betaUsers = [
  {
    email: 'sarah.johnson@example.com',
    username: 'sarahj',
    name: 'Sarah Johnson',
    bio: 'Event organizer and social butterfly 🦋',
    location: 'San Francisco, CA',
    favoriteActivities: ['Hiking', 'Photography', 'Wine Tasting', 'Yoga'],
    favoritePlaces: ['Golden Gate Park', 'Napa Valley', 'Muir Woods', 'Mission District']
  },
  {
    email: 'mike.chen@example.com',
    username: 'mikechen',
    name: 'Mike Chen',
    bio: 'Tech entrepreneur and foodie 🍜',
    location: 'San Francisco, CA',
    favoriteActivities: ['Coding', 'Cooking', 'Rock Climbing', 'Board Games'],
    favoritePlaces: ['Chinatown', 'SOMA', 'Dolores Park', 'Fisherman\'s Wharf']
  },
  {
    email: 'emma.rodriguez@example.com',
    username: 'emmar',
    name: 'Emma Rodriguez',
    bio: 'Artist and community builder 🎨',
    location: 'Oakland, CA',
    favoriteActivities: ['Painting', 'Dancing', 'Volunteering', 'Coffee'],
    favoritePlaces: ['Lake Merritt', 'Jack London Square', 'Temescal', 'Fruitvale']
  },
  {
    email: 'alex.kim@example.com',
    username: 'alexk',
    name: 'Alex Kim',
    bio: 'Fitness enthusiast and adventure seeker 🏃‍♂️',
    location: 'Berkeley, CA',
    favoriteActivities: ['Running', 'Basketball', 'Hiking', 'Meditation'],
    favoritePlaces: ['UC Berkeley', 'Tilden Park', 'Fourth Street', 'Elmwood']
  },
  {
    email: 'jessica.wong@example.com',
    username: 'jessw',
    name: 'Jessica Wong',
    bio: 'Music lover and nightlife explorer 🎵',
    location: 'San Francisco, CA',
    favoriteActivities: ['Concerts', 'Dancing', 'Karaoke', 'Cocktails'],
    favoritePlaces: ['Fillmore District', 'Castro', 'Hayes Valley', 'Marina']
  },
  {
    email: 'david.martinez@example.com',
    username: 'davidm',
    name: 'David Martinez',
    bio: 'Chef and food culture enthusiast 👨‍🍳',
    location: 'San Francisco, CA',
    favoriteActivities: ['Cooking', 'Food Tours', 'Wine Tasting', 'Gardening'],
    favoritePlaces: ['Mission District', 'Ferry Building', 'Castro', 'Noe Valley']
  },
  {
    email: 'lisa.patel@example.com',
    username: 'lisap',
    name: 'Lisa Patel',
    bio: 'Yoga instructor and wellness advocate 🧘‍♀️',
    location: 'San Francisco, CA',
    favoriteActivities: ['Yoga', 'Meditation', 'Hiking', 'Reading'],
    favoritePlaces: ['Dolores Park', 'Presidio', 'Mission District', 'SOMA']
  },
  {
    email: 'ryan.oconnor@example.com',
    username: 'ryano',
    name: 'Ryan O\'Connor',
    bio: 'Outdoor enthusiast and photographer 📸',
    location: 'Mill Valley, CA',
    favoriteActivities: ['Photography', 'Hiking', 'Camping', 'Surfing'],
    favoritePlaces: ['Muir Woods', 'Stinson Beach', 'Mount Tam', 'Sausalito']
  },
  {
    email: 'maria.gonzalez@example.com',
    username: 'mariag',
    name: 'Maria Gonzalez',
    bio: 'Community organizer and social justice advocate ✊',
    location: 'Oakland, CA',
    favoriteActivities: ['Volunteering', 'Activism', 'Art', 'Community Events'],
    favoritePlaces: ['Fruitvale', 'Lake Merritt', 'Jack London Square', 'Temescal']
  },
  {
    email: 'kevin.lee@example.com',
    username: 'kevinl',
    name: 'Kevin Lee',
    bio: 'Gamer and tech enthusiast 🎮',
    location: 'San Francisco, CA',
    favoriteActivities: ['Gaming', 'Tech Meetups', 'Board Games', 'Anime'],
    favoritePlaces: ['SOMA', 'Mission District', 'Castro', 'Hayes Valley']
  }
]

// Beautiful event data
const betaEvents = [
  {
    title: 'Sunset Yoga in Golden Gate Park',
    description: 'Join us for a peaceful sunset yoga session in the heart of Golden Gate Park. All levels welcome! Bring your own mat and water.',
    category: 'HEALTH',
    venue: 'Golden Gate Park',
    address: 'Golden Gate Park, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-01-15',
    startTime: '18:00',
    price: { min: 0, max: 0, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
    tags: ['yoga', 'outdoor', 'sunset', 'wellness', 'free'],
    creator: 'sarahj'
  },
  {
    title: 'Tech Startup Networking Mixer',
    description: 'Connect with fellow entrepreneurs, developers, and investors in the Bay Area startup scene. Food and drinks provided!',
    category: 'BUSINESS',
    venue: 'SOMA District',
    address: '123 Mission St, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-01-20',
    startTime: '19:00',
    price: { min: 25, max: 25, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop',
    tags: ['networking', 'startup', 'tech', 'business', 'professional'],
    creator: 'mikechen'
  },
  {
    title: 'Art Gallery Opening: Local Artists',
    description: 'Celebrate the opening of our new gallery featuring works from emerging Bay Area artists. Wine and light refreshments included.',
    category: 'ARTS',
    venue: 'Mission District Gallery',
    address: '456 Valencia St, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-01-25',
    startTime: '18:30',
    price: { min: 0, max: 0, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    tags: ['art', 'gallery', 'opening', 'local', 'culture'],
    creator: 'emmar'
  },
  {
    title: 'Basketball Tournament at UC Berkeley',
    description: '3v3 basketball tournament for all skill levels. Prizes for winners! Registration required.',
    category: 'SPORTS',
    venue: 'UC Berkeley Recreation Center',
    address: '2301 Bancroft Way, Berkeley, CA',
    city: 'Berkeley',
    startDate: '2025-01-18',
    startTime: '10:00',
    price: { min: 15, max: 15, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1546519638-68e1095ffc5c?w=800&h=600&fit=crop',
    tags: ['basketball', 'tournament', 'sports', 'competition', 'team'],
    creator: 'alexk'
  },
  {
    title: 'Live Music Night at The Fillmore',
    description: 'Experience the best of local indie bands at the historic Fillmore venue. Doors open at 8 PM.',
    category: 'MUSIC',
    venue: 'The Fillmore',
    address: '1805 Geary Blvd, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-01-22',
    startTime: '20:00',
    price: { min: 35, max: 50, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    tags: ['music', 'live', 'indie', 'concert', 'nightlife'],
    creator: 'jessw'
  },
  {
    title: 'Food & Wine Tasting Experience',
    description: 'Join us for an exclusive food and wine pairing event featuring local chefs and winemakers.',
    category: 'FOOD',
    venue: 'Ferry Building Marketplace',
    address: '1 Ferry Building, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-01-28',
    startTime: '17:00',
    price: { min: 75, max: 75, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    tags: ['food', 'wine', 'tasting', 'gourmet', 'local'],
    creator: 'davidm'
  },
  {
    title: 'Meditation & Mindfulness Workshop',
    description: 'Learn meditation techniques and mindfulness practices in a peaceful, supportive environment.',
    category: 'HEALTH',
    venue: 'Dolores Park',
    address: 'Dolores St & 19th St, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-01-30',
    startTime: '09:00',
    price: { min: 20, max: 20, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
    tags: ['meditation', 'mindfulness', 'wellness', 'peace', 'spiritual'],
    creator: 'lisap'
  },
  {
    title: 'Photography Walk: Street Art Tour',
    description: 'Capture the vibrant street art of the Mission District with professional photography tips.',
    category: 'ARTS',
    venue: 'Mission District',
    address: 'Mission St & 24th St, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-02-01',
    startTime: '14:00',
    price: { min: 30, max: 30, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop',
    tags: ['photography', 'street art', 'walking', 'creative', 'urban'],
    creator: 'ryano'
  },
  {
    title: 'Community Garden Volunteer Day',
    description: 'Help maintain our community garden and learn about sustainable urban farming practices.',
    category: 'HEALTH',
    venue: 'Oakland Community Garden',
    address: '1234 Fruitvale Ave, Oakland, CA',
    city: 'Oakland',
    startDate: '2025-02-05',
    startTime: '10:00',
    price: { min: 0, max: 0, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop',
    tags: ['volunteer', 'gardening', 'community', 'sustainable', 'outdoor'],
    creator: 'mariag'
  },
  {
    title: 'Board Game Night & Tournament',
    description: 'Join us for an epic board game night with tournaments, prizes, and snacks! All skill levels welcome.',
    category: 'ENTERTAINMENT',
    venue: 'Game Parlor SF',
    address: '789 Castro St, San Francisco, CA',
    city: 'San Francisco',
    startDate: '2025-02-08',
    startTime: '19:00',
    price: { min: 10, max: 10, currency: 'USD' },
    coverImage: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop',
    tags: ['board games', 'tournament', 'social', 'fun', 'competitive'],
    creator: 'kevinl'
  }
]

// Beautiful hangout data
const betaHangouts = [
  {
    title: 'Weekend Hiking Adventure to Muir Woods',
    description: 'Let\'s explore the beautiful redwood forests of Muir Woods! We\'ll do a moderate 3-mile loop with amazing views.',
    location: 'Muir Woods National Monument',
    startTime: '2025-01-19T09:00:00.000Z',
    endTime: '2025-01-19T15:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'ryano',
    options: [
      {
        id: 'option_1',
        title: 'Muir Woods Main Trail',
        description: 'Easy 2-mile loop through the redwoods',
        location: 'Muir Woods National Monument',
        dateTime: '2025-01-19T09:00:00.000Z',
        price: 0
      },
      {
        id: 'option_2',
        title: 'Dipsea Trail Challenge',
        description: 'Strenuous 7-mile hike with ocean views',
        location: 'Muir Woods to Stinson Beach',
        dateTime: '2025-01-19T09:00:00.000Z',
        price: 0
      }
    ]
  },
  {
    title: 'Foodie Tour of Mission District',
    description: 'Join us for a culinary adventure through the Mission! We\'ll visit 5 different restaurants and food trucks.',
    location: 'Mission District, San Francisco',
    startTime: '2025-01-21T12:00:00.000Z',
    endTime: '2025-01-21T18:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'davidm',
    options: [
      {
        id: 'option_1',
        title: 'Taco Crawl',
        description: 'Visit 4 authentic taquerias',
        location: 'Mission District',
        dateTime: '2025-01-21T12:00:00.000Z',
        price: 25
      },
      {
        id: 'option_2',
        title: 'Fine Dining Experience',
        description: '3-course meal at upscale restaurants',
        location: 'Mission District',
        dateTime: '2025-01-21T12:00:00.000Z',
        price: 85
      }
    ]
  },
  {
    title: 'Beach Volleyball at Ocean Beach',
    description: 'Let\'s play some beach volleyball and enjoy the sunset! All skill levels welcome.',
    location: 'Ocean Beach, San Francisco',
    startTime: '2025-01-23T16:00:00.000Z',
    endTime: '2025-01-23T20:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'alexk',
    options: [
      {
        id: 'option_1',
        title: 'Casual Play',
        description: 'Friendly games for fun',
        location: 'Ocean Beach',
        dateTime: '2025-01-23T16:00:00.000Z',
        price: 0
      }
    ]
  },
  {
    title: 'Art Gallery Hopping in SOMA',
    description: 'Explore the contemporary art scene in SOMA district. We\'ll visit 3 galleries and discuss the works.',
    location: 'SOMA District, San Francisco',
    startTime: '2025-01-26T14:00:00.000Z',
    endTime: '2025-01-26T18:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'emmar',
    options: [
      {
        id: 'option_1',
        title: 'Contemporary Art Tour',
        description: 'Visit 3 modern art galleries',
        location: 'SOMA District',
        dateTime: '2025-01-26T14:00:00.000Z',
        price: 15
      }
    ]
  },
  {
    title: 'Karaoke Night at The Castro',
    description: 'Sing your heart out at our favorite karaoke bar! Private room for our group.',
    location: 'The Castro, San Francisco',
    startTime: '2025-01-24T20:00:00.000Z',
    endTime: '2025-01-25T01:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    privacyLevel: 'FRIENDS_ONLY',
    creator: 'jessw',
    options: [
      {
        id: 'option_1',
        title: 'Private Karaoke Room',
        description: 'Private room with full bar service',
        location: 'Castro District',
        dateTime: '2025-01-24T20:00:00.000Z',
        price: 20
      }
    ]
  },
  {
    title: 'Morning Yoga Flow in Dolores Park',
    description: 'Start your day with a peaceful yoga session in the beautiful Dolores Park.',
    location: 'Dolores Park, San Francisco',
    startTime: '2025-01-27T08:00:00.000Z',
    endTime: '2025-01-27T09:30:00.000Z',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'lisap',
    options: [
      {
        id: 'option_1',
        title: 'Vinyasa Flow',
        description: 'Dynamic yoga practice for all levels',
        location: 'Dolores Park',
        dateTime: '2025-01-27T08:00:00.000Z',
        price: 0
      }
    ]
  },
  {
    title: 'Tech Meetup & Networking',
    description: 'Connect with fellow developers and entrepreneurs. Lightning talks and networking session.',
    location: 'SOMA District, San Francisco',
    startTime: '2025-01-29T18:00:00.000Z',
    endTime: '2025-01-29T21:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'mikechen',
    options: [
      {
        id: 'option_1',
        title: 'Tech Talks & Networking',
        description: 'Lightning talks followed by networking',
        location: 'SOMA District',
        dateTime: '2025-01-29T18:00:00.000Z',
        price: 0
      }
    ]
  },
  {
    title: 'Photography Workshop: Street Photography',
    description: 'Learn street photography techniques while exploring the vibrant Mission District.',
    location: 'Mission District, San Francisco',
    startTime: '2025-02-02T10:00:00.000Z',
    endTime: '2025-02-02T16:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'ryano',
    options: [
      {
        id: 'option_1',
        title: 'Street Photography Workshop',
        description: 'Hands-on workshop with professional guidance',
        location: 'Mission District',
        dateTime: '2025-02-02T10:00:00.000Z',
        price: 45
      }
    ]
  },
  {
    title: 'Community Garden Work Day',
    description: 'Help maintain our community garden and learn about sustainable urban farming.',
    location: 'Oakland Community Garden',
    startTime: '2025-02-06T09:00:00.000Z',
    endTime: '2025-02-06T13:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop',
    privacyLevel: 'PUBLIC',
    creator: 'mariag',
    options: [
      {
        id: 'option_1',
        title: 'Garden Maintenance',
        description: 'Planting, weeding, and general maintenance',
        location: 'Oakland Community Garden',
        dateTime: '2025-02-06T09:00:00.000Z',
        price: 0
      }
    ]
  },
  {
    title: 'Board Game Tournament Night',
    description: 'Compete in our monthly board game tournament! Prizes for top 3 players.',
    location: 'Game Parlor SF',
    startTime: '2025-02-09T18:00:00.000Z',
    endTime: '2025-02-09T23:00:00.000Z',
    image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop',
    privacyLevel: 'FRIENDS_ONLY',
    creator: 'kevinl',
    options: [
      {
        id: 'option_1',
        title: 'Tournament Play',
        description: 'Competitive board game tournament',
        location: 'Game Parlor SF',
        dateTime: '2025-02-09T18:00:00.000Z',
        price: 15
      }
    ]
  }
]

async function seedProductionBeta() {
  try {
    console.log('🚀 Starting production beta seed...')

    // Step 1: Clean up existing data
    console.log('🧹 Cleaning up existing data...')
    await db.PollVote.deleteMany()
    await db.polls.deleteMany()
    await db.rsvp.deleteMany()
    await db.content_participants.deleteMany()
    await db.EventSave.deleteMany()
    await db.content_likes.deleteMany()
    await db.content_shares.deleteMany()
    await db.comments.deleteMany()
    await db.photos.deleteMany()
    await db.messages.deleteMany()
    await db.content.deleteMany()
    await db.Friendship.deleteMany()
    
    // Keep existing users but clean up their data
    const existingUsers = await db.User.findMany()
    for (const user of existingUsers) {
      await db.User.update({
        where: { id: user.id },
        data: {
          favoriteActivities: "[]",
          favoritePlaces: "[]",
          bio: null,
          location: null
        }
      })
    }

    // Step 2: Create or update beta users
    console.log('👥 Creating beta users...')
    const createdUsers = []
    
    for (const userData of betaUsers) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const user = await db.User.upsert({
        where: { email: userData.email },
        update: {
          username: userData.username,
          name: userData.name,
          bio: userData.bio,
          location: userData.location,
          favoriteActivities: JSON.stringify(userData.favoriteActivities),
          favoritePlaces: JSON.stringify(userData.favoritePlaces),
          password: hashedPassword,
          isActive: true,
          isVerified: true
        },
        create: {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          bio: userData.bio,
          location: userData.location,
          favoriteActivities: JSON.stringify(userData.favoriteActivities),
          favoritePlaces: JSON.stringify(userData.favoritePlaces),
          password: hashedPassword,
          role: 'USER',
          isActive: true,
          isVerified: true
        }
      })
      
      createdUsers.push(user)
      console.log(`✅ Created/updated user: ${user.name} (${user.username})`)
    }

    // Step 3: Create friendships (everyone friends with everyone for beta)
    console.log('🤝 Creating friendships...')
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        await db.Friendship.create({
          data: {
            userId: createdUsers[i].id,
            friendId: createdUsers[j].id,
            status: 'ACTIVE'
          }
        })
        console.log(`✅ Created friendship: ${createdUsers[i].name} ↔ ${createdUsers[j].name}`)
      }
    }

    // Step 4: Create events
    console.log('🎉 Creating events...')
    for (const eventData of betaEvents) {
      const creator = createdUsers.find(u => u.username === eventData.creator)
      if (!creator) continue

      const event = await db.content.create({
        data: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'EVENT',
          title: eventData.title,
          description: eventData.description,
          venue: eventData.venue,
          address: eventData.address,
          city: eventData.city,
          startTime: new Date(`${eventData.startDate}T${eventData.startTime}:00.000Z`),
          endTime: new Date(`${eventData.startDate}T${eventData.startTime}:00.000Z`),
          priceMin: eventData.price.min,
          priceMax: eventData.price.max,
          currency: eventData.price.currency,
          image: eventData.coverImage,
          status: 'PUBLISHED',
          privacyLevel: 'PUBLIC',
          creatorId: creator.id,
          attendeeCount: Math.floor(Math.random() * 20) + 5,
          updatedAt: new Date()
        }
      })

      // Create event tags
      for (const tag of eventData.tags) {
        await db.EventTag.create({
          data: {
            tag: tag,
            contentId: event.id
          }
        })
      }

      // Create some random RSVPs
      const randomUsers = createdUsers.filter(u => u.id !== creator.id)
      const rsvpCount = Math.floor(Math.random() * 5) + 2
      const usedUsers = new Set()
      for (let i = 0; i < rsvpCount && usedUsers.size < randomUsers.length; i++) {
        let user
        do {
          user = randomUsers[Math.floor(Math.random() * randomUsers.length)]
        } while (usedUsers.has(user.id))
        
        usedUsers.add(user.id)
        await db.rsvp.create({
          data: {
            contentId: event.id,
            userId: user.id,
            status: ['YES', 'MAYBE', 'NO'][Math.floor(Math.random() * 3)],
            respondedAt: new Date()
          }
        })
      }

      console.log(`✅ Created event: ${event.title}`)
    }

    // Step 5: Create hangouts
    console.log('🎯 Creating hangouts...')
    for (const hangoutData of betaHangouts) {
      const creator = createdUsers.find(u => u.username === hangoutData.creator)
      if (!creator) continue

      const hangout = await db.content.create({
        data: {
          id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'HANGOUT',
          title: hangoutData.title,
          description: hangoutData.description,
          location: hangoutData.location,
          startTime: new Date(hangoutData.startTime),
          endTime: new Date(hangoutData.endTime),
          image: hangoutData.image,
          status: 'PUBLISHED',
          privacyLevel: hangoutData.privacyLevel,
          creatorId: creator.id,
          priceMin: 0,
          priceMax: 0,
          currency: 'USD',
          updatedAt: new Date()
        }
      })

      // Add creator as participant
      await db.content_participants.create({
        data: {
          id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout.id,
          userId: creator.id,
          role: 'CREATOR',
          canEdit: true,
          isMandatory: true,
          joinedAt: new Date()
        }
      })

      // Create poll if there are multiple options
      if (hangoutData.options && hangoutData.options.length > 1) {
        const poll = await db.polls.create({
          data: {
            id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangout.id,
            creatorId: creator.id,
            title: `Choose your preferred option for ${hangoutData.title}`,
            description: 'Vote for your preferred option',
            options: hangoutData.options,
            allowMultiple: false,
            isAnonymous: false,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            consensusPercentage: 60,
            minimumParticipants: 2,
            consensusType: 'MAJORITY',
            status: 'ACTIVE',
            isPublic: true,
            visibility: 'PUBLIC'
          }
        })

        // Add some random votes
        const randomUsers = createdUsers.filter(u => u.id !== creator.id)
        const voteCount = Math.floor(Math.random() * 3) + 1
        for (let i = 0; i < voteCount; i++) {
          const user = randomUsers[Math.floor(Math.random() * randomUsers.length)]
          const option = hangoutData.options[Math.floor(Math.random() * hangoutData.options.length)]
          await db.pollVote.create({
            data: {
              pollId: poll.id,
              userId: user.id,
              option: option.id,
              voteType: 'SINGLE',
              weight: 1.0,
              isPreferred: Math.random() > 0.5
            }
          })
        }
      }

      // Add some random participants
      const randomUsers = createdUsers.filter(u => u.id !== creator.id)
      const participantCount = Math.floor(Math.random() * 4) + 1
      for (let i = 0; i < participantCount; i++) {
        const user = randomUsers[Math.floor(Math.random() * randomUsers.length)]
        await db.content_participants.create({
          data: {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangout.id,
            userId: user.id,
            role: 'MEMBER',
            canEdit: false,
            isMandatory: false,
            joinedAt: new Date()
          }
        })
      }

      // Add some random RSVPs
      const rsvpCount = Math.floor(Math.random() * 5) + 2
      const usedUsers = new Set()
      for (let i = 0; i < rsvpCount && usedUsers.size < randomUsers.length; i++) {
        let user
        do {
          user = randomUsers[Math.floor(Math.random() * randomUsers.length)]
        } while (usedUsers.has(user.id))
        
        usedUsers.add(user.id)
        await db.rsvp.create({
          data: {
            contentId: hangout.id,
            userId: user.id,
            status: ['YES', 'MAYBE', 'NO'][Math.floor(Math.random() * 3)],
            respondedAt: new Date()
          }
        })
      }

      console.log(`✅ Created hangout: ${hangout.title}`)
    }

    console.log('🎉 Production beta seed completed successfully!')
    console.log(`📊 Created ${createdUsers.length} users with full friendships`)
    console.log(`📊 Created ${betaEvents.length} events`)
    console.log(`📊 Created ${betaHangouts.length} hangouts`)
    console.log('🚀 Your beta users are ready for testing!')

  } catch (error) {
    console.error('❌ Error seeding production beta:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run the seed
seedProductionBeta()
  .then(() => {
    console.log('✅ Seed completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
