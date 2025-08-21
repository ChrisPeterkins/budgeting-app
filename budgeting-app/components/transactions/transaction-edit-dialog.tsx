'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Edit3, Calendar, DollarSign, Tags, Plus } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog'

interface Transaction {
  id: string
  date: string | Date
  amount: number
  description: string
  categoryId?: string | null
  category?: { 
    id: string; 
    name: string; 
    icon?: string | null;
    color?: string | null;
    parentId?: string | null;
    isSystem?: boolean;
  } | null
  transactionCategories?: Array<{
    id: string
    category: { 
      id: string; 
      name: string; 
      icon?: string | null;
      color?: string | null;
      parentId?: string | null;
      isSystem?: boolean;
    }
  }>
  account?: {
    id: string
    name: string
    type: string
  }
}

interface TransactionEditDialogProps {
  transaction: Transaction
  children?: React.ReactNode
  onSuccess?: () => void
  account?: {
    id: string
    name: string
    type: string
  }
}

export function TransactionEditDialog({ transaction, children, onSuccess, account }: TransactionEditDialogProps) {
  const [open, setOpen] = useState(false)
  
  // Use the account from props or transaction
  const transactionAccount = account || transaction.account
  
  // Move helper functions before state initialization
  const isCreditCard = (accountType: string) => {
    return accountType === 'CREDIT_CARD' || accountType === 'CREDIT'
  }
  
  const [formData, setFormData] = useState({
    date: format(new Date(transaction.date), 'yyyy-MM-dd'),
    amount: Math.abs(transaction.amount).toString(),
    description: transaction.description,
    // Fix the transaction type detection logic
    isExpense: transactionAccount && isCreditCard(transactionAccount.type) 
      ? transaction.amount > 0  // For credit cards: positive = expense
      : transaction.amount < 0, // For checking/savings: negative = expense
  })
  
  // Get all categories assigned to this transaction
  const currentCategoryIds = new Set([
    ...(transaction.categoryId ? [transaction.categoryId] : []),
    ...(transaction.transactionCategories?.map(tc => tc.category.id) || [])
  ])
  
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    Array.from(currentCategoryIds)
  )

  const { data: categories } = api.categories.getAll.useQuery()
  const updateTransactionMutation = api.transactions.update.useMutation()
  const updateCategoriesMutation = api.transactions.updateCategories.useMutation()
  const learnFromCategorizationMutation = api.categories.learnFromCategorization.useMutation()
  const utils = api.useContext()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleCategoryCreated = async (newCategory: any) => {
    // Refresh categories data
    await utils.categories.getAll.refetch()
    
    // Automatically add the new category to the transaction
    if (!selectedCategoryIds.includes(newCategory.id)) {
      setSelectedCategoryIds([...selectedCategoryIds, newCategory.id])
    }
    
    toast.success(`"${newCategory.name}" added to transaction!`)
  }

  const handleSave = async () => {
    try {
      const numericAmount = parseFloat(formData.amount)
      if (isNaN(numericAmount)) {
        toast.error('Please enter a valid amount')
        return
      }

      // Calculate signed amount based on account type and expense flag
      let signedAmount: number
      if (transactionAccount && isCreditCard(transactionAccount.type)) {
        // For credit cards: expenses are positive, payments are negative
        signedAmount = formData.isExpense ? numericAmount : -numericAmount
      } else {
        // For checking/savings: expenses are negative, income is positive
        signedAmount = formData.isExpense ? -numericAmount : numericAmount
      }

      // Update basic transaction details
      await updateTransactionMutation.mutateAsync({
        id: transaction.id,
        date: new Date(formData.date), // Convert to Date object
        amount: signedAmount,
        description: formData.description,
      })

      // Update categories separately for better control
      await updateCategoriesMutation.mutateAsync({
        transactionId: transaction.id,
        categoryIds: selectedCategoryIds,
      })

      // Learn from each new category assignment
      for (const categoryId of selectedCategoryIds) {
        try {
          await learnFromCategorizationMutation.mutateAsync({
            transactionId: transaction.id,
            categoryId
          })
        } catch (error) {
          console.warn('Learning failed for category:', categoryId, error)
        }
      }

      console.log('Transaction updated, invalidating caches...')

      // More aggressive cache invalidation strategy
      try {
        // First, invalidate all category-related queries
        await utils.categories.invalidate()
        await utils.transactions.invalidate()
        await utils.accounts.invalidate()
        
        // Force refetch specific queries
        await Promise.all([
          utils.categories.getAnalytics.refetch(),
          utils.categories.getAll.refetch(),
          utils.categories.getTotalTransactionCount.refetch(),
          utils.transactions.getAll.refetch(),
        ])
        
        console.log('Cache invalidation completed successfully')
        
        // Additional debugging
        console.log('Updated transaction with categories:', {
          transactionId: transaction.id,
          newCategoryIds: selectedCategoryIds,
          timestamp: new Date().toISOString()
        })
      } catch (cacheError) {
        console.error('Cache invalidation error:', cacheError)
      }

      toast.success('Transaction updated successfully')
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to update transaction')
      console.error('Update transaction error:', error)
    }
  }

  const addCategory = (categoryId: string) => {
    if (!selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds([...selectedCategoryIds, categoryId])
    }
  }

  const removeCategory = (categoryId: string) => {
    setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== categoryId))
  }

  const availableCategories = categories?.filter(
    category => !selectedCategoryIds.includes(category.id)
  ) || []

  const selectedCategories = categories?.filter(
    category => selectedCategoryIds.includes(category.id)
  ) || []

  // Get account type for transaction type labels
  const accountType = transactionAccount?.type || 'CHECKING'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="w-5 h-5 mr-2" />
            Edit Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amount" className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Transaction description"
              />
            </div>

            <div>
              <Label>Transaction Type</Label>
              <div className="flex space-x-4 mt-2">
                <Button
                  type="button"
                  variant={formData.isExpense ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, isExpense: true })}
                  className="flex-1"
                >
                  {isCreditCard(accountType) ? 'Expense' : 'Expense'}
                </Button>
                <Button
                  type="button"
                  variant={!formData.isExpense ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, isExpense: false })}
                  className="flex-1"
                >
                  {isCreditCard(accountType) ? 'Payment' : 'Income'}
                </Button>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-4">
            <Label className="flex items-center">
              <Tags className="w-4 h-4 mr-2" />
              Categories
            </Label>

            {/* Selected Categories */}
            {selectedCategories.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Selected Categories:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="secondary"
                      className="flex items-center space-x-1"
                      style={{ backgroundColor: category.color || undefined }}
                    >
                      <span>{category.name}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(category.id)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Category Section */}
            <div className="space-y-3">
              {/* Add Existing Category Dropdown */}
              {availableCategories.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Add Existing Category:</div>
                  <Select onValueChange={addCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            {category.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Create New Category */}
              <div>
                <div className="text-sm text-gray-600 mb-2">Or create a new category:</div>
                <CreateCategoryDialog
                  onCategoryCreated={handleCategoryCreated}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Category
                    </Button>
                  }
                />
              </div>
            </div>

            {selectedCategories.length === 0 && (
              <div className="text-sm text-gray-500 italic">
                No categories selected. You can add existing categories or create new ones to help organize this transaction.
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Preview:</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{formData.description}</div>
                <div className="text-sm text-gray-500">
                  {format(new Date(formData.date), 'MMM dd, yyyy')}
                  {transactionAccount && ` • ${transactionAccount.name}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(parseFloat(formData.amount || '0'))}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.isExpense 
                    ? (isCreditCard(accountType) ? 'Expense' : 'Expense')
                    : (isCreditCard(accountType) ? 'Payment' : 'Income')
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button
              onClick={handleSave}
              disabled={updateTransactionMutation.isPending || updateCategoriesMutation.isPending}
              className="flex-1"
            >
              {(updateTransactionMutation.isPending || updateCategoriesMutation.isPending) ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 