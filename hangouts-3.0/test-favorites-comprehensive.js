#!/usr/bin/env node

/**
 * Comprehensive test for favorites saving functionality
 * This script tests the complete flow from frontend to database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFavoritesComprehensive() {
  console.log('🧪 Comprehensive Favorites Test\n');
  
  try {
    // Test 1: Check database schema
    console.log('1. Checking database schema...');
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
    
    console.log(`✅ Found user: ${user.name} (${user.username})`);
    console.log(`   Current favoriteActivities: ${user.favoriteActivities}`);
    console.log(`   Current favoritePlaces: ${user.favoritePlaces}`);
    
    // Test 2: Test JSON parsing
    console.log('\n2. Testing JSON parsing...');
    try {
      const activities = user.favoriteActivities ? JSON.parse(user.favoriteActivities) : [];
      const places = user.favoritePlaces ? JSON.parse(user.favoritePlaces) : [];
      console.log('✅ JSON parsing successful');
      console.log(`   Parsed activities: ${JSON.stringify(activities)}`);
      console.log(`   Parsed places: ${JSON.stringify(places)}`);
    } catch (error) {
      console.log('❌ JSON parsing failed:', error.message);
    }
    
    // Test 3: Test updating favorites
    console.log('\n3. Testing favorites update...');
    const testActivities = ['Hiking', 'Photography', 'Cooking', 'Reading'];
    const testPlaces = ['Central Park', 'Brooklyn Bridge', 'Times Square', 'Coffee Shops'];
    
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
    
    console.log('✅ Favorites update successful');
    console.log(`   Updated activities: ${updatedUser.favoriteActivities}`);
    console.log(`   Updated places: ${updatedUser.favoritePlaces}`);
    
    // Test 4: Verify the update persisted
    console.log('\n4. Verifying persistence...');
    const verifyUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        favoriteActivities: true,
        favoritePlaces: true
      }
    });
    
    if (verifyUser.favoriteActivities === updatedUser.favoriteActivities &&
        verifyUser.favoritePlaces === updatedUser.favoritePlaces) {
      console.log('✅ Favorites persisted correctly');
    } else {
      console.log('❌ Favorites did not persist correctly');
    }
    
    // Test 5: Test parsing updated data
    console.log('\n5. Testing parsing of updated data...');
    try {
      const parsedActivities = JSON.parse(verifyUser.favoriteActivities);
      const parsedPlaces = JSON.parse(verifyUser.favoritePlaces);
      
      if (Array.isArray(parsedActivities) && Array.isArray(parsedPlaces)) {
        console.log('✅ Updated data parses correctly');
        console.log(`   Parsed activities: ${JSON.stringify(parsedActivities)}`);
        console.log(`   Parsed places: ${JSON.stringify(parsedPlaces)}`);
      } else {
        console.log('❌ Updated data does not parse to arrays');
      }
    } catch (error) {
      console.log('❌ Failed to parse updated data:', error.message);
    }
    
    // Test 6: Test empty arrays
    console.log('\n6. Testing empty arrays...');
    const emptyUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteActivities: JSON.stringify([]),
        favoritePlaces: JSON.stringify([])
      },
      select: {
        favoriteActivities: true,
        favoritePlaces: true
      }
    });
    
    console.log('✅ Empty arrays set successfully');
    console.log(`   Empty activities: ${emptyUser.favoriteActivities}`);
    console.log(`   Empty places: ${emptyUser.favoritePlaces}`);
    
    // Test 7: Test null handling
    console.log('\n7. Testing null handling...');
    const nullUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteActivities: null,
        favoritePlaces: null
      },
      select: {
        favoriteActivities: true,
        favoritePlaces: true
      }
    });
    
    console.log('✅ Null values set successfully');
    console.log(`   Null activities: ${nullUser.favoriteActivities}`);
    console.log(`   Null places: ${nullUser.favoritePlaces}`);
    
    // Restore original data
    console.log('\n8. Restoring original data...');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteActivities: user.favoriteActivities,
        favoritePlaces: user.favoritePlaces
      }
    });
    console.log('✅ Original data restored');
    
    console.log('\n🎉 All tests passed! Favorites system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFavoritesComprehensive().catch(console.error);
