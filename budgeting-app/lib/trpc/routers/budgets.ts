import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { BudgetPeriod } from '@prisma/client'

// Input validation schemas
const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  period: z.nativeEnum(BudgetPeriod),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
})

const updateBudgetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  period: z.nativeEnum(BudgetPeriod).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
})

const budgetItemSchema = z.object({
  categoryId: z.string(),
  amount: z.number().min(0, 'Budget amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE'),
})

const updateBudgetItemsSchema = z.object({
  budgetId: z.string(),
  items: z.array(budgetItemSchema),
})

export const budgetsRouter = router({
  // Get all budgets for the authenticated user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.budget.findMany({
      where: { userId: ctx.user.id },
      include: {
        items: {
          include: {
            category: true,
          }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Get active budgets
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.budget.findMany({
      where: { 
        userId: ctx.user.id,
        isActive: true 
      },
      include: {
        items: {
          include: {
            category: true,
          }
        }
      },
      orderBy: { startDate: 'desc' },
    })
  }),

  // Get a single budget by ID with progress
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        },
        include: {
          items: {
            include: {
              category: true,
            }
          }
        }
      })

      if (!budget) {
        throw new Error('Budget not found')
      }

      // Calculate actual spending for each category
      const itemsWithProgress = await Promise.all(
        budget.items.map(async (item) => {
          const spent = await ctx.db.transaction.aggregate({
            where: {
              userId: ctx.user.id,
              categoryId: item.categoryId,
              date: {
                gte: budget.startDate,
                lte: budget.endDate,
              }
            },
            _sum: { amount: true }
          })

          const spentAmount = Math.abs(spent._sum.amount || 0)
          const progress = item.amount > 0 ? (spentAmount / item.amount) * 100 : 0

          return {
            ...item,
            spent: spentAmount,
            remaining: Math.max(0, item.amount - spentAmount),
            progress,
            isOverBudget: spentAmount > item.amount,
          }
        })
      )

      // Calculate totals based on income vs expense types
      const totalIncome = budget.items
        .filter(item => item.type === 'INCOME')
        .reduce((sum, item) => sum + item.amount, 0)
      
      const totalExpenses = budget.items
        .filter(item => item.type === 'EXPENSE')
        .reduce((sum, item) => sum + item.amount, 0)
      
      const netBudget = totalIncome - totalExpenses
      
      // Calculate actual spending (income adds to available funds, expenses reduce them)
      const actualIncome = itemsWithProgress
        .filter(item => item.type === 'INCOME')
        .reduce((sum, item) => sum + item.spent, 0)
      
      const actualExpenses = itemsWithProgress
        .filter(item => item.type === 'EXPENSE')
        .reduce((sum, item) => sum + item.spent, 0)
      
      const netSpent = actualExpenses - actualIncome
      const netRemaining = netBudget - netSpent

      return {
        ...budget,
        items: itemsWithProgress,
        totalIncome,
        totalExpenses,
        netBudget,
        actualIncome,
        actualExpenses,
        netSpent,
        netRemaining,
        // Keep legacy fields for compatibility but with correct calculations
        totalBudgeted: Math.abs(netBudget),
        totalSpent: Math.abs(netSpent),
        totalRemaining: netRemaining,
        overallProgress: Math.abs(netBudget) > 0 ? (Math.abs(netSpent) / Math.abs(netBudget)) * 100 : 0,
        isOverBudget: netSpent > netBudget,
      }
    }),

  // Create a new budget
  create: protectedProcedure
    .input(createBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate date range
      if (input.endDate <= input.startDate) {
        throw new Error('End date must be after start date')
      }

      return await ctx.db.budget.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
        include: {
          items: {
            include: {
              category: true,
            }
          }
        }
      })
    }),

  // Update a budget
  update: protectedProcedure
    .input(updateBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify budget belongs to user
      const budget = await ctx.db.budget.findFirst({
        where: { id, userId: ctx.user.id }
      })

      if (!budget) {
        throw new Error('Budget not found')
      }

      // Validate date range if both dates provided
      if (data.startDate && data.endDate && data.endDate <= data.startDate) {
        throw new Error('End date must be after start date')
      }

      return await ctx.db.budget.update({
        where: { id },
        data,
        include: {
          items: {
            include: {
              category: true,
            }
          }
        }
      })
    }),

  // Delete a budget
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify budget belongs to user
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!budget) {
        throw new Error('Budget not found')
      }

      return await ctx.db.budget.delete({
        where: { id: input.id },
      })
    }),

  // Update budget items (categories and amounts)
  updateItems: protectedProcedure
    .input(updateBudgetItemsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify budget belongs to user
      const budget = await ctx.db.budget.findFirst({
        where: { id: input.budgetId, userId: ctx.user.id }
      })

      if (!budget) {
        throw new Error('Budget not found')
      }

      // Verify all categories exist
      const categoryIds = input.items.map(item => item.categoryId)
      const categories = await ctx.db.category.findMany({
        where: { id: { in: categoryIds } }
      })

      if (categories.length !== categoryIds.length) {
        throw new Error('Some categories not found')
      }

      // Use transaction to update all items atomically
      return await ctx.db.$transaction(async (prisma) => {
        // Delete existing items
        await prisma.budgetItem.deleteMany({
          where: { budgetId: input.budgetId }
        })

        // Create new items
        await prisma.budgetItem.createMany({
          data: input.items.map(item => ({
            budgetId: input.budgetId,
            categoryId: item.categoryId,
            amount: item.amount,
            type: item.type,
          }))
        })

        // Return updated budget
        return await prisma.budget.findUnique({
          where: { id: input.budgetId },
          include: {
            items: {
              include: {
                category: true,
              }
            }
          }
        })
      })
    }),

  // Get budget progress summary
  getProgress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const budget = await ctx.db.budget.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        },
        include: {
          items: {
            include: {
              category: true,
            }
          }
        }
      })

      if (!budget) {
        throw new Error('Budget not found')
      }

      // Get spending by category for this budget period
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

      const itemProgress = budget.items.map(item => {
        const spent = spendingMap.get(item.categoryId) || 0
        const progress = item.amount > 0 ? (spent / item.amount) * 100 : 0

        return {
          categoryId: item.categoryId,
          category: item.category,
          budgeted: item.amount,
          spent,
          remaining: Math.max(0, item.amount - spent),
          progress,
          isOverBudget: spent > item.amount,
        }
      })

      const totalBudgeted = budget.items.reduce((sum, item) => sum + item.amount, 0)
      const totalSpent = itemProgress.reduce((sum, item) => sum + item.spent, 0)

      return {
        budgetId: budget.id,
        budgetName: budget.name,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        totalBudgeted,
        totalSpent,
        totalRemaining: Math.max(0, totalBudgeted - totalSpent),
        overallProgress: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
        isOverBudget: totalSpent > totalBudgeted,
        items: itemProgress,
      }
    }),

  // Clone a budget (useful for creating similar budgets for new periods)
  clone: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify original budget belongs to user
      const originalBudget = await ctx.db.budget.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { items: true }
      })

      if (!originalBudget) {
        throw new Error('Budget not found')
      }

      return await ctx.db.budget.create({
        data: {
          name: input.name,
          period: originalBudget.period,
          startDate: input.startDate,
          endDate: input.endDate,
          userId: ctx.user.id,
          items: {
            create: originalBudget.items.map(item => ({
              categoryId: item.categoryId,
              amount: item.amount,
            }))
          }
        },
        include: {
          items: {
            include: {
              category: true,
            }
          }
        }
      })
    }),
}) 