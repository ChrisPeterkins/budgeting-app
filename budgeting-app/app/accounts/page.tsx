'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Plus, Building, Wallet, DollarSign, Edit, Trash2, RefreshCw, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/trpc/client'
import { BankLogo } from '@/components/uploads/bank-logo'
import { toast } from 'sonner'
import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { useEffect } from 'react'

export default function AccountsPage() {
  const router = useRouter()
  const { invalidateAccountData } = useRealtimeData()
  
  const { data: accounts, isLoading, refetch } = api.accounts.getAll.useQuery()
  const deleteAccountMutation = api.accounts.delete.useMutation()
  const recalculateAllBalancesMutation = api.accounts.recalculateAllBalances.useMutation()

  // Auto-refresh accounts when navigating to this page
  useEffect(() => {
    // Invalidate and refetch accounts data when page mounts
    invalidateAccountData()
  }, [invalidateAccountData])

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
    return 'Balance'
  }

  const calculateNetWorth = (accounts: any[]) => {
    return accounts.reduce((net, account) => {
      const balance = (account as any).balance || 0
      if (isCreditCard(account.type)) {
        // Credit cards reduce net worth (they're debt)
        return net - Math.abs(balance)
      }
      // Checking/Savings add to net worth
      return net + balance
    }, 0)
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

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? This will also delete all associated transactions.`)) {
      return
    }

    try {
      await deleteAccountMutation.mutateAsync({ id: accountId })
      toast.success('Account deleted successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to delete account')
      console.error('Delete account error:', error)
    }
  }

  const handleRecalculateAllBalances = async () => {
    try {
      const result = await recalculateAllBalancesMutation.mutateAsync()
      toast.success(result.message)
      refetch()
    } catch (error) {
      toast.error('Failed to recalculate balances')
      console.error('Recalculate balances error:', error)
    }
  }

  // Calculate totals
  const totalTransactions = accounts?.reduce((sum, account) => sum + account._count.transactions, 0) || 0
  const netWorth = accounts ? calculateNetWorth(accounts) : 0

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Accounts</h1>
            <p className="text-gray-600">Manage your bank accounts and credit cards</p>
          </div>
          <Button onClick={() => router.push('/accounts/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>

        {/* Summary Card */}
        {accounts && accounts.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Account Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {accounts.length}
                      </div>
                      <p className="text-sm text-gray-500">Total Accounts</p>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netWorth)}
                      </div>
                      <p className="text-sm text-gray-500">Net Worth</p>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Active Accounts</p>
                    <p className="text-xl font-bold text-green-600">
                      {accounts.filter(account => account.isActive).length}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalculateAllBalances}
                    disabled={recalculateAllBalancesMutation.isPending}
                    className="w-full"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${recalculateAllBalancesMutation.isPending ? 'animate-spin' : ''}`} />
                    {recalculateAllBalancesMutation.isPending ? 'Calculating...' : 'Recalculate Balances'}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {totalTransactions} total transactions across all accounts
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Your Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : !accounts || accounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Accounts Added</h3>
                <p className="mb-4">Add your bank accounts and credit cards to start tracking your finances</p>
                <Button onClick={() => router.push('/accounts/new')}>
                  Add Your First Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => {
                  const IconComponent = getAccountIcon(account.type)
                  return (
                    <Card 
                      key={account.id} 
                      className="hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group" 
                      onClick={() => {
                        console.log('Account card clicked:', account.id)
                        router.push(`/accounts/${account.id}`)
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              {account.institution ? (
                                <BankLogo bankName={account.institution} />
                              ) : (
                                <IconComponent className="w-6 h-6 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{account.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className={getAccountTypeColor(account.type)}>
                                  {account.type.replace('_', ' ')}
                                </Badge>
                                {account.institution && (
                                  <span className="text-sm text-gray-500">
                                    {account.institution}
                                  </span>
                                )}
                                {account.lastFour && (
                                  <span className="text-sm text-gray-500">
                                    •••• {account.lastFour}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">{getBalanceLabel(account.type)}</p>
                              <p className={`text-lg font-semibold ${getBalanceColor((account as any).balance || 0, account.type)}`}>
                                {formatAccountBalance((account as any).balance || 0, account.type)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Transactions</p>
                              <p className="text-lg font-semibold">
                                {account._count.transactions}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('View button clicked for account:', account.id)
                                  router.push(`/accounts/${account.id}`)
                                }}
                                className="group-hover:border-blue-400 group-hover:text-blue-600"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('Delete button clicked for account:', account.id)
                                  handleDeleteAccount(account.id, account.name)
                                }}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {!account.isActive && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              This account is inactive and won't appear in transaction imports.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 