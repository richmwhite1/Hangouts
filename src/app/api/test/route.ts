import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      },
      database: {
        connected: false,
        error: null
      }
    }

    // Test database connection
    try {
      await db.$connect()
      await db.$queryRaw`SELECT 1`
      results.database.connected = true
      await db.$disconnect()
    } catch (dbError: any) {
      results.database.error = dbError.message
    }

    return NextResponse.json(results)
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
