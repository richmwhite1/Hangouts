import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from '@/lib/logger'
// POST /api/conversations/[id]/avatar - Upload conversation avatar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    // Check if conversation exists and user has permission
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    // Check if user is a participant
    const userParticipant = conversation.participants.find(p => p.userId === user.id)
    if (!userParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    // Check if it's a group conversation
    if (conversation.type !== 'GROUP') {
      return NextResponse.json(createErrorResponse('Invalid operation', 'Can only upload avatars for group conversations'), { status: 400 })
    }
    const formData = await request.formData()
    const photo = formData.get('photo') as File
    if (!photo) {
      return NextResponse.json(createErrorResponse('No photo provided', 'Photo is required'), { status: 400 })
    }
    // Validate file size (max 2MB)
    if (photo.size > 2 * 1024 * 1024) {
      return NextResponse.json(createErrorResponse('File too large', 'Photo must be smaller than 2MB'), { status: 400 })
    }
    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(createErrorResponse('Invalid file type', 'Please select an image file'), { status: 400 })
    }
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'conversations')
    // console.log('Creating uploads directory:', uploadsDir); // Removed for production
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
      // console.log('Directory created successfully'); // Removed for production
    } else {
      // console.log('Directory already exists'); // Removed for production
    }
    // Generate unique filename
    const fileExtension = photo.name.split('.').pop() || 'jpg'
    const fileName = `${params.id}-${Date.now()}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)
    // Convert file to buffer and save
    // console.log('Saving file to:', filePath); // Removed for production
    const bytes = await photo.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    // console.log('File saved successfully'); // Removed for production
    // Update conversation with avatar URL
    const avatarUrl = `/uploads/conversations/${fileName}`
    // console.log('Updating conversation with avatar URL:', avatarUrl); // Removed for production
    const updatedConversation = await db.conversation.update({
      where: { id: params.id },
      data: {
        avatar: avatarUrl
      }
    })
    // console.log('Conversation updated successfully:', updatedConversation.avatar); // Removed for production
    return NextResponse.json(createSuccessResponse({
      avatar: avatarUrl
    }, 'Avatar uploaded successfully'))
  } catch (error) {
    logger.error('Error uploading avatar:', error);
    return NextResponse.json(createErrorResponse('Failed to upload avatar', error.message), { status: 500 })
  }
}