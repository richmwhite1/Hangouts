const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function checkFavoritesFields() {
  try {
    console.log('Checking favorites fields in production database...\n');
    
    // Check if the fields exist by trying to query them
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        favoriteActivities: true,
        favoritePlaces: true
      },
      take: 5
    });
    
    console.log(`Found ${users.length} users with favorites fields:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username})`);
      console.log(`   Favorite Activities: ${user.favoriteActivities || 'null'}`);
      console.log(`   Favorite Places: ${user.favoritePlaces || 'null'}`);
      console.log('');
    });
    
    // Test updating favorites for a user
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`Testing favorites update for ${testUser.name}...`);
      
      const testActivities = ['Hiking', 'Reading', 'Cooking'];
      const testPlaces = ['Coffee Shops', 'Parks', 'Museums'];
      
      const updatedUser = await db.user.update({
        where: { id: testUser.id },
        data: {
          favoriteActivities: JSON.stringify(testActivities),
          favoritePlaces: JSON.stringify(testPlaces)
        },
        select: {
          id: true,
          name: true,
          favoriteActivities: true,
          favoritePlaces: true
        }
      });
      
      console.log('✅ Favorites update successful!');
      console.log(`Updated activities: ${updatedUser.favoriteActivities}`);
      console.log(`Updated places: ${updatedUser.favoritePlaces}`);
      
      // Parse and verify the JSON
      try {
        const parsedActivities = JSON.parse(updatedUser.favoriteActivities);
        const parsedPlaces = JSON.parse(updatedUser.favoritePlaces);
        console.log('✅ JSON parsing successful!');
        console.log(`Parsed activities: ${JSON.stringify(parsedActivities)}`);
        console.log(`Parsed places: ${JSON.stringify(parsedPlaces)}`);
      } catch (e) {
        console.log('❌ JSON parsing failed:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Error checking favorites fields:', error);
    
    // If the fields don't exist, try to add them
    if (error.message.includes('Unknown column') || error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n🔧 Attempting to add missing favorites fields...');
      
      try {
        // Add favoriteActivities column
        await db.$executeRaw`
          ALTER TABLE "users" 
          ADD COLUMN "favoriteActivities" TEXT DEFAULT '[]'
        `;
        console.log('✅ Added favoriteActivities column');
        
        // Add favoritePlaces column
        await db.$executeRaw`
          ALTER TABLE "users" 
          ADD COLUMN "favoritePlaces" TEXT DEFAULT '[]'
        `;
        console.log('✅ Added favoritePlaces column');
        
        // Update existing users with default values
        await db.user.updateMany({
          where: {
            OR: [
              { favoriteActivities: null },
              { favoritePlaces: null }
            ]
          },
          data: {
            favoriteActivities: '[]',
            favoritePlaces: '[]'
          }
        });
        
        console.log('✅ Updated existing users with default values');
        console.log('🎉 Database schema fixed! Please run the check again.');
        
      } catch (addError) {
        console.error('❌ Failed to add fields:', addError);
      }
    }
  } finally {
    await db.$disconnect();
  }
}

checkFavoritesFields();
