'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  Copy,
  Trash2,
  BarChart3
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

export default function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [budgetId, setBudgetId] = useState<string | null>(null)

  // Handle async params
  useEffect(() => {
    params.then((resolvedParams) => {
      setBudgetId(resolvedParams.id)
    })
  }, [params])

  const { data: budget, isLoading, refetch } = api.budgets.getById.useQuery(
    { id: budgetId! },
    { enabled: !!budgetId }
  )
  const deleteBudgetMutation = api.budgets.delete.useMutation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getBudgetStatus = () => {
    if (!budget) return 'unknown'
    
    const today = new Date()
    const startDate = new Date(budget.startDate)
    const endDate = new Date(budget.endDate)
    
    if (today < startDate) return 'upcoming'
    if (today > endDate) return 'completed'
    return 'active'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressColor = (progress: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'bg-red-500'
    if (progress > 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleDeleteBudget = async () => {
    if (!budget || !budgetId) return
    
    if (!confirm(`Are you sure you want to delete the budget "${budget.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteBudgetMutation.mutateAsync({ id: budgetId })
      toast.success('Budget deleted successfully')
      router.push('/budgets')
    } catch (error) {
      toast.error('Failed to delete budget')
      console.error('Delete budget error:', error)
    }
  }

  const status = getBudgetStatus()

  // Show loading if budgetId is not yet resolved or data is loading
  if (!budgetId || isLoading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
                <div className="h-96 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!budget) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Budget Not Found</h3>
              <p className="text-gray-600 mb-4">The budget you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => router.push('/budgets')}>
                Back to Budgets
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold">{budget.name}</h1>
              <Badge className={getStatusColor(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
              </div>
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-1" />
                {budget.period.toLowerCase()} budget
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/budgets/${budget.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/budgets/${budget.id}/clone`)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Clone
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteBudget}
              disabled={deleteBudgetMutation.isPending}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Total Income</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(budget.totalIncome || 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Actual: {formatCurrency(budget.actualIncome || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Total Expenses</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(budget.totalExpenses || 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Actual: {formatCurrency(budget.actualExpenses || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Net Budget</span>
                  </div>
                  <div className={`text-2xl font-bold ${(budget.netBudget || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(budget.netBudget || 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {(budget.netBudget || 0) >= 0 ? 'Surplus' : 'Deficit'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Net Remaining</span>
                  </div>
                  <div className={`text-2xl font-bold ${(budget.netRemaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(budget.netRemaining || 0)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {(budget.netRemaining || 0) >= 0 ? 'On track' : 'Over budget'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budgeted Income:</span>
                        <span className="font-medium text-green-600">{formatCurrency(budget.totalIncome || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Income:</span>
                        <span className="font-medium">{formatCurrency(budget.actualIncome || 0)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budgeted Expenses:</span>
                        <span className="font-medium text-red-600">{formatCurrency(budget.totalExpenses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Expenses:</span>
                        <span className="font-medium">{formatCurrency(budget.actualExpenses || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Net Position:</span>
                      <span className={`font-bold ${(budget.netRemaining || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(budget.netRemaining || 0)}
                      </span>
                    </div>
                    <Progress 
                      value={budget.overallProgress ? Math.min(budget.overallProgress, 100) : 0} 
                      className="h-3"
                    />
                    {budget.isOverBudget && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm mt-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Over budget by {formatCurrency(Math.abs(budget.netRemaining || 0))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budget.items.map((item) => (
                    <div key={item.categoryId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.category.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              (item as any).type === 'INCOME' 
                                ? 'text-green-600 border-green-200' 
                                : 'text-red-600 border-red-200'
                            }`}
                          >
                            {(item as any).type === 'INCOME' ? 'Income' : 'Expense'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(item.spent)} / {formatCurrency(item.amount)}
                          </div>
                          <div className={`text-sm ${item.isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
                            {item.isOverBudget ? 'Over' : 'Remaining'}: {formatCurrency(Math.abs(item.remaining))}
                          </div>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(item.progress, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{item.progress.toFixed(1)}% used</span>
                        {item.isOverBudget && (
                          <span className="text-red-600 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Over budget
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium capitalize">{budget.period.toLowerCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{formatDate(budget.startDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">End Date:</span>
                  <span className="font-medium">{formatDate(budget.endDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Categories:</span>
                  <span className="font-medium">{budget.items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(status)}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push(`/budgets/${budget.id}/edit`)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Budget
                </Button>
                <Button 
                  onClick={() => router.push(`/budgets/${budget.id}/clone`)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Clone Budget
                </Button>
                <Button 
                  onClick={() => router.push('/transactions')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Transactions
                </Button>
              </CardContent>
            </Card>

            {/* Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${budget.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    {budget.overallProgress.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Budget Used</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Categories on track:</span>
                    <span className="font-medium">
                      {budget.items.filter(item => !item.isOverBudget).length} / {budget.items.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Over budget:</span>
                    <span className={`font-medium ${budget.items.filter(item => item.isOverBudget).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {budget.items.filter(item => item.isOverBudget).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 