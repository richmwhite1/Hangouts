import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createSuccessResponse, createErrorResponse, API_CONFIGS, AuthenticatedRequest } from '@/lib/api-handler'
import { PollService } from '@/lib/services'
import { wsManager } from '@/lib/websocket-server'

// Add option to poll
async function addOptionHandler(request: AuthenticatedRequest) {
  const { id: hangoutId, pollId } = await request.params
  const data = await request.json()

  try {
    // Create service context
    const serviceContext = {
      userId: request.user.userId,
      userRole: request.user.role,
      ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined
    }

    // Create poll service
    const pollService = new PollService(serviceContext)

    // Add option using service
    const result = await pollService.addPollOption(pollId, data)

    if (!result.success) {
      return createErrorResponse(
        result.error || 'Unknown error',
        result.message || 'Failed to add option',
        result.statusCode || 500,
        result.errorCode || 'SERVICE_ERROR'
      )
    }

    // Broadcast option added via WebSocket
    const wsServer = getPollWebSocketServer()
    if (wsServer && result.data) {
      wsServer.broadcastOptionAdded(pollId, {
        type: 'option_added',
        poll: result.data,
        newOption: data.option
      })
    }

    return createSuccessResponse(result.data, result.message)
  } catch (error) {
    console.error('Add option error:', error)
    return createErrorResponse(
      'Service error',
      'Failed to add option',
      500,
      'SERVICE_ERROR'
    )
  }
}

export const POST = createApiHandler(
  addOptionHandler,
  {
    ...API_CONFIGS.HANGOUT,
    requireValidation: true,
    version: 'v1'
  }
)

export const OPTIONS = createApiHandler(
  async () => new NextResponse(null, { status: 200 }),
  {
    ...API_CONFIGS.PUBLIC,
    version: 'v1'
  }
)



