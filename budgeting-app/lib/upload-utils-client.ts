// Client-safe upload utilities (no Node.js imports)

// Supported file types for bank statement uploads
export const SUPPORTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES = 10

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
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalName.substring(originalName.lastIndexOf('.'))
  const name = originalName.substring(0, originalName.lastIndexOf('.'))
  return `${name}_${timestamp}_${random}${ext}`
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Get file extension
export function getFileExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.'))
}

// Check if file is supported
export function isSupportedFileType(file: File): boolean {
  return Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)
}

// Get MIME type from extension
export function getMimeTypeFromExtension(extension: string): string | null {
  for (const [mimeType, extensions] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (extensions.includes(extension as any)) {
      return mimeType
    }
  }
  return null
} 