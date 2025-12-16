import { v2 as cloudinary } from 'cloudinary';
import { saveFileLocally } from './local-storage';

import { logger } from '@/lib/logger'

// Validate Cloudinary configuration
export const validateCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const isProduction = process.env.NODE_ENV === 'production';
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build';

  // Skip validation during build process - only validate at runtime
  if (isBuild) {
    logger.debug('Skipping Cloudinary validation during build', { isBuild, isProduction }, 'CLOUDINARY');
    return;
  }

  // In production, all three variables must be set and not demo values
  if (isProduction) {
    const missing = [];
    if (!cloudName || cloudName === 'demo' || cloudName === 'your_cloudinary_cloud_name') {
      missing.push('CLOUDINARY_CLOUD_NAME');
    }
    if (!apiKey || apiKey === 'demo' || apiKey === 'your_cloudinary_api_key') {
      missing.push('CLOUDINARY_API_KEY');
    }
    if (!apiSecret || apiSecret === 'demo' || apiSecret === 'your_cloudinary_api_secret') {
      missing.push('CLOUDINARY_API_SECRET');
    }

    if (missing.length > 0) {
      const error = `Missing or invalid Cloudinary configuration in production. Required environment variables: ${missing.join(', ')}`;
      logger.error('Cloudinary configuration validation failed', { missing, isProduction }, 'CLOUDINARY');
      throw new Error(error);
    }

    logger.info('Cloudinary configuration validated for production', {
      cloudName: cloudName.substring(0, 8) + '...',
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    }, 'CLOUDINARY');
  } else {
    logger.info('Cloudinary validation skipped for development mode', { isProduction }, 'CLOUDINARY');
  }
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
});

export default cloudinary;

// Helper function to upload image
export const uploadImage = async (buffer, filename, mimeType, folder = 'hangouts') => {
  try {
    // Check if we're in development mode with demo/placeholder credentials
    if (process.env.NODE_ENV === 'development' && 
        (process.env.CLOUDINARY_CLOUD_NAME === 'demo' || 
         process.env.CLOUDINARY_CLOUD_NAME === 'your_cloudinary_cloud_name' ||
         !process.env.CLOUDINARY_CLOUD_NAME ||
         process.env.CLOUDINARY_API_KEY === 'demo' ||
         process.env.CLOUDINARY_API_KEY === 'your_cloudinary_api_key')) {
      // Use local file storage for development
      // console.log('Using local file storage for development'); // Removed for production
      const result = await saveFileLocally(buffer, filename, folder);
      if (result.success) {
        return {
          success: true,
          url: result.url,
          public_id: result.filename,
        };
      } else {
        throw new Error(result.error);
      }
    }
    
    // Convert buffer to base64
    const base64 = buffer.toString('base64');
    const dataURI = `data:${mimeType};base64,${base64}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      public_id: filename.replace(/\.[^/.]+$/, ''), // Remove file extension
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    });
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to delete image
export const deleteImage = async (publicId) => {
  try {
    // Check if we're in development mode with local storage
    if (process.env.NODE_ENV === 'development' && 
        (process.env.CLOUDINARY_CLOUD_NAME === 'demo' || 
         process.env.CLOUDINARY_CLOUD_NAME === 'your_cloudinary_cloud_name' ||
         !process.env.CLOUDINARY_CLOUD_NAME ||
         process.env.CLOUDINARY_API_KEY === 'demo' ||
         process.env.CLOUDINARY_API_KEY === 'your_cloudinary_api_key')) {
      // Delete local file
      const { deleteFileLocally } = await import('./local-storage');
      return await deleteFileLocally(publicId);
    }
    
    // Use Cloudinary for production
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    logger.error('Image delete error:', error);
    return { success: false, error: error.message };
  }
};
