'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { useOptimisticUpdates } from '@/lib/hooks/use-optimistic-updates'
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  RefreshCw,
  Plus,
  Minus,
  Zap,
  Bell,
  Wallet,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface MobileLiveDashboardProps {
  className?: string
}

export function MobileLiveDashboard({ className = '' }: MobileLiveDashboardProps) {
  const [pullToRefreshDistance, setPullToRefreshDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [startY, setStartY] = useState(0)
  const [showQuickActions, setShowQuickActions] = useState(false)

  const realtimeData = useRealtimeData({
    enableBudgets: true,
    enableGoals: true,
    enableTransactions: true,
    enableAccounts: true
  })

  const { updateGoalProgressOptimistic, isUpdatingGoal } = useOptimisticUpdates()

  // Pull to refresh functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY)
    
    if (distance > 100) {
      e.preventDefault()
      setPullToRefreshDistance(Math.min(distance, 120))
    }
  }

  const handleTouchEnd = async () => {
    if (pullToRefreshDistance > 80) {
      await realtimeData.refreshAll()
    }
    setIsPulling(false)
    setPullToRefreshDistance(0)
    setStartY(0)
  }

  // Quick goal progress update
  const handleQuickGoalUpdate = async (goalId: string, amount: number) => {
    await updateGoalProgressOptimistic.mutateAsync({
      id: goalId,
      action: 'add',
      amount
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getConnectionStatus = () => {
    if (!realtimeData.isOnline) return { text: 'Offline', color: 'bg-red-500', icon: '🔴' }
    if (!realtimeData.isConnected) return { text: 'Connecting', color: 'bg-yellow-500', icon: '🟡' }
    const isSyncing = Object.values(realtimeData.isFetching).some(Boolean)
    if (isSyncing) return { text: 'Syncing', color: 'bg-blue-500', icon: '🔄' }
    return { text: 'Live', color: 'bg-green-500', icon: '🟢' }
  }

  const status = getConnectionStatus()

  return (
    <div 
      className={`mobile-dashboard ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 bg-blue-50 dark:bg-blue-900/20 transition-all duration-200 z-40"
          style={{ height: `${pullToRefreshDistance}px` }}
        >
          <div className="flex items-center justify-center h-full">
            <RefreshCw 
              className={`w-6 h-6 text-blue-500 ${pullToRefreshDistance > 80 ? 'animate-spin' : ''}`} 
            />
            <span className="ml-2 text-blue-600 text-sm">
              {pullToRefreshDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{status.text}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Badge variant="outline" className="text-xs">
            {realtimeData.data.recentTransactions?.totalCount || 0} transactions
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => realtimeData.refreshAll()}
            disabled={Object.values(realtimeData.isFetching).some(Boolean)}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${Object.values(realtimeData.isFetching).some(Boolean) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Overview */}
        <Card className="touch-friendly">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Total Balance</h3>
              {realtimeData.isFetching.accounts && (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(
                realtimeData.data.accounts?.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0) || 0
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Across {realtimeData.data.accounts?.length || 0} accounts
            </p>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="touch-friendly">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-base">
              <Target className="w-4 h-4 mr-2" />
              Goals Progress
              {realtimeData.isFetching.goals && (
                <RefreshCw className="w-4 h-4 ml-2 animate-spin text-blue-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {realtimeData.data.goals?.length ? (
              <div className="space-y-4">
                {realtimeData.data.goals.slice(0, 3).map((goal: any) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal.name}</span>
                      <Badge variant={goal.isCompleted ? 'default' : 'secondary'} className="text-xs">
                        {Math.round(goal.progress)}%
                      </Badge>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                      {!goal.isCompleted && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickGoalUpdate(goal.id, 50)}
                            disabled={isUpdatingGoal}
                            className="h-6 w-8 p-0 text-xs"
                          >
                            +$50
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickGoalUpdate(goal.id, 100)}
                            disabled={isUpdatingGoal}
                            className="h-6 w-8 p-0 text-xs"
                          >
                            +$100
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No goals yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="touch-friendly">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-base">
              <DollarSign className="w-4 h-4 mr-2" />
              Recent Activity
              {realtimeData.isFetching.transactions && (
                <RefreshCw className="w-4 h-4 ml-2 animate-spin text-blue-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {realtimeData.data.recentTransactions?.transactions?.length ? (
              <div className="space-y-3">
                {realtimeData.data.recentTransactions.transactions.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.amount > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="touch-friendly">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {realtimeData.data.goalStats?.activeGoals || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">Active Goals</p>
            </CardContent>
          </Card>
          <Card className="touch-friendly">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {realtimeData.data.budgets?.length || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">Active Budgets</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action Button for Quick Actions */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={() => setShowQuickActions(!showQuickActions)}
        >
          <Plus className={`w-6 h-6 transition-transform ${showQuickActions ? 'rotate-45' : ''}`} />
        </Button>
        
        {showQuickActions && (
          <div className="absolute bottom-16 right-0 space-y-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-lg"
              onClick={() => window.location.href = '/transactions/new'}
            >
              <DollarSign className="w-5 h-5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-lg"
              onClick={() => window.location.href = '/goals/new'}
            >
              <Target className="w-5 h-5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full w-12 h-12 shadow-lg"
              onClick={() => window.location.href = '/uploads'}
            >
              <TrendingUp className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .mobile-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding-bottom: 100px;
        }
        
        .touch-friendly {
          min-height: 44px;
          transition: transform 0.1s ease;
        }
        
        .touch-friendly:active {
          transform: scale(0.98);
        }
        
        @media (max-width: 768px) {
          .mobile-dashboard {
            padding-bottom: 120px;
          }
        }
      `}</style>
    </div>
  )
} 