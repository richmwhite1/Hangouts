import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: hangoutId, photoId } = await params

    // Check if photo exists and user has permission to delete it
    const photo = await db.photos.findUnique({
      where: { id: photoId },
      include: { 
        hangout: {
          include: { content_participants: true }
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Verify the photo belongs to the specified hangout
    if (photo.hangoutId !== hangoutId) {
      return NextResponse.json({ error: 'Photo does not belong to this hangout' }, { status: 400 })
    }

    // Check if user is the creator of the photo or a participant in the hangout
    const isCreator = photo.creatorId === payload.userId
    const isParticipant = photo.hangout.content_participants.some(
      p => p.userId === payload.userId
    )

    if (!isCreator && !isParticipant) {
      return NextResponse.json({ error: 'Not authorized to delete this photo' }, { status: 403 })
    }

    // Delete the photo from database
    await db.photos.delete({
      where: { id: photoId }
    })

    // Delete the physical file
    try {
      const filePath = join(process.cwd(), 'public', photo.originalUrl)
      await unlink(filePath)
    } catch (fileError) {
      console.warn('Could not delete physical file:', fileError)
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({ success: true, message: 'Photo deleted successfully' })

  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ 
      error: 'Failed to delete photo', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}



















