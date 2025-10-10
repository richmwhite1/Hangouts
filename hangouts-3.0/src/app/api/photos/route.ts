import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'

// Enhanced photo management API with Instagram-quality features
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hangoutId = searchParams.get('hangoutId')
    const albumId = searchParams.get('albumId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query conditions
    const where: any = {
      creatorId: user.id
    }

    if (hangoutId) {
      where.hangoutId = hangoutId
    }

    if (albumId) {
      where.albumId = albumId
    }

    // Get photos with pagination
    const photos = await db.photo.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        hangout: {
          select: {
            id: true,
            title: true
          }
        },
        album: {
          select: {
            id: true,
            name: true
          }
        },
        tags: true,
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await db.photo.count({ where })
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        photos,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Get photos error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const hangoutId = formData.get('hangoutId') as string
    const albumId = formData.get('albumId') as string
    const caption = formData.get('caption') as string
    const tags = formData.get('tags') as string
    const isPublic = formData.get('isPublic') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/gif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, HEIF' 
      }, { status: 400 })
    }

    // Validate file size (max 20MB for photos)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 20MB' 
      }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Process image with multiple sizes (Instagram-style)
    let image = sharp(buffer)
    
    // Handle HEIC/HEIF formats
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      image = image.heif()
    }

    const metadata = await image.metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // Create multiple sizes for responsive design
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 400, height: 400 },
      { name: 'medium', width: 800, height: 800 },
      { name: 'large', width: 1200, height: 1200 },
      { name: 'original', width: originalWidth, height: originalHeight }
    ]

    const processedImages: { [key: string]: { buffer: Buffer; filename: string; dimensions: { width: number; height: number } } } = {}
    const baseFilename = `photo_${user.id}_${Date.now()}`

    for (const size of sizes) {
      let processedBuffer: Buffer
      let dimensions: { width: number; height: number }

      if (size.name === 'original') {
        // Keep original dimensions but optimize
        processedBuffer = await image
          .webp({ 
            quality: 90,
            effort: 6,
            lossless: false
          })
          .toBuffer()
        dimensions = { width: originalWidth, height: originalHeight }
      } else {
        // Resize to specific dimensions
        const aspectRatio = originalWidth / originalHeight
        let width: number, height: number

        if (aspectRatio > 1) {
          // Landscape
          width = Math.min(size.width, originalWidth)
          height = Math.round(width / aspectRatio)
        } else {
          // Portrait or square
          height = Math.min(size.height, originalHeight)
          width = Math.round(height * aspectRatio)
        }

        processedBuffer = await image
          .resize(width, height, { 
            fit: 'cover', 
            position: 'center',
            withoutEnlargement: true
          })
          .webp({ 
            quality: size.name === 'thumbnail' ? 80 : 85,
            effort: 6,
            lossless: false
          })
          .toBuffer()

        dimensions = { width, height }
      }

      const filename = `${baseFilename}_${size.name}.webp`
      processedImages[size.name] = {
        buffer: processedBuffer,
        filename,
        dimensions
      }
    }

    // Create uploads directory structure
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'photos')
    await mkdir(uploadsDir, { recursive: true })

    // Save all processed images
    const savedFiles: { [key: string]: string } = {}
    for (const [sizeName, imageData] of Object.entries(processedImages)) {
      const filepath = join(uploadsDir, imageData.filename)
      await writeFile(filepath, imageData.buffer)
      savedFiles[sizeName] = `/uploads/photos/${imageData.filename}`
    }

    // Parse tags
    const tagList = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

    // Save photo metadata to database
    const photo = await db.photo.create({
      data: {
        creatorId: user.id,
        hangoutId: hangoutId || null,
        albumId: albumId || null,
        caption: caption || null,
        isPublic,
        originalUrl: savedFiles.original,
        thumbnailUrl: savedFiles.thumbnail,
        smallUrl: savedFiles.small,
        mediumUrl: savedFiles.medium,
        largeUrl: savedFiles.large,
        originalWidth,
        originalHeight,
        fileSize: processedImages.original.buffer.length,
        mimeType: 'image/webp',
        tags: {
          create: tagList.map(tag => ({
            name: tag,
            creatorId: user.id
          }))
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        hangout: {
          select: {
            id: true,
            title: true
          }
        },
        album: {
          select: {
            id: true,
            name: true
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: photo,
      message: 'Photo uploaded successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Upload photo error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}



















