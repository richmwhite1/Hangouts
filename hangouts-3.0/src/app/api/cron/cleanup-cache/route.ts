import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredCache } from '@/lib/agent-cache-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cache cleanup attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Perform cleanup
    await cleanupExpiredCache();
    
    logger.info('Cache cleanup completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleaned up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error in cache cleanup cron:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup cache',
      message: error.message
    }, { status: 500 });
  }
}




