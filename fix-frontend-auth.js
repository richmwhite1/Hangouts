const jwt = require('jsonwebtoken')

// Create a valid JWT token using the correct secret
const JWT_SECRET = 'your-super-secret-jwt-key-here-make-it-long-and-random'

const token = jwt.sign(
  {
    userId: 'cmfq75h2v0000jpf08u3kfi6b',
    email: 'bill@email.com',
    username: 'bill'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
)

console.log('🔑 Valid JWT Token:')
console.log(token)
console.log('\n📋 Instructions:')
console.log('1. Open browser developer tools (F12)')
console.log('2. Go to Application/Storage tab')
console.log('3. Find Local Storage for localhost:3000')
console.log('4. Set auth_token to:', token)
console.log('5. Set auth_user to: {"id":"cmfq75h2v0000jpf08u3kfi6b","name":"bill","username":"bill","email":"bill@email.com"}')
console.log('6. Refresh the page')












