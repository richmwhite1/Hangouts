import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
// POST /api/conversations/[id]/upload - Upload file for messaging
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
    // Check if user is a participant in the conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: { participants: true }
    })
    if (!conversation) {
      return NextResponse.json(createErrorResponse('Conversation not found', 'The conversation does not exist'), { status: 404 })
    }
    const isParticipant = conversation.participants.some(p => p.userId === user.id)
    if (!isParticipant) {
      return NextResponse.json(createErrorResponse('Access denied', 'You are not a participant in this conversation'), { status: 403 })
    }
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'DOCUMENT'
    if (!file) {
      return NextResponse.json(createErrorResponse('No file provided', 'File is required'), { status: 400 })
    }
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(createErrorResponse('File too large', 'File size must be less than 10MB'), { status: 400 })
    }
    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(createErrorResponse('Invalid file type', 'File type not supported'), { status: 400 })
    }
    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || ''
    const uniqueFilename = `${uuidv4()}.${fileExtension}`
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'messages')
    await mkdir(uploadDir, { recursive: true })
    // Save file
    const filePath = join(uploadDir, uniqueFilename)
    const fileBuffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(fileBuffer))
    // Generate thumbnail for images and videos
    let thumbnailUrl = null
    if (file.type.startsWith('image/')) {
      // For images, we could generate a thumbnail here
      // For now, we'll use the same URL
      thumbnailUrl = `/uploads/messages/${uniqueFilename}`
    } else if (file.type.startsWith('video/')) {
      // For videos, we could generate a thumbnail here
      // For now, we'll use a placeholder
      thumbnailUrl = '/placeholder-video-thumbnail.png'
    }
    // Determine attachment type based on file type
    let attachmentType = 'DOCUMENT'
    if (file.type.startsWith('image/')) {
      attachmentType = 'IMAGE'
    } else if (file.type.startsWith('video/')) {
      attachmentType = 'VIDEO'
    } else if (file.type.startsWith('audio/')) {
      attachmentType = 'AUDIO'
    }
    const fileUrl = `/uploads/messages/${uniqueFilename}`
    return NextResponse.json(createSuccessResponse({
      attachment: {
        id: uuidv4(),
        type: attachmentType,
        url: fileUrl,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        thumbnailUrl: thumbnailUrl,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id
        }
      }
    }, 'File uploaded successfully'))
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(createErrorResponse('Failed to upload file', error.message), { status: 500 })
  }
}