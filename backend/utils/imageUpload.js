import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const uploadImage = async (base64Data, fileName = null) => {
  try {
    console.log('📤 uploadImage called with fileName:', fileName);
    // Extract base64 content
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 image format');
    }

    const [, ext, base64Content] = matches;
    console.log('📦 Base64 extracted - ext:', ext, 'content length:', base64Content.length);
    const buffer = Buffer.from(base64Content, 'base64');
    console.log('📦 Buffer created - size:', buffer.length, 'bytes');

    // Generate unique filename
    const uniqueName = fileName || `${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);
    console.log('📁 Upload path:', filePath);

    // Write file
    fs.writeFileSync(filePath, buffer);
    console.log('✅ File written successfully');

    // Return relative URL path
    const url = `/uploads/${uniqueName}`;
    console.log('🔗 Returning URL:', url);
    return url;
  } catch (error) {
    console.error('❌ Image upload error:', error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

export const deleteImage = (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
      return; // Not a local upload
    }

    const fileName = imageUrl.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
};
