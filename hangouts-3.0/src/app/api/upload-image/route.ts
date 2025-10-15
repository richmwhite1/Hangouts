import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'

import { logger } from '@/lib/logger'
export async function POST(request: NextRequest) {
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

    // Check content type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ 
        error: 'Invalid content type. Expected multipart/form-data' 
      }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' 
      }, { status: 400 })
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Please upload an image smaller than 10MB.' 
      }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'images')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `event_${timestamp}_${Math.random().toString(36).substr(2, 9)}.webp`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and process with Sharp
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Process image: resize to max 1200x1200, convert to WebP, optimize
    const processedBuffer = await sharp(buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ 
        quality: 85,
        effort: 4 
      })
      .toBuffer()

    await writeFile(filepath, processedBuffer)

    const imageUrl = `/uploads/images/${filename}`

    return NextResponse.json({ 
      success: true, 
      url: imageUrl
    })

  } catch (error) {
    logger.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}






















