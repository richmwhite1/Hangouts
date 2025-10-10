import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const AddOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  description: z.string().optional(),
  what: z.string().optional(),
  where: z.string().optional(),
  when: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const { pollId } = await params
    const body = await request.json()
    const validatedData = AddOptionSchema.parse(body)

    // Get the poll and check if user can add options
    const poll = await db.polls.findUnique({
      where: { id: pollId },
      include: {
        participants: true,
        pollOptions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Check if poll allows adding options
    if (!poll.allowAddOptions) {
      return NextResponse.json({ error: 'This poll does not allow adding options' }, { status: 403 })
    }

    // Check if user is a participant
    const isParticipant = poll.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json({ error: 'You must be a participant to add options' }, { status: 403 })
    }

    // Get the next order number
    const nextOrder = poll.pollOptions.length > 0 
      ? Math.max(...poll.pollOptions.map(opt => opt.order)) + 1 
      : 1

    // Create the new poll option
    const newOption = await db.pollOption.create({
      data: {
        id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pollId: pollId,
        text: validatedData.text,
        description: validatedData.description,
        order: nextOrder,
        what: validatedData.what,
        where: validatedData.where,
        when: validatedData.when,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Update the poll's options JSON field for backward compatibility
    const currentOptions = Array.isArray(poll.options) ? poll.options : []
    const updatedOptions = [...currentOptions, validatedData.text]
    
    await db.polls.update({
      where: { id: pollId },
      data: {
        options: updatedOptions,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      option: {
        id: newOption.id,
        text: newOption.text,
        description: newOption.description,
        order: newOption.order,
        what: newOption.what,
        where: newOption.where,
        when: newOption.when,
        votes: [],
        _count: { votes: 0 }
      }
    })

  } catch (error) {
    console.error('Error adding poll option:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to add option' },
      { status: 500 }
    )
  }
}















