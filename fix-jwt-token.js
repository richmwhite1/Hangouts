const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random';

// Test with correct payload structure
const correctPayload = {
  userId: 'cmfq75h2v0000jpf08u3kfi6b',  // Note: userId, not id
  email: 'bill@example.com',
  username: 'bill'
};

const token = jwt.sign(correctPayload, JWT_SECRET, { expiresIn: '7d' });

console.log('Correct JWT Token:', token);
console.log('Decoded payload:', jwt.verify(token, JWT_SECRET));

// Test the polls API with correct token
async function testPollsWithCorrectToken() {
  try {
    const response = await fetch('http://localhost:3000/api/hangouts/hangout_1758511366656_plvc93u5a/polls-simple', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Polls API Success with correct token');
      console.log('Polls count:', data.polls?.length || 0);
      if (data.polls && data.polls.length > 0) {
        console.log('First poll:', {
          id: data.polls[0].id,
          title: data.polls[0].title,
          isActive: data.polls[0].isActive,
          consensusReached: data.polls[0].consensusReached
        });
      }
    } else {
      console.error('❌ Polls API failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPollsWithCorrectToken();













