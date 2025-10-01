import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

// Generate a random key for each conversation
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

// Encrypt message content
export function encryptMessage(content: string, key: string): { encryptedContent: string; iv: string; tag: string } {
  const keyBuffer = Buffer.from(key, 'hex')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipher(ALGORITHM, keyBuffer)
  cipher.setAAD(Buffer.from('hangouts-message', 'utf8'))
  
  let encrypted = cipher.update(content, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encryptedContent: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

// Decrypt message content
export function decryptMessage(encryptedContent: string, key: string, iv: string, tag: string): string {
  const keyBuffer = Buffer.from(key, 'hex')
  const ivBuffer = Buffer.from(iv, 'hex')
  const tagBuffer = Buffer.from(tag, 'hex')
  
  const decipher = crypto.createDecipher(ALGORITHM, keyBuffer)
  decipher.setAAD(Buffer.from('hangouts-message', 'utf8'))
  decipher.setAuthTag(tagBuffer)
  
  let decrypted = decipher.update(encryptedContent, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Hash a string for key derivation
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

// Generate a conversation-specific key from user IDs
export function generateConversationKey(userIds: string[]): string {
  const sortedIds = userIds.sort()
  const combined = sortedIds.join('-')
  return hashString(combined)
}

// Simple XOR encryption for basic privacy (fallback)
export function simpleEncrypt(content: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex')
  const contentBuffer = Buffer.from(content, 'utf8')
  const result = Buffer.alloc(contentBuffer.length)
  
  for (let i = 0; i < contentBuffer.length; i++) {
    result[i] = contentBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }
  
  return result.toString('hex')
}

// Simple XOR decryption for basic privacy (fallback)
export function simpleDecrypt(encryptedContent: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex')
  const contentBuffer = Buffer.from(encryptedContent, 'hex')
  const result = Buffer.alloc(contentBuffer.length)
  
  for (let i = 0; i < contentBuffer.length; i++) {
    result[i] = contentBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }
  
  return result.toString('utf8')
}
