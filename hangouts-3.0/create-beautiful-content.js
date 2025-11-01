const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const db = new PrismaClient();

// Beautiful placeholder images (base64 encoded small images)
const images = {
  coffee: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkY2QjM1Ii8+CjxjaXJjbGUgY3g9IjQwMCIgY3k9IjMwMCIgcj0iMTAwIiBmaWxsPSIjRkZCODQ0Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMzUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj5Db2ZmZWU8L3RleHQ+Cjwvc3ZnPgo=',
  beach: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjMDA5OUZGIi8+CjxyZWN0IHg9IjAiIHk9IjQwMCIgd2lkdGg9IjgwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGRkY0QzMiLz4KPGNpcmNsZSBjeD0iMjAwIiBjeT0iMzAwIiByPSI1MCIgZmlsbD0iI0ZGRkZGRiIvPgo8dGV4dCB4PSI0MDAiIHk9IjM1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+QmVhY2g8L3RleHQ+Cjwvc3ZnPgo=',
  art: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjOUI1Q0Y2Ii8+CjxyZWN0IHg9IjEwMCIgeT0iMTAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSIyMDAiIHI9IjUwIiBmaWxsPSIjRkY2QjM1Ii8+CjxjaXJjbGUgY3g9IjQwMCIgY3k9IjMwMCIgcj0iNDAiIGZpbGw9IiNGRkI4NDQiLz4KPGNpcmNsZSBjeD0iNjAwIiBjeT0iMjUwIiByPSIzMCIgZmlsbD0iIzAwOTlGRiIvPgo8dGV4dCB4PSI0MDAiIHk9IjU1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+QXJ0PC90ZXh0Pgo8L3N2Zz4K',
  food: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkZCODQ0Ii8+CjxyZWN0IHg9IjEwMCIgeT0iMjAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGNkIzNSIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSIzMDAiIHI9IjMwIiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjQwMCIgY3k9IjMwMCIgcj0iMzAiIGZpbGw9IiNGRkZGRkYiLz4KPGNpcmNsZSBjeD0iNjAwIiBjeT0iMzAwIiByPSIzMCIgZmlsbD0iI0ZGRkZGRiIvPgo8dGV4dCB4PSI0MDAiIHk9IjU1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+Rm9vZDwvdGV4dD4KPC9zdmc+Cg==',
  hiking: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjMDBGRjAwIi8+Cjxwb2x5Z29uIHBvaW50cz0iNDAwLDEwMCA1MDAsMjAwIDYwMCwxMDAgNzAwLDIwMCA4MDAsMTAwIDgwMCw2MDAgMCw2MDAgMCwxMDAiIGZpbGw9IiM4QjVDRkYiLz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iMzAwIiByPSI0MCIgZmlsbD0iI0ZGRkZGRiIvPgo8dGV4dCB4PSI0MDAiIHk9IjU1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+SGlraW5nPC90ZXh0Pgo8L3N2Zz4K',
  music: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkY2QjM1Ii8+CjxyZWN0IHg9IjMwMCIgeT0iMjAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSIzNTAiIGN5PSIzMDAiIHI9IjIwIiBmaWxsPSIjRkY2QjM1Ii8+CjxjaXJjbGUgY3g9IjQ1MCIgY3k9IjMwMCIgcj0iMjAiIGZpbGw9IiNGRkI4NDQiLz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iMzUwIiByPSIxNSIgZmlsbD0iIzAwOTlGRiIvPgo8dGV4dCB4PSI0MDAiIHk9IjU1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+TXVzaWM8L3RleHQ+Cjwvc3ZnPgo=',
  sports: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjMDA5OUZGIi8+CjxyZWN0IHg9IjMwMCIgeT0iMjAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSI0MDAiIGN5PSIzMDAiIHI9IjgwIiBmaWxsPSIjRkY2QjM1Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iNTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj5TcG9ydHM8L3RleHQ+Cjwvc3ZnPgo=',
  tech: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjOUI1Q0Y2Ii8+CjxyZWN0IHg9IjEwMCIgeT0iMTAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI0ZGRkZGRiIvPgo8cmVjdCB4PSIyMDAiIHk9IjIwMCIgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGRjZCMzUiLz4KPGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSIyMCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMDAiIHI9IjIwIiBmaWxsPSIjRkZGRkZGIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj5UZWNoPC90ZXh0Pgo8L3N2Zz4K',
  gaming: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkY2QjM1Ii8+CjxyZWN0IHg9IjIwMCIgeT0iMjAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0ZGRkZGRiIvPgo8Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjMwIiBmaWxsPSIjRkY2QjM1Ii8+CjxjaXJjbGUgY3g9IjUwMCIgY3k9IjMwMCIgcj0iMzAiIGZpbGw9IiNGRkI4NDQiLz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iMzUwIiByPSIyMCIgZmlsbD0iIzAwOTlGRiIvPgo8dGV4dCB4PSI0MDAiIHk9IjU1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+R2FtaW5nPC90ZXh0Pgo8L3N2Zz4K',
  party: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRkY2QjM1Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iNTAiIGZpbGw9IiNGRkZGRkYiLz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iMjAwIiByPSI1MCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iNjAwIiBjeT0iMjAwIiByPSI1MCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSI0MCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iNTAwIiBjeT0iMzAwIiByPSI0MCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iNDAwIiByPSIzMCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iNTAwIiByPSIyMCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iNTUwIiByPSIxMCIgZmlsbD0iI0ZGRkZGRiIvPz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iNTkwIiByPSI1IiBmaWxsPSIjRkZGRkZGIi8vPgo8dGV4dCB4PSI0MDAiIHk9IjU1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+UGFydHk8L3RleHQ+Cjwvc3ZnPgo='
};

// Function to save base64 image to file
function saveBase64Image(base64Data, filename) {
  const base64String = base64Data.split(',')[1];
  const buffer = Buffer.from(base64String, 'base64');
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'hangout', filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/hangout/${filename}`;
}

async function createBeautifulContent() {
  try {
    console.log('Creating beautiful hangouts and events...');

    // Get or create a test user
    let user = await db.user.findFirst({
      where: { username: 'testuser' }
    });

    if (!user) {
      console.log('Creating test user...');
      user = await db.user.create({
        data: {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          clerkId: `clerk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: `testuser_${Date.now()}@example.com`,
          username: 'testuser',
          name: 'Test User',
          role: 'USER',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('Test user created:', user.username);
    } else {
      console.log('Found user:', user.username);
    }

    // Clear existing test content
    await db.content.deleteMany({
      where: {
        creatorId: user.id,
        title: {
          in: [
            "Weekend Coffee Meetup",
            "Beach Volleyball Tournament", 
            "Art Gallery Opening",
            "Food Truck Festival",
            "Hiking Adventure",
            "Live Music Night",
            "Basketball Game",
            "Tech Meetup",
            "Gaming Tournament",
            "Birthday Party"
          ]
        }
      }
    });
    console.log('Cleared old test content.');

    // Create 5 beautiful hangouts
    const hangoutsData = [
      {
        title: "Weekend Coffee Meetup",
        description: "Join us for a relaxing coffee and conversation at our favorite local cafe. Perfect way to start your weekend!",
        location: "Downtown Coffee Shop",
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        image: saveBase64Image(images.coffee, 'coffee_meetup.webp'),
        privacyLevel: "PUBLIC",
        type: "HANGOUT"
      },
      {
        title: "Beach Volleyball Tournament",
        description: "Friendly volleyball tournament at the beach! All skill levels welcome. Bring sunscreen and water!",
        location: "Santa Monica Beach",
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        image: saveBase64Image(images.beach, 'beach_volleyball.webp'),
        privacyLevel: "PUBLIC",
        type: "HANGOUT"
      },
      {
        title: "Art Gallery Opening",
        description: "Explore new contemporary art at the downtown gallery. Wine and cheese reception included!",
        location: "Downtown Art Gallery",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        image: saveBase64Image(images.art, 'art_gallery.webp'),
        privacyLevel: "PUBLIC",
        type: "HANGOUT"
      },
      {
        title: "Food Truck Festival",
        description: "Taste delicious food from various food trucks. Live music and family-friendly activities!",
        location: "City Park",
        startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        image: saveBase64Image(images.food, 'food_truck_festival.webp'),
        privacyLevel: "PUBLIC",
        type: "HANGOUT"
      },
      {
        title: "Hiking Adventure",
        description: "Scenic hike in the local mountains. Moderate difficulty, bring water and snacks!",
        location: "Griffith Park Trails",
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        image: saveBase64Image(images.hiking, 'hiking_adventure.webp'),
        privacyLevel: "PUBLIC",
        type: "HANGOUT"
      }
    ];

    // Create 5 beautiful events
    const eventsData = [
      {
        title: "Live Music Night",
        description: "Local bands performing live music. Great atmosphere and drinks available!",
        location: "The Music Venue",
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        image: saveBase64Image(images.music, 'live_music.webp'),
        privacyLevel: "PUBLIC",
        type: "EVENT"
      },
      {
        title: "Basketball Game",
        description: "Pick-up basketball game at the community center. All skill levels welcome!",
        location: "Community Center Gym",
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        image: saveBase64Image(images.sports, 'basketball_game.webp'),
        privacyLevel: "PUBLIC",
        type: "EVENT"
      },
      {
        title: "Tech Meetup",
        description: "Discuss the latest in technology and networking. Pizza and drinks provided!",
        location: "Tech Hub",
        startTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
        endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        image: saveBase64Image(images.tech, 'tech_meetup.webp'),
        privacyLevel: "PUBLIC",
        type: "EVENT"
      },
      {
        title: "Gaming Tournament",
        description: "Video game tournament with prizes! Bring your own controller or use ours.",
        location: "Gaming Lounge",
        startTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
        endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        image: saveBase64Image(images.gaming, 'gaming_tournament.webp'),
        privacyLevel: "PUBLIC",
        type: "EVENT"
      },
      {
        title: "Birthday Party",
        description: "Celebrate Sarah's birthday with food, drinks, and dancing!",
        location: "Sarah's House",
        startTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        image: saveBase64Image(images.party, 'birthday_party.webp'),
        privacyLevel: "PUBLIC",
        type: "EVENT"
      }
    ];

    // Create all content
    const allContent = [...hangoutsData, ...eventsData];

    for (const data of allContent) {
      const content = await db.content.create({
        data: {
          id: `${data.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: data.type,
          title: data.title,
          description: data.description,
          location: data.location,
          startTime: data.startTime,
          endTime: data.endTime,
          privacyLevel: data.privacyLevel,
          creatorId: user.id,
          image: data.image,
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Created ${data.type.toLowerCase()}:`, content.title);

      // Add creator as a participant
      await db.content_participants.create({
        data: {
          id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: content.id,
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

    console.log('✅ Successfully created beautiful content!');
    console.log('- 5 hangouts with beautiful images');
    console.log('- 5 events with beautiful images');
    console.log('- All content is published and ready to view');
    console.log('- Images saved to public/uploads/hangout/');

  } catch (error) {
    console.error('Error creating beautiful content:', error);
  } finally {
    await db.$disconnect();
  }
}

createBeautifulContent();

