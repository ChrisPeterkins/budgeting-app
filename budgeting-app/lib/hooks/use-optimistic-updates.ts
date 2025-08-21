import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

interface Transaction {
  id: string
  amount: number
  description: string
  date: Date
  accountId: string
  categoryId: string
  userId: string
  account?: { name: string }
  category?: { name: string }
}

interface Goal {
  id: string
  name: string
  currentAmount: number
  targetAmount: number
  isCompleted: boolean
}

interface BudgetItem {
  id: string
  categoryId: string
  amount: number
  category: { name: string }
}

export function useOptimisticUpdates() {
  const queryClient = useQueryClient()

  // Optimistic transaction creation
  const createTransactionOptimistic = api.transactions.create.useMutation({
    onMutate: async (newTransaction) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions'] })

      // Snapshot the previous value
      const previousTransactions = queryClient.getQueryData(['transactions', 'getAll'])

      // Optimistically update to the new value
      const optimisticTransaction = {
        id: `temp-${Date.now()}`, // Temporary ID
        ...newTransaction,
        createdAt: new Date(),
        updatedAt: new Date(),
        account: { name: 'Loading...' },
        category: { name: 'Loading...' },
      }

      queryClient.setQueryData(['transactions', 'getAll'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          transactions: [optimisticTransaction, ...old.transactions],
          totalCount: old.totalCount + 1,
        }
      })

      // Show success toast immediately
      toast.success('Transaction added!')

      return { previousTransactions }
    },
    onError: (err, newTransaction, context) => {
      // Revert the optimistic update
      queryClient.setQueryData(['transactions', 'getAll'], context?.previousTransactions)
      toast.error('Failed to add transaction. Please try again.')
    },
    onSettled: () => {
      // Always invalidate after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })

  // Optimistic goal progress update
  const updateGoalProgressOptimistic = api.goals.updateProgress.useMutation({
    onMutate: async ({ id, action, amount }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] })

      // Get current goal data
      const previousGoals = queryClient.getQueryData(['goals', 'getAll'])
      const previousGoal = queryClient.getQueryData(['goals', 'getById', { id }])
      const previousStats = queryClient.getQueryData(['goals', 'getStats'])

      // Calculate optimistic update
      queryClient.setQueryData(['goals', 'getAll'], (old: Goal[] | undefined) => {
        if (!old) return old
        return old.map(goal => {
          if (goal.id === id) {
            let newAmount = goal.currentAmount
            switch (action) {
              case 'add':
                newAmount += amount
                break
              case 'subtract':
                newAmount = Math.max(0, newAmount - amount)
                break
              case 'set':
                newAmount = Math.max(0, amount)
                break
            }
            
            const isCompleted = newAmount >= goal.targetAmount
            return { ...goal, currentAmount: newAmount, isCompleted }
          }
          return goal
        })
      })

      // Update individual goal query if it exists
      queryClient.setQueryData(['goals', 'getById', { id }], (old: any) => {
        if (!old) return old
        let newAmount = old.currentAmount
        switch (action) {
          case 'add':
            newAmount += amount
            break
          case 'subtract':
            newAmount = Math.max(0, newAmount - amount)
            break
          case 'set':
            newAmount = Math.max(0, amount)
            break
        }
        
        const isCompleted = newAmount >= old.targetAmount
        const progress = old.targetAmount > 0 ? (newAmount / old.targetAmount) * 100 : 0
        
        return { 
          ...old, 
          currentAmount: newAmount, 
          isCompleted,
          progress: Math.min(progress, 100),
          remaining: Math.max(0, old.targetAmount - newAmount)
        }
      })

      // Show immediate feedback
      const actionText = action === 'add' ? 'Added to' : action === 'subtract' ? 'Removed from' : 'Updated'
      toast.success(`${actionText} goal progress!`)

      return { previousGoals, previousGoal, previousStats }
    },
    onError: (err, variables, context) => {
      // Revert optimistic updates
      if (context?.previousGoals) {
        queryClient.setQueryData(['goals', 'getAll'], context.previousGoals)
      }
      if (context?.previousGoal) {
        queryClient.setQueryData(['goals', 'getById', { id: variables.id }], context.previousGoal)
      }
      toast.error('Failed to update goal progress. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  // Optimistic budget item update
  const updateBudgetItemOptimistic = api.budgets.updateItems.useMutation({
    onMutate: async ({ budgetId, items }) => {
      await queryClient.cancelQueries({ queryKey: ['budgets'] })

      const previousBudgets = queryClient.getQueryData(['budgets', 'getAll'])
      const previousBudget = queryClient.getQueryData(['budgets', 'getById', { id: budgetId }])

      // Update budget items optimistically
      queryClient.setQueryData(['budgets', 'getById', { id: budgetId }], (old: any) => {
        if (!old) return old
        return {
          ...old,
          items: items.map(item => ({
            ...item,
            id: `temp-${item.categoryId}`,
            budgetId,
            category: { name: 'Loading...' }, // Will be replaced by real data
          }))
        }
      })

      toast.success('Budget updated!')

      return { previousBudgets, previousBudget }
    },
    onError: (err, variables, context) => {
      if (context?.previousBudget) {
        queryClient.setQueryData(['budgets', 'getById', { id: variables.budgetId }], context.previousBudget)
      }
      toast.error('Failed to update budget. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  // Optimistic transaction deletion
  const deleteTransactionOptimistic = api.transactions.delete.useMutation({
    onMutate: async ({ id: transactionId }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] })

      const previousTransactions = queryClient.getQueryData(['transactions', 'getAll'])

      // Remove transaction optimistically
      queryClient.setQueryData(['transactions', 'getAll'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          transactions: old.transactions.filter((t: Transaction) => t.id !== transactionId),
          totalCount: Math.max(0, old.totalCount - 1),
        }
      })

      toast.success('Transaction deleted!')

      return { previousTransactions }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['transactions', 'getAll'], context?.previousTransactions)
      toast.error('Failed to delete transaction. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })

  // Optimistic goal completion toggle
  const toggleGoalCompletionOptimistic = api.goals.markCompleted.useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] })

      const previousGoals = queryClient.getQueryData(['goals', 'getAll'])
      const previousGoal = queryClient.getQueryData(['goals', 'getById', { id }])

      // Toggle completion optimistically
      queryClient.setQueryData(['goals', 'getAll'], (old: Goal[] | undefined) => {
        if (!old) return old
        return old.map(goal => {
          if (goal.id === id) {
            const isCompleted = !goal.isCompleted
            return { 
              ...goal, 
              isCompleted,
              currentAmount: isCompleted ? goal.targetAmount : goal.currentAmount
            }
          }
          return goal
        })
      })

      queryClient.setQueryData(['goals', 'getById', { id }], (old: any) => {
        if (!old) return old
        const isCompleted = !old.isCompleted
        return { 
          ...old, 
          isCompleted,
          currentAmount: isCompleted ? old.targetAmount : old.currentAmount,
          progress: isCompleted ? 100 : old.progress
        }
      })

      toast.success('Goal status updated!')

      return { previousGoals, previousGoal }
    },
    onError: (err, variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(['goals', 'getAll'], context.previousGoals)
      }
      if (context?.previousGoal) {
        queryClient.setQueryData(['goals', 'getById', { id: variables.id }], context.previousGoal)
      }
      toast.error('Failed to update goal status. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  // Batch invalidation for related data
  const invalidateRelatedData = (types: ('transactions' | 'budgets' | 'goals' | 'analytics')[]) => {
    const invalidationMap = {
      transactions: [['transactions']],
      budgets: [['budgets']],
      goals: [['goals']],
      analytics: [['analytics']],
    }

    types.forEach(type => {
      invalidationMap[type]?.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })
    })
  }

  // Force refresh all data
  const forceRefreshAll = () => {
    queryClient.invalidateQueries()
    toast.info('Refreshing all data...')
  }

  return {
    // Optimistic mutations
    createTransactionOptimistic,
    updateGoalProgressOptimistic,
    updateBudgetItemOptimistic,
    deleteTransactionOptimistic,
    toggleGoalCompletionOptimistic,
    
    // Utility functions
    invalidateRelatedData,
    forceRefreshAll,
    
    // Status indicators
    isCreatingTransaction: createTransactionOptimistic.isPending,
    isUpdatingGoal: updateGoalProgressOptimistic.isPending,
    isUpdatingBudget: updateBudgetItemOptimistic.isPending,
    isDeletingTransaction: deleteTransactionOptimistic.isPending,
    isTogglingGoal: toggleGoalCompletionOptimistic.isPending,
  }
} 