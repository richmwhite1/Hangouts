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
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const image = formData.get('image') as File
    const type = formData.get('type') as string

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'events')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const baseFilename = `${type}_${timestamp}_${randomString}`
    
    // Convert image to buffer
    const imageBuffer = Buffer.from(await image.arrayBuffer())

    // Process image with Sharp
    const processedImage = await sharp(imageBuffer)
      .resize(1200, 800, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toBuffer()

    // Save processed image
    const filename = `${baseFilename}.webp`
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, processedImage)

    // Generate URL
    const imageUrl = `/uploads/events/${filename}`

    // console.log('✅ Image uploaded successfully:', imageUrl); // Removed for production

    return NextResponse.json({
      success: true,
      url: imageUrl,
      filename: filename,
      size: processedImage.length,
      type: 'image/webp'
    })

  } catch (error) {
    logger.error('❌ Image upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}