import fs from 'fs'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'

// Supported file types for bank statement uploads
export const SUPPORTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
} as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')
export const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed')

// Ensure upload directories exist
export async function ensureUploadDirs() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
    await mkdir(PROCESSED_DIR, { recursive: true })
    await mkdir(path.join(process.cwd(), 'data', 'backups'), { recursive: true })
  } catch (error) {
    console.error('Error creating upload directories:', error)
  }
}

// Validate file type and size
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    }
  }

  // Check file type
  const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES)
  if (!supportedTypes.includes(file.type)) {
    const supportedExtensions = Object.values(SUPPORTED_FILE_TYPES).flat()
    return {
      isValid: false,
      error: `Unsupported file type. Supported formats: ${supportedExtensions.join(', ')}`
    }
  }

  return { isValid: true }
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  console.log('Generating filename for:', originalName)
  
  if (!originalName || originalName === 'undefined') {
    throw new Error('Invalid original filename provided')
  }
  
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = path.extname(originalName)
  const name = path.basename(originalName, ext)
  
  console.log('Filename parts:', { originalName, timestamp, random, ext, name })
  
  const result = `${name}_${timestamp}_${random}${ext}`
  console.log('Generated filename:', result)
  
  return result
}

// Save uploaded file to local storage
export async function saveUploadedFile(
  file: File,
  filename: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    await ensureUploadDirs()
    
    const filePath = path.join(UPLOAD_DIR, filename)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    await writeFile(filePath, buffer)
    
    return {
      success: true,
      filePath
    }
  } catch (error) {
    console.error('Error saving file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Move file from uploads to processed directory
export async function moveToProcessed(filename: string): Promise<boolean> {
  try {
    const sourcePath = path.join(UPLOAD_DIR, filename)
    const destPath = path.join(PROCESSED_DIR, filename)
    
    if (fs.existsSync(sourcePath)) {
      await fs.promises.rename(sourcePath, destPath)
      return true
    }
    return false
  } catch (error) {
    console.error('Error moving file to processed:', error)
    return false
  }
}

// Delete file from storage
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
      return true
    }
    return false
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

// Get file info
export function getFileInfo(filePath: string): {
  exists: boolean
  size?: number
  modifiedAt?: Date
} {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      return {
        exists: true,
        size: stats.size,
        modifiedAt: stats.mtime
      }
    }
    return { exists: false }
  } catch (error) {
    console.error('Error getting file info:', error)
    return { exists: false }
  }
}

// Clean up old files (older than specified days)
export async function cleanupOldFiles(
  directory: string,
  olderThanDays: number = 30
): Promise<{ deletedCount: number; deletedFiles: string[] }> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    const files = await fs.promises.readdir(directory)
    const deletedFiles: string[] = []
    
    for (const file of files) {
      const filePath = path.join(directory, file)
      const stats = await fs.promises.stat(filePath)
      
      if (stats.mtime < cutoffDate) {
        await fs.promises.unlink(filePath)
        deletedFiles.push(file)
      }
    }
    
    return {
      deletedCount: deletedFiles.length,
      deletedFiles
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error)
    return { deletedCount: 0, deletedFiles: [] }
  }
}

// Get directory size
export async function getDirectorySize(directory: string): Promise<number> {
  try {
    let totalSize = 0
    const files = await fs.promises.readdir(directory)
    
    for (const file of files) {
      const filePath = path.join(directory, file)
      const stats = await fs.promises.stat(filePath)
      totalSize += stats.size
    }
    
    return totalSize
  } catch (error) {
    console.error('Error calculating directory size:', error)
    return 0
  }
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 