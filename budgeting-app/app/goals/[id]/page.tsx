'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Edit,
  X,
  Save,
  Plus,
  Minus,
  PiggyBank,
  CreditCard,
  Shield,
  RefreshCw
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { useOptimisticUpdates } from '@/lib/hooks/use-optimistic-updates'
import { toast } from 'sonner'
import { GoalType } from '@prisma/client'

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [goalId, setGoalId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [updateAmount, setUpdateAmount] = useState<number>(0)
  const [updateAction, setUpdateAction] = useState<'add' | 'set'>('add')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editTargetAmount, setEditTargetAmount] = useState<number>(0)
  const [editCurrentAmount, setEditCurrentAmount] = useState<number>(0)
  const [editTargetDate, setEditTargetDate] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Handle async params
  useEffect(() => {
    params.then((resolvedParams) => {
      setGoalId(resolvedParams.id)
    })
  }, [params])

  const { data: goal, isLoading, refetch } = api.goals.getById.useQuery(
    { id: goalId! },
    { enabled: !!goalId }
  )

  const optimisticUpdates = useOptimisticUpdates()
  const updateProgressMutation = api.goals.updateProgress.useMutation()
  const updateGoalMutation = api.goals.update.useMutation()
  const markCompletedMutation = api.goals.markCompleted.useMutation()
  const reopenMutation = api.goals.reopen.useMutation()

  // Initialize edit form when goal data loads
  useEffect(() => {
    if (goal && !isEditing) {
      setEditName(goal.name)
      setEditTargetAmount(goal.targetAmount)
      setEditCurrentAmount(goal.currentAmount)
      setEditTargetDate(new Date(goal.targetDate).toISOString().split('T')[0])
    }
  }, [goal, isEditing])

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

  const handleUpdateProgress = async () => {
    if (!goal || updateAmount <= 0) return

    try {
      await updateProgressMutation.mutateAsync({
        id: goal.id,
        amount: updateAmount,
        action: updateAction
      })
      
      toast.success('Goal progress updated!')
      setUpdateAmount(0)
      refetch()
    } catch (error) {
      toast.error('Failed to update progress')
      console.error('Update progress error:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!goal) return

    try {
      await updateGoalMutation.mutateAsync({
        id: goal.id,
        name: editName.trim(),
        targetAmount: editTargetAmount,
        currentAmount: editCurrentAmount,
        targetDate: new Date(editTargetDate),
        description: editDescription.trim() || undefined
      })
      
      toast.success('Goal updated successfully!')
      setIsEditing(false)
      refetch()
    } catch (error) {
      toast.error('Failed to update goal')
      console.error('Update goal error:', error)
    }
  }

  const handleMarkCompleted = async () => {
    if (!goal) return

    try {
      await markCompletedMutation.mutateAsync({ id: goal.id })
      toast.success(`Congratulations! Goal "${goal.name}" completed! 🎉`)
      refetch()
    } catch (error) {
      toast.error('Failed to mark goal as completed')
      console.error('Mark completed error:', error)
    }
  }

  const handleReopen = async () => {
    if (!goal) return

    try {
      await reopenMutation.mutateAsync({ id: goal.id })
      toast.success(`Goal "${goal.name}" reopened`)
      refetch()
    } catch (error) {
      toast.error('Failed to reopen goal')
      console.error('Reopen goal error:', error)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    // Reset form to original values
    if (goal) {
      setEditName(goal.name)
      setEditTargetAmount(goal.targetAmount)
      setEditCurrentAmount(goal.currentAmount)
      setEditTargetDate(new Date(goal.targetDate).toISOString().split('T')[0])
    }
  }

  // Show loading if goalId is not yet resolved or data is loading
  if (!goalId || isLoading) {
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

  if (!goal) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Goal Not Found</h3>
              <p className="text-gray-600 mb-4">The goal you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => router.push('/goals')}>
                Back to Goals
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  const IconComponent = getGoalTypeIcon(goal.type)

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <IconComponent className="w-8 h-8 text-gray-600" />
              <h1 className="text-3xl font-bold">{goal.name}</h1>
              <Badge className={getGoalTypeColor(goal.type)}>
                {goal.type.replace('_', ' ')}
              </Badge>
              {goal.isCompleted && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              )}
              {goal.isOverdue && !goal.isCompleted && (
                <Badge className="bg-red-100 text-red-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Goal
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateGoalMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-medium">
                        {formatCurrency(isEditing ? editCurrentAmount : goal.currentAmount)} of {formatCurrency(isEditing ? editTargetAmount : goal.targetAmount)}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {((isEditing ? editCurrentAmount : goal.currentAmount) / (isEditing ? editTargetAmount : goal.targetAmount) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(((isEditing ? editCurrentAmount : goal.currentAmount) / (isEditing ? editTargetAmount : goal.targetAmount)) * 100, 100)} 
                      className="h-4"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Remaining</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatCurrency(Math.max(0, (isEditing ? editTargetAmount : goal.targetAmount) - (isEditing ? editCurrentAmount : goal.currentAmount)))}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Days Left</div>
                      <div className={`text-xl font-bold ${goal.isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                        {goal.isOverdue ? 'Overdue' : `${goal.daysRemaining} days`}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Monthly Needed</div>
                      <div className="text-xl font-bold text-purple-600">
                        {formatCurrency(goal.monthlyNeeded)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Goal Details */}
            <Card>
              <CardHeader>
                <CardTitle>Goal Details</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Goal Name</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-target-amount">Target Amount</Label>
                        <Input
                          id="edit-target-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editTargetAmount || ''}
                          onChange={(e) => setEditTargetAmount(parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-current-amount">Current Amount</Label>
                        <Input
                          id="edit-current-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editCurrentAmount || ''}
                          onChange={(e) => setEditCurrentAmount(parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit-target-date">Target Date</Label>
                      <Input
                        id="edit-target-date"
                        type="date"
                        value={editTargetDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEditTargetDate(e.target.value)}
                        className="mt-1 max-w-md"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Input
                        id="edit-description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="mt-1"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Target Amount</label>
                        <div className="text-lg font-medium text-green-600">{formatCurrency(goal.targetAmount)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Amount</label>
                        <div className="text-lg font-medium">{formatCurrency(goal.currentAmount)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Goal Type</label>
                        <Badge className={getGoalTypeColor(goal.type)}>
                          {goal.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Target Date</label>
                        <div className="text-lg font-medium">{formatDate(goal.targetDate)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Created</label>
                        <div className="text-lg font-medium">{formatDate(goal.createdAt)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div>
                          {goal.isCompleted ? (
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          ) : goal.isOverdue ? (
                            <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {!goal.isCompleted && !isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Action</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant={updateAction === 'add' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUpdateAction('add')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                      <Button
                        variant={updateAction === 'set' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUpdateAction('set')}
                      >
                        Set
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="update-amount">Amount</Label>
                    <Input
                      id="update-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={updateAmount || ''}
                      onChange={(e) => setUpdateAmount(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleUpdateProgress}
                    disabled={updateAmount <= 0 || updateProgressMutation.isPending}
                    className="w-full"
                  >
                    {updateProgressMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="w-4 h-4 mr-2" />
                    )}
                    Update Progress
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Goal Status Actions */}
            {!isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Goal Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!goal.isCompleted ? (
                    <Button
                      onClick={handleMarkCompleted}
                      disabled={markCompletedMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </Button>
                  ) : (
                    <Button
                      onClick={handleReopen}
                      disabled={reopenMutation.isPending}
                      className="w-full"
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reopen Goal
                    </Button>
                  )}

                  <Button
                    onClick={() => router.push('/goals')}
                    variant="outline"
                    className="w-full"
                  >
                    Back to All Goals
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Goal Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Goal Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{goal.progress.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Months remaining:</span>
                  <span className="font-medium">{goal.monthsRemaining}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Achievable:</span>
                  <span className={`font-medium ${goal.isAchievable ? 'text-green-600' : 'text-red-600'}`}>
                    {goal.isAchievable ? 'Yes' : 'Challenging'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 