import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { uploadImage } from '@/lib/cloudinary'

import { logger } from '@/lib/logger'

const db = new PrismaClient()
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
      // User exists in Clerk but not in database - try to create them
      console.log('Upload API - No database user found, attempting to create...')
      try {
        // Check if DATABASE_URL is set and valid
        if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
          logger.error('Upload API - DATABASE_URL not configured', { clerkUserId })
          return NextResponse.json(
            { 
              error: 'Database not configured',
              message: 'DATABASE_URL environment variable is not set in Railway. Please check your Railway project settings.'
            },
            { status: 500 }
          )
        }
        
        // Validate DATABASE_URL format
        if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
          logger.error('Upload API - Invalid DATABASE_URL format', { 
            clerkUserId,
            urlPrefix: process.env.DATABASE_URL.substring(0, 20) 
          })
          return NextResponse.json(
            { 
              error: 'Invalid database configuration',
              message: 'DATABASE_URL must start with postgresql:// or postgres://. Please check your Railway database service is properly linked.'
            },
            { status: 500 }
          )
        }
        
        // Try to get user again - getClerkApiUser should create them
        user = await getClerkApiUser()
        
        if (!user) {
          // If still no user, try direct creation as fallback
          const { db } = await import('@/lib/db')
          user = await db.user.create({
            data: {
              id: clerkUserId,
              clerkId: clerkUserId,
              email: `${clerkUserId}@clerk.temp`,
              username: `user_${clerkUserId.substring(0, 8)}`,
              name: 'New User',
              role: 'USER',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          console.log('Upload API - User created via fallback:', user.id)
        }
      } catch (dbError: any) {
        console.error('Upload API - Error creating user:', dbError.message)
        logger.error('Upload API - Database error creating user', { error: dbError.message, clerkUserId })
        
        let errorMessage = 'Failed to create user in database'
        if (dbError.message?.includes('DATABASE_URL') || dbError.message?.includes('datasource')) {
          errorMessage = 'Database connection not configured. Please ensure DATABASE_URL is set correctly in Railway project settings and that your PostgreSQL service is properly linked.'
        } else if (dbError.message?.includes('postgresql://') || dbError.message?.includes('postgres://')) {
          errorMessage = 'Invalid database URL format. Please check that your Railway PostgreSQL service is properly configured and linked to your app service.'
        }
        
        return NextResponse.json(
          { 
            error: 'Database error',
            message: errorMessage
          },
          { status: 500 }
        )
      }
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

    // Determine folder for Cloudinary upload
    const cloudinaryFolder = type === 'hangout' ? 'hangouts' : type === 'profile' ? 'profiles' : 'backgrounds'
    
    // Try to upload to Cloudinary first (if configured)
    const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                                process.env.CLOUDINARY_CLOUD_NAME !== 'demo' &&
                                process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
                                process.env.CLOUDINARY_API_KEY &&
                                process.env.CLOUDINARY_API_KEY !== 'demo' &&
                                process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key'
    
    let fileUrl: string
    let uploadMethod: 'cloudinary' | 'local' = 'local'
    
    if (hasCloudinaryConfig) {
      try {
        logger.info('Upload API - Uploading to Cloudinary', { type, folder: cloudinaryFolder, filename })
        const cloudinaryResult = await uploadImage(
          processedBuffer,
          filename, // uploadImage function will handle extension removal
          'image/webp',
          cloudinaryFolder
        )
        
        if (cloudinaryResult.success && cloudinaryResult.url) {
          fileUrl = cloudinaryResult.url
          uploadMethod = 'cloudinary'
          logger.info('Upload API - Cloudinary upload successful', { url: fileUrl })
        } else {
          logger.warn('Upload API - Cloudinary upload failed, falling back to local storage', { error: cloudinaryResult.error })
          throw new Error(cloudinaryResult.error || 'Cloudinary upload failed')
        }
      } catch (cloudinaryError: any) {
        logger.warn('Upload API - Cloudinary error, falling back to local storage', { error: cloudinaryError.message })
        // Fall through to local storage
      }
    }
    
    // Fallback to local filesystem if Cloudinary is not configured or upload failed
    if (uploadMethod === 'local' || !fileUrl) {
      logger.info('Upload API - Using local filesystem storage', { type, filename })
      const uploadsDir = join(process.cwd(), 'public', 'uploads', type)
      await mkdir(uploadsDir, { recursive: true })
      
      // Write file to disk
      const filePath = join(uploadsDir, filename)
      await writeFile(filePath, processedBuffer)
      
      // Return file info with local URL
      fileUrl = `/uploads/${type}/${filename}`
    }
    
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
        uploadMethod,
        ...(type === 'hangout' && hangoutId && { hangoutId })
      }
    })

  } catch (error) {
    logger.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect()
  }
}
