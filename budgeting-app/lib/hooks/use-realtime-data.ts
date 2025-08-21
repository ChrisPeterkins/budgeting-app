import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '@/lib/trpc/client'
import { useQueryClient } from '@tanstack/react-query'

// Configuration for real-time polling intervals
const POLLING_INTERVALS = {
  // Fast updates for critical data
  transactions: 30000, // 30 seconds
  budgets: 45000,      // 45 seconds
  goals: 60000,        // 1 minute
  
  // Medium updates for analytics
  analytics: 120000,   // 2 minutes
  
  // Slow updates for less critical data
  accounts: 300000,    // 5 minutes
}

interface UseRealtimeDataOptions {
  enableBudgets?: boolean
  enableGoals?: boolean
  enableTransactions?: boolean
  enableAnalytics?: boolean
  enableAccounts?: boolean
  budgetId?: string
}

export function useRealtimeData(options: UseRealtimeDataOptions = {}) {
  const {
    enableBudgets = true,
    enableGoals = true,
    enableTransactions = true,
    enableAnalytics = false,
    enableAccounts = false,
    budgetId
  } = options

  const queryClient = useQueryClient()
  const intervalsRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  // Properly manage online state to avoid infinite re-renders
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Real-time budget data with automatic refetching
  const budgetsQuery = api.budgets.getActive.useQuery(undefined, {
    enabled: enableBudgets,
    refetchInterval: POLLING_INTERVALS.budgets,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  // Specific budget real-time updates
  const budgetQuery = api.budgets.getById.useQuery(
    { id: budgetId! },
    {
      enabled: enableBudgets && !!budgetId,
      refetchInterval: POLLING_INTERVALS.budgets,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      staleTime: 30000,
    }
  )

  // Real-time goals data
  const goalsQuery = api.goals.getAll.useQuery(undefined, {
    enabled: enableGoals,
    refetchInterval: POLLING_INTERVALS.goals,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 45000,
  })

  // Real-time goal statistics
  const goalStatsQuery = api.goals.getStats.useQuery(undefined, {
    enabled: enableGoals,
    refetchInterval: POLLING_INTERVALS.goals,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 45000,
  })

  // Real-time recent transactions
  const recentTransactionsQuery = api.transactions.getAll.useQuery(
    { limit: 20, offset: 0 },
    {
      enabled: enableTransactions,
      refetchInterval: POLLING_INTERVALS.transactions,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      staleTime: 20000,
    }
  )

  // Real-time analytics data (less frequent)
  const spendingTrendsQuery = api.analytics.getSpendingTrends.useQuery(
    { months: 6 },
    {
      enabled: enableAnalytics,
      refetchInterval: POLLING_INTERVALS.analytics,
      refetchIntervalInBackground: false, // Only when tab is active
      refetchOnWindowFocus: true,
      staleTime: 90000,
    }
  )

  const monthlyComparisonQuery = api.analytics.getMonthlyComparison.useQuery(
    {},
    {
      enabled: enableAnalytics,
      refetchInterval: POLLING_INTERVALS.analytics,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      staleTime: 90000,
    }
  )

  // Real-time account data
  const accountsQuery = api.accounts.getAll.useQuery(undefined, {
    enabled: enableAccounts,
    refetchInterval: POLLING_INTERVALS.accounts,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 240000,
  })

  // Manual refresh function for all enabled queries
  const refreshAll = async () => {
    const promises = []
    
    if (enableBudgets) {
      promises.push(budgetsQuery.refetch())
      if (budgetId) promises.push(budgetQuery.refetch())
    }
    
    if (enableGoals) {
      promises.push(goalsQuery.refetch())
      promises.push(goalStatsQuery.refetch())
    }
    
    if (enableTransactions) {
      promises.push(recentTransactionsQuery.refetch())
    }
    
    if (enableAnalytics) {
      promises.push(spendingTrendsQuery.refetch())
      promises.push(monthlyComparisonQuery.refetch())
    }
    
    if (enableAccounts) {
      promises.push(accountsQuery.refetch())
    }

    await Promise.allSettled(promises)
  }

  // Invalidate specific data types
  const invalidateData = (type: 'budgets' | 'goals' | 'transactions' | 'analytics' | 'accounts' | 'all') => {
    if (type === 'all') {
      queryClient.invalidateQueries()
      return
    }

    const invalidationMap = {
      budgets: [['budgets'], ['analytics', 'getBudgetPerformance']],
      goals: [['goals'], ['analytics', 'getGoalAnalytics']],
      transactions: [['transactions'], ['analytics']],
      analytics: [['analytics']],
      accounts: [['accounts']],
    }

    invalidationMap[type]?.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey })
    })
  }

  // Enhanced error tracking
  const errors = {
    budgets: budgetsQuery.error || budgetQuery.error,
    goals: goalsQuery.error || goalStatsQuery.error,
    transactions: recentTransactionsQuery.error,
    analytics: spendingTrendsQuery.error || monthlyComparisonQuery.error,
    accounts: accountsQuery.error,
  }

  // Loading states
  const isLoading = {
    budgets: budgetsQuery.isLoading || budgetQuery.isLoading,
    goals: goalsQuery.isLoading || goalStatsQuery.isLoading,
    transactions: recentTransactionsQuery.isLoading,
    analytics: spendingTrendsQuery.isLoading || monthlyComparisonQuery.isLoading,
    accounts: accountsQuery.isLoading,
  }

  // Fetching states (for showing refresh indicators)
  const isFetching = {
    budgets: budgetsQuery.isFetching || budgetQuery.isFetching,
    goals: goalsQuery.isFetching || goalStatsQuery.isFetching,
    transactions: recentTransactionsQuery.isFetching,
    analytics: spendingTrendsQuery.isFetching || monthlyComparisonQuery.isFetching,
    accounts: accountsQuery.isFetching,
  }

  // Connection status monitoring
  const isConnected = !Object.values(errors).some(error => error !== null)

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(interval => {
        clearInterval(interval)
      })
    }
  }, [])

  // Pause polling when offline
  useEffect(() => {
    if (!isOnline) {
      Object.values(intervalsRef.current).forEach(interval => {
        clearInterval(interval)
      })
    }
  }, [isOnline])

  const utils = api.useUtils()

  // Function to invalidate all account-related queries
  const invalidateAccountData = useCallback(async () => {
    await Promise.all([
      utils.accounts.getAll.invalidate(),
      utils.accounts.getDetailedById.invalidate(),
      utils.transactions.getAll.invalidate(),
      utils.uploads.getAll.invalidate(),
      utils.analytics.getCategoryAnalytics.invalidate(),
    ])
  }, [utils])

  // Function to invalidate all transaction-related queries
  const invalidateTransactionData = useCallback(async () => {
    await Promise.all([
      utils.transactions.getAll.invalidate(),
      utils.transactions.getRecent.invalidate(),
      utils.analytics.getSpendingTrends.invalidate(),
      utils.analytics.getCategoryAnalytics.invalidate(),
    ])
  }, [utils])

  // Function to invalidate all data (for major changes)
  const invalidateAllData = useCallback(async () => {
    await utils.invalidate()
  }, [utils])

  // Set up polling for file processing status changes
  useEffect(() => {
    let pollInterval: NodeJS.Timeout
    let lastFileStatusHash = ''

    const checkProcessingFiles = async () => {
      try {
        // Get current processing files
        const uploads = await utils.uploads.getAll.fetch()
        const hasProcessingFiles = uploads.some(file => file.status === 'PROCESSING')
        
        // Create a hash of file statuses to detect changes
        const currentStatusHash = uploads
          .map(file => `${file.id}:${file.status}:${file.transactionCount}`)
          .join('|')
        
        // If file statuses changed, trigger data invalidation
        if (lastFileStatusHash && lastFileStatusHash !== currentStatusHash) {
          console.log('File status changes detected, triggering data invalidation...')
          invalidateAllData()
        }
        
        lastFileStatusHash = currentStatusHash
        
        if (hasProcessingFiles) {
          // If files are processing, check more frequently
          pollInterval = setTimeout(checkProcessingFiles, 1500) // 1.5 seconds
        } else {
          // If no files processing, check less frequently
          pollInterval = setTimeout(checkProcessingFiles, 5000) // 5 seconds
        }
      } catch (error) {
        console.error('Error checking processing files:', error)
        // Continue polling even on error
        pollInterval = setTimeout(checkProcessingFiles, 5000)
      }
    }

    // Start polling
    checkProcessingFiles()

    return () => {
      if (pollInterval) {
        clearTimeout(pollInterval)
      }
    }
  }, [utils, invalidateAllData])

  // Listen for storage events (for cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'data-invalidation-trigger') {
        // Another tab triggered a data update
        invalidateAllData()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [invalidateAllData])

  // Function to trigger data invalidation across tabs
  const triggerDataInvalidation = useCallback(() => {
    // Trigger local invalidation
    invalidateAllData()
    
    // Trigger invalidation in other tabs
    localStorage.setItem('data-invalidation-trigger', Date.now().toString())
    
    // Clean up the localStorage item after a short delay
    setTimeout(() => {
      localStorage.removeItem('data-invalidation-trigger')
    }, 1000)
  }, [invalidateAllData])

  return {
    // Data
    data: {
      budgets: budgetsQuery.data,
      budget: budgetQuery.data,
      goals: goalsQuery.data,
      goalStats: goalStatsQuery.data,
      recentTransactions: recentTransactionsQuery.data,
      spendingTrends: spendingTrendsQuery.data,
      monthlyComparison: monthlyComparisonQuery.data,
      accounts: accountsQuery.data,
    },
    
    // Status
    isLoading,
    isFetching,
    errors,
    isOnline,
    isConnected,
    
    // Actions
    refreshAll,
    invalidateData,
    
    // Individual refresh functions
    refreshBudgets: () => {
      budgetsQuery.refetch()
      if (budgetId) budgetQuery.refetch()
    },
    refreshGoals: () => {
      goalsQuery.refetch()
      goalStatsQuery.refetch()
    },
    refreshTransactions: () => recentTransactionsQuery.refetch(),
    refreshAnalytics: () => {
      spendingTrendsQuery.refetch()
      monthlyComparisonQuery.refetch()
    },
    refreshAccounts: () => accountsQuery.refetch(),
    invalidateAccountData,
    invalidateTransactionData,
    invalidateAllData,
    triggerDataInvalidation,
  }
} 