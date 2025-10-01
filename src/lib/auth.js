const jwt = require('jsonwebtoken')

function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key'
    const payload = jwt.verify(token, secret)
    return payload
  } catch (error) {
    console.error('Token verification failed:', error.message)
    return null
  }
}

module.exports = {
  verifyToken
}
