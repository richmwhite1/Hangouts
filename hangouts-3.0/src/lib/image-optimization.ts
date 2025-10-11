import sharp from 'sharp'
import { createLogger } from './winston-logger'

const logger = createLogger('IMAGE_OPTIMIZATION')

// Image optimization configuration
const imageConfig = {
  // Quality settings
  jpegQuality: parseInt(process.env.IMAGE_JPEG_QUALITY || '85'),
  pngQuality: parseInt(process.env.IMAGE_PNG_QUALITY || '90'),
  webpQuality: parseInt(process.env.IMAGE_WEBP_QUALITY || '80'),
  
  // Size limits
  maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '1920'),
  maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || '1080'),
  thumbnailSize: parseInt(process.env.IMAGE_THUMBNAIL_SIZE || '300'),
  
  // File size limits
  maxFileSize: parseInt(process.env.IMAGE_MAX_FILE_SIZE || '10485760'), // 10MB
  targetFileSize: parseInt(process.env.IMAGE_TARGET_FILE_SIZE || '2097152'), // 2MB
  
  // Supported formats
  supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif'],
  outputFormats: ['jpeg', 'webp'],
}

interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  background?: string
  blur?: number
  sharpen?: boolean
  grayscale?: boolean
  rotate?: number
  flip?: boolean
  flop?: boolean
}

interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
  density?: number
  space: string
  channels: number
  depth: string
}

class ImageOptimizer {
  private sharp: typeof sharp

  constructor() {
    this.sharp = sharp
  }

  // Get image metadata
  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await this.sharp(buffer).metadata()
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
        density: metadata.density,
        space: metadata.space || 'srgb',
        channels: metadata.channels || 0,
        depth: metadata.depth || 'uchar',
      }
    } catch (error) {
      logger.error('Failed to get image metadata:', error)
      throw new Error('Invalid image file')
    }
  }

  // Validate image file
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(buffer)
      
      // Check file size
      if (metadata.size > imageConfig.maxFileSize) {
        throw new Error(`Image size ${metadata.size} exceeds maximum ${imageConfig.maxFileSize}`)
      }
      
      // Check format
      if (!imageConfig.supportedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported image format: ${metadata.format}`)
      }
      
      // Check dimensions
      if (metadata.width > imageConfig.maxWidth || metadata.height > imageConfig.maxHeight) {
        logger.warn('Image dimensions exceed recommended limits:', {
          width: metadata.width,
          height: metadata.height,
          maxWidth: imageConfig.maxWidth,
          maxHeight: imageConfig.maxHeight,
        })
      }
      
      return true
    } catch (error) {
      logger.error('Image validation failed:', error)
      return false
    }
  }

  // Optimize image
  async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<Buffer> {
    try {
      const metadata = await this.getMetadata(buffer)
      
      // Set default options
      const opts: ImageOptimizationOptions = {
        width: options.width || Math.min(metadata.width, imageConfig.maxWidth),
        height: options.height || Math.min(metadata.height, imageConfig.maxHeight),
        quality: options.quality || imageConfig.jpegQuality,
        format: options.format || 'jpeg',
        fit: options.fit || 'cover',
        position: options.position || 'center',
        background: options.background || '#ffffff',
        blur: options.blur,
        sharpen: options.sharpen || false,
        grayscale: options.grayscale || false,
        rotate: options.rotate,
        flip: options.flip || false,
        flop: options.flop || false,
      }

      let sharpInstance = this.sharp(buffer)

      // Apply transformations
      if (opts.width && opts.height) {
        sharpInstance = sharpInstance.resize(opts.width, opts.height, {
          fit: opts.fit,
          position: opts.position,
          background: opts.background,
        })
      }

      if (opts.blur) {
        sharpInstance = sharpInstance.blur(opts.blur)
      }

      if (opts.sharpen) {
        sharpInstance = sharpInstance.sharpen()
      }

      if (opts.grayscale) {
        sharpInstance = sharpInstance.grayscale()
      }

      if (opts.rotate) {
        sharpInstance = sharpInstance.rotate(opts.rotate)
      }

      if (opts.flip) {
        sharpInstance = sharpInstance.flip()
      }

      if (opts.flop) {
        sharpInstance = sharpInstance.flop()
      }

      // Apply format-specific optimizations
      switch (opts.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: opts.quality,
            progressive: true,
            mozjpeg: true,
          })
          break
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: opts.quality,
            progressive: true,
            compressionLevel: 9,
          })
          break
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: opts.quality,
            lossless: false,
            nearLossless: false,
          })
          break
      }

      const optimizedBuffer = await sharpInstance.toBuffer()
      
      logger.info('Image optimized:', {
        originalSize: metadata.size,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: ((metadata.size - optimizedBuffer.length) / metadata.size * 100).toFixed(2) + '%',
        format: opts.format,
        dimensions: `${opts.width}x${opts.height}`,
      })

      return optimizedBuffer
    } catch (error) {
      logger.error('Image optimization failed:', error)
      throw error
    }
  }

  // Create thumbnail
  async createThumbnail(buffer: Buffer, size: number = imageConfig.thumbnailSize): Promise<Buffer> {
    try {
      const metadata = await this.getMetadata(buffer)
      
      // Calculate thumbnail dimensions maintaining aspect ratio
      const aspectRatio = metadata.width / metadata.height
      let thumbnailWidth = size
      let thumbnailHeight = size

      if (aspectRatio > 1) {
        thumbnailHeight = Math.round(size / aspectRatio)
      } else {
        thumbnailWidth = Math.round(size * aspectRatio)
      }

      const thumbnail = await this.sharp(buffer)
        .resize(thumbnailWidth, thumbnailHeight, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 80,
          progressive: true,
        })
        .toBuffer()

      logger.info('Thumbnail created:', {
        originalSize: metadata.size,
        thumbnailSize: thumbnail.length,
        dimensions: `${thumbnailWidth}x${thumbnailHeight}`,
      })

      return thumbnail
    } catch (error) {
      logger.error('Thumbnail creation failed:', error)
      throw error
    }
  }

  // Create multiple sizes
  async createMultipleSizes(buffer: Buffer): Promise<{
    original: Buffer
    large: Buffer
    medium: Buffer
    small: Buffer
    thumbnail: Buffer
  }> {
    try {
      const metadata = await this.getMetadata(buffer)
      
      const sizes = {
        large: { width: 1200, height: 800 },
        medium: { width: 800, height: 600 },
        small: { width: 400, height: 300 },
        thumbnail: { width: imageConfig.thumbnailSize, height: imageConfig.thumbnailSize },
      }

      const results = {
        original: buffer,
        large: await this.optimizeImage(buffer, sizes.large),
        medium: await this.optimizeImage(buffer, sizes.medium),
        small: await this.optimizeImage(buffer, sizes.small),
        thumbnail: await this.createThumbnail(buffer),
      }

      logger.info('Multiple sizes created:', {
        originalSize: metadata.size,
        largeSize: results.large.length,
        mediumSize: results.medium.length,
        smallSize: results.small.length,
        thumbnailSize: results.thumbnail.length,
      })

      return results
    } catch (error) {
      logger.error('Multiple sizes creation failed:', error)
      throw error
    }
  }

  // Compress image to target size
  async compressToTargetSize(buffer: Buffer, targetSize: number = imageConfig.targetFileSize): Promise<Buffer> {
    try {
      const metadata = await this.getMetadata(buffer)
      
      if (metadata.size <= targetSize) {
        return buffer
      }

      let quality = 90
      let compressedBuffer = buffer
      let attempts = 0
      const maxAttempts = 10

      while (compressedBuffer.length > targetSize && attempts < maxAttempts) {
        quality -= 10
        if (quality < 10) quality = 10

        compressedBuffer = await this.optimizeImage(buffer, {
          quality,
          format: 'jpeg',
        })

        attempts++
      }

      logger.info('Image compressed to target size:', {
        originalSize: metadata.size,
        compressedSize: compressedBuffer.length,
        targetSize,
        finalQuality: quality,
        attempts,
      })

      return compressedBuffer
    } catch (error) {
      logger.error('Image compression failed:', error)
      throw error
    }
  }

  // Convert to WebP
  async convertToWebP(buffer: Buffer, quality: number = imageConfig.webpQuality): Promise<Buffer> {
    try {
      const webpBuffer = await this.sharp(buffer)
        .webp({
          quality,
          lossless: false,
          nearLossless: false,
        })
        .toBuffer()

      logger.info('Image converted to WebP:', {
        originalSize: buffer.length,
        webpSize: webpBuffer.length,
        compressionRatio: ((buffer.length - webpBuffer.length) / buffer.length * 100).toFixed(2) + '%',
      })

      return webpBuffer
    } catch (error) {
      logger.error('WebP conversion failed:', error)
      throw error
    }
  }

  // Get optimization recommendations
  getOptimizationRecommendations(metadata: ImageMetadata): string[] {
    const recommendations: string[] = []

    if (metadata.size > imageConfig.targetFileSize) {
      recommendations.push('Consider compressing the image to reduce file size')
    }

    if (metadata.width > imageConfig.maxWidth || metadata.height > imageConfig.maxHeight) {
      recommendations.push('Consider resizing the image to reduce dimensions')
    }

    if (metadata.format === 'png' && !metadata.hasAlpha) {
      recommendations.push('Consider converting PNG to JPEG for better compression')
    }

    if (metadata.format === 'gif') {
      recommendations.push('Consider converting GIF to WebP for better compression')
    }

    return recommendations
  }
}

// Singleton instance
export const imageOptimizer = new ImageOptimizer()

// Convenience functions
export const imageUtils = {
  // Validate image
  validate: (buffer: Buffer) => imageOptimizer.validateImage(buffer),
  
  // Get metadata
  getMetadata: (buffer: Buffer) => imageOptimizer.getMetadata(buffer),
  
  // Optimize image
  optimize: (buffer: Buffer, options?: ImageOptimizationOptions) => 
    imageOptimizer.optimizeImage(buffer, options),
  
  // Create thumbnail
  thumbnail: (buffer: Buffer, size?: number) => 
    imageOptimizer.createThumbnail(buffer, size),
  
  // Create multiple sizes
  multipleSizes: (buffer: Buffer) => 
    imageOptimizer.createMultipleSizes(buffer),
  
  // Compress to target size
  compress: (buffer: Buffer, targetSize?: number) => 
    imageOptimizer.compressToTargetSize(buffer, targetSize),
  
  // Convert to WebP
  toWebP: (buffer: Buffer, quality?: number) => 
    imageOptimizer.convertToWebP(buffer, quality),
  
  // Get recommendations
  getRecommendations: (metadata: ImageMetadata) => 
    imageOptimizer.getOptimizationRecommendations(metadata),
}

export default imageOptimizer
