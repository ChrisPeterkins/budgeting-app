'use client'

import { useState } from 'react'
import { Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { UploadedFile } from '@/lib/hooks/use-file-upload'

interface MetadataEditDialogProps {
  file: UploadedFile
  onMetadataUpdate: (fileId: string) => void
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

export function MetadataEditDialog({ file, onMetadataUpdate }: MetadataEditDialogProps) {
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