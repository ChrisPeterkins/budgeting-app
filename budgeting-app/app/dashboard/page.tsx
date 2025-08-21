'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Temporarily disabled real-time features
// import { LiveNotifications } from '@/components/ui/live-notifications'
// import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { 
  PlusCircle,
  BarChart3,
  Target,
  Upload,
  RefreshCw,
  DollarSign
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Test protected endpoint
  const { data: authTest } = api.auth.test.useQuery()

  // Temporarily disable real-time data to test if it's causing infinite re-renders
  // const realtimeOptions = useMemo(() => ({
  //   enableBudgets: true,
  //   enableGoals: true,
  //   enableTransactions: true,
  //   enableAnalytics: false,
  //   enableAccounts: true
  // }), [])

  // const realtimeData = useRealtimeData(realtimeOptions)

  // Use regular tRPC queries instead
  const { data: budgets } = api.budgets.getActive.useQuery()
  const { data: goals } = api.goals.getAll.useQuery()
  const { data: goalStats } = api.goals.getStats.useQuery()
  const { data: transactions } = api.transactions.getAll.useQuery({ limit: 20, offset: 0 })
  const { data: accounts } = api.accounts.getAll.useQuery()

  // Create a simple data structure to replace realtimeData
  const realtimeData = {
    data: {
      budgets: budgets || [],
      goals: goals || [],
      goalStats: goalStats || null,
      recentTransactions: { transactions: transactions?.transactions || [] },
      accounts: accounts || []
    },
    isFetching: {
      budgets: false,
      goals: false,
      transactions: false,
      accounts: false
    }
  }

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const quickActions = [
    {
      icon: PlusCircle,
      title: 'Add Transaction',
      description: 'Record a new expense or income',
      href: '/transactions/new',
      color: 'bg-green-500',
    },
    {
      icon: Upload,
      title: 'Upload Statement',
      description: 'Import bank statement CSV',
      href: '/uploads',
      color: 'bg-blue-500',
    },
    {
      icon: Target,
      title: 'Set Goal',
      description: 'Create a new financial goal',
      href: '/goals/new',
      color: 'bg-purple-500',
    },
    {
      icon: BarChart3,
      title: 'View Analytics',
      description: 'See spending insights',
      href: '/analytics',
      color: 'bg-orange-500',
    },
  ]

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
             Welcome back, {user?.name ? user.name.split(' ')[0] : 'User'}!
           </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Here's an overview of your financial activity.
          </p>
          
          {authTest && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ {authTest.message} - Your connection is secure.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Card 
                  key={action.title} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleNavigation(action.href)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {action.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    Total Balance
                    {realtimeData.isFetching.accounts && (
                      <RefreshCw className="w-3 h-3 ml-2 animate-spin text-blue-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {realtimeData.data.accounts?.length ? 
                      `$${realtimeData.data.accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0).toLocaleString()}` : 
                      '$0.00'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {realtimeData.data.accounts?.length ? 
                      `${realtimeData.data.accounts.length} account${realtimeData.data.accounts.length !== 1 ? 's' : ''}` :
                      'No accounts connected'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    This Month
                    {realtimeData.isFetching.transactions && (
                      <RefreshCw className="w-3 h-3 ml-2 animate-spin text-blue-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {realtimeData.data.recentTransactions?.transactions?.length ?
                      `$${Math.abs(realtimeData.data.recentTransactions.transactions
                        .filter((t: any) => t.amount < 0)
                        .reduce((sum: number, t: any) => sum + t.amount, 0)
                      ).toLocaleString()}` :
                      '$0.00'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {realtimeData.data.recentTransactions?.transactions?.length ?
                      `${realtimeData.data.recentTransactions.transactions.filter((t: any) => t.amount < 0).length} expenses` :
                      'No expenses yet'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    Goals Progress
                    {realtimeData.isFetching.goals && (
                      <RefreshCw className="w-3 h-3 ml-2 animate-spin text-blue-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {realtimeData.data.goalStats ? 
                      `${realtimeData.data.goalStats.completedGoals}/${realtimeData.data.goalStats.totalGoals}` :
                      '0/0'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {realtimeData.data.goalStats?.totalGoals ? 
                      `${Math.round(realtimeData.data.goalStats.completionRate)}% completion rate` :
                      'No goals set'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Spending Overview Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Spending Overview</CardTitle>
                <CardDescription>
                  Last 7 days transaction volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                {realtimeData.data.recentTransactions?.transactions?.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={Array.from({length: 7}, (_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - (6 - i))
                        const dayTransactions = realtimeData.data.recentTransactions.transactions.filter((t: any) => {
                          const transactionDate = new Date(t.date)
                          return transactionDate.toDateString() === date.toDateString()
                        })
                        const daySpending = dayTransactions
                          .filter((t: any) => t.amount < 0)
                          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)
                        
                        return {
                          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                          spending: daySpending,
                          transactions: dayTransactions.length
                        }
                      })}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'spending' ? `$${value}` : value,
                          name === 'spending' ? 'Spending' : 'Transactions'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="spending" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        dot={{ fill: '#EF4444' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No spending data available</p>
                    <p className="text-sm">Add transactions to see spending trends</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Recent Activity
                  {realtimeData.isFetching.transactions && (
                    <RefreshCw className="w-4 h-4 ml-2 animate-spin text-blue-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Your latest financial transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {realtimeData.data.recentTransactions?.transactions?.length ? (
                  <div className="space-y-3">
                    {realtimeData.data.recentTransactions.transactions.slice(0, 5).map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()} • {transaction.category?.name || 'Uncategorized'}
                            </p>
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleNavigation('/transactions')}
                      >
                        View All Transactions
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Add your first transaction or upload a bank statement to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Complete these steps to set up your budget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Create your account</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Add your accounts</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Upload transactions</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Set up budgets</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Notifications - temporarily disabled to test infinite re-render fix */}
        {/* <LiveNotifications 
          maxNotifications={5}
          autoHide={true}
          autoHideDelay={8000}
          enableSound={false}
          position="top-right"
        /> */}
      </div>
    </ProtectedLayout>
   )
 } 