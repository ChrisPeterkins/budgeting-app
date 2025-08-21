'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Plus, Calendar, Building2, Edit3, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/trpc/client'
import { TransactionEditDialog } from '@/components/transactions/transaction-edit-dialog'

export default function TransactionsPage() {
  const router = useRouter()
  const utils = api.useContext()
  
  const { data: transactionsData, isLoading, error, refetch } = api.transactions.getAll.useQuery({
    limit: 50,
    offset: 0
  })

  const { data: accounts } = api.accounts.getAll.useQuery()
  const { data: categories } = api.categories.getAll.useQuery()
  
  const { data: transactionsNeedingReview } = api.categories.getTransactionsNeedingReview.useQuery()

  const handleTransactionUpdated = async () => {
    // Invalidate all related queries when a transaction is updated
    await Promise.all([
      utils.categories.getAnalytics.invalidate(),
      utils.categories.getAll.invalidate(),
      utils.transactions.getAll.invalidate(),
      utils.accounts.getAll.invalidate(),
      refetch()
    ])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isCreditCard = (accountType: string) => {
    return accountType === 'CREDIT_CARD' || accountType === 'CREDIT'
  }

  const getTransactionTypeLabel = (amount: number, accountType: string) => {
    if (isCreditCard(accountType)) {
      // For credit cards: positive amounts are expenses, negative are payments
      return amount > 0 ? 'Expense' : 'Payment'
    }
    // For checking/savings: positive amounts are income, negative are expenses
    return amount >= 0 ? 'Income' : 'Expense'
  }

  const getTransactionColor = (amount: number, accountType: string) => {
    if (isCreditCard(accountType)) {
      // For credit cards: expenses are red (bad), payments are green (good)
      return amount > 0 ? 'text-red-600' : 'text-green-600'
    }
    // For checking/savings: income is green (good), expenses are red (bad)
    return amount >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionSign = (amount: number, accountType: string) => {
    if (isCreditCard(accountType)) {
      // For credit cards: show - for expenses (increasing debt is bad), + for payments (reducing debt is good)
      return amount > 0 ? '−' : '+'
    }
    // For checking/savings: show + for income, - for expenses
    return amount >= 0 ? '+' : '−'
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-gray-600">View and manage your financial transactions</p>
          </div>
          <div className="flex space-x-3">
            {transactionsNeedingReview && transactionsNeedingReview.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => router.push('/transactions/review')}
                className="relative"
              >
                <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                Review
                <Badge variant="destructive" className="ml-2">
                  {transactionsNeedingReview.length}
                </Badge>
              </Button>
            )}
            <Button onClick={() => router.push('/transactions/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Transaction History
              {transactionsData && (
                <Badge variant="secondary" className="ml-2">
                  {transactionsData.totalCount} total
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading transactions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <p>Error loading transactions: {error.message}</p>
              </div>
            ) : !transactionsData?.transactions.length ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                <p className="mb-4">Start by adding a transaction or uploading a bank statement</p>
                <div className="space-x-4">
                  <Button onClick={() => router.push('/transactions/new')}>
                    Add Transaction
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/uploads')}>
                    Upload Statement
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {transactionsData.transactions.map((transaction: any) => {
                  const transactionType = getTransactionTypeLabel(transaction.amount, transaction.account?.type || '')
                  const transactionColor = getTransactionColor(transaction.amount, transaction.account?.type || '')
                  const transactionSign = getTransactionSign(transaction.amount, transaction.account?.type || '')
                  
                  // Get all categories for this transaction (both old and new way)
                  const allCategories = [
                    ...(transaction.category ? [transaction.category] : []),
                    ...(transaction.transactionCategories?.map((tc: any) => tc.category) || [])
                  ].filter((category, index, self) => 
                    // Remove duplicates by id
                    index === self.findIndex(c => c.id === category.id)
                  )
                  
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {transaction.description}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(transaction.date)}
                              </div>
                              {transaction.account && (
                                <div className="flex items-center">
                                  <Building2 className="w-4 h-4 mr-1" />
                                  {transaction.account.name}
                                </div>
                              )}
                            </div>
                            {/* Show all categories */}
                            {allCategories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {allCategories.map((category: any) => (
                                  <Badge 
                                    key={category.id} 
                                    variant="outline"
                                    style={{ 
                                      backgroundColor: category.color ? `${category.color}20` : undefined,
                                      borderColor: category.color || undefined 
                                    }}
                                  >
                                    {category.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className={`text-lg font-semibold flex items-center justify-end ${transactionColor}`}>
                            <span className="mr-1">
                              {transactionSign}
                            </span>
                            {formatCurrency(transaction.amount)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {transactionType}
                          </div>
                        </div>
                        <TransactionEditDialog 
                          transaction={transaction}
                          onSuccess={() => handleTransactionUpdated()}
                        >
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </TransactionEditDialog>
                      </div>
                    </div>
                  )
                })}
                
                {transactionsData.hasMore && (
                  <div className="text-center pt-4">
                    <Button variant="outline">
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 