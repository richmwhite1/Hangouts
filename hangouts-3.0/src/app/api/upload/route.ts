import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import sharp from 'sharp'
import { filterPhotoContent } from '@/lib/content-filter'
import { uploadImage } from '@/lib/cloudinary'

import { logger } from '@/lib/logger'
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    console.log('Upload API - Clerk userId:', clerkUserId)
    
    if (!clerkUserId) {
      console.log('Upload API - No clerkUserId, returning 401')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let user = await getClerkApiUser()
    console.log('Upload API - Database user:', user?.id)
    
    if (!user) {
      console.log('Upload API - No database user, creating fallback user')
      // Create a minimal user object as fallback
      user = {
        id: clerkUserId,
        email: 'temp@example.com',
        username: 'temp_user',
        name: 'Temp User',
        role: 'USER' as const,
        avatar: null,
        isActive: true
      }
      console.log('Upload API - Using fallback user:', user.id)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'profile', 'background', or 'hangout'
    const hangoutId = formData.get('hangoutId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!type || !['profile', 'background', 'hangout'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be profile, background, or hangout' }, { status: 400 })
    }

    // For hangout photos, hangoutId is optional (for creation flow)
    // if (type === 'hangout' && !hangoutId) {
    //   return NextResponse.json({ error: 'hangoutId is required for hangout photos' }, { status: 400 })
    // }

    // Validate file type - support all common image formats
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp', 
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'image/heic',
      'image/heif',
      'image/avif',
      'image/jxl'
    ]
    
    // If file type is not in allowed list, try to process it anyway
    if (!allowedTypes.includes(file.type)) {
      // // console.log(`Unknown file type: ${file.type}, attempting to process anyway`); // Removed for production; // Removed for production
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Content filtering - disabled for now
    // const filterResult = await filterPhotoContent('', buffer)
    // 
    // if (!filterResult.isAllowed) {
    //   return NextResponse.json({
    //     success: false,
    //     error: 'Content policy violation',
    //     details: {
    //       reasons: filterResult.reasons,
    //       categories: filterResult.categories,
    //       suggestions: filterResult.suggestions
    //     }
    //   }, { status: 400 })
    // }

    // Process image based on type with enhanced mobile optimization
    let processedBuffer: Buffer
    let filename: string
    let dimensions: { width: number; height: number }

            try {
              // Initialize Sharp with the buffer and handle various formats
              let image = sharp(buffer)
              
              // Handle HEIC/HEIF formats (common on mobile)
              if (file.type === 'image/heic' || file.type === 'image/heif') {
                image = image.heif()
              }
              
              // Handle SVG (convert to PNG first)
              if (file.type === 'image/svg+xml') {
                image = image.png()
              }
              
              // Handle unknown formats by trying to auto-detect
              if (!allowedTypes.includes(file.type)) {
                // // console.log(`Attempting to process unknown format: ${file.type}`); // Removed for production; // Removed for production
                // Sharp will try to auto-detect the format
              }
      
      const metadata = await image.metadata()

      if (type === 'profile') {
        // Profile image: 400x400, WebP format, mobile optimized
        const size = Math.min(metadata.width || 400, metadata.height || 400, 400)
        processedBuffer = await image
          .resize(size, size, { fit: 'cover', position: 'center' })
          .webp({ 
            quality: 85,
            effort: 6, // Higher effort for better compression
            lossless: false
          })
          .toBuffer()
        
        filename = `profile_${user.id}_${Date.now()}.webp`
        dimensions = { width: size, height: size }
      } else if (type === 'background') {
        // Background image: 1200x400, WebP format, mobile optimized
        const targetWidth = 1200
        const targetHeight = 400
        const aspectRatio = (metadata.width || 1) / (metadata.height || 1)
        const targetAspectRatio = targetWidth / targetHeight
        
        let width: number, height: number
        if (aspectRatio > targetAspectRatio) {
          // Image is wider, fit to height
          height = targetHeight
          width = Math.round(height * aspectRatio)
        } else {
          // Image is taller, fit to width
          width = targetWidth
          height = Math.round(width / aspectRatio)
        }
        
        processedBuffer = await image
          .resize(width, height, { fit: 'cover', position: 'center' })
          .webp({ 
            quality: 80,
            effort: 6,
            lossless: false
          })
          .toBuffer()
        
        filename = `background_${user.id}_${Date.now()}.webp`
        dimensions = { width, height }
      } else {
        // Hangout image: 800x600, WebP format, mobile optimized
        const targetWidth = 800
        const targetHeight = 600
        const aspectRatio = (metadata.width || 1) / (metadata.height || 1)
        const targetAspectRatio = targetWidth / targetHeight
        
        let width: number, height: number
        if (aspectRatio > targetAspectRatio) {
          // Image is wider, fit to height
          height = targetHeight
          width = Math.round(height * aspectRatio)
        } else {
          // Image is taller, fit to width
          width = targetWidth
          height = Math.round(width / aspectRatio)
        }
        
        processedBuffer = await image
          .resize(width, height, { fit: 'cover', position: 'center' })
          .webp({ 
            quality: 85,
            effort: 6,
            lossless: false
          })
          .toBuffer()
        
        filename = `hangout_${user.id}_${Date.now()}.webp`
        dimensions = { width, height }
      }
    } catch (processingError) {
      logger.error('Image processing error:', processingError);
      return NextResponse.json(
        { error: 'Image processing failed', details: processingError instanceof Error ? processingError.message : 'Unknown processing error' },
        { status: 400 }
      )
    }

    // Upload to Cloudinary
    const uploadResult = await uploadImage(
      processedBuffer,
      filename,
      'image/webp',
      `hangouts/${type}`
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: 'Cloud upload failed', details: uploadResult.error },
        { status: 500 }
      )
    }

    // Return file info
    const fileUrl = uploadResult.url
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
      data: {
        url: fileUrl,
        filename,
        type,
        size: processedBuffer.length,
        dimensions,
        originalSize: file.size,
        compressionRatio: Math.round((1 - processedBuffer.length / file.size) * 100),
        ...(type === 'hangout' && hangoutId && { hangoutId })
      }
    })

  } catch (error) {
    logger.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
