import { NextRequest, NextResponse } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { z } from 'zod'

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'ui', 'performance']),
  rating: z.number().min(1).max(5),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  stepsToReproduce: z.string().optional(),
  context: z.object({
    page: z.string(),
    feature: z.string().optional(),
    hangoutId: z.string().optional(),
    userAgent: z.string(),
    timestamp: z.string()
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = feedbackSchema.parse(body)

    // For now, we'll just log the feedback
    // In production, you'd save this to a database
    console.log('=== BETA FEEDBACK SUBMITTED ===')
    console.log('Type:', validatedData.type)
    console.log('Rating:', validatedData.rating)
    console.log('Title:', validatedData.title)
    console.log('Description:', validatedData.description)
    console.log('Steps to Reproduce:', validatedData.stepsToReproduce)
    console.log('Context:', JSON.stringify(validatedData.context, null, 2))
    console.log('================================')

    // TODO: Save to database
    // await db.feedback.create({
    //   data: {
    //     type: validatedData.type,
    //     rating: validatedData.rating,
    //     title: validatedData.title,
    //     description: validatedData.description,
    //     stepsToReproduce: validatedData.stepsToReproduce,
    //     context: validatedData.context,
    //     status: 'pending',
    //     createdAt: new Date()
    //   }
    // })

    return NextResponse.json(createSuccessResponse({
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'Feedback submitted successfully'
    }, 'Thank you for your feedback!'))

  } catch (error) {
    console.error('Error processing feedback:', error)
    return NextResponse.json(createErrorResponse('Invalid feedback data', 'Please check your input and try again'), { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Implement admin endpoint to view feedback
    // This would require authentication and admin role
    return NextResponse.json(createErrorResponse('Not implemented', 'Admin endpoint not yet implemented'), { status: 501 })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch feedback', 'Please try again later'), { status: 500 })
  }
}
