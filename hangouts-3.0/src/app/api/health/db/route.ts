import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function GET() {
  try {
    // console.log('🏥 Database health check requested'); // Removed for production
    
    // Test database connection
    await db.$connect()
    // console.log('✅ Database connected successfully'); // Removed for production
    
    // Test a simple query
    const userCount = await db.user.count()
    // // console.log(`✅ Database query successful, user count: ${userCount}`); // Removed for production; // Removed for production
    
    const response = {
      status: 'healthy',
      database: 'connected',
      userCount,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
    
    // console.log('✅ Database health check response:', response); // Removed for production
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error: any) {
    logger.error('❌ Database health check failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } finally {
    try {
      await db.$disconnect()
      // console.log('✅ Database disconnected successfully'); // Removed for production
    } catch (disconnectError) {
      logger.error('❌ Error disconnecting from database:', disconnectError);
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}


