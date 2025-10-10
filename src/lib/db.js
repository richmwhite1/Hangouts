const { PrismaClient } = require('@prisma/client')

// Use singleton pattern to prevent multiple PrismaClient instances
const globalForPrisma = globalThis

const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty'
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

module.exports = {
  db
}
