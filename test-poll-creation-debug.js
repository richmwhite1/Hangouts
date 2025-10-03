const jwt = require('jsonwebtoken');

const JWT_SECRET = "your-super-secret-jwt-key-here-make-it-long-and-random";

// Generate a valid JWT token for Bill
function generateToken(userId, username, name, avatar) {
  return jwt.sign({ userId, username, name, avatar }, JWT_SECRET, { expiresIn: '1h' });
}

async function testPollCreation() {
  console.log('🧪 Testing Poll Creation with Debug...');

  // Generate token for Bill
  const billUserId = "cmfq75h2v0000jpf08u3kfi6b";
  const billUsername = "bill";
  const billName = "bill";
  const billAvatar = "/uploads/images/profile_cmfq75h2v0000jpf08u3kfi6b_1758391755838.webp";
  
  const token = generateToken(billUserId, billUsername, billName, billAvatar);
  console.log('✅ Generated token for Bill');

  // Test poll creation
  const hangoutId = "hangout_1758250598719_ti4p2nlxr";
  const pollPayload = {
    title: "Test Poll Debug",
    description: "Testing poll creation with debug",
    options: [{"text": "Option A"}, {"text": "Option B"}],
    allowMultiple: false,
    isAnonymous: false,
    consensusConfig: {
      consensusType: "PERCENTAGE",
      threshold: 60,
      minParticipants: 2,
      allowTies: false
    },
    allowDelegation: false,
    allowAbstention: true,
    isPublic: false
  };

  console.log('📤 Sending poll creation request...');
  console.log('Payload:', JSON.stringify(pollPayload, null, 2));

  try {
    const response = await fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(pollPayload)
    });

    const responseText = await response.text();
    console.log(`📥 Response status: ${response.status}`);
    console.log('📥 Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Poll created successfully!');
      console.log('📊 Created poll:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Poll creation failed');
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('Raw error response:', responseText);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testPollCreation();









