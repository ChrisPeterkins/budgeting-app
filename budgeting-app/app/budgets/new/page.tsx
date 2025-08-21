'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  Target, 
  DollarSign,
  Plus,
  Trash2,
  Save,
  AlertTriangle
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { BudgetPeriod } from '@prisma/client'
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog'
import { CategoryIcon } from '@/components/categories/category-icon'

interface BudgetItem {
  categoryId: string
  categoryName: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
}

export default function NewBudgetPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  
  // Budget basic info
  const [budgetName, setBudgetName] = useState('')
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(BudgetPeriod.MONTHLY)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Budget items
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  
  const { data: categories, refetch: refetchCategories } = api.categories.getAll.useQuery()
  const createBudgetMutation = api.budgets.create.useMutation()
  const updateBudgetItemsMutation = api.budgets.updateItems.useMutation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const calculateEndDate = (start: string, period: BudgetPeriod) => {
    if (!start) return ''
    
    const startDate = new Date(start)
    let endDate = new Date(startDate)
    
    switch (period) {
      case BudgetPeriod.WEEKLY:
        endDate.setDate(startDate.getDate() + 6)
        break
      case BudgetPeriod.MONTHLY:
        endDate.setMonth(startDate.getMonth() + 1)
        endDate.setDate(startDate.getDate() - 1)
        break
      case BudgetPeriod.QUARTERLY:
        endDate.setMonth(startDate.getMonth() + 3)
        endDate.setDate(startDate.getDate() - 1)
        break
      case BudgetPeriod.YEARLY:
        endDate.setFullYear(startDate.getFullYear() + 1)
        endDate.setDate(startDate.getDate() - 1)
        break
    }
    
    return endDate.toISOString().split('T')[0]
  }

  const handlePeriodChange = (period: BudgetPeriod) => {
    setBudgetPeriod(period)
    if (startDate) {
      setEndDate(calculateEndDate(startDate, period))
    }
  }

  const handleStartDateChange = (date: string) => {
    setStartDate(date)
    setEndDate(calculateEndDate(date, budgetPeriod))
  }

  const addBudgetItem = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId)
    if (!category) return
    
    // Check if category already added
    if (budgetItems.find(item => item.categoryId === categoryId)) {
      toast.error('Category already added to budget')
      return
    }
    
    setBudgetItems([...budgetItems, {
      categoryId,
      categoryName: category.name,
      amount: 0,
      type: 'EXPENSE'
    }])
  }

  const handleCategoryCreated = async (newCategory: any) => {
    // Refresh categories to include the new one
    await refetchCategories()
    
    // Automatically add the new category to the budget
    setBudgetItems([...budgetItems, {
      categoryId: newCategory.id,
      categoryName: newCategory.name,
      amount: 0,
      type: 'EXPENSE'
    }])
    
    toast.success(`"${newCategory.name}" added to your budget!`)
  }

  const updateBudgetItemAmount = (categoryId: string, amount: number) => {
    setBudgetItems(items => 
      items.map(item => 
        item.categoryId === categoryId 
          ? { ...item, amount: Math.max(0, amount) }
          : item
      )
    )
  }

  const removeBudgetItem = (categoryId: string) => {
    setBudgetItems(items => items.filter(item => item.categoryId !== categoryId))
  }

  const updateBudgetItemType = (categoryId: string, type: 'INCOME' | 'EXPENSE') => {
    setBudgetItems(items => 
      items.map(item => 
        item.categoryId === categoryId 
          ? { ...item, type }
          : item
      )
    )
  }

  // Calculate budget totals
  const calculateBudgetTotals = () => {
    const income = budgetItems
      .filter(item => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amount, 0)
    
    const expenses = budgetItems
      .filter(item => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amount, 0)
    
    const netBudget = income - expenses
    
    return { income, expenses, netBudget }
  }

  const { income: totalIncome, expenses: totalExpenses, netBudget } = calculateBudgetTotals()

  const handleCreateBudget = async () => {
    try {
      if (!budgetName.trim()) {
        toast.error('Budget name is required')
        return
      }
      
      if (!startDate || !endDate) {
        toast.error('Start and end dates are required')
        return
      }
      
      if (budgetItems.length === 0) {
        toast.error('At least one budget category is required')
        return
      }
      
      if (budgetItems.some(item => item.amount <= 0)) {
        toast.error('All budget amounts must be greater than 0')
        return
      }

      // Create the budget
      const newBudget = await createBudgetMutation.mutateAsync({
        name: budgetName.trim(),
        period: budgetPeriod,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      })

      // Add budget items
      await updateBudgetItemsMutation.mutateAsync({
        budgetId: newBudget.id,
        items: budgetItems.map(item => ({
          categoryId: item.categoryId,
          amount: item.amount,
          type: item.type
        }))
      })

      toast.success('Budget created successfully!')
      router.push(`/budgets/${newBudget.id}`)
      
    } catch (error) {
      toast.error('Failed to create budget')
      console.error('Create budget error:', error)
    }
  }

  const totalBudgetAmount = budgetItems.reduce((sum, item) => sum + item.amount, 0)
  const availableCategories = categories?.filter(category => 
    !budgetItems.find(item => item.categoryId === category.id)
  ) || []

  const isStep1Valid = budgetName.trim() && startDate && endDate
  const isStep2Valid = budgetItems.length > 0 && budgetItems.every(item => item.amount > 0)

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center space-x-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold">Create New Budget</h1>
            <p className="text-gray-600">Set up spending limits for your categories</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Basic Info</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-200"></div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Categories & Amounts</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-200"></div>
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="font-medium">Review & Create</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Budget Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="budget-name">Budget Name</Label>
                <Input
                  id="budget-name"
                  placeholder="e.g., January 2024 Budget"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Budget Period</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {Object.values(BudgetPeriod).map((period) => (
                    <Button
                      key={period}
                      variant={budgetPeriod === period ? "default" : "outline"}
                      onClick={() => handlePeriodChange(period)}
                      className="capitalize"
                    >
                      {period.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid}
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Budget Categories & Amounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {budgetItems.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {budgetItems.map((item) => (
                      <div key={item.categoryId} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <CategoryIcon 
                              iconName={categories?.find(c => c.id === item.categoryId)?.icon}
                              className="w-5 h-5 text-gray-600"
                            />
                            <span className="font-medium">{item.categoryName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBudgetItem(item.categoryId)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {/* Type Selection */}
                          <div className="flex border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateBudgetItemType(item.categoryId, 'EXPENSE')}
                              className={`px-3 py-2 text-sm font-medium transition-colors ${
                                item.type === 'EXPENSE'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Expense
                            </button>
                            <button
                              type="button"
                              onClick={() => updateBudgetItemType(item.categoryId, 'INCOME')}
                              className={`px-3 py-2 text-sm font-medium transition-colors ${
                                item.type === 'INCOME'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Income
                            </button>
                          </div>
                          
                          {/* Amount Input */}
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`amount-${item.categoryId}`} className="sr-only">
                              Amount for {item.categoryName}
                            </Label>
                            <span className="text-sm text-gray-500">$</span>
                            <Input
                              id={`amount-${item.categoryId}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount || ''}
                              onChange={(e) => updateBudgetItemAmount(item.categoryId, parseFloat(e.target.value) || 0)}
                              className="w-32"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Enhanced Budget Summary */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600">Total Income</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(totalIncome)}
                          </div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-sm text-gray-600">Total Expenses</div>
                          <div className="text-lg font-bold text-red-600">
                            {formatCurrency(totalExpenses)}
                          </div>
                        </div>
                        <div className={`p-3 rounded-lg ${netBudget >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                          <div className="text-sm text-gray-600">
                            {netBudget >= 0 ? 'Surplus' : 'Deficit'}
                          </div>
                          <div className={`text-lg font-bold ${netBudget >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCurrency(Math.abs(netBudget))}
                          </div>
                        </div>
                      </div>
                      
                      {netBudget < 0 && (
                        <div className="flex items-center space-x-2 text-orange-600 text-sm bg-orange-50 p-3 rounded-lg">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Your expenses exceed your income by {formatCurrency(Math.abs(netBudget))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">Add Categories</Label>
                    <CreateCategoryDialog onCategoryCreated={handleCategoryCreated} />
                  </div>
                  
                  {availableCategories.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {availableCategories.map((category) => (
                        <Button
                          key={category.id}
                          variant="outline"
                          size="sm"
                          onClick={() => addBudgetItem(category.id)}
                          className="justify-start"
                        >
                          <Plus className="w-3 h-3 mr-2" />
                          <CategoryIcon 
                            iconName={category.icon}
                            className="w-4 h-4 mr-2"
                          />
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">All available categories have been added to your budget.</p>
                      <p className="text-sm">Create a custom category to add more options.</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-6">
                  <Button 
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button 
                    onClick={() => setStep(3)}
                    disabled={!isStep2Valid}
                  >
                    Review Budget
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Save className="w-5 h-5 mr-2" />
                Review & Create Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Budget Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{budgetName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium capitalize">{budgetPeriod.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">{new Date(startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Date:</span>
                      <span className="font-medium">{new Date(endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Budget Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categories:</span>
                      <span className="font-medium">{budgetItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Income:</span>
                      <span className="font-medium text-green-600">{formatCurrency(totalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses:</span>
                      <span className="font-medium text-red-600">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Net Budget:</span>
                      <span className={`font-medium text-lg ${netBudget >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {netBudget >= 0 ? '+' : ''}{formatCurrency(netBudget)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Budget Categories</h3>
                <div className="space-y-2">
                  {budgetItems.map((item) => (
                    <div key={item.categoryId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{item.categoryName}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.type === 'INCOME' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.type.toLowerCase()}
                        </span>
                      </div>
                      <span className={`text-lg font-semibold ${
                        item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.type === 'INCOME' ? '+' : ''}{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button 
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Edit Categories
                </Button>
                <Button 
                  onClick={handleCreateBudget}
                  disabled={createBudgetMutation.isPending || updateBudgetItemsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createBudgetMutation.isPending || updateBudgetItemsMutation.isPending ? 'Creating...' : 'Create Budget'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
} 