'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Target,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Shield,
  Calendar,
  DollarSign
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { GoalType } from '@prisma/client'

export default function NewGoalPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  
  // Form state
  const [goalName, setGoalName] = useState('')
  const [goalType, setGoalType] = useState<GoalType>('SAVINGS')
  const [targetAmount, setTargetAmount] = useState<number>(0)
  const [currentAmount, setCurrentAmount] = useState<number>(0)
  const [targetDate, setTargetDate] = useState('')
  const [description, setDescription] = useState('')

  const createGoalMutation = api.goals.create.useMutation()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const goalTypes = [
    {
      type: 'SAVINGS' as GoalType,
      name: 'Savings Goal',
      icon: PiggyBank,
      description: 'Save money for a specific purpose like vacation, car, or house down payment',
      color: 'bg-green-100 text-green-800 border-green-200',
      examples: ['Vacation fund', 'New car', 'House down payment', 'Wedding']
    },
    {
      type: 'DEBT_PAYOFF' as GoalType,
      name: 'Debt Payoff',
      icon: CreditCard,
      description: 'Pay off credit cards, loans, or other debts',
      color: 'bg-red-100 text-red-800 border-red-200',
      examples: ['Credit card debt', 'Student loans', 'Car loan', 'Personal loan']
    },
    {
      type: 'INVESTMENT' as GoalType,
      name: 'Investment Goal',
      icon: TrendingUp,
      description: 'Build wealth through investments for retirement or other long-term goals',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      examples: ['Retirement fund', 'Stock portfolio', 'Real estate investment', 'College fund']
    },
    {
      type: 'EMERGENCY_FUND' as GoalType,
      name: 'Emergency Fund',
      icon: Shield,
      description: 'Build a safety net for unexpected expenses',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      examples: ['3-month expenses', '6-month expenses', 'Medical emergency fund', 'Job loss fund']
    }
  ]

  const handleGoalTypeSelect = (type: GoalType) => {
    setGoalType(type)
  }

  const calculateMonthlyContribution = () => {
    if (!targetDate || targetAmount <= currentAmount) return 0
    
    const today = new Date()
    const target = new Date(targetDate)
    const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const monthsRemaining = Math.max(1, daysRemaining / 30)
    const remaining = targetAmount - currentAmount
    
    return remaining / monthsRemaining
  }

  const handleCreateGoal = async () => {
    try {
      if (!goalName.trim()) {
        toast.error('Goal name is required')
        return
      }
      
      if (targetAmount <= 0) {
        toast.error('Target amount must be greater than 0')
        return
      }
      
      if (!targetDate) {
        toast.error('Target date is required')
        return
      }
      
      if (currentAmount < 0) {
        toast.error('Current amount cannot be negative')
        return
      }

      if (currentAmount >= targetAmount) {
        toast.error('Current amount should be less than target amount')
        return
      }

      const newGoal = await createGoalMutation.mutateAsync({
        name: goalName.trim(),
        type: goalType,
        targetAmount,
        currentAmount,
        targetDate: new Date(targetDate),
        description: description.trim() || undefined
      })

      toast.success('Goal created successfully!')
      router.push(`/goals/${newGoal.id}`)
      
    } catch (error) {
      toast.error('Failed to create goal')
      console.error('Create goal error:', error)
    }
  }

  const isStep1Valid = goalName.trim() && goalType
  const isStep2Valid = targetAmount > 0 && targetDate && currentAmount >= 0 && currentAmount < targetAmount
  const monthlyContribution = calculateMonthlyContribution()

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center space-x-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Goal</h1>
            <p className="text-gray-600">Set a financial target to work towards</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="font-medium">Goal Details</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-200"></div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Amount & Timeline</span>
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
                Goal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="goal-name">Goal Name</Label>
                <Input
                  id="goal-name"
                  placeholder="e.g., Emergency Fund, Vacation, New Car"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Goal Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {goalTypes.map((type) => {
                    const IconComponent = type.icon
                    return (
                      <Card
                        key={type.type}
                        className={`cursor-pointer transition-all border-2 ${
                          goalType === type.type 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleGoalTypeSelect(type.type)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <IconComponent className="w-6 h-6 text-gray-600 mt-1" />
                            <div className="flex-1">
                              <h3 className="font-medium mb-1">{type.name}</h3>
                              <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {type.examples.map((example, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {example}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Add any additional details about your goal"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid}
                >
                  Next: Amount & Timeline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Amount & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="target-amount">Target Amount</Label>
                  <Input
                    id="target-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={targetAmount || ''}
                    onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="current-amount">Current Amount</Label>
                  <Input
                    id="current-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={currentAmount || ''}
                    onChange={(e) => setCurrentAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="target-date">Target Date</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 max-w-md"
                />
              </div>

              {targetAmount > 0 && targetDate && currentAmount < targetAmount && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 text-blue-800">Goal Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Amount needed:</span>
                        <div className="font-medium">{formatCurrency(targetAmount - currentAmount)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Monthly contribution needed:</span>
                        <div className="font-medium text-blue-600">{formatCurrency(monthlyContribution)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Based on your target date, you'll need to save approximately {formatCurrency(monthlyContribution)} per month.
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                >
                  Next: Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Review & Create Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Goal Name</label>
                      <div className="text-lg font-medium">{goalName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Goal Type</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {(() => {
                          const selectedType = goalTypes.find(t => t.type === goalType)
                          const IconComponent = selectedType?.icon || Target
                          return (
                            <>
                              <IconComponent className="w-4 h-4" />
                              <Badge className={selectedType?.color}>
                                {selectedType?.name}
                              </Badge>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    {description && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <div className="text-sm text-gray-800">{description}</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Target Amount</label>
                      <div className="text-lg font-medium text-green-600">{formatCurrency(targetAmount)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Starting Amount</label>
                      <div className="text-lg font-medium">{formatCurrency(currentAmount)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Target Date</label>
                      <div className="text-lg font-medium">{new Date(targetDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600">Amount to Save</div>
                      <div className="text-xl font-bold text-blue-600">{formatCurrency(targetAmount - currentAmount)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600">Monthly Contribution</div>
                      <div className="text-xl font-bold text-purple-600">{formatCurrency(monthlyContribution)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600">Days Remaining</div>
                      <div className="text-xl font-bold text-orange-600">
                        {Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateGoal}
                  disabled={createGoalMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
} 