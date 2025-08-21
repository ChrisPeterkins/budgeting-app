'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  X,
  Bell,
  BellOff,
  RefreshCw,
  Upload
} from 'lucide-react'
import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  type: 'budget_progress' | 'goal_milestone' | 'transaction_added' | 'budget_exceeded' | 'goal_completed'
  title: string
  message: string
  timestamp: Date
  data?: any
  priority: 'low' | 'medium' | 'high'
  read: boolean
}

interface LiveNotificationsProps {
  maxNotifications?: number
  autoHide?: boolean
  autoHideDelay?: number
  enableSound?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function LiveNotifications({
  maxNotifications = 5,
  autoHide = true,
  autoHideDelay = 5000,
  enableSound = false,
  position = 'top-right'
}: LiveNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isEnabled, setIsEnabled] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
  const prevDataRef = useRef<any>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, isFetching } = useRealtimeData({
    enableBudgets: true,
    enableGoals: true,
    enableTransactions: true
  })

  // Initialize audio for notifications
  useEffect(() => {
    if (enableSound && typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIZAysY')
    }
  }, [enableSound])

  // Create notifications based on data changes
  useEffect(() => {
    if (!isEnabled || !data) return

    const prevData = prevDataRef.current
    const currentData = data

    // Skip if this is the initial load or no significant changes
    if (Object.keys(prevData).length === 0) {
      prevDataRef.current = { ...currentData }
      return
    }

    // Check for meaningful changes
    const budgetsChanged = currentData.budgets?.length !== prevData.budgets?.length ||
      currentData.budgets?.some((b: any) => {
        const prev = prevData.budgets?.find((pb: any) => pb.id === b.id)
        return !prev || prev.totalSpent !== b.totalSpent
      })

    const goalsChanged = currentData.goals?.length !== prevData.goals?.length ||
      currentData.goals?.some((g: any) => {
        const prev = prevData.goals?.find((pg: any) => pg.id === g.id)
        return !prev || prev.currentAmount !== g.currentAmount
      })

    const transactionsChanged = currentData.recentTransactions?.transactions?.length !== 
      prevData.recentTransactions?.transactions?.length

    if (!budgetsChanged && !goalsChanged && !transactionsChanged) {
      return
    }

    // Budget progress notifications
    if (currentData.budgets && prevData.budgets) {
      currentData.budgets.forEach((budget: any) => {
        const prevBudget = prevData.budgets?.find((b: any) => b.id === budget.id)
        if (prevBudget) {
          const prevProgress = (prevBudget.totalSpent / prevBudget.totalBudget) * 100
          const currentProgress = (budget.totalSpent / budget.totalBudget) * 100
          
          // Budget milestone notifications (25%, 50%, 75%, 90%, 100%)
          const milestones = [25, 50, 75, 90, 100]
          milestones.forEach(milestone => {
            if (prevProgress < milestone && currentProgress >= milestone) {
              addNotification({
                type: milestone === 100 ? 'budget_exceeded' : 'budget_progress',
                title: milestone === 100 ? 'Budget Exceeded!' : 'Budget Milestone',
                message: `${budget.name} is ${milestone}% spent (${budget.totalSpent.toLocaleString()} of ${budget.totalBudget.toLocaleString()})`,
                data: { budget, progress: milestone },
                priority: milestone >= 90 ? 'high' : milestone >= 75 ? 'medium' : 'low'
              })
            }
          })
        }
      })
    }

    // Goal progress notifications
    if (currentData.goals && prevData.goals) {
      currentData.goals.forEach((goal: any) => {
        const prevGoal = prevData.goals?.find((g: any) => g.id === goal.id)
        if (prevGoal) {
          const prevProgress = prevGoal.progress
          const currentProgress = goal.progress

          // Goal milestones (25%, 50%, 75%, 100%)
          const milestones = [25, 50, 75, 100]
          milestones.forEach(milestone => {
            if (prevProgress < milestone && currentProgress >= milestone) {
              addNotification({
                type: milestone === 100 ? 'goal_completed' : 'goal_milestone',
                title: milestone === 100 ? 'Goal Completed! 🎉' : 'Goal Progress',
                message: `${goal.name} is ${milestone}% complete (${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()})`,
                data: { goal, progress: milestone },
                priority: milestone === 100 ? 'high' : 'medium'
              })
            }
          })
        }
      })
    }

    // Transaction notifications (new transactions)
    if (currentData.recentTransactions && prevData.recentTransactions) {
      const newTransactions = currentData.recentTransactions.transactions?.filter((t: any) => 
        !prevData.recentTransactions?.transactions?.find((pt: any) => pt.id === t.id)
      ) || []

      newTransactions.forEach((transaction: any) => {
        addNotification({
          type: 'transaction_added',
          title: 'New Transaction',
          message: `${transaction.description}: ${transaction.amount > 0 ? '+' : ''}${transaction.amount.toLocaleString()}`,
          data: { transaction },
          priority: Math.abs(transaction.amount) > 1000 ? 'high' : 'medium'
        })
      })
    }

    // Only update prevData if we actually processed changes
    if (budgetsChanged || goalsChanged || transactionsChanged || Object.keys(prevData).length === 0) {
      prevDataRef.current = { ...currentData }
    }
  }, [data, isEnabled])

  useEffect(() => {
    // Listen for data invalidation events
    const handleDataRefresh = () => {
      setIsRefreshing(true)
      toast.info('Refreshing data...', {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        duration: 2000
      })

      // Clear the refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false)
        toast.success('Data updated', {
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 1500
        })
      }, 2000)
    }

    // Listen for file processing completion
    const handleFileProcessed = () => {
      toast.success('File processing completed! New accounts and transactions are now available.', {
        icon: <Upload className="w-4 h-4" />,
        duration: 4000,
        action: {
          label: 'View Accounts',
          onClick: () => {
            window.location.href = '/accounts'
          }
        }
      })
    }

    // Listen for custom events
    window.addEventListener('dataRefreshStarted', handleDataRefresh)
    window.addEventListener('fileProcessingCompleted', handleFileProcessed)

    return () => {
      window.removeEventListener('dataRefreshStarted', handleDataRefresh)
      window.removeEventListener('fileProcessingCompleted', handleFileProcessed)
    }
  }, [])

  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, maxNotifications)
      return updated
    })

    // Play sound if enabled
    if (enableSound && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (user hasn't interacted with page yet)
      })
    }

    // Auto-hide notification
    if (autoHide) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, autoHideDelay)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'budget_progress':
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      case 'budget_exceeded':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'goal_milestone':
        return <Target className="w-4 h-4 text-purple-500" />
      case 'goal_completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'transaction_added':
        return <DollarSign className="w-4 h-4 text-blue-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right': return 'top-4 right-4'
      case 'top-left': return 'top-4 left-4'
      case 'bottom-right': return 'bottom-4 right-4'
      case 'bottom-left': return 'bottom-4 left-4'
    }
  }

  if (!isVisible || notifications.length === 0) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-white dark:bg-gray-800 shadow-lg"
        >
          {isEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          {notifications.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
              {notifications.length}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 w-80 space-y-2`}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4" />
          <span className="text-sm font-medium">Live Notifications</span>
          <Badge variant="secondary">{notifications.length}</Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEnabled(!isEnabled)}
            className="h-6 w-6 p-0"
          >
            {isEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 w-6 p-0"
            disabled={notifications.length === 0}
          >
            <X className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.map((notification, index) => (
          <Card 
            key={notification.id}
            className={`${getPriorityColor(notification.priority)} border-l-4 transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
              !notification.read ? 'animate-pulse' : 'opacity-75'
            }`}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between space-x-2">
                <div className="flex items-start space-x-2 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Toast-style notification for individual alerts
export function LiveToastNotification({ 
  notification, 
  onClose 
}: { 
  notification: NotificationItem
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className={`${notification.priority === 'high' ? 'border-red-500' : 'border-blue-500'} shadow-lg`}>
        <CardContent className="p-4 flex items-center space-x-3">
          {/* ... notification content similar to above ... */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 ml-auto"
          >
            <X className="w-3 h-3" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 