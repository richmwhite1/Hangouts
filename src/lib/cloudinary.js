import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper function to upload image
export const uploadImage = async (buffer, filename, mimeType, folder = 'hangouts') => {
  try {
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
