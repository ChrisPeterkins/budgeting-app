import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface UploadedFile {
  id: string
  filename: string
  originalName: string
  fileSize: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  accountId?: string | null
  bankName?: string | null
  accountType?: string
  statementType?: string
  createdAt: string
  processedAt?: string | null
  errorMessage?: string | null
  transactionCount?: number | null
  processingDetails?: string | null
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  result?: UploadedFile
}

export function useFileUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = useCallback(async (file: File, metadata?: { 
    accountId?: string | null; 
    bankName?: string; 
    accountType?: string; 
    statementType?: string 
  }) => {
    const fileId = `${file.name}_${Date.now()}`
    
    // Initialize upload progress
    setUploads(prev => new Map(prev.set(fileId, {
      file,
      progress: 0,
      status: 'uploading'
    })))
    
    setIsUploading(true)

    try {
      // Get auth token
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('🚀 FRESH UPLOAD HOOK - sending metadata:', metadata)
      console.log('🚀 Full metadata object structure:', JSON.stringify(metadata, null, 2))
      
      // Add metadata if provided - always send values if they exist, even empty strings
      if (metadata?.accountId) {
        formData.append('accountId', metadata.accountId)
        console.log('Added accountId to form:', metadata.accountId)
      }
      if (metadata?.bankName !== undefined) {
        formData.append('bankName', metadata.bankName)
        console.log('Added bankName to form:', metadata.bankName)
      }
      if (metadata?.accountType !== undefined) {
        formData.append('accountType', metadata.accountType)
        console.log('Added accountType to form:', metadata.accountType)
      }
      if (metadata?.statementType !== undefined) {
        formData.append('statementType', metadata.statementType)
        console.log('Added statementType to form:', metadata.statementType)
      }

      // Upload with progress tracking
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      // Update progress to success
      setUploads(prev => new Map(prev.set(fileId, {
        file,
        progress: 100,
        status: 'success',
        result: result.upload
      })))

      toast.success(`File "${file.name}" uploaded successfully`)
      return result.upload

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      // Update progress to error
      setUploads(prev => new Map(prev.set(fileId, {
        file,
        progress: 0,
        status: 'error',
        error: errorMessage
      })))

      toast.error(`Upload failed: ${errorMessage}`)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [])

  const uploadMultipleFiles = useCallback(async (files: File[] | Array<{ 
    file: File; 
    metadata?: { 
      accountId?: string | null; 
      bankName?: string; 
      accountType?: string; 
      statementType?: string 
    } 
  }>) => {
    console.log('📦 FRESH uploadMultipleFiles received:', files)
    console.log('📦 First item type check:', files[0] instanceof File ? 'File' : 'Object with metadata')
    setIsUploading(true)
    const results = []
    const errors = []

    for (const item of files) {
      try {
        // Handle both File[] and Array<{file: File, metadata}> inputs
        if (item instanceof File) {
          console.log('Processing as File:', item.name)
          const result = await uploadFile(item)
          results.push(result)
        } else {
          console.log('Processing as object with metadata:', {
            fileName: item.file.name,
            metadata: item.metadata
          })
          const result = await uploadFile(item.file, item.metadata)
          results.push(result)
        }
      } catch (error) {
        const file = item instanceof File ? item : item.file
        errors.push({ file, error })
      }
    }

    setIsUploading(false)

    if (results.length > 0) {
      toast.success(`${results.length} file(s) uploaded successfully`)
    }

    if (errors.length > 0) {
      toast.error(`${errors.length} file(s) failed to upload`)
    }

    return { results, errors }
  }, [uploadFile])

  const clearUpload = useCallback((fileId: string) => {
    setUploads(prev => {
      const newMap = new Map(prev)
      newMap.delete(fileId)
      return newMap
    })
  }, [])

  const clearAllUploads = useCallback(() => {
    setUploads(new Map())
  }, [])

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/upload?id=${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      toast.success('File deleted successfully')
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed'
      toast.error(`Delete failed: ${errorMessage}`)
      throw error
    }
  }, [])

  return {
    uploads: Array.from(uploads.values()),
    isUploading,
    uploadFile,
    uploadMultipleFiles,
    clearUpload,
    clearAllUploads,
    deleteFile
  }
}

// Hook to fetch upload list
export function useUploads() {
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUploads = useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams()
      if (status) params.append('status', status)

      const response = await fetch(`/api/upload?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch uploads')
      }

      const data = await response.json()
      setUploads(data.uploads)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch uploads'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    uploads,
    loading,
    error,
    fetchUploads,
    refetch: () => fetchUploads()
  }
} 