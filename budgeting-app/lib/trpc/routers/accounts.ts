import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { AccountType } from '@prisma/client'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'

// Input validation schemas
const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.nativeEnum(AccountType),
  institution: z.string().optional(),
  lastFour: z.string().length(4).optional(),
})

const updateAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AccountType).optional(),
  institution: z.string().optional(),
  lastFour: z.string().length(4).optional(),
  isActive: z.boolean().optional(),
})

export const accountsRouter = router({
  // Get all accounts for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const accounts = await ctx.db.account.findMany({
        where: { userId: ctx.user.id },
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      return accounts
    }),

  // Get a single account by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        },
        include: {
          _count: {
            select: { transactions: true }
          },
          transactions: {
            take: 10,
            orderBy: { date: 'desc' },
            include: {
              category: true
            }
          }
        }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      return account
    }),

  // Get detailed account information with related data
  getDetailedById: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      period: z.enum(['month', '3months', '6months', 'year', 'all']).default('month')
    }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        },
        include: {
          _count: {
            select: { transactions: true }
          }
        }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      // Calculate date range based on period
      let startDate: Date
      let endDate = new Date()
      
      switch (input.period) {
        case 'month':
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
          break
        case '3months':
          startDate = subMonths(new Date(), 3)
          break
        case '6months':
          startDate = subMonths(new Date(), 6)
          break
        case 'year':
          startDate = startOfYear(new Date())
          endDate = endOfYear(new Date())
          break
        case 'all':
        default:
          startDate = new Date(2020, 0, 1) // Arbitrary old date
          break
      }

      // Get recent transactions
      const recentTransactions = await ctx.db.transaction.findMany({
        where: { 
          accountId: input.id,
          ...(input.period !== 'all' && {
            date: {
              gte: startDate,
              lte: endDate
            }
          })
        },
        include: { 
          category: true
        },
        orderBy: { date: 'desc' },
        take: 20
      })

      // Get uploaded files for this account
      // Include files directly linked AND files from multi-account statements (via statements)
      const directFiles = await ctx.db.uploadedFile.findMany({
        where: { accountId: input.id } as any,
        orderBy: { createdAt: 'desc' }
      })

      // Find additional files from statements that reference this account
      const statementsForAccount = await ctx.db.statement.findMany({
        where: {
          accountSections: {
            some: {
              accountId: input.id
            }
          }
        },
        select: {
          uploadedFileId: true
        }
      })

      const statementFileIds = statementsForAccount
        .map(stmt => stmt.uploadedFileId)
        .filter(id => id !== null)

      let additionalFiles: any[] = []
      if (statementFileIds.length > 0) {
        const allStatementFiles = await ctx.db.uploadedFile.findMany({
          where: {
            id: { in: statementFileIds }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        // Filter out files that are already in directFiles
        const directFileIds = new Set(directFiles.map(f => f.id))
        additionalFiles = allStatementFiles.filter(f => !directFileIds.has(f.id))
      }

      // Combine and deduplicate files
      const uploadedFiles = [...directFiles, ...additionalFiles]

      // Get financial statistics for the selected period
      const periodTransactions = await ctx.db.transaction.findMany({
        where: {
          accountId: input.id,
          ...(input.period !== 'all' && {
            date: {
              gte: startDate,
              lte: endDate
            }
          })
        },
        include: {
          category: true
        }
      })

      // Calculate period statistics
      let totalIncome = 0
      let totalExpenses = 0
      let transfersIn = 0
      let transfersOut = 0
      let interestIncome = 0
      
      for (const transaction of periodTransactions) {
        const amount = Math.abs(transaction.amount)
        const categoryName = transaction.category?.name?.toLowerCase() || ''
        
        if (transaction.amount > 0) {
          // Positive amounts (income)
          if (categoryName.includes('transfer') && categoryName.includes('in')) {
            transfersIn += amount
          } else if (categoryName.includes('interest')) {
            interestIncome += amount
          } else {
            totalIncome += amount
          }
        } else {
          // Negative amounts (expenses)
          if (categoryName.includes('transfer') && categoryName.includes('out')) {
            transfersOut += amount
          } else {
            totalExpenses += amount
          }
        }
      }

      // Get monthly transaction summary for trend analysis
      const monthlyData = await ctx.db.transaction.groupBy({
        by: ['date'],
        where: {
          accountId: input.id,
          date: {
            gte: input.period === 'all' ? new Date(2020, 0, 1) : subMonths(new Date(), 12)
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          date: 'asc'
        }
      })

      // Process monthly data into month buckets
      const monthlyStats = monthlyData.reduce((acc: any[], item) => {
        const month = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
        const existing = acc.find(entry => entry.month === month)
        
        if (existing) {
          existing.amount += item._sum.amount || 0
          existing.transactions += item._count.id
        } else {
          acc.push({
            month,
            amount: item._sum.amount || 0,
            transactions: item._count.id
          })
        }
        
        return acc
      }, [])

      // Calculate expense breakdown by category
      const expensesByCategory = await ctx.db.transaction.groupBy({
        by: ['categoryId'],
        where: {
          accountId: input.id,
          amount: { lt: 0 }, // Only expenses
          ...(input.period !== 'all' && {
            date: {
              gte: startDate,
              lte: endDate
            }
          })
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      })

      // Get category details for expense breakdown
      const categoryIds = expensesByCategory.map(item => item.categoryId).filter((id): id is string => id !== null)
      const categories = await ctx.db.category.findMany({
        where: {
          id: { in: categoryIds }
        }
      })

      const expenseBreakdown = expensesByCategory.map(item => {
        const category = categories.find(cat => cat.id === item.categoryId)
        return {
          categoryId: item.categoryId,
          categoryName: category?.name || 'Unknown',
          categoryIcon: category?.icon || '📊',
          categoryColor: category?.color || '#6B7280',
          amount: Math.abs(item._sum.amount || 0),
          transactions: item._count.id
        }
      }).sort((a, b) => b.amount - a.amount)

      return {
        account,
        recentTransactions,
        uploadedFiles,
        statistics: {
          period: input.period,
          startDate: input.period !== 'all' ? startDate : null,
          endDate: input.period !== 'all' ? endDate : null,
          totalIncome,
          totalExpenses,
          transfersIn,
          transfersOut,
          interestIncome,
          netChange: totalIncome + interestIncome + transfersIn - totalExpenses - transfersOut,
          transactionCount: periodTransactions.length,
          averageTransaction: periodTransactions.length > 0 
            ? Math.abs(periodTransactions.reduce((sum, t) => sum + t.amount, 0)) / periodTransactions.length 
            : 0
        },
        monthlyStats,
        expenseBreakdown
      }
    }),

  // Create a new account
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN']),
      institution: z.string().optional(),
      lastFour: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.create({
        data: {
          ...input,
          userId: ctx.user.id
        }
      })
      return account
    }),

  // Update an account
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN']).optional(),
      institution: z.string().optional(),
      lastFour: z.string().optional(),
      isActive: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const account = await ctx.db.account.update({
        where: { 
          id,
          userId: ctx.user.id 
        },
        data
      })
      return account
    }),

  // Delete an account
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete by setting isActive to false
      const account = await ctx.db.account.update({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        },
        data: { isActive: false }
      })
      return account
    }),

  // Get account balance (sum of all transactions)
  getBalance: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      const result = await ctx.db.transaction.aggregate({
        where: { accountId: input.id },
        _sum: { amount: true },
        _count: true,
      })

      return {
        balance: result._sum.amount || 0,
        transactionCount: result._count
      }
    }),

  // Get account transaction summary
  getSummary: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      const whereClause: any = { accountId: input.id }
      
      if (input.startDate || input.endDate) {
        whereClause.date = {}
        if (input.startDate) whereClause.date.gte = input.startDate
        if (input.endDate) whereClause.date.lte = input.endDate
      }

      const [income, expenses, totalTransactions] = await Promise.all([
        ctx.db.transaction.aggregate({
          where: { ...whereClause, amount: { gt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
        ctx.db.transaction.aggregate({
          where: { ...whereClause, amount: { lt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
        ctx.db.transaction.count({
          where: whereClause,
        })
      ])

      return {
        totalIncome: income._sum.amount || 0,
        totalExpenses: Math.abs(expenses._sum.amount || 0),
        netAmount: (income._sum.amount || 0) + (expenses._sum.amount || 0),
        incomeTransactions: income._count,
        expenseTransactions: expenses._count,
        totalTransactions,
      }
    }),

  // Update account balance manually
  updateBalance: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      balance: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      return await ctx.db.account.update({
        where: { id: input.id },
        data: { balance: input.balance } as any,
      })
    }),

  // Recalculate balance from transactions
  recalculateBalance: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.db.account.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      // Calculate balance from transactions
      const result = await ctx.db.transaction.aggregate({
        where: { accountId: input.id },
        _sum: { amount: true },
      })

      const calculatedBalance = result._sum.amount || 0

      // Update the account balance
      return await ctx.db.account.update({
        where: { id: input.id },
        data: { balance: calculatedBalance } as any,
      })
    }),

  // Recalculate balances for all user accounts
  recalculateAllBalances: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Get all user accounts
      const accounts = await ctx.db.account.findMany({
        where: { userId: ctx.user.id }
      })

      // Update each account balance
      for (const account of accounts) {
        const result = await ctx.db.transaction.aggregate({
          where: { accountId: account.id },
          _sum: { amount: true },
        })

        const calculatedBalance = result._sum.amount || 0

        await ctx.db.account.update({
          where: { id: account.id },
          data: { balance: calculatedBalance } as any,
        })
      }

      return { message: 'All account balances recalculated successfully' }
    }),

  // Clear all user data (accounts, transactions, files, budgets, goals)
  clearAllData: protectedProcedure
    .mutation(async ({ ctx }) => {
      let deletedCounts = {
        transactions: 0,
        uploadedFiles: 0,
        budgetItems: 0,
        budgets: 0,
        goals: 0,
        accounts: 0
      }

      try {
        // Delete in the correct order to respect foreign key constraints
        
        // 1. Delete all transactions first (referenced by accounts)
        const transactionsResult = await ctx.db.transaction.deleteMany({
          where: { userId: ctx.user.id }
        })
        deletedCounts.transactions = transactionsResult.count

        // 2. Delete all uploaded files that belong to user's accounts
        // First get all user account IDs
        const userAccounts = await ctx.db.account.findMany({
          where: { userId: ctx.user.id },
          select: { id: true }
        })
        const accountIds = userAccounts.map(account => account.id)
        
        // Delete files linked to user's accounts
        const filesResult = await ctx.db.uploadedFile.deleteMany({
          where: { 
            accountId: { in: accountIds }
          } as any
        })
        deletedCounts.uploadedFiles = filesResult.count

        // Also delete any orphaned files (no accountId) - these might be from failed uploads
        const orphanedFilesResult = await ctx.db.uploadedFile.deleteMany({
          where: { 
            accountId: null
          } as any
        })
        deletedCounts.uploadedFiles += orphanedFilesResult.count

        // 3. Delete budget items first (they reference budgets and categories)
        const budgetItemsResult = await ctx.db.budgetItem.deleteMany({
          where: { 
            budget: { userId: ctx.user.id }
          }
        })
        deletedCounts.budgetItems = budgetItemsResult.count

        // 4. Delete all budgets
        const budgetsResult = await ctx.db.budget.deleteMany({
          where: { userId: ctx.user.id }
        })
        deletedCounts.budgets = budgetsResult.count

        // 5. Delete all goals
        const goalsResult = await ctx.db.goal.deleteMany({
          where: { userId: ctx.user.id }
        })
        deletedCounts.goals = goalsResult.count

        // 6. Finally delete all accounts
        const accountsResult = await ctx.db.account.deleteMany({
          where: { userId: ctx.user.id }
        })
        deletedCounts.accounts = accountsResult.count

        return {
          success: true,
          deletedCounts,
          message: `Successfully deleted all data: ${deletedCounts.accounts} accounts, ${deletedCounts.transactions} transactions, ${deletedCounts.uploadedFiles} files, ${deletedCounts.budgetItems} budget items, ${deletedCounts.budgets} budgets, ${deletedCounts.goals} goals`
        }
      } catch (error) {
        console.error('Error clearing all data:', error)
        throw new Error(`Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
}) 