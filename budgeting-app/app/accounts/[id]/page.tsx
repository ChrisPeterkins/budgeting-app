'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  CreditCard, 
  Wallet, 
  Building, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  FileText,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowDownIcon,
  ArrowUpIcon,
  Minus,
  ArrowLeftRight,
  Target,
  BarChart3
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { TransactionEditDialog } from '@/components/transactions/transaction-edit-dialog'
import { BankLogo } from '@/components/uploads/bank-logo'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AccountDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const utils = api.useContext()
  const [selectedStatement, setSelectedStatement] = useState<any>(null)
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [period, setPeriod] = useState<'month' | '3months' | '6months' | 'year' | 'all'>('month')
  
  const { data: accountData, isLoading, refetch } = api.accounts.getDetailedById.useQuery({ id: accountId, period }, { enabled: !!accountId })
  const recalculateBalanceMutation = api.accounts.recalculateBalance.useMutation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const isCreditCard = (accountType: string) => {
    return accountType === 'CREDIT_CARD' || accountType === 'CREDIT'
  }

  const formatAccountBalance = (balance: number, accountType: string) => {
    if (isCreditCard(accountType)) {
      // For credit cards, show the debt amount (positive balance = money owed)
      return formatCurrency(Math.abs(balance))
    }
    return formatCurrency(balance)
  }

  const getBalanceColor = (balance: number, accountType: string) => {
    if (isCreditCard(accountType)) {
      // For credit cards: green when $0 (no debt), red when there's a balance
      return balance === 0 ? 'text-green-600' : 'text-red-600'
    }
    // For checking/savings: green when positive, red when negative
    return balance >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getBalanceLabel = (accountType: string) => {
    if (isCreditCard(accountType)) {
      return 'Outstanding Balance'
    }
    return 'Current Balance'
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

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CHECKING': return Wallet
      case 'SAVINGS': return Building
      case 'CREDIT': return CreditCard
      default: return DollarSign
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'CHECKING': return 'bg-blue-100 text-blue-800'
      case 'SAVINGS': return 'bg-green-100 text-green-800'
      case 'CREDIT': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-600" />
      case 'PROCESSING': return <Clock className="w-4 h-4 text-yellow-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRecalculateBalance = async () => {
    try {
      await recalculateBalanceMutation.mutateAsync({ id: accountId })
      toast.success('Balance recalculated successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to recalculate balance')
      console.error('Recalculate balance error:', error)
    }
  }

  const handleTransactionUpdated = async () => {
    // Invalidate all related queries when a transaction is updated
    await Promise.all([
      utils.categories.getAnalytics.invalidate(),
      utils.categories.getAll.invalidate(),
      utils.transactions.getAll.invalidate(),
      utils.accounts.getAll.invalidate(),
      utils.accounts.getDetailedById.invalidate({ id: accountId }),
      refetch()
    ])
  }

  // Enhanced modal content helper
  const renderStatementModal = () => {
    if (!selectedStatement) return null

    let processingDetails: any = {}
    try {
      processingDetails = JSON.parse((selectedStatement as any).processingDetails || '{}')
    } catch {
      processingDetails = {}
    }

    const transactions = processingDetails.transactions || []
    const displayTransactions = showAllTransactions ? transactions : transactions.slice(0, 10)

    // Calculate transaction summary
    const totalCredits = transactions
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + t.amount, 0)
    
    const totalDebits = transactions
      .filter((t: any) => t.type === 'EXPENSE')
      .reduce((sum: number, t: any) => sum + t.amount, 0)
    
    const netChange = totalCredits - totalDebits

    return (
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Statement Details: {selectedStatement?.originalName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Enhanced File Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Name:</span>
                  <span className="font-medium">{selectedStatement.originalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Name:</span>
                  <span className="font-medium text-xs">{selectedStatement.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span className="font-medium">{(selectedStatement.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getFileStatusColor(selectedStatement.status)}>
                    {selectedStatement.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uploaded:</span>
                  <span className="font-medium">{format(new Date(selectedStatement.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank:</span>
                  <span className="font-medium">{(selectedStatement as any).bankName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">{(selectedStatement as any).accountType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Statement Type:</span>
                  <span className="font-medium">{(selectedStatement as any).statementType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processed:</span>
                  <span className="font-medium">
                    {selectedStatement.processedAt 
                      ? format(new Date(selectedStatement.processedAt), 'MMM dd, yyyy HH:mm')
                      : 'Not yet processed'
                    }
                  </span>
                </div>
                {processingDetails.bankType && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank Type:</span>
                    <span className="font-medium">{processingDetails.bankType}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Transaction Summary */}
          {(selectedStatement as any).transactionCount && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {processingDetails.transactionsFound || 0}
                    </div>
                    <div className="text-sm text-gray-600">Transactions Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {processingDetails.transactionsImported || 0}
                    </div>
                    <div className="text-sm text-gray-600">Successfully Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {processingDetails.duplicates || 0}
                    </div>
                    <div className="text-sm text-gray-600">Duplicates Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {processingDetails.errors?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Processing Errors</div>
                  </div>
                </div>

                {processingDetails.errors && processingDetails.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-700 mb-2">Processing Errors:</h4>
                    <div className="space-y-1">
                      {processingDetails.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalCredits)}
                  </div>
                  <div className="text-sm text-gray-600">Total Credits</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalDebits)}
                  </div>
                  <div className="text-sm text-gray-600">Total Debits</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netChange)}
                  </div>
                  <div className="text-sm text-gray-600">Net Change</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multi-account information */}
          {processingDetails.accounts && processingDetails.accounts.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Multi-Account Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-3">
                    This statement contains information for {processingDetails.accounts.length} accounts:
                  </div>
                  {processingDetails.accounts.map((acc: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{acc.name}</div>
                        <div className="text-sm text-gray-600">Account #{acc.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          Balance: {formatCurrency(acc.endingBalance)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Change: {formatCurrency(acc.endingBalance - acc.beginningBalance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Error Information */}
          {selectedStatement.status === 'FAILED' && selectedStatement.errorMessage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">Error Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{selectedStatement.errorMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    )
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  if (!accountData) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Not Found</h2>
            <p className="text-gray-600 mb-6">The account you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => router.push('/accounts')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Accounts
            </Button>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  const { account, recentTransactions, uploadedFiles, monthlyStats, statistics } = accountData
  const IconComponent = getAccountIcon(account.type)

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <IconComponent className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{account.name}</h1>
                <div className="flex items-center space-x-2">
                  <Badge className={getAccountTypeColor(account.type)}>
                    {account.type.replace('_', ' ')}
                  </Badge>
                  {account.institution && (
                    <span className="text-gray-600">
                      {account.institution}
                      {account.lastFour && ` •••• ${account.lastFour}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculateBalance}
              disabled={recalculateBalanceMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 ${recalculateBalanceMutation.isPending ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
            <Button onClick={() => router.push('/uploads')}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Statement
            </Button>
          </div>
        </div>

        {/* Balance Overview */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">{getBalanceLabel(account.type)}</div>
                <div className={`text-3xl font-bold ${getBalanceColor((account as any).balance || 0, account.type)}`}>
                  {formatAccountBalance((account as any).balance || 0, account.type)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
                <div className="text-3xl font-bold text-blue-600">
                  {account._count?.transactions || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Account Status</div>
                <div className="text-lg font-medium">
                  <Badge className={account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="statements">Statements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => router.push(`/transactions?account=${accountId}`)}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {recentTransactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(transaction.date), 'MMM dd, yyyy')} • {(transaction as any).category?.name || 'Uncategorized'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`font-medium ${getTransactionColor(transaction.amount, account.type)}`}>
                            {getTransactionTypeLabel(transaction.amount, account.type) === 'Income' ? '+' : ''}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                          <TransactionEditDialog 
                            transaction={transaction}
                            onSuccess={handleTransactionUpdated}
                          >
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TransactionEditDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                    <p className="mb-4">No transactions have been recorded for this account yet.</p>
                    <Button onClick={() => router.push('/transactions/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Transaction
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statements Tab */}
          <TabsContent value="statements">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Statements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFileStatusIcon(file.status)}
                        <div>
                          <div className="font-medium">{file.originalName}</div>
                          <div className="text-sm text-gray-600">
                            Uploaded {format(new Date(file.createdAt), 'MMM dd, yyyy')}
                            {(file as any).transactionCount && ` • ${(file as any).transactionCount} transactions`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog open={selectedStatement?.id === file.id} onOpenChange={(open) => setSelectedStatement(open ? file : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                          </DialogTrigger>
                          {renderStatementModal()}
                        </Dialog>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {uploadedFiles.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Statements</h3>
                      <p className="mb-4">No statements have been uploaded for this account yet.</p>
                      <Button onClick={() => router.push('/uploads')}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload First Statement
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Income vs Expenses</span>
                        <span className="text-sm font-medium">
                          {statistics.transactionCount} total
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span className="text-sm">Income</span>
                          <span className="text-sm text-green-600 font-medium">
                            {formatCurrency(statistics.totalIncome + statistics.interestIncome + statistics.transfersIn)}
                          </span>
                        </div>
                        <Progress 
                          value={statistics.totalIncome / (statistics.totalIncome + statistics.totalExpenses) * 100} 
                          className="h-2"
                        />
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-red-500 rounded"></div>
                          <span className="text-sm">Expenses</span>
                          <span className="text-sm text-red-600 font-medium">
                            {formatCurrency(statistics.totalExpenses + statistics.transfersOut)}
                          </span>
                        </div>
                        <Progress 
                          value={statistics.totalExpenses / (statistics.totalIncome + statistics.totalExpenses) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Net Flow</span>
                        <span className={`text-sm font-medium ${
                          (statistics.totalIncome - statistics.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(statistics.totalIncome - statistics.totalExpenses)}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(0, ((statistics.totalIncome - statistics.totalExpenses) / Math.max(statistics.totalIncome, statistics.totalExpenses)) * 100))} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  )
}
