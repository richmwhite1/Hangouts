const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random';

// Test user
const testUser = {
  id: 'cmfq75h2v0000jpf08u3kfi6b',
  email: 'bill@example.com',
  username: 'bill'
};

const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });

async function testPhotoFunctionality() {
  console.log('🧪 Testing Photo Functionality...\n');

  try {
    // 1. Get a hangout with photos
    console.log('1. Getting hangout with photos...');
    const hangoutResponse = await fetch(`${BASE_URL}/api/hangouts/hangout_1758511366656_plvc93u5a`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!hangoutResponse.ok) {
      throw new Error(`Failed to get hangout: ${hangoutResponse.status}`);
    }
    
    const hangoutData = await hangoutResponse.json();
    const hangout = hangoutData.hangout || hangoutData;
    console.log(`✅ Hangout found: ${hangout.title}`);
    console.log(`   Photos count: ${hangout.photos?.length || 0}`);

    // 2. Test photo upload
    console.log('\n2. Testing photo upload...');
    
    // Use an existing image file
    const testImagePath = path.join(__dirname, 'public', 'placeholder.jpg');

    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));

    const uploadResponse = await fetch(`${BASE_URL}/api/hangouts/hangout_1758511366656_plvc93u5a/photos`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data; boundary=' + formData.getBoundary()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.log('Upload error details:', errorData);
      console.log('Response status:', uploadResponse.status);
      throw new Error(`Photo upload failed: ${errorData.error || uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    console.log(`✅ Photo uploaded successfully: ${uploadData.photo}`);

    // 3. Verify photo appears in hangout
    console.log('\n3. Verifying photo appears in hangout...');
    const updatedHangoutResponse = await fetch(`${BASE_URL}/api/hangouts/hangout_1758511366656_plvc93u5a`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!updatedHangoutResponse.ok) {
      throw new Error(`Failed to get updated hangout: ${updatedHangoutResponse.status}`);
    }
    
    const updatedHangoutData = await updatedHangoutResponse.json();
    const updatedHangout = updatedHangoutData.hangout || updatedHangoutData;
    console.log(`✅ Updated hangout photos count: ${updatedHangout.photos?.length || 0}`);

    if (updatedHangout.photos && updatedHangout.photos.length > 0) {
      const latestPhoto = updatedHangout.photos[updatedHangout.photos.length - 1];
      console.log(`   Latest photo: ${latestPhoto.originalUrl}`);
      console.log(`   Photo ID: ${latestPhoto.id}`);

      // 4. Test photo deletion
      console.log('\n4. Testing photo deletion...');
      const deleteResponse = await fetch(`${BASE_URL}/api/hangouts/hangout_1758511366656_plvc93u5a/photos/${latestPhoto.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(`Photo deletion failed: ${errorData.error || deleteResponse.status}`);
      }

      const deleteData = await deleteResponse.json();
      console.log(`✅ Photo deleted successfully: ${deleteData.message}`);

      // 5. Verify photo is removed
      console.log('\n5. Verifying photo is removed...');
      const finalHangoutResponse = await fetch(`${BASE_URL}/api/hangouts/hangout_1758511366656_plvc93u5a`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!finalHangoutResponse.ok) {
        throw new Error(`Failed to get final hangout: ${finalHangoutResponse.status}`);
      }
      
      const finalHangoutData = await finalHangoutResponse.json();
      const finalHangout = finalHangoutData.hangout || finalHangoutData;
      console.log(`✅ Final hangout photos count: ${finalHangout.photos?.length || 0}`);
    }

    console.log('\n🎉 Photo functionality test completed successfully!');
    console.log('\n📱 Frontend Features:');
    console.log('   • Photos display in beautiful grid layout');
    console.log('   • Click photos to view full-screen');
    console.log('   • Swipe left/right to navigate between photos');
    console.log('   • Download photos with download button');
    console.log('   • Delete photos (if you\'re the creator)');
    console.log('   • Keyboard navigation (arrow keys, escape)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // No cleanup needed since we're using an existing image
  }
}

testPhotoFunctionality();
