import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Local storage configuration
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const UPLOAD_URL = '/uploads'

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Generate unique filename
function generateFilename(originalName, type) {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const uuid = uuidv4().substring(0, 8)
  return `${type}_${timestamp}_${uuid}${ext}`
}

// Save file locally
export async function saveFileLocally(buffer, originalName, type = 'hangout') {
  try {
    await ensureUploadDir()
    
    const filename = generateFilename(originalName, type)
    const filePath = path.join(UPLOAD_DIR, filename)
    const publicUrl = `${UPLOAD_URL}/${filename}`
    
    await fs.writeFile(filePath, buffer)
    
    return {
      success: true,
      url: publicUrl,
      filename: filename,
      path: filePath,
      size: buffer.length
    }
  } catch (error) {
    console.error('Local file save error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Delete file locally
export async function deleteFileLocally(filename) {
  try {
    const filePath = path.join(UPLOAD_DIR, filename)
    await fs.unlink(filePath)
    return { success: true }
  } catch (error) {
    console.error('Local file delete error:', error)
    return { success: false, error: error.message }
  }
}

// Get file info
export async function getFileInfo(filename) {
  try {
    const filePath = path.join(UPLOAD_DIR, filename)
    const stats = await fs.stat(filePath)
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime
    }
  } catch {
    return { exists: false }
  }
}
