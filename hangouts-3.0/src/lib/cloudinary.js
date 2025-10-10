import { v2 as cloudinary } from 'cloudinary';
import { saveFileLocally } from './local-storage';

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
      console.log('Using local file storage for development');
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
    console.error('Cloudinary upload error:', error);
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
    console.error('Image delete error:', error);
    return { success: false, error: error.message };
  }
};
