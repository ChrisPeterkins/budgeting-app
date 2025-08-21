'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Banknote,
  PiggyBank,
  CreditCard,
  Shield,
  Edit,
  Trash2
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { GoalType } from '@prisma/client'

export default function GoalsPage() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState('all')

  const { data: goals, isLoading, refetch } = api.goals.getAll.useQuery()
  const { data: stats } = api.goals.getStats.useQuery()
  const deleteGoalMutation = api.goals.delete.useMutation()
  const markCompletedMutation = api.goals.markCompleted.useMutation()
  const reopenMutation = api.goals.reopen.useMutation()

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

  const getGoalTypeIcon = (type: GoalType) => {
    switch (type) {
      case 'SAVINGS': return PiggyBank
      case 'DEBT_PAYOFF': return CreditCard
      case 'INVESTMENT': return TrendingUp
      case 'EMERGENCY_FUND': return Shield
      default: return Target
    }
  }

  const getGoalTypeColor = (type: GoalType) => {
    switch (type) {
      case 'SAVINGS': return 'bg-green-100 text-green-800'
      case 'DEBT_PAYOFF': return 'bg-red-100 text-red-800'
      case 'INVESTMENT': return 'bg-blue-100 text-blue-800'
      case 'EMERGENCY_FUND': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressColor = (progress: number, isOverdue: boolean) => {
    if (isOverdue) return 'bg-red-500'
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const handleDeleteGoal = async (goalId: string, goalName: string) => {
    if (!confirm(`Are you sure you want to delete the goal "${goalName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteGoalMutation.mutateAsync({ id: goalId })
      toast.success('Goal deleted successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to delete goal')
      console.error('Delete goal error:', error)
    }
  }

  const handleMarkCompleted = async (goalId: string, goalName: string) => {
    try {
      await markCompletedMutation.mutateAsync({ id: goalId })
      toast.success(`Congratulations! Goal "${goalName}" completed! 🎉`)
      refetch()
    } catch (error) {
      toast.error('Failed to mark goal as completed')
      console.error('Mark completed error:', error)
    }
  }

  const handleReopen = async (goalId: string, goalName: string) => {
    try {
      await reopenMutation.mutateAsync({ id: goalId })
      toast.success(`Goal "${goalName}" reopened`)
      refetch()
    } catch (error) {
      toast.error('Failed to reopen goal')
      console.error('Reopen goal error:', error)
    }
  }

  const filteredGoals = goals?.filter(goal => {
    switch (selectedTab) {
      case 'active': return !goal.isCompleted
      case 'completed': return goal.isCompleted
      case 'overdue': return goal.isOverdue
      case 'savings': return goal.type === 'SAVINGS'
      case 'debt': return goal.type === 'DEBT_PAYOFF'
      case 'investment': return goal.type === 'INVESTMENT'
      case 'emergency': return goal.type === 'EMERGENCY_FUND'
      default: return true
    }
  }) || []

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Financial Goals</h1>
            <p className="text-gray-600">Track and achieve your financial objectives</p>
          </div>
          <Button onClick={() => router.push('/goals/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Goals</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalGoals}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {stats.activeGoals} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Completed</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.completedGoals}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {stats.completionRate.toFixed(1)}% completion rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Total Progress</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalCurrentAmount)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  of {formatCurrency(stats.totalTargetAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">Overdue</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.overdueGoals}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Need attention
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Goals List with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="savings">Savings</TabsTrigger>
                <TabsTrigger value="debt">Debt</TabsTrigger>
                <TabsTrigger value="investment">Investment</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-6">
                {filteredGoals.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No goals found</h3>
                    <p className="text-gray-600 mb-4">
                      {selectedTab === 'all' 
                        ? "You haven't created any financial goals yet." 
                        : `No ${selectedTab} goals found.`}
                    </p>
                    <Button onClick={() => router.push('/goals/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredGoals.map((goal) => {
                      const IconComponent = getGoalTypeIcon(goal.type)
                      return (
                        <Card key={goal.id} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <IconComponent className="w-5 h-5 text-gray-600" />
                                <div>
                                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                                  <Badge className={`mt-1 ${getGoalTypeColor(goal.type)}`}>
                                    {goal.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/goals/${goal.id}`)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteGoal(goal.id, goal.name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium">Progress</span>
                                  <span className="text-sm font-bold">
                                    {goal.progress.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress 
                                  value={goal.progress} 
                                  className="h-2"
                                />
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Current:</span>
                                  <span className="font-medium">{formatCurrency(goal.currentAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Target:</span>
                                  <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Remaining:</span>
                                  <span className="font-medium">{formatCurrency(goal.remaining)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Target Date:</span>
                                  <span className={`font-medium ${goal.isOverdue ? 'text-red-600' : ''}`}>
                                    {formatDate(goal.targetDate)}
                                  </span>
                                </div>
                                {!goal.isCompleted && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Monthly Needed:</span>
                                    <span className="font-medium text-blue-600">
                                      {formatCurrency(goal.monthlyNeeded)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center space-x-2">
                                  {goal.isCompleted ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  ) : goal.isOverdue ? (
                                    <Badge className="bg-red-100 text-red-800">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Overdue
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-800">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {goal.daysRemaining} days left
                                    </Badge>
                                  )}
                                </div>
                                
                                {!goal.isCompleted ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkCompleted(goal.id, goal.name)}
                                  >
                                    Mark Complete
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReopen(goal.id, goal.name)}
                                  >
                                    Reopen
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 