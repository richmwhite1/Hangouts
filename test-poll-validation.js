const jwt = require('jsonwebtoken');

// Test poll validation with the exact data from the frontend
const hangoutId = 'hangout_1758585614387_1tkfo6rg0';
const userId = 'cmfq75h2v0000jpf08u3kfi6b'; // bill user

// Create a token using the same secret that works for hangout API
const token = jwt.sign(
  { userId, email: 'bill@email.com', username: 'bill' },
  'your-secret-key-here-replace-in-production',
  { expiresIn: '7d' }
);

console.log('🔍 Testing poll validation...');
console.log('Hangout ID:', hangoutId);
console.log('User ID:', userId);

// Test poll data that matches what the frontend sends
const pollData = {
  title: "What should we do?",
  description: "",
  options: [
    {
      text: "Option 1",
      description: "",
      date: "",
      time: "",
      location: "",
      latitude: null,
      longitude: null
    },
    {
      text: "Option 2",
      description: "",
      date: "",
      time: "",
      location: "",
      latitude: null,
      longitude: null
    }
  ],
  consensusConfig: {
    consensusType: "PERCENTAGE",
    threshold: 60,
    minParticipants: 2,
    allowTies: false,
    customRules: {}
  },
  allowMultiple: true,
  isAnonymous: false,
  allowDelegation: false,
  allowAbstention: true,
  isPublic: false,
  visibility: "FRIENDS",
  allowAddOptions: true
};

console.log('Poll data:', JSON.stringify(pollData, null, 2));

// Test the API call
fetch(`http://localhost:3000/api/hangouts/${hangoutId}/polls`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(pollData)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.text();
})
.then(data => {
  console.log('Response data:', data);
  
  // Try to parse as JSON to see validation errors
  try {
    const jsonData = JSON.parse(data);
    if (jsonData.details) {
      console.log('Validation errors:', JSON.stringify(jsonData.details, null, 2));
    }
  } catch (e) {
    console.log('Response is not JSON');
  }
})
.catch(error => {
  console.error('Error:', error);
});








