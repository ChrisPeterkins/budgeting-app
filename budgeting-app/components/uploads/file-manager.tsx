'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, Trash2, Clock, CheckCircle, XCircle, RefreshCw, Eye, Info, List, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Simple Badge component inline
const Badge = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
    {children}
  </span>
)
import { useUploads, UploadedFile } from '@/lib/hooks/use-file-upload'
import { formatFileSize } from '@/lib/upload-utils-client'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { BankLogo } from './bank-logo'
// import { MetadataEditDialog } from './metadata-edit-dialog'

interface FileManagerProps {
  onFileSelect?: (file: UploadedFile) => void
  showActions?: boolean
}

// Bank and account type options
const BANK_OPTIONS = [
  'TD Bank', 'Chase', 'Bank of America', 'Wells Fargo', 'Ally Bank', 
  'Capital One', 'Citibank', 'Discover', 'American Express', 'US Bank'
]

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CREDIT', label: 'Credit' }
]

const STATEMENT_TYPES = [
  { value: 'CHECKING', label: 'Checking Statement' },
  { value: 'SAVINGS', label: 'Savings Statement' },
  { value: 'CREDIT_CARD', label: 'Credit Card Statement' }
]

function TransactionDetailsDialog({ file }: { file: UploadedFile }) {
  const details = file.processingDetails ? JSON.parse(file.processingDetails) : null
  const transactions = details?.transactions || []
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-green-500 hover:text-green-700"
          title="View All Transactions Found"
        >
          <List className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transactions Found in {file.originalName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Total Found</div>
              <div className="text-lg font-semibold">{transactions.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Successfully Imported</div>
              <div className="text-lg font-semibold text-green-600">{details?.transactionsImported || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Duplicates Skipped</div>
              <div className="text-lg font-semibold text-yellow-600">{details?.duplicates || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Bank Type</div>
              <div className="text-lg font-semibold">{details?.bankType || 'Unknown'}</div>
            </div>
          </div>
          
          {transactions.length > 0 ? (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">All Transactions Found:</h3>
              <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
                                  <table className="w-full text-base">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 border-b font-semibold">Date</th>
                        <th className="text-left p-3 border-b font-semibold">Description</th>
                        <th className="text-right p-3 border-b font-semibold">Amount</th>
                        <th className="text-center p-3 border-b font-semibold">Type</th>
                      </tr>
                    </thead>
                  <tbody>
                    {transactions.map((transaction: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-3 border-b">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="p-3 border-b">
                          <div className="max-w-md" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </td>
                        <td className="p-3 border-b text-right font-mono">
                          ${transaction.amount.toFixed(2)}
                        </td>
                        <td className="p-3 border-b text-center">
                          <Badge className={transaction.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {transaction.type === 'INCOME' && transaction.description.toLowerCase().includes('payment') ? 'PAYMENT' : transaction.type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No transaction details available
            </div>
          )}
          
          {details?.errors && details.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-red-600">Processing Errors</h4>
              <div className="text-sm space-y-1">
                {details.errors.map((error: string, index: number) => (
                  <div key={index} className="text-red-600 bg-red-50 p-2 rounded text-xs">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProcessingDetailsDialog({ file }: { file: UploadedFile }) {
  const details = file.processingDetails ? JSON.parse(file.processingDetails) : null
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
          title="View Processing Details"
        >
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Processing Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">File Information</h4>
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Name:</span> {file.originalName}</div>
              <div><span className="font-medium">Status:</span> {file.status}</div>
              <div><span className="font-medium">Processed:</span> {file.processedAt ? new Date(file.processedAt).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
          
          {details && (
            <div>
              <h4 className="font-medium text-sm mb-2">Processing Results</h4>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Bank Type:</span> {details.bankType || 'Unknown'}</div>
                <div><span className="font-medium">File Type:</span> {details.fileType || 'Unknown'}</div>
                <div><span className="font-medium">Transactions Found:</span> {details.transactionsFound || 0}</div>
                <div><span className="font-medium">Transactions Imported:</span> {details.transactionsImported || 0}</div>
                <div><span className="font-medium">Duplicates Skipped:</span> {details.duplicates || 0}</div>
              </div>
            </div>
          )}
          
          {details?.accounts && details.accounts.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Extracted Accounts</h4>
              <div className="text-sm space-y-2 max-h-40 overflow-y-auto">
                {details.accounts.map((account: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-2 rounded border">
                    <div className="font-medium text-blue-600">{account.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      <div>Account: {account.accountNumber}</div>
                      <div className="flex justify-between mt-1">
                        <span>Beginning: ${account.beginningBalance.toFixed(2)}</span>
                        <span>Ending: ${account.endingBalance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {file.errorMessage && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-red-600">Errors</h4>
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {file.errorMessage}
              </div>
            </div>
          )}
          
          {details?.errors && details.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-yellow-600">Processing Warnings</h4>
              <div className="text-sm space-y-1">
                {details.errors.map((error: string, index: number) => (
                  <div key={index} className="text-yellow-600 bg-yellow-50 p-1 rounded text-xs">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MetadataEditDialog({ file, onMetadataUpdate }: { file: UploadedFile, onMetadataUpdate: (fileId: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [bankName, setBankName] = useState((file as any).bankName || '')
  const [accountType, setAccountType] = useState((file as any).accountType || 'CHECKING')
  const [statementType, setStatementType] = useState((file as any).statementType || 'CHECKING')
  const [isUpdating, setIsUpdating] = useState(false)
  
  const updateMetadataMutation = api.uploads.updateMetadata.useMutation()
  
  const handleSave = async () => {
    if (!bankName.trim()) {
      toast.error('Bank name is required')
      return
    }
    
    setIsUpdating(true)
    try {
      await updateMetadataMutation.mutateAsync({
        fileId: file.id,
        bankName: bankName.trim(),
        accountType,
        statementType
      })
      
      toast.success('Metadata updated successfully. Processing changes...')
      setIsOpen(false)
      onMetadataUpdate(file.id)
    } catch (error) {
      console.error('Failed to update metadata:', error)
      toast.error('Failed to update metadata')
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700"
          title="Edit Metadata"
        >
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit File Metadata</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bankName">Bank/Institution</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank..." />
              </SelectTrigger>
              <SelectContent>
                {BANK_OPTIONS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="accountType">Account Type</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="statementType">Statement Type</Label>
            <Select value={statementType} onValueChange={setStatementType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATEMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> Changing metadata will trigger reprocessing of this file. 
              Transactions may be migrated to a different account or a new account may be created.
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleSave} 
              disabled={isUpdating || !bankName.trim()}
              className="flex-1"
            >
              {isUpdating ? 'Updating...' : 'Save & Reprocess'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function FileManager({ onFileSelect, showActions = true }: FileManagerProps) {
  const { uploads, loading, error, fetchUploads } = useUploads()
  const deleteFileMutation = api.uploads.delete.useMutation()
  
  // Load user's accounts to show account names
  const { data: accounts } = api.accounts.getAll.useQuery()

  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  // Auto-refresh for processing files
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if any files are currently processing
      const hasProcessingFiles = uploads.some(file => file.status === 'PROCESSING')
      if (hasProcessingFiles) {
        fetchUploads()
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [uploads, fetchUploads])

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    try {
      await deleteFileMutation.mutateAsync({ id: fileId })
      toast.success('File deleted successfully')
      fetchUploads() // Refresh the list
    } catch (error) {
      toast.error('Failed to delete file')
      console.error('Delete error:', error)
    }
  }

  const handleRetryFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // First reset the file status to PENDING
      const response = await fetch('/api/process-file', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId, action: 'reset' })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Reset failed')
      }

      toast.success('File reset to pending, you can now retry processing')
      fetchUploads() // Refresh to show updated status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed'
      toast.error(`Retry failed: ${errorMessage}`)
    }
  }

  const handleReprocessFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Reset the file status to PENDING first
      const resetResponse = await fetch('/api/process-file', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId, action: 'reset' })
      })

      if (!resetResponse.ok) {
        const errorData = await resetResponse.json()
        throw new Error(errorData.error || 'Reset failed')
      }

      // Then start processing
      const processResponse = await fetch('/api/process-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId })
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        throw new Error(errorData.error || 'Reprocessing failed')
      }

      toast.success('File reprocessing started')
      fetchUploads() // Refresh to show updated status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reprocess failed'
      toast.error(`Reprocess failed: ${errorMessage}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />
      case 'FAILED':
        return <XCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const filterFilesByStatus = (status: string) => {
    return uploads.filter(file => file.status === status)
  }

  const FileList = ({ files, emptyMessage }: { files: UploadedFile[], emptyMessage: string }) => (
    <div className="space-y-3">
      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        files.map((file) => (
          <Card key={file.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-3 flex-grow cursor-pointer"
                  onClick={() => onFileSelect?.(file)}
                >
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-sm truncate">{file.originalName}</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Bank and Account Information */}
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      {(file as any).bankName && (
                        <div className="flex items-center space-x-2">
                          <BankLogo bankName={(file as any).bankName} size={6} />
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {(file as any).bankName}
                          </Badge>
                        </div>
                      )}
                      {(file as any).accountId && accounts && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          📊 {accounts.find(a => a.id === (file as any).accountId)?.name || 'Linked Account'}
                        </Badge>
                      )}
                      <Badge className="bg-gray-100 text-gray-800 text-xs">
                        {(file as any).accountType?.replace('_', ' ') || 'CHECKING'}
                      </Badge>
                    </div>
                    
                    {file.status === 'FAILED' && file.errorMessage && (
                      <div className="mt-1 text-xs text-red-600 truncate" title={file.errorMessage}>
                        Error: {file.errorMessage}
                      </div>
                    )}
                    {file.status === 'COMPLETED' && file.transactionCount !== null && (
                      <div className="mt-1 text-xs text-green-600">
                        {file.transactionCount} transactions imported
                        {(file as any).accountId && accounts && (
                          <span className="ml-1">
                            → {accounts.find(a => a.id === (file as any).accountId)?.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getStatusColor(file.status)} text-xs`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(file.status)}
                        <span>{file.status}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
                
                {showActions && (
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Removed manual "Process File" button since processing is now automatic */}
                    
                    {file.status === 'FAILED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700"
                        onClick={() => handleRetryFile(file.id)}
                        title="Retry Processing"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {(file.status === 'COMPLETED' || file.status === 'FAILED') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-purple-500 hover:text-purple-700"
                        onClick={() => handleReprocessFile(file.id)}
                        title="Reprocess File"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {(file.status === 'COMPLETED' || file.status === 'FAILED') && (
                      <ProcessingDetailsDialog file={file} />
                    )}
                    
                    {(file.status === 'COMPLETED' || file.status === 'FAILED') && (
                      <MetadataEditDialog 
                        file={file} 
                        onMetadataUpdate={(fileId) => {
                          // Refresh the uploads list after metadata update
                          fetchUploads()
                          // Show a message that reprocessing has started
                          toast.info('Reprocessing file with new metadata...')
                        }} 
                      />
                    )}
                    
                    {file.status === 'COMPLETED' && (() => {
                      const details = file.processingDetails ? JSON.parse(file.processingDetails) : null
                      const hasTransactions = (file.transactionCount && file.transactionCount > 0) || 
                                            (details?.transactions && details.transactions.length > 0)
                      return hasTransactions
                    })() && (
                      <TransactionDetailsDialog file={file} />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={deleteFileMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
          <p className="text-gray-500">Loading files...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <XCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => fetchUploads()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const pendingFiles = filterFilesByStatus('PENDING')
  const processingFiles = filterFilesByStatus('PROCESSING')
  const completedFiles = filterFilesByStatus('COMPLETED')
  const failedFiles = filterFilesByStatus('FAILED')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>File Manager</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchUploads()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">
              All ({uploads.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending ({pendingFiles.length})
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs">
              Processing ({processingFiles.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              Completed ({completedFiles.length})
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">
              Failed ({failedFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <FileList 
              files={uploads} 
              emptyMessage="No files uploaded yet. Upload some files to get started." 
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <FileList 
              files={pendingFiles} 
              emptyMessage="No pending files. Files are automatically processed upon upload." 
            />
          </TabsContent>

          <TabsContent value="processing" className="mt-4">
            <FileList 
              files={processingFiles} 
              emptyMessage="No files currently being processed. Files are automatically processed when uploaded." 
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <FileList 
              files={completedFiles} 
              emptyMessage="No completed files yet. Successfully processed files will appear here." 
            />
          </TabsContent>

          <TabsContent value="failed" className="mt-4">
            <FileList 
              files={failedFiles} 
              emptyMessage="No failed files. Files that couldn't be processed will appear here." 
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 