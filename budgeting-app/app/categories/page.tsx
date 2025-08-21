'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { api } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog'
import { CategoryIcon } from '@/components/categories/category-icon'
import { 
  Tags, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  PieChart,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts'

export default function CategoriesPage() {
  const { user } = useAuth()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const utils = api.useContext()
  
  // Fetch categories with transaction counts - enable auto-refetch
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = api.categories.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: true, // Always refetch on mount
    }
  )
  
  // Fetch category analytics data - enable auto-refetch  
  const { data: categoryAnalytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = api.categories.getAnalytics.useQuery(
    undefined,
    {
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: true, // Always refetch on mount
    }
  )

  // Fetch total transaction count (unique count, not sum of category counts)
  const { data: totalTransactionCount, refetch: refetchTotalCount } = api.categories.getTotalTransactionCount.useQuery(
    undefined,
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  )

  // Debug: Log when data changes
  useEffect(() => {
    console.log('Categories data updated:', { 
      categoriesCount: categories?.length,
      analyticsCount: categoryAnalytics?.length,
      totalTransactions: totalTransactionCount,
      timestamp: new Date().toISOString()
    })
  }, [categories, categoryAnalytics, totalTransactionCount])

  // Listen for transaction changes to invalidate category data
  useEffect(() => {
    const handleTransactionChange = () => {
      console.log('Manual refresh triggered at:', new Date().toISOString())
      // Invalidate category analytics when transactions change
      utils.categories.getAnalytics.invalidate()
      utils.categories.getAll.invalidate()
      utils.categories.getTotalTransactionCount.invalidate()
      // Also force refetch
      refetchCategories()
      refetchAnalytics()
      refetchTotalCount()
    }

    // Set up interval to check for changes more frequently
    const interval = setInterval(() => {
      handleTransactionChange()
    }, 30000) // Check every 30 seconds instead of 10

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [utils.categories, refetchCategories, refetchAnalytics, refetchTotalCount])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
  }

  const getUsagePercentage = (transactionCount: number, totalTransactions: number) => {
    if (totalTransactions === 0) return 0
    return ((transactionCount / totalTransactions) * 100).toFixed(1)
  }

  // Use the proper total transaction count instead of summing category counts
  const totalTransactions = totalTransactionCount || 0
  
  // Calculate total spending excluding income categories like Salary, Transfer, and positive amounts
  const totalSpending = categoryAnalytics?.reduce((sum: number, cat: any) => {
    // Skip income categories and transfer categories
    const isIncomeCategory = cat.name.toLowerCase().includes('salary') || 
                           cat.name.toLowerCase().includes('income') || 
                           cat.name.toLowerCase().includes('freelance') ||
                           cat.name.toLowerCase().includes('investment')
    
    const isTransferCategory = cat.name.toLowerCase().includes('transfer') ||
                              cat.name.toLowerCase().includes('payment') && cat.name.toLowerCase().includes('credit')
    
    // Skip if it's an income/transfer category or if the total amount is positive (indicating income)
    if (isIncomeCategory || isTransferCategory || cat.totalAmount > 0) {
      return sum
    }
    
    // Only count negative amounts (actual expenses)
    return sum + Math.abs(cat.totalAmount)
  }, 0) || 0

  // Sort categories by different criteria
  const getSortedCategories = (sortBy: 'name' | 'usage' | 'spending') => {
    if (!categoryAnalytics) return []
    
    switch (sortBy) {
      case 'usage':
        return [...categoryAnalytics].sort((a: any, b: any) => b.transactionCount - a.transactionCount)
      case 'spending':
        return [...categoryAnalytics].sort((a: any, b: any) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
      case 'name':
      default:
        return [...categoryAnalytics].sort((a: any, b: any) => a.name.localeCompare(b.name))
    }
  }

  const handleCategoryCreated = async () => {
    // Immediately invalidate and refetch both categories and analytics when a new category is created
    await Promise.all([
      utils.categories.getAll.invalidate(),
      utils.categories.getAnalytics.invalidate(),
      utils.categories.getTotalTransactionCount.invalidate(),
      refetchCategories(),
      refetchAnalytics(),
      refetchTotalCount()
    ])
    toast.success('Category created successfully')
  }

  const handleRefreshData = async () => {
    // Manual refresh function with loading state
    try {
      await Promise.all([
        utils.categories.getAll.invalidate(),
        utils.categories.getAnalytics.invalidate(),
        utils.categories.getTotalTransactionCount.invalidate(),
        refetchCategories(),
        refetchAnalytics(),
        refetchTotalCount()
      ])
      toast.success('Data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh data')
    }
  }

  if (categoriesLoading || analyticsLoading || totalTransactionCount === undefined) {
    return (
      <ProtectedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Categories</h1>
              <p className="text-gray-600">Loading categories and analytics...</p>
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
              <Tags className="mr-3 h-8 w-8" />
              Categories
            </h1>
            <p className="text-gray-600">Manage your transaction categories and view spending analytics</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleRefreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <CreateCategoryDialog 
              onCategoryCreated={handleCategoryCreated}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              }
            />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Tags className="h-4 w-4 text-blue-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Total Categories</p>
                  <p className="text-2xl font-bold">{categories?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-red-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Total Spending</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSpending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-gray-600">Avg per Category</p>
                  <p className="text-2xl font-bold">
                    {categoryAnalytics && categoryAnalytics.length > 0 
                      ? formatCurrency(totalSpending / categoryAnalytics.length)
                      : '$0.00'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Categories by Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Most Used Categories
                  </CardTitle>
                  <CardDescription>Categories by transaction count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getSortedCategories('usage').slice(0, 8).map((category) => (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color || '#gray' }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{category.transactionCount}</p>
                          <p className="text-sm text-gray-500">
                            {getUsagePercentage(category.transactionCount, totalTransactions)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Categories by Spending */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Highest Spending Categories
                  </CardTitle>
                  <CardDescription>Categories by total amount spent (excluding income & transfers)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getSortedCategories('spending')
                      .filter((category) => {
                        // Apply same filtering logic as total spending calculation
                        const isIncomeCategory = category.name.toLowerCase().includes('salary') || 
                                               category.name.toLowerCase().includes('income') || 
                                               category.name.toLowerCase().includes('freelance') ||
                                               category.name.toLowerCase().includes('investment')
                        
                        const isTransferCategory = category.name.toLowerCase().includes('transfer') ||
                                                  category.name.toLowerCase().includes('payment') && category.name.toLowerCase().includes('credit')
                        
                        // Only include actual spending categories (negative amounts)
                        return !isIncomeCategory && !isTransferCategory && category.totalAmount <= 0
                      })
                      .slice(0, 8).map((category) => (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color || '#gray' }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(Math.abs(category.totalAmount))}</p>
                          <p className="text-sm text-gray-500">
                            {totalSpending > 0 ? ((Math.abs(category.totalAmount) / totalSpending) * 100).toFixed(1) : '0'}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart - Top Spending Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending Distribution</CardTitle>
                  <CardDescription>Top spending categories breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={getSortedCategories('spending')
                          .filter((category) => {
                            const isIncomeCategory = category.name.toLowerCase().includes('salary') || 
                                                   category.name.toLowerCase().includes('income') || 
                                                   category.name.toLowerCase().includes('freelance') ||
                                                   category.name.toLowerCase().includes('investment')
                            
                            const isTransferCategory = category.name.toLowerCase().includes('transfer') ||
                                                      category.name.toLowerCase().includes('payment') && category.name.toLowerCase().includes('credit')
                            
                            return !isIncomeCategory && !isTransferCategory && category.totalAmount <= 0
                          })
                          .slice(0, 8)
                          .map((category) => ({
                            name: category.name,
                            value: Math.abs(category.totalAmount),
                            color: category.color || '#8B5CF6'
                          }))
                        }
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getSortedCategories('spending')
                          .filter((category) => {
                            const isIncomeCategory = category.name.toLowerCase().includes('salary') || 
                                                   category.name.toLowerCase().includes('income') || 
                                                   category.name.toLowerCase().includes('freelance') ||
                                                   category.name.toLowerCase().includes('investment')
                            
                            const isTransferCategory = category.name.toLowerCase().includes('transfer') ||
                                                      category.name.toLowerCase().includes('payment') && category.name.toLowerCase().includes('credit')
                            
                            return !isIncomeCategory && !isTransferCategory && category.totalAmount <= 0
                          })
                          .slice(0, 8)
                          .map((category, index) => (
                            <Cell key={`cell-${index}`} fill={category.color || `hsl(${index * 45}, 70%, 60%)`} />
                          ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${Math.abs(Number(value)).toLocaleString()}`, 'Amount']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar Chart - Category Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Volume by Category</CardTitle>
                  <CardDescription>Most used categories by transaction count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={getSortedCategories('usage')
                        .slice(0, 10)
                        .map((category) => ({
                          name: category.name.length > 15 ? category.name.substring(0, 15) + '...' : category.name,
                          transactions: category.transactionCount,
                          fullName: category.name
                        }))
                      }
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} transactions`, 
                          props.payload.fullName
                        ]}
                      />
                      <Bar dataKey="transactions" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Performance Analytics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance Analytics</CardTitle>
                <CardDescription>Detailed breakdown of spending category usage and patterns (excluding income & transfers)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Category</th>
                        <th className="text-right p-2">Transactions</th>
                        <th className="text-right p-2">Total Amount</th>
                        <th className="text-right p-2">Avg Amount</th>
                        <th className="text-right p-2">Usage %</th>
                        <th className="text-right p-2">Spending %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedCategories('spending')
                        .filter((category) => {
                          // Apply same filtering logic - only show spending categories
                          const isIncomeCategory = category.name.toLowerCase().includes('salary') || 
                                                 category.name.toLowerCase().includes('income') || 
                                                 category.name.toLowerCase().includes('freelance') ||
                                                 category.name.toLowerCase().includes('investment')
                          
                          const isTransferCategory = category.name.toLowerCase().includes('transfer') ||
                                                    category.name.toLowerCase().includes('payment') && category.name.toLowerCase().includes('credit')
                          
                          return !isIncomeCategory && !isTransferCategory && category.totalAmount <= 0
                        })
                        .map((category) => (
                        <tr key={category.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color || '#gray' }}
                              />
                              <span className="font-medium">{category.name}</span>
                            </div>
                          </td>
                          <td className="text-right p-2 font-mono">
                            {category.transactionCount}
                          </td>
                          <td className="text-right p-2 font-mono">
                            {formatCurrency(Math.abs(category.totalAmount))}
                          </td>
                          <td className="text-right p-2 font-mono">
                            {category.transactionCount > 0 
                              ? formatCurrency(Math.abs(category.totalAmount) / category.transactionCount)
                              : '$0.00'
                            }
                          </td>
                          <td className="text-right p-2 font-mono">
                            {getUsagePercentage(category.transactionCount, totalTransactions)}%
                          </td>
                          <td className="text-right p-2 font-mono">
                            {totalSpending > 0 ? ((Math.abs(category.totalAmount) / totalSpending) * 100).toFixed(1) : '0'}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Management</CardTitle>
                <CardDescription>View and manage all your categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories?.map((category) => {
                    const analytics = categoryAnalytics?.find(a => a.id === category.id)
                    return (
                      <Card key={category.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon iconName={category.icon} className="w-5 h-5" />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color || '#gray' }}
                              />
                            </div>
                            {category.isSystem && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                          </div>
                          
                          <h3 className="font-semibold mb-2">{category.name}</h3>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Transactions:</span>
                              <span className="font-mono">{analytics?.transactionCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-mono">
                                {analytics ? formatCurrency(Math.abs(analytics.totalAmount)) : '$0.00'}
                              </span>
                            </div>
                            {analytics && analytics.transactionCount > 0 && (
                              <div className="flex justify-between">
                                <span>Average:</span>
                                <span className="font-mono">
                                  {formatCurrency(Math.abs(analytics.totalAmount) / analytics.transactionCount)}
                                </span>
                              </div>
                            )}
                          </div>

                          {!category.isSystem && (
                            <div className="flex justify-end space-x-2 mt-3">
                              <Button variant="outline" size="sm">
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  )
} 