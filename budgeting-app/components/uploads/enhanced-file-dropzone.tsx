'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle, CheckCircle, Building, CreditCard, Wallet, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatFileSize } from '@/lib/upload-utils-client'
import { useFileUpload } from '@/lib/hooks/use-file-upload'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface EnhancedFileDropzoneProps {
  onUploadComplete?: (files: any[]) => void
  maxFiles?: number
  className?: string
}

interface FileWithMetadata {
  file: File
  accountId: string | null
  bankName: string
  accountType: string
  statementType: string
}

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Checking', icon: Wallet, color: 'bg-blue-100 text-blue-800' },
  { value: 'SAVINGS', label: 'Savings', icon: Building, color: 'bg-green-100 text-green-800' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, color: 'bg-purple-100 text-purple-800' },
]

const BANK_OPTIONS = [
  'TD Bank', 'Chase', 'Bank of America', 'Wells Fargo', 'Ally Bank', 
  'Capital One', 'Citibank', 'Discover', 'American Express', 'US Bank'
]

// Smart defaults based on file name
const getSmartDefaults = (fileName: string) => {
  const lowerName = fileName.toLowerCase()
  
  let accountType = 'CHECKING'
  if (lowerName.includes('credit') || lowerName.includes('card')) {
    accountType = 'CREDIT_CARD'
  } else if (lowerName.includes('saving')) {
    accountType = 'SAVINGS'
  }
  
  return { accountType, statementType: 'MONTHLY' }
}

export function EnhancedFileDropzone({ 
  onUploadComplete, 
  maxFiles = 10,
  className = '' 
}: EnhancedFileDropzoneProps) {
  console.log('🚀 Enhanced File Dropzone Loaded - Version with Metadata Fix')
  
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([])
  const { uploads, isUploading, uploadMultipleFiles, clearUpload } = useFileUpload()
  
  // Load user's accounts for selection
  const { data: accounts } = api.accounts.getAll.useQuery()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          toast.error(`${file.name}: ${error.message}`)
        })
      })
    }

    // Add accepted files with smart defaults but NO automatic account linking
    if (acceptedFiles.length > 0) {
      const filesWithMetadata: FileWithMetadata[] = acceptedFiles.map(file => {
        const smartDefaults = getSmartDefaults(file.name)
        
        const fileData = {
          file,
          accountId: null, // Never auto-link to prevent wrong associations
          bankName: 'TD Bank', // Default bank
          accountType: smartDefaults.accountType,
          statementType: smartDefaults.statementType,
        }
        
        console.log('📁 Adding file with metadata:', {
          fileName: file.name,
          metadata: {
            bankName: fileData.bankName,
            accountType: fileData.accountType,
            statementType: fileData.statementType
          }
        })
        
        return fileData
      })
      setSelectedFiles(prev => [...prev, ...filesWithMetadata])
      toast.success(`Added ${filesWithMetadata.length} file(s) ready to upload`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles,
    multiple: true
  })

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateFileMetadata = (index: number, field: string, value: string | null) => {
    console.log(`🔄 Updating file metadata [${index}]: ${field} = ${value}`)
    setSelectedFiles(prev => prev.map((fileData, i) => 
      i === index ? { ...fileData, [field]: value } : fileData
    ))
  }

  const handleUpload = async () => {
    try {
      const uploadData = selectedFiles.map(f => ({
        file: f.file,
        metadata: {
          accountId: f.accountId,
          bankName: f.bankName,
          accountType: f.accountType,
          statementType: f.statementType
        }
      }))

      console.log('🎯 ENHANCED DROPZONE FRESH - calling uploadMultipleFiles with:', uploadData)
      console.log('🎯 First file structure:', JSON.stringify(uploadData[0], null, 2))

      await uploadMultipleFiles(uploadData)
      setSelectedFiles([])
      onUploadComplete?.(uploadData)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const getAccountTypeInfo = (type: string) => 
    ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dropzone */}
      <Card className="border-2 border-dashed transition-colors">
        <CardContent
          {...getRootProps()}
          className={`
            p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : ''}
            ${isDragReject ? 'border-red-500 bg-red-50' : ''}
            ${!isDragActive && !isDragReject ? 'hover:bg-gray-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
              <Upload className={`
                w-8 h-8 transition-colors
                ${isDragActive ? 'text-blue-500' : 'text-gray-400'}
                ${isDragReject ? 'text-red-500' : ''}
              `} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive 
                  ? 'Drop files here...' 
                  : 'Upload Bank Statements'
                }
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop files here, or click to browse
              </p>
              
              <div className="text-xs text-gray-500">
                <p><strong>Supported:</strong> CSV, XLS, XLSX, TXT, PDF • Max 10MB per file</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files - Compact Design */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Ready to Upload ({selectedFiles.length} files)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFiles([])}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Compact file list */}
            <div className="space-y-2">
              {selectedFiles.map((fileData, index) => {
                const accountTypeInfo = getAccountTypeInfo(fileData.accountType)
                const IconComponent = accountTypeInfo.icon
                const linkedAccount = accounts?.find(a => a.id === fileData.accountId)
                
                return (
                  <div key={index} className="border rounded-lg p-3">
                    {/* Compact file row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <File className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{fileData.file.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{formatFileSize(fileData.file.size)}</span>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {fileData.bankName}
                            </Badge>
                            <Badge className={`text-xs px-1 py-0 ${accountTypeInfo.color}`}>
                              <IconComponent className="w-3 h-3 mr-1" />
                              {accountTypeInfo.label}
                            </Badge>
                            {linkedAccount && (
                              <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-300">
                                → {linkedAccount.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Configuration always visible */}
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Bank Selection */}
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Bank</Label>
                          <select
                            value={fileData.bankName}
                            onChange={(e) => updateFileMetadata(index, 'bankName', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            {BANK_OPTIONS.map((bank) => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                          </select>
                        </div>

                        {/* Account Type */}
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Type</Label>
                          <select
                            value={fileData.accountType}
                            onChange={(e) => updateFileMetadata(index, 'accountType', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            {ACCOUNT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Account Linking */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">
                          Link to existing account (optional - leave blank to create new)
                        </Label>
                        <select
                          value={fileData.accountId || ''}
                          onChange={(e) => updateFileMetadata(index, 'accountId', e.target.value || null)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Create new account</option>
                          {accounts
                            ?.filter(acc => acc.type === fileData.accountType)
                            .map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} ({account.institution || 'No institution'})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Upload button - always visible, no scrolling needed */}
            <div className="pt-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? 'Uploading...' : `Upload & Process ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress - Compact */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Upload Progress</h4>
              <Button variant="outline" size="sm" onClick={() => uploads.forEach((_, i) => clearUpload(`upload_${i}`))}>
                Clear
              </Button>
            </div>
            
            <div className="space-y-2">
              {uploads.map((upload, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <File className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium truncate">{upload.file.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {upload.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    )}
                    {upload.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-xs capitalize text-gray-600">{upload.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
