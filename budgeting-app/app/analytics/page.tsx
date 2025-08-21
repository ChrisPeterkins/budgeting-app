'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  PieChart, 
  Calendar,
  DollarSign,
  Target,
  Activity,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/trpc/client'
import { format, subMonths } from 'date-fns'

import { SpendingTrendsChart } from '@/components/analytics/spending-trends-chart'
import { CategoryPieChart } from '@/components/analytics/category-pie-chart'
import { FinancialHealthScore } from '@/components/analytics/financial-health-score'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatPercentage = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

const getChangeColor = (value: number) => {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState(6) // months
  const [includeIncome, setIncludeIncome] = useState(false)

  // Fetch analytics data
  const { data: spendingTrends, isLoading: trendsLoading, refetch: refetchTrends } = 
    api.analytics.getSpendingTrends.useQuery({ months: timeRange })
  
  const { data: categoryAnalytics, isLoading: categoryLoading, refetch: refetchCategory } = 
    api.analytics.getCategoryAnalytics.useQuery({ includeIncome })
  
  const { data: budgetPerformance, isLoading: budgetLoading, refetch: refetchBudget } = 
    api.analytics.getBudgetPerformance.useQuery({ months: 3 })
  
  const { data: monthlyComparison, isLoading: comparisonLoading, refetch: refetchComparison } = 
    api.analytics.getMonthlyComparison.useQuery({})
  
  const { data: financialHealth, isLoading: healthLoading, refetch: refetchHealth } = 
    api.analytics.getFinancialHealth.useQuery()
  
  const { data: goalAnalytics, isLoading: goalLoading, refetch: refetchGoals } = 
    api.analytics.getGoalAnalytics.useQuery()

  const isLoading = trendsLoading || categoryLoading || budgetLoading || comparisonLoading || healthLoading || goalLoading

  const handleRefresh = () => {
    refetchTrends()
    refetchCategory()
    refetchBudget()
    refetchComparison()
    refetchHealth()
    refetchGoals()
  }

  const hasData = spendingTrends && spendingTrends.length > 0

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-gray-600">Comprehensive view of your financial patterns and performance</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {!hasData ? (
          // Empty state
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Analytics Data Available</h3>
              <p className="text-gray-600 mb-6">Start by adding transactions or uploading bank statements to see your financial analytics</p>
              <div className="space-x-4">
                <Button onClick={() => router.push('/transactions/new')}>
                  Add Transaction
                </Button>
                <Button variant="outline" onClick={() => router.push('/uploads')}>
                  Upload Statement
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="budgets">Budget Performance</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="health">Financial Health</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick Stats */}
              {monthlyComparison && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-600">This Month Income</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(monthlyComparison.current.income)}
                      </div>
                      <div className={`text-sm mt-1 ${getChangeColor(monthlyComparison.changes.income)}`}>
                        {formatPercentage(monthlyComparison.changes.income)} vs last month
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-gray-600">This Month Expenses</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(monthlyComparison.current.expenses)}
                      </div>
                      <div className={`text-sm mt-1 ${getChangeColor(-monthlyComparison.changes.expenses)}`}>
                        {formatPercentage(monthlyComparison.changes.expenses)} vs last month
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Net This Month</span>
                      </div>
                      <div className={`text-2xl font-bold ${monthlyComparison.current.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(monthlyComparison.current.net)}
                      </div>
                      <div className={`text-sm mt-1 ${getChangeColor(monthlyComparison.changes.net)}`}>
                        {formatPercentage(monthlyComparison.changes.net)} vs last month
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Transactions</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {monthlyComparison.current.transactionCount}
                      </div>
                      <div className={`text-sm mt-1 ${getChangeColor(monthlyComparison.changes.transactionCount)}`}>
                        {formatPercentage(monthlyComparison.changes.transactionCount)} vs last month
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Spending Trends Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Spending Trends ({timeRange} months)
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant={timeRange === 3 ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setTimeRange(3)}
                      >
                        3M
                      </Button>
                      <Button 
                        variant={timeRange === 6 ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setTimeRange(6)}
                      >
                        6M
                      </Button>
                      <Button 
                        variant={timeRange === 12 ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setTimeRange(12)}
                      >
                        1Y
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {spendingTrends && <SpendingTrendsChart data={spendingTrends} />}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <PieChart className="w-5 h-5 mr-2" />
                      Category Breakdown (This Month)
                    </CardTitle>
                    <Button
                      variant={includeIncome ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIncludeIncome(!includeIncome)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {includeIncome ? 'All' : 'Expenses Only'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {categoryAnalytics && <CategoryPieChart data={categoryAnalytics} />}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Spending Tab */}
            <TabsContent value="spending" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Spending Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {spendingTrends && <SpendingTrendsChart data={spendingTrends} />}
                  </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryAnalytics && <CategoryPieChart data={categoryAnalytics} />}
                  </CardContent>
                </Card>
              </div>

              {/* Top Categories Table */}
              {categoryAnalytics && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Spending Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categoryAnalytics.categories.slice(0, 10).map((category, index) => (
                        <div key={category.categoryId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: category.color }} />
                            <div>
                              <div className="font-medium">{category.categoryName}</div>
                              <div className="text-sm text-gray-600">
                                {category.transactionCount} transactions • Avg: {formatCurrency(category.averageAmount)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(category.amount)}</div>
                            <div className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Budget Performance Tab */}
            <TabsContent value="budgets" className="space-y-6">
              {budgetPerformance && budgetPerformance.length > 0 ? (
                <div className="space-y-6">
                  {budgetPerformance.map((budget) => (
                    <Card key={budget.budgetId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{budget.budgetName}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant={budget.isOverBudget ? "destructive" : "default"}>
                              {budget.period}
                            </Badge>
                            <Badge variant={budget.isOverBudget ? "destructive" : "default"}>
                              {budget.isOverBudget ? 'Over Budget' : 'On Track'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="text-sm text-gray-600">Budgeted</div>
                              <div className="text-lg font-bold text-blue-600">
                                {formatCurrency(budget.totalBudgeted)}
                              </div>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <div className="text-sm text-gray-600">Spent</div>
                              <div className="text-lg font-bold text-purple-600">
                                {formatCurrency(budget.totalSpent)}
                              </div>
                            </div>
                            <div className={`p-3 rounded-lg ${budget.overallVariance >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                              <div className="text-sm text-gray-600">Variance</div>
                              <div className={`text-lg font-bold ${budget.overallVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {budget.overallVariance >= 0 ? '+' : ''}{formatCurrency(budget.overallVariance)}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {budget.categoryPerformance.map((category) => (
                              <div key={category.categoryId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="font-medium">{category.categoryName}</div>
                                  <Badge variant="outline" className={`text-xs ${
                                    category.type === 'INCOME' 
                                      ? 'text-green-600 border-green-200' 
                                      : 'text-red-600 border-red-200'
                                  }`}>
                                    {category.type === 'INCOME' ? 'Income' : 'Expense'}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                                  </div>
                                  <div className={`text-sm ${category.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                    {category.variancePercentage >= 0 ? '+' : ''}{category.variancePercentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Budget Performance Data</h3>
                    <p className="text-gray-600 mb-4">Create a budget to see performance analytics</p>
                    <Button onClick={() => router.push('/budgets/new')}>
                      Create Budget
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-6">
              {goalAnalytics ? (
                <div className="space-y-6">
                  {/* Goal Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <Target className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Total Goals</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{goalAnalytics.stats.total}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-gray-600">Completed</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{goalAnalytics.stats.completed}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-medium text-gray-600">On Track</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">{goalAnalytics.stats.onTrack}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-medium text-gray-600">Avg Progress</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {goalAnalytics.averageProgress.toFixed(0)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Goals List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Goal Progress Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {goalAnalytics.goals.map((goal) => (
                          <div key={goal.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{goal.name}</div>
                              <Badge variant={goal.isCompleted ? "default" : goal.isOverdue ? "destructive" : "outline"}>
                                {goal.isCompleted ? 'Completed' : goal.isOverdue ? 'Overdue' : goal.type}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)} 
                              {goal.monthsToTarget > 0 && ` • ${goal.monthsToTarget} months remaining`}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(goal.progress, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{goal.progress.toFixed(1)}% complete</span>
                              {goal.monthlyNeeded > 0 && (
                                <span>Need {formatCurrency(goal.monthlyNeeded)}/month</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Goals Set</h3>
                    <p className="text-gray-600 mb-4">Create financial goals to track your progress</p>
                    <Button onClick={() => router.push('/goals/new')}>
                      Create Goal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

                         {/* Financial Health Tab */}
             <TabsContent value="health">
               {financialHealth ? (
                 <FinancialHealthScore data={financialHealth as any} />
               ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Activity className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Calculating Financial Health</h3>
                    <p className="text-gray-600">Add more transactions to get a comprehensive health score</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ProtectedLayout>
  )
} 