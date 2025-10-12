// Test favorites saving functionality
const { PrismaClient } = require('@prisma/client');

async function testFavoritesSaving() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing favorites saving functionality...\n');
    
    // Get a user to test with
    const user = await prisma.user.findFirst({
      where: {
        clerkId: { not: null }
      },
      select: {
        id: true,
        username: true,
        name: true,
        favoriteActivities: true,
        favoritePlaces: true
      }
    });
    
    if (!user) {
      console.log('❌ No user with Clerk ID found');
      return;
    }
    
    console.log(`Testing with user: ${user.name} (${user.username})`);
    console.log(`Current favoriteActivities: ${user.favoriteActivities}`);
    console.log(`Current favoritePlaces: ${user.favoritePlaces}`);
    
    // Test updating favorites
    const testActivities = ['Hiking', 'Photography', 'Cooking'];
    const testPlaces = ['Central Park', 'Brooklyn Bridge', 'Times Square'];
    
    console.log('\n📝 Testing favorites update...');
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteActivities: JSON.stringify(testActivities),
        favoritePlaces: JSON.stringify(testPlaces)
      },
      select: {
        id: true,
        favoriteActivities: true,
        favoritePlaces: true
      }
    });
    
    console.log('✅ Favorites updated successfully!');
    console.log(`Updated favoriteActivities: ${updatedUser.favoriteActivities}`);
    console.log(`Updated favoritePlaces: ${updatedUser.favoritePlaces}`);
    
    // Test parsing the JSON
    try {
      const parsedActivities = JSON.parse(updatedUser.favoriteActivities);
      const parsedPlaces = JSON.parse(updatedUser.favoritePlaces);
      console.log('\n✅ JSON parsing works correctly:');
      console.log(`Parsed activities: ${JSON.stringify(parsedActivities)}`);
      console.log(`Parsed places: ${JSON.stringify(parsedPlaces)}`);
    } catch (e) {
      console.log('❌ JSON parsing failed:', e.message);
    }
    
    // Reset to original values
    await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteActivities: user.favoriteActivities,
        favoritePlaces: user.favoritePlaces
      }
    });
    
    console.log('\n🔄 Reset to original values');
    
  } catch (error) {
    console.error('Error testing favorites:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFavoritesSaving();
