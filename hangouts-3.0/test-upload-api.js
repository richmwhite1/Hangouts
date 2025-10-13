const FormData = require('form-data');
const fs = require('fs');

async function testUploadAPI() {
  try {
    console.log('Testing upload API...');
    
    // Create a simple test image file
    const testImagePath = 'test-image.txt';
    fs.writeFileSync(testImagePath, 'This is a test file');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath));
    form.append('type', 'hangout');
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer test-token'
      },
      body: form
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    // Clean up
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUploadAPI();
