import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imagePath = searchParams.get('src')
    const width = parseInt(searchParams.get('w') || '0')
    const height = parseInt(searchParams.get('h') || '0')
    const quality = parseInt(searchParams.get('q') || '75')
    const format = searchParams.get('f') || 'webp'
    
    if (!imagePath) {
      return NextResponse.json({ error: 'Image path required' }, { status: 400 })
    }
    
    // Security: Only allow images from uploads directory
    if (!imagePath.startsWith('/uploads/images/')) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 })
    }
    
    // Build full file path
    const fullPath = join(process.cwd(), 'public', imagePath)
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }
    
    // Read original image
    const imageBuffer = await readFile(fullPath)
    let image = sharp(imageBuffer)
    
    // Get original metadata
    const metadata = await image.metadata()
    
    // Resize if dimensions provided
    if (width > 0 || height > 0) {
      image = image.resize(width || null, height || null, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }
    
    // Convert to requested format
    let outputBuffer: Buffer
    
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        outputBuffer = await image
          .jpeg({ quality: Math.min(quality, 100) })
          .toBuffer()
        break
      case 'png':
        outputBuffer = await image
          .png({ quality: Math.min(quality, 100) })
          .toBuffer()
        break
      case 'webp':
      default:
        outputBuffer = await image
          .webp({ quality: Math.min(quality, 100) })
          .toBuffer()
        break
    }
    
    // Set appropriate content type
    const contentType = format === 'jpeg' || format === 'jpg' 
      ? 'image/jpeg' 
      : format === 'png' 
      ? 'image/png' 
      : 'image/webp'
    
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
        'Content-Length': outputBuffer.length.toString(),
      },
    })
    
  } catch (error) {
    console.error('Image resize error:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}
