import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

// Input validation schemas
const createTransactionSchema = z.object({
  accountId: z.string(),
  date: z.coerce.date(),
  amount: z.number(),
  description: z.string().min(1, 'Description is required'),
  categoryId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(), // For multiple categories
})

const updateTransactionSchema = z.object({
  id: z.string(),
  date: z.coerce.date().optional(),
  amount: z.number().optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(), // For multiple categories
})

const updateTransactionCategoriesSchema = z.object({
  transactionId: z.string(),
  categoryIds: z.array(z.string()),
})

const transactionFiltersSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

const bulkUpdateCategoriesSchema = z.object({
  transactionIds: z.array(z.string()),
  categoryId: z.string().optional(),
})

export const transactionsRouter = router({
  // Get transactions with filtering and pagination
  getAll: protectedProcedure
    .input(transactionFiltersSchema)
    .query(async ({ ctx, input }) => {
      const whereClause: any = { userId: ctx.user.id }

      // Apply filters
      if (input.accountId) whereClause.accountId = input.accountId
      if (input.categoryId) whereClause.categoryId = input.categoryId
      
      if (input.startDate || input.endDate) {
        whereClause.date = {}
        if (input.startDate) whereClause.date.gte = input.startDate
        if (input.endDate) whereClause.date.lte = input.endDate
      }

      if (input.minAmount !== undefined || input.maxAmount !== undefined) {
        whereClause.amount = {}
        if (input.minAmount !== undefined) whereClause.amount.gte = input.minAmount
        if (input.maxAmount !== undefined) whereClause.amount.lte = input.maxAmount
      }

      if (input.search) {
        whereClause.description = {
          contains: input.search
        }
      }

      const [transactions, totalCount] = await Promise.all([
        ctx.db.transaction.findMany({
          where: whereClause,
          include: {
            account: true,
            category: true,
            transactionCategories: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.transaction.count({ where: whereClause })
      ])

      return {
        transactions,
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      }
    }),

  // Get a single transaction by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.transaction.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        },
        include: {
          account: true,
          category: true,
          transactionCategories: {
            include: {
              category: true,
            },
          },
        }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      return transaction
    }),

  // Create a new transaction
  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const account = await ctx.db.account.findFirst({
        where: { id: input.accountId, userId: ctx.user.id }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      const { categoryIds, ...transactionData } = input

      const transaction = await ctx.db.transaction.create({
        data: {
          ...transactionData,
          userId: ctx.user.id,
        },
        include: {
          account: true,
          category: true,
          transactionCategories: {
            include: {
              category: true,
            },
          },
        }
      })

      // Add multiple categories if provided
      if (categoryIds && categoryIds.length > 0) {
        await ctx.db.transactionCategory.createMany({
          data: categoryIds.map(categoryId => ({
            transactionId: transaction.id,
            categoryId,
          })),
        })

        // Refetch with categories
        return await ctx.db.transaction.findFirst({
          where: { id: transaction.id },
          include: {
            account: true,
            category: true,
            transactionCategories: {
              include: {
                category: true,
              },
            },
          },
        })
      }

      return transaction
    }),

  // Update a transaction
  update: protectedProcedure
    .input(updateTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, categoryIds, ...data } = input

      // Verify transaction belongs to user
      const transaction = await ctx.db.transaction.findFirst({
        where: { id, userId: ctx.user.id }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      const updatedTransaction = await ctx.db.transaction.update({
        where: { id },
        data,
        include: {
          account: true,
          category: true,
          transactionCategories: {
            include: {
              category: true,
            },
          },
        }
      })

      // Update multiple categories if provided
      if (categoryIds !== undefined) {
        // Remove existing categories
        await ctx.db.transactionCategory.deleteMany({
          where: { transactionId: id },
        })

        // Add new categories
        if (categoryIds.length > 0) {
          await ctx.db.transactionCategory.createMany({
            data: categoryIds.map(categoryId => ({
              transactionId: id,
              categoryId,
            })),
          })
        }

        // Refetch with updated categories
        return await ctx.db.transaction.findFirst({
          where: { id },
          include: {
            account: true,
            category: true,
            transactionCategories: {
              include: {
                category: true,
              },
            },
          },
        })
      }

      return updatedTransaction
    }),

  // Update categories for a specific transaction
  updateCategories: protectedProcedure
    .input(updateTransactionCategoriesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to user
      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.transactionId, userId: ctx.user.id }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // Remove existing categories
      await ctx.db.transactionCategory.deleteMany({
        where: { transactionId: input.transactionId },
      })

      // Add new categories
      if (input.categoryIds.length > 0) {
        await ctx.db.transactionCategory.createMany({
          data: input.categoryIds.map(categoryId => ({
            transactionId: input.transactionId,
            categoryId,
          })),
        })
      }

      // Return updated transaction
      return await ctx.db.transaction.findFirst({
        where: { id: input.transactionId },
        include: {
          account: true,
          category: true,
          transactionCategories: {
            include: {
              category: true,
            },
          },
        },
      })
    }),

  // Delete a transaction
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to user
      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      return await ctx.db.transaction.delete({
        where: { id: input.id },
      })
    }),

  // Delete all transactions for the current user
  deleteAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.db.transaction.deleteMany({
        where: { userId: ctx.user.id }
      })

      return {
        deletedCount: result.count,
        message: `Successfully deleted ${result.count} transactions`
      }
    }),

  // Bulk update categories for multiple transactions
  bulkUpdateCategories: protectedProcedure
    .input(bulkUpdateCategoriesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify all transactions belong to user
      const transactionCount = await ctx.db.transaction.count({
        where: {
          id: { in: input.transactionIds },
          userId: ctx.user.id
        }
      })

      if (transactionCount !== input.transactionIds.length) {
        throw new Error('Some transactions not found or do not belong to user')
      }

      return await ctx.db.transaction.updateMany({
        where: { id: { in: input.transactionIds } },
        data: { categoryId: input.categoryId },
      })
    }),

  // Get transaction statistics
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      accountId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = { userId: ctx.user.id }
      
      if (input.accountId) whereClause.accountId = input.accountId
      
      if (input.startDate || input.endDate) {
        whereClause.date = {}
        if (input.startDate) whereClause.date.gte = input.startDate
        if (input.endDate) whereClause.date.lte = input.endDate
      }

      const [income, expenses, byCategory] = await Promise.all([
        ctx.db.transaction.aggregate({
          where: { ...whereClause, amount: { gt: 0 } },
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true },
        }),
        ctx.db.transaction.aggregate({
          where: { ...whereClause, amount: { lt: 0 } },
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true },
        }),
        ctx.db.transaction.groupBy({
          by: ['categoryId'],
          where: whereClause,
          _sum: { amount: true },
          _count: true,
        })
      ])

      // Get category details for grouping
      const categoryIds = byCategory.map(g => g.categoryId).filter(Boolean) as string[]
      const categories = await ctx.db.category.findMany({
        where: { id: { in: categoryIds } }
      })

      const categoryMap = new Map(categories.map(c => [c.id, c]))

      return {
        income: {
          total: income._sum.amount || 0,
          count: income._count,
          average: income._avg.amount || 0,
        },
        expenses: {
          total: Math.abs(expenses._sum.amount || 0),
          count: expenses._count,
          average: Math.abs(expenses._avg.amount || 0),
        },
        netAmount: (income._sum.amount || 0) + (expenses._sum.amount || 0),
        byCategory: byCategory.map(group => ({
          categoryId: group.categoryId,
          category: group.categoryId ? categoryMap.get(group.categoryId) : null,
          total: group._sum.amount || 0,
          count: group._count,
        })),
      }
    }),

  // Get recent transactions for dashboard
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.transaction.findMany({
        where: { userId: ctx.user.id },
        include: {
          account: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })
    }),
}) 