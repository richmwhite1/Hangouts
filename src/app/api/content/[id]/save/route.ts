import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { createApiHandler } from '@/lib/api-handler'

async function saveContentHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const contentId = params.id
  const { action } = await request.json() // 'save' or 'unsave'
  
  // Verify authentication
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
  }
  
  const userId = payload.userId
  
  try {
    if (action === 'save') {
      // Save content to user's feed
      await db.eventSave.upsert({
        where: {
          contentId_userId: {
            contentId: contentId,
            userId: userId
          }
        },
        update: {
          createdAt: new Date()
        },
        create: {
          userId: userId,
          contentId: contentId,
          createdAt: new Date()
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Content saved to your feed',
        saved: true 
      })
    } else if (action === 'unsave') {
      // Remove from user's feed
      await db.eventSave.deleteMany({
        where: {
          userId: userId,
          contentId: contentId
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Content removed from your feed',
        saved: false 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use "save" or "unsave"' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error saving content:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save content' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return await saveContentHandler(request, { params })
}
