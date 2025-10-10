import { v2 as cloudinary } from 'cloudinary';

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
    // Check if we're in development mode with demo credentials
    if (process.env.NODE_ENV === 'development' && 
        (process.env.CLOUDINARY_CLOUD_NAME === 'demo' || !process.env.CLOUDINARY_CLOUD_NAME)) {
      // Return a placeholder URL for local development
      return {
        success: true,
        url: `https://via.placeholder.com/400x300/cccccc/666666?text=${encodeURIComponent(filename)}`,
        public_id: `local_dev_${Date.now()}_${filename}`,
      };
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
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return { success: false, error: error.message };
  }
};
