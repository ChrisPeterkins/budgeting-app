'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react'
import { useRealtimeData } from '@/lib/hooks/use-realtime-data'

interface RealtimeStatusProps {
  enabledFeatures?: {
    enableBudgets?: boolean
    enableGoals?: boolean
    enableTransactions?: boolean
    enableAnalytics?: boolean
  }
  showRefreshButton?: boolean
  compact?: boolean
}

export function RealtimeStatus({ 
  enabledFeatures = { enableBudgets: true, enableGoals: true, enableTransactions: true },
  showRefreshButton = true,
  compact = false
}: RealtimeStatusProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [isVisible, setIsVisible] = useState(true)

  // Memoize the enabledFeatures to prevent unnecessary re-renders
  const memoizedFeatures = useMemo(() => enabledFeatures, [
    enabledFeatures.enableBudgets,
    enabledFeatures.enableGoals,
    enabledFeatures.enableTransactions,
    enabledFeatures.enableAnalytics
  ])

  const {
    isOnline,
    isConnected,
    isFetching,
    errors,
    refreshAll
  } = useRealtimeData(memoizedFeatures)

  // Update last update time when data changes
  useEffect(() => {
    if (Object.values(isFetching).some(fetching => !fetching)) {
      setLastUpdateTime(new Date())
    }
  }, [isFetching])

  // Auto-hide after a period of inactivity (optional) - only run when compact changes
  useEffect(() => {
    if (compact) {
      const timer = setTimeout(() => setIsVisible(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [compact]) // Removed lastUpdateTime from dependencies to prevent infinite loop

  // Connection status
  const getConnectionStatus = () => {
    if (!isOnline) return { status: 'offline', color: 'destructive', icon: WifiOff }
    if (!isConnected) return { status: 'error', color: 'destructive', icon: AlertCircle }
    if (Object.values(isFetching).some(Boolean)) return { status: 'syncing', color: 'secondary', icon: RefreshCw }
    return { status: 'connected', color: 'default', icon: Wifi }
  }

  const connectionInfo = getConnectionStatus()
  const hasErrors = Object.values(errors).some(error => error !== null)
  const isSyncing = Object.values(isFetching).some(Boolean)

  // Format time since last update
  const getTimeSinceUpdate = () => {
    const diffMs = Date.now() - lastUpdateTime.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    return `${Math.floor(diffMins / 60)}h ago`
  }

  // Handle refresh click
  const handleRefresh = async () => {
    setLastUpdateTime(new Date())
    await refreshAll()
  }

  if (compact && !isVisible && isConnected && !hasErrors) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
      >
        <Zap className="w-3 h-3" />
      </Button>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Connection Status Badge */}
      <Badge variant={connectionInfo.color as any} className="flex items-center space-x-1">
        <connectionInfo.icon 
          className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} 
        />
        {!compact && (
          <span className="text-xs">
            {!isOnline ? 'Offline' : 
             !isConnected ? 'Connection Error' :
             isSyncing ? 'Syncing...' : 'Live'}
          </span>
        )}
      </Badge>

      {/* Last Update Time */}
      {!compact && !isSyncing && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Updated {getTimeSinceUpdate()}</span>
        </div>
      )}

      {/* Error Indicator */}
      {hasErrors && (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          {!compact && <span className="text-xs">Sync Error</span>}
        </Badge>
      )}

      {/* Active Features Indicators */}
      {!compact && (
        <div className="flex items-center space-x-1">
          {memoizedFeatures.enableTransactions && (
            <div className={`w-2 h-2 rounded-full ${isFetching.transactions ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} 
                 title="Transactions sync" />
          )}
          {memoizedFeatures.enableBudgets && (
            <div className={`w-2 h-2 rounded-full ${isFetching.budgets ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} 
                 title="Budgets sync" />
          )}
          {memoizedFeatures.enableGoals && (
            <div className={`w-2 h-2 rounded-full ${isFetching.goals ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} 
                 title="Goals sync" />
          )}
          {memoizedFeatures.enableAnalytics && (
            <div className={`w-2 h-2 rounded-full ${isFetching.analytics ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} 
                 title="Analytics sync" />
          )}
        </div>
      )}

      {/* Manual Refresh Button */}
      {showRefreshButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isSyncing}
          className="h-6 px-2"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {!compact && <span className="ml-1 text-xs">Refresh</span>}
        </Button>
      )}

      {/* Compact mode toggle */}
      {!compact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
        >
          <Clock className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}

// Simplified status for minimal space usage
export function RealtimeStatusMini() {
  // Use default options to prevent passing unstable objects
  const { isOnline, isConnected, isFetching } = useRealtimeData({
    enableBudgets: true,
    enableGoals: true,
    enableTransactions: true
  })
  const isSyncing = Object.values(isFetching).some(Boolean)

  if (!isOnline) {
    return (
      <div className="flex items-center">
        <WifiOff className="w-4 h-4 text-red-500" />
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex items-center">
        <AlertCircle className="w-4 h-4 text-red-500" />
      </div>
    )
  }

  return (
    <div className="flex items-center">
      {isSyncing ? (
        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      ) : (
        <CheckCircle className="w-4 h-4 text-green-500" />
      )}
    </div>
  )
}

// Live data indicator for specific features
export function LiveDataIndicator({ 
  type, 
  isFetching = false 
}: { 
  type: 'transactions' | 'budgets' | 'goals' | 'analytics'
  isFetching?: boolean 
}) {
  const getTypeInfo = () => {
    const typeMap = {
      transactions: { color: 'blue', icon: '💰' },
      budgets: { color: 'green', icon: '📊' },
      goals: { color: 'purple', icon: '🎯' },
      analytics: { color: 'orange', icon: '📈' }
    }
    return typeMap[type]
  }

  const typeInfo = getTypeInfo()

  return (
    <div className="flex items-center space-x-1">
      <div 
        className={`w-2 h-2 rounded-full ${
          isFetching ? `bg-${typeInfo.color}-500 animate-pulse` : `bg-${typeInfo.color}-400`
        }`}
        title={`${type} sync ${isFetching ? 'in progress' : 'complete'}`}
      />
      <span className="text-xs">{typeInfo.icon}</span>
    </div>
  )
} 