import { NextRequest, NextResponse } from 'next/server'
import { checkRelationshipReminders } from '@/lib/services/relationship-reminder-service'
import { logger } from '@/lib/logger'

/**
 * Cron job endpoint to check and send relationship reminders
 * Can be called manually or via Railway's cron feature
 * GET /api/cron/relationship-reminders
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authorization check for cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron job access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting relationship reminder check...')
    
    const result = await checkRelationshipReminders()
    
    logger.info('Relationship reminder check completed', result)
    
    return NextResponse.json({
      success: true,
      message: 'Relationship reminders processed',
      data: result
    })
  } catch (error) {
    logger.error('Error in relationship reminders cron:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}







