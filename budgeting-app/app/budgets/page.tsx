'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Plus, 
  Calendar, 
  DollarSign, 
  Target,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Edit,
  Copy,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog'
import { CategoryIcon } from '@/components/categories/category-icon'

export default function BudgetsPage() {
  const router = useRouter()
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null)
  
  const { data: budgets, isLoading, refetch } = api.budgets.getAll.useQuery()
  const { data: activeBudgets } = api.budgets.getActive.useQuery()
  const { data: categories, refetch: refetchCategories } = api.categories.getAll.useQuery()
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
      month: 'short',
      day: 'numeric'
    })
  }

  const getBudgetStatus = (budget: any) => {
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

  const handleDeleteBudget = async (budgetId: string, budgetName: string) => {
    if (!confirm(`Are you sure you want to delete the budget "${budgetName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteBudgetMutation.mutateAsync({ id: budgetId })
      toast.success('Budget deleted successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to delete budget')
      console.error('Delete budget error:', error)
    }
  }

  const BudgetCard = ({ budget }: { budget: any }) => {
    const status = getBudgetStatus(budget)
    const totalBudgeted = budget.items?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0
    
    return (
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">{budget.name}</h3>
                <Badge className={getStatusColor(status)}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                </div>
                <div className="flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  {budget.period.toLowerCase()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/budgets/${budget.id}/edit`)}
                title="Edit Budget"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/budgets/${budget.id}/clone`)}
                title="Clone Budget"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteBudget(budget.id, budget.name)}
                disabled={deleteBudgetMutation.isPending}
                title="Delete Budget"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Budget</div>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(totalBudgeted)}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Categories</div>
              <div className="text-xl font-bold text-green-600">
                {budget.items?.length || 0}
              </div>
            </div>
          </div>

          <Button
            onClick={() => router.push(`/budgets/${budget.id}`)}
            className="w-full"
            variant="outline"
          >
            View Details
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activeBudgetsList = budgets?.filter(budget => getBudgetStatus(budget) === 'active') || []
  const upcomingBudgetsList = budgets?.filter(budget => getBudgetStatus(budget) === 'upcoming') || []
  const completedBudgetsList = budgets?.filter(budget => getBudgetStatus(budget) === 'completed') || []

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Budget Management</h1>
            <p className="text-gray-600">Set and track your spending limits by category</p>
          </div>
          <Button onClick={() => router.push('/budgets/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Budget
          </Button>
        </div>

        {budgets && budgets.length > 0 ? (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="active" className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Active ({activeBudgetsList.length})</span>
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Upcoming ({upcomingBudgetsList.length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4" />
                <span>Completed ({completedBudgetsList.length})</span>
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>All ({budgets.length})</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Categories</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {activeBudgetsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeBudgetsList.map((budget) => (
                    <BudgetCard key={budget.id} budget={budget} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Active Budgets</h3>
                    <p className="text-gray-600 mb-4">Create a budget to start tracking your spending</p>
                    <Button onClick={() => router.push('/budgets/new')}>
                      Create Budget
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="mt-6">
              {upcomingBudgetsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingBudgetsList.map((budget) => (
                    <BudgetCard key={budget.id} budget={budget} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Upcoming Budgets</h3>
                    <p className="text-gray-600">No budgets scheduled for future periods</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedBudgetsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedBudgetsList.map((budget) => (
                    <BudgetCard key={budget.id} budget={budget} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <TrendingDown className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Budgets</h3>
                    <p className="text-gray-600">Past budgets will appear here</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.map((budget) => (
                  <BudgetCard key={budget.id} budget={budget} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        Manage Categories
                      </div>
                      <CreateCategoryDialog 
                        onCategoryCreated={() => refetchCategories()} 
                        trigger={
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Category
                          </Button>
                        }
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categories && categories.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((category) => (
                          <div key={category.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: category.color || '#6b7280' }}
                              >
                                <CategoryIcon 
                                  iconName={category.icon}
                                  className="w-5 h-5"
                                />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium">{category.name}</h3>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  <Badge variant={category.isSystem ? "secondary" : "outline"}>
                                    {category.isSystem ? 'System' : 'Custom'}
                                  </Badge>
                                  {category.children && category.children.length > 0 && (
                                    <span>{category.children.length} subcategories</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {category.children && category.children.length > 0 && (
                              <div className="mt-3 ml-11 space-y-2">
                                {category.children.map((child) => (
                                  <div key={child.id} className="flex items-center space-x-2 text-sm">
                                    <CategoryIcon 
                                      iconName={child.icon}
                                      className="w-4 h-4 text-gray-600"
                                    />
                                    <span>{child.name}</span>
                                    {!child.isSystem && (
                                      <Badge variant="outline" className="text-xs">Custom</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Categories Available</h3>
                        <p className="mb-4">Create categories to organize your budget items</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Your Budgets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Budgets Created</h3>
                <p className="mb-4">Create budgets to track your spending and stay on top of your finances</p>
                <Button onClick={() => router.push('/budgets/new')}>
                  Create Your First Budget
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}