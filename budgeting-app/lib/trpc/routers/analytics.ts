import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isAfter, isBefore } from 'date-fns'

export const analyticsRouter = router({
  // Get spending trends over time
  getSpendingTrends: protectedProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const endDate = input.endDate ? parseISO(input.endDate) : new Date()
      const startDate = input.startDate 
        ? parseISO(input.startDate) 
        : subMonths(startOfMonth(endDate), input.months - 1)

      // Get monthly spending data
      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId: ctx.user.id,
          date: {
            gte: startDate,
            lte: endDate,
          }
        },
        include: {
          category: true,
        },
        orderBy: { date: 'asc' }
      })

      // Group by month and type
      const monthlyData = new Map()
      
      transactions.forEach(transaction => {
        const monthKey = format(transaction.date, 'yyyy-MM')
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthKey,
            monthName: format(transaction.date, 'MMM yyyy'),
            income: 0,
            expenses: 0,
            net: 0,
            transactionCount: 0,
          })
        }
        
        const monthData = monthlyData.get(monthKey)
        if (transaction.amount > 0) {
          monthData.income += transaction.amount
        } else {
          monthData.expenses += Math.abs(transaction.amount)
        }
        monthData.net = monthData.income - monthData.expenses
        monthData.transactionCount++
      })

      return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month))
    }),

  // Get category breakdown analytics
  getCategoryAnalytics: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      includeIncome: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const endDate = input.endDate ? parseISO(input.endDate) : new Date()
      const startDate = input.startDate ? parseISO(input.startDate) : subMonths(endDate, 1)

      const transactions = await ctx.db.transaction.findMany({
        where: {
          userId: ctx.user.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          ...(input.includeIncome ? {} : { amount: { lt: 0 } })
        },
        include: {
          category: true,
        }
      })

      // Group by category
      const categoryData = new Map()
      let totalAmount = 0

      transactions.forEach(transaction => {
        const categoryId = transaction.categoryId
        const categoryName = transaction.category?.name || 'Uncategorized'
        const amount = Math.abs(transaction.amount)
        
        if (!categoryData.has(categoryId)) {
          categoryData.set(categoryId, {
            categoryId,
            categoryName,
            amount: 0,
            transactionCount: 0,
            averageAmount: 0,
            color: transaction.category?.color || '#8B5CF6',
            percentage: 0,
          })
        }
        
        const data = categoryData.get(categoryId)
        data.amount += amount
        data.transactionCount++
        totalAmount += amount
      })

      // Calculate percentages and averages
      const result = Array.from(categoryData.values()).map(category => ({
        ...category,
        percentage: totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0,
        averageAmount: category.transactionCount > 0 ? category.amount / category.transactionCount : 0,
      }))

      return {
        categories: result.sort((a, b) => b.amount - a.amount),
        totalAmount,
        periodStart: startDate,
        periodEnd: endDate,
      }
    }),

  // Get budget performance analytics
  getBudgetPerformance: protectedProcedure
    .input(z.object({
      budgetId: z.string().optional(),
      months: z.number().min(1).max(12).default(3),
    }))
    .query(async ({ ctx, input }) => {
      const endDate = new Date()
      const startDate = subMonths(endDate, input.months)

      let budgetWhere: any = { userId: ctx.user.id }
      if (input.budgetId) {
        budgetWhere.id = input.budgetId
      } else {
        // Get most recent active budget
        budgetWhere.isActive = true
      }

      const budgets = await ctx.db.budget.findMany({
        where: {
          ...budgetWhere,
          startDate: { gte: startDate }
        },
        include: {
          items: {
            include: {
              category: true,
            }
          }
        },
        orderBy: { startDate: 'desc' }
      })

      const performanceData = await Promise.all(
        budgets.map(async (budget) => {
          // Calculate actual spending for this budget period
          const categorySpending = await ctx.db.transaction.groupBy({
            by: ['categoryId'],
            where: {
              userId: ctx.user.id,
              date: {
                gte: budget.startDate,
                lte: budget.endDate,
              }
            },
            _sum: { amount: true }
          })

          const spendingMap = new Map(
            categorySpending.map(s => [s.categoryId, Math.abs(s._sum.amount || 0)])
          )

                     const categoryPerformance = budget.items.map(item => {
             const spent = spendingMap.get(item.categoryId) || 0
             const variance = spent - item.amount
             const variancePercentage = item.amount > 0 ? (variance / item.amount) * 100 : 0

             return {
               categoryId: item.categoryId,
               categoryName: item.category.name,
               budgeted: item.amount,
               spent,
               variance,
               variancePercentage,
               isOverBudget: spent > item.amount,
               type: (item as any).type,
             }
           })

          const totalBudgeted = budget.items.reduce((sum, item) => sum + item.amount, 0)
          const totalSpent = categoryPerformance.reduce((sum, item) => sum + item.spent, 0)
          const overallVariance = totalSpent - totalBudgeted
          const overallVariancePercentage = totalBudgeted > 0 ? (overallVariance / totalBudgeted) * 100 : 0

          return {
            budgetId: budget.id,
            budgetName: budget.name,
            period: format(budget.startDate, 'MMM yyyy'),
            startDate: budget.startDate,
            endDate: budget.endDate,
            totalBudgeted,
            totalSpent,
            overallVariance,
            overallVariancePercentage,
            categoryPerformance,
            isOverBudget: totalSpent > totalBudgeted,
          }
        })
      )

      return performanceData.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    }),

  // Get financial health score
  getFinancialHealth: protectedProcedure
    .query(async ({ ctx }) => {
      const endDate = new Date()
      const startDate = subMonths(endDate, 3) // Last 3 months

      const [
        transactions,
        budgets,
        goals,
        accounts
      ] = await Promise.all([
        ctx.db.transaction.findMany({
          where: {
            userId: ctx.user.id,
            date: { gte: startDate }
          }
        }),
        ctx.db.budget.findMany({
          where: {
            userId: ctx.user.id,
            isActive: true
          },
          include: { items: true }
        }),
        ctx.db.goal.findMany({
          where: { userId: ctx.user.id }
        }),
        ctx.db.account.findMany({
          where: { userId: ctx.user.id }
        })
      ])

      // Calculate metrics
      const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
      const totalExpenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

      // Budget adherence score
      let budgetScore = 0
      if (budgets.length > 0) {
        const activeBudget = budgets[0]
        const budgetedAmount = activeBudget.items.reduce((sum, item) => sum + item.amount, 0)
        const adherenceRate = budgetedAmount > 0 ? Math.max(0, 100 - ((totalExpenses - budgetedAmount) / budgetedAmount) * 100) : 0
        budgetScore = Math.min(100, adherenceRate)
      }

      // Goal progress score
      const activeGoals = goals.filter(g => !g.isCompleted)
      let goalScore = 0
      if (activeGoals.length > 0) {
        const avgProgress = activeGoals.reduce((sum, goal) => {
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
          return sum + Math.min(100, progress)
        }, 0) / activeGoals.length
        goalScore = avgProgress
      }

      // Emergency fund score (3-6 months of expenses is ideal)
      const monthlyExpenses = totalExpenses / 3
      const emergencyFund = accounts.reduce((sum, account) => {
        // This would need account balance calculation in a real implementation
        return sum + 0 // Placeholder since we don't store account balances
      }, 0)
      const emergencyScore = monthlyExpenses > 0 ? Math.min(100, (emergencyFund / (monthlyExpenses * 3)) * 100) : 0

      // Overall health score (weighted average)
      const weights = {
        savings: 0.3,
        budget: 0.3,
        goals: 0.2,
        emergency: 0.2
      }

      const overallScore = (
        savingsRate * weights.savings +
        budgetScore * weights.budget +
        goalScore * weights.goals +
        emergencyScore * weights.emergency
      )

      return {
        overallScore: Math.round(overallScore),
        savingsRate: Math.round(savingsRate),
        budgetAdherence: Math.round(budgetScore),
        goalProgress: Math.round(goalScore),
        emergencyFund: Math.round(emergencyScore),
        metrics: {
          totalIncome,
          totalExpenses,
          netIncome: totalIncome - totalExpenses,
          monthlyExpenses,
          activeGoals: activeGoals.length,
          completedGoals: goals.filter(g => g.isCompleted).length,
          activeBudgets: budgets.length,
        },
        recommendations: generateRecommendations({
          savingsRate,
          budgetScore,
          goalScore,
          emergencyScore,
          activeGoals: activeGoals.length,
          hasActiveBudget: budgets.length > 0,
        })
      }
    }),

  // Get monthly comparison data
  getMonthlyComparison: protectedProcedure
    .input(z.object({
      currentMonth: z.string().optional(),
      compareToMonth: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const currentDate = input.currentMonth ? parseISO(input.currentMonth) : new Date()
      const compareDate = input.compareToMonth 
        ? parseISO(input.compareToMonth) 
        : subMonths(currentDate, 1)

      const [currentTransactions, compareTransactions] = await Promise.all([
        ctx.db.transaction.findMany({
          where: {
            userId: ctx.user.id,
            date: {
              gte: startOfMonth(currentDate),
              lte: endOfMonth(currentDate),
            }
          },
          include: { category: true }
        }),
        ctx.db.transaction.findMany({
          where: {
            userId: ctx.user.id,
            date: {
              gte: startOfMonth(compareDate),
              lte: endOfMonth(compareDate),
            }
          },
          include: { category: true }
        })
      ])

      const calculatePeriodStats = (transactions: any[]) => {
        const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
        const expenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
        
        const categoryBreakdown = new Map()
        transactions.forEach(t => {
          const categoryName = t.category?.name || 'Uncategorized'
          const amount = Math.abs(t.amount)
          categoryBreakdown.set(categoryName, (categoryBreakdown.get(categoryName) || 0) + amount)
        })

        return {
          income,
          expenses,
          net: income - expenses,
          transactionCount: transactions.length,
          topCategories: Array.from(categoryBreakdown.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
        }
      }

      const current = calculatePeriodStats(currentTransactions)
      const previous = calculatePeriodStats(compareTransactions)

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }

      return {
        current: {
          ...current,
          period: format(currentDate, 'MMMM yyyy')
        },
        previous: {
          ...previous,
          period: format(compareDate, 'MMMM yyyy')
        },
        changes: {
          income: calculateChange(current.income, previous.income),
          expenses: calculateChange(current.expenses, previous.expenses),
          net: calculateChange(current.net, previous.net),
          transactionCount: calculateChange(current.transactionCount, previous.transactionCount),
        }
      }
    }),

  // Get goal analytics
  getGoalAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      const goals = await ctx.db.goal.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' }
      })

      const now = new Date()
      
      const analytics = goals.map(goal => {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
        const daysToTarget = goal.targetDate ? Math.ceil((goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
        const isOverdue = goal.targetDate ? isAfter(now, goal.targetDate) && !goal.isCompleted : false
        const monthsToTarget = daysToTarget > 0 ? Math.ceil(daysToTarget / 30) : 0
        const monthlyNeeded = goal.targetDate && monthsToTarget > 0 
          ? (goal.targetAmount - goal.currentAmount) / monthsToTarget 
          : 0

        return {
          ...goal,
          progress,
          daysToTarget,
          monthsToTarget,
          monthlyNeeded,
          isOverdue,
          isOnTrack: progress >= ((now.getTime() - goal.createdAt.getTime()) / (goal.targetDate?.getTime() - goal.createdAt.getTime())) * 100,
          remainingAmount: goal.targetAmount - goal.currentAmount,
        }
      })

      const byType = analytics.reduce((acc, goal) => {
        acc[goal.type] = (acc[goal.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const stats = {
        total: goals.length,
        completed: goals.filter(g => g.isCompleted).length,
        overdue: analytics.filter(g => g.isOverdue).length,
        onTrack: analytics.filter(g => g.isOnTrack && !g.isCompleted).length,
        totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0),
        totalCurrent: goals.reduce((sum, g) => sum + g.currentAmount, 0),
        byType,
      }

      return {
        goals: analytics,
        stats,
        averageProgress: stats.total > 0 ? (stats.totalCurrent / stats.totalTarget) * 100 : 0,
      }
    }),
})

function generateRecommendations(metrics: {
  savingsRate: number
  budgetScore: number
  goalScore: number
  emergencyScore: number
  activeGoals: number
  hasActiveBudget: boolean
}) {
  const recommendations = []

  if (metrics.savingsRate < 20) {
    recommendations.push({
      type: 'savings',
      priority: 'high',
      title: 'Increase Savings Rate',
      description: 'Aim to save at least 20% of your income for long-term financial health.',
    })
  }

  if (!metrics.hasActiveBudget) {
    recommendations.push({
      type: 'budget',
      priority: 'high',
      title: 'Create a Budget',
      description: 'Setting up a budget will help you track and control your spending.',
    })
  } else if (metrics.budgetScore < 70) {
    recommendations.push({
      type: 'budget',
      priority: 'medium',
      title: 'Improve Budget Adherence',
      description: 'Review your budget categories and adjust amounts to better match your spending patterns.',
    })
  }

  if (metrics.activeGoals === 0) {
    recommendations.push({
      type: 'goals',
      priority: 'medium',
      title: 'Set Financial Goals',
      description: 'Create specific financial goals to stay motivated and track your progress.',
    })
  }

  if (metrics.emergencyScore < 50) {
    recommendations.push({
      type: 'emergency',
      priority: 'high',
      title: 'Build Emergency Fund',
      description: 'Aim to save 3-6 months of expenses for unexpected situations.',
    })
  }

  return recommendations
} 