import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Configuration
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'images')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DIMENSION = 1080
const QUALITY = 75
const TARGET_SIZE_KB = 150 // Target file size in KB

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = 'webp'
  return `${timestamp}_${random}.${extension}`
}

// Optimize image using Sharp
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer)
  
  // Get image metadata
  const metadata = await image.metadata()
  
  // Auto-rotate based on EXIF orientation
  const rotated = image.rotate()
  
  // Calculate new dimensions while maintaining aspect ratio
  let width = metadata.width || 0
  let height = metadata.height || 0
  
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const aspectRatio = width / height
    if (width > height) {
      width = MAX_DIMENSION
      height = Math.round(MAX_DIMENSION / aspectRatio)
    } else {
      height = MAX_DIMENSION
      width = Math.round(MAX_DIMENSION * aspectRatio)
    }
  }
  
  // Resize and optimize
  const optimized = await rotated
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: QUALITY,
      effort: 6 // Higher effort for better compression
    })
    .toBuffer()
  
  return optimized
}

// Generate JPEG fallback
async function generateJPEGFallback(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .jpeg({
      quality: QUALITY,
      progressive: true
    })
    .toBuffer()
}

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    await ensureUploadDir()
    
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Optimize image
    const optimizedBuffer = await optimizeImage(buffer)
    
    // Generate filename
    const filename = generateFilename(file.name)
    const filepath = join(UPLOAD_DIR, filename)
    
    // Save optimized image
    await writeFile(filepath, optimizedBuffer)
    
    // Generate JPEG fallback
    const jpegBuffer = await generateJPEGFallback(buffer)
    const jpegFilename = filename.replace('.webp', '.jpg')
    const jpegFilepath = join(UPLOAD_DIR, jpegFilename)
    await writeFile(jpegFilepath, jpegBuffer)
    
    // Return success response
    const imageUrl = `/uploads/images/${filename}`
    const jpegUrl = `/uploads/images/${jpegFilename}`
    
    return NextResponse.json({
      success: true,
      image: {
        url: imageUrl,
        jpegUrl: jpegUrl,
        filename: filename,
        size: optimizedBuffer.length,
        sizeKB: Math.round(optimizedBuffer.length / 1024)
      }
    })
    
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

