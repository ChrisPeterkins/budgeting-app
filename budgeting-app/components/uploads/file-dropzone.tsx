'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle, CheckCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatFileSize } from '@/lib/upload-utils-client'
import { useFileUpload } from '@/lib/hooks/use-file-upload'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface FileDropzoneProps {
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
  { value: 'CHECKING', label: 'Checking Account', description: 'Regular checking account statements' },
  { value: 'SAVINGS', label: 'Savings Account', description: 'Savings account statements' },
  { value: 'CREDIT_CARD', label: 'Credit Card', description: 'Credit card statements' },
  { value: 'INVESTMENT', label: 'Investment Account', description: 'Brokerage/investment statements' },
  { value: 'LOAN', label: 'Loan Account', description: 'Loan statements (auto, mortgage, etc.)' },
]

const STATEMENT_TYPES = [
  { value: 'MONTHLY', label: 'Monthly Statement', description: 'Regular monthly account statement' },
  { value: 'QUARTERLY', label: 'Quarterly Statement', description: 'Quarterly summary statement' },
  { value: 'ANNUAL', label: 'Annual Statement', description: 'Year-end or annual statement' },
  { value: 'TRANSACTION_HISTORY', label: 'Transaction Export', description: 'CSV/Excel transaction export' },
]

// Common bank names for quick selection
const COMMON_BANKS = [
  'TD Bank',
  'Chase Bank',
  'Bank of America',
  'Wells Fargo',
  'Ally Bank',
  'Capital One',
  'Citi Bank',
  'PNC Bank',
  'US Bank',
  'Discover Bank',
  'American Express',
  'Other'
]

export function FileDropzone({ 
  onUploadComplete, 
  maxFiles = 10,
  className = '' 
}: FileDropzoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { uploads, isUploading, uploadMultipleFiles, clearUpload } = useFileUpload()
  
  // Load user's accounts for selection
  const { data: accounts, isLoading: accountsLoading } = api.accounts.getAll.useQuery()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          toast.error(`${file.name}: ${error.message}`)
        })
      })
    }

    // Add accepted files with default metadata
    if (acceptedFiles.length > 0) {
      const filesWithMetadata: FileWithMetadata[] = acceptedFiles.map(file => ({
        file,
        accountId: null, // No account selected by default
        bankName: 'TD Bank', // Default to TD Bank since we have good PDF support
        accountType: 'CHECKING', // Default to checking
        statementType: 'MONTHLY' // Default to monthly
      }))
      setSelectedFiles(prev => [...prev, ...filesWithMetadata])
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
    setSelectedFiles(prev => prev.map((fileData, i) => 
      i === index ? { ...fileData, [field]: value } : fileData
    ))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    try {
      // Upload files with metadata
      const filesWithMetadata = selectedFiles.map(fileData => ({
        file: fileData.file,
        metadata: {
          accountId: fileData.accountId,
          bankName: fileData.bankName,
          accountType: fileData.accountType,
          statementType: fileData.statementType
        }
      }))
      
      const { results } = await uploadMultipleFiles(filesWithMetadata)
      setSelectedFiles([])
      onUploadComplete?.(results)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const clearUploads = () => {
    uploads.forEach((upload, index) => {
      clearUpload(`${upload.file.name}_${Date.now() - index}`)
    })
  }

  const getAccountTypeInfo = (type: string) => 
    ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0]

  const getStatementTypeInfo = (type: string) => 
    STATEMENT_TYPES.find(t => t.value === type) || STATEMENT_TYPES[0]

  return (
    <div className={`space-y-4 ${className}`}>
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
                <p><strong>Supported formats:</strong> CSV, XLS, XLSX, TXT, PDF</p>
                <p><strong>Bank PDFs:</strong> TD Bank, Ally Bank, Chase, Wells Fargo</p>
                <p>Maximum file size: 10MB • Maximum {maxFiles} files</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Selected Files ({selectedFiles.length})</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide Options' : 'Configure Files'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{file.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File Configuration */}
                {showAdvanced && (
                  <div className="space-y-4 pt-3 border-t">
                    {/* Account Selection and Bank Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">
                          Link to Account
                        </Label>
                        {accountsLoading ? (
                          <div className="text-xs text-gray-500">Loading accounts...</div>
                        ) : (
                          <select
                            value={file.accountId || ''}
                            onChange={(e) => updateFileMetadata(index, 'accountId', e.target.value || null)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select account (optional)</option>
                            {accounts?.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} ({account.type.replace('_', ' ')})
                                {account.institution && ` - ${account.institution}`}
                              </option>
                            ))}
                          </select>
                        )}
                        {file.accountId && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Will import transactions to this account
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">
                          Bank/Institution
                        </Label>
                        <select
                          value={file.bankName}
                          onChange={(e) => updateFileMetadata(index, 'bankName', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {COMMON_BANKS.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                        {file.bankName === 'Other' && (
                          <input
                            type="text"
                            placeholder="Enter bank name"
                            value={file.bankName === 'Other' ? '' : file.bankName}
                            onChange={(e) => updateFileMetadata(index, 'bankName', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    </div>

                    {/* Account Type and Statement Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium text-gray-700">Account Type</Label>
                        <div className="mt-1 space-y-1">
                          {ACCOUNT_TYPES.map((type) => (
                            <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`accountType-${index}`}
                                value={type.value}
                                checked={file.accountType === type.value}
                                onChange={(e) => updateFileMetadata(index, 'accountType', e.target.value)}
                                className="w-3 h-3 text-blue-600"
                              />
                              <span className="text-xs">{type.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-gray-700">Statement Type</Label>
                        <div className="mt-1 space-y-1">
                          {STATEMENT_TYPES.map((type) => (
                            <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`statementType-${index}`}
                                value={type.value}
                                checked={file.statementType === type.value}
                                onChange={(e) => updateFileMetadata(index, 'statementType', e.target.value)}
                                className="w-3 h-3 text-blue-600"
                              />
                              <span className="text-xs">{type.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick file info badges */}
                {!showAdvanced && (
                  <div className="flex flex-wrap gap-2">
                    {file.bankName && (
                      <Badge variant="secondary" className="text-xs">
                        {file.bankName}
                      </Badge>
                    )}
                    {file.accountId && accounts && (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                        {accounts.find(a => a.id === file.accountId)?.name || 'Linked Account'}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {getAccountTypeInfo(file.accountType!).label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getStatementTypeInfo(file.statementType!).label}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
            
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Upload Progress</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={clearUploads}
              >
                Clear
              </Button>
            </div>
            
            <div className="space-y-3">
              {uploads.map((upload, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-3">
                    <File className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{upload.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(upload.file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {upload.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {upload.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-xs capitalize">{upload.status}</span>
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