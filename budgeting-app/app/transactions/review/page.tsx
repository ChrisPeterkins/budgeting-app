'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { api } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TransactionEditDialog } from '@/components/transactions/transaction-edit-dialog'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Calendar,
  Building,
  RefreshCw,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

export default function TransactionsReviewPage() {
  const { user } = useAuth()
  const [processingTransactionId, setProcessingTransactionId] = useState<string | null>(null)
  
  const { data: transactionsNeedingReview, isLoading, refetch } = api.categories.getTransactionsNeedingReview.useQuery()
  const seedRulesMutation = api.categories.seedDefaultRules.useMutation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleSeedRules = async () => {
    try {
      await seedRulesMutation.mutateAsync()
      toast.success('Default categorization rules have been seeded!')
      refetch()
    } catch (error) {
      toast.error('Failed to seed default rules')
    }
  }

  const handleTransactionUpdated = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Transaction Review</h1>
              <p className="text-gray-600">Loading transactions that need review...</p>
            </div>
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <AlertCircle className="mr-3 h-8 w-8 text-orange-500" />
              Transaction Review
            </h1>
            <p className="text-gray-600">Review and categorize transactions that need attention</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleSeedRules}
              disabled={seedRulesMutation.isPending}
            >
              <Zap className="mr-2 h-4 w-4" />
              {seedRulesMutation.isPending ? 'Seeding...' : 'Seed Auto-Rules'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-orange-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Needs Review</p>
                  <p className="text-2xl font-bold">{transactionsNeedingReview?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      transactionsNeedingReview?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <p className="text-2xl font-bold">
                    {transactionsNeedingReview?.length === 0 ? '100%' : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions Needing Review</CardTitle>
            <CardDescription>
              These transactions need manual categorization or have low confidence auto-categorization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!transactionsNeedingReview || transactionsNeedingReview.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600 mb-4">
                  No transactions need review right now. Great job keeping your categories organized!
                </p>
                <Button onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {transactionsNeedingReview.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{transaction.description}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(transaction.date)}
                            </span>
                            <span className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {transaction.account.name}
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {transaction.category && (
                            <Badge 
                              variant="secondary" 
                              className="flex items-center space-x-1"
                              style={{ backgroundColor: transaction.category.color || undefined }}
                            >
                              <span>{transaction.category.name}</span>
                            </Badge>
                          )}
                          
                          {transaction.transactionCategories?.map((tc) => (
                            <Badge
                              key={tc.id}
                              variant="secondary"
                              className="flex items-center space-x-1"
                              style={{ backgroundColor: tc.category.color || undefined }}
                            >
                              <span>{tc.category.name}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <TransactionEditDialog
                        transaction={transaction}
                        account={transaction.account}
                        onSuccess={handleTransactionUpdated}
                      >
                        <Button variant="outline" size="sm">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </TransactionEditDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 