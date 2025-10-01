const jwt = require('jsonwebtoken');

// Create a test poll for the new hangout
const hangoutId = 'hangout_1758585614387_1tkfo6rg0';
const userId = 'cmfq75h2v0000jpf08u3kfi6b'; // bill user

// Create a token (using a common secret for testing)
const token = jwt.sign(
  { userId, email: 'bill@email.com', username: 'bill' },
  'your-secret-key-here-replace-in-production',
  { expiresIn: '7d' }
);

console.log('Test token:', token);

// Test poll data
const pollData = {
  title: "What should we do?",
  description: "Choose an activity",
  options: [
    {
      text: "Go to the movies",
      description: "Catch the latest blockbuster",
      date: "2025-09-23",
      time: "7:00 PM",
      location: "AMC Theater",
      latitude: null,
      longitude: null
    },
    {
      text: "Play board games",
      description: "Fun night at home",
      date: "2025-09-23",
      time: "8:00 PM",
      location: "Home",
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
})
.catch(error => {
  console.error('Error:', error);
});