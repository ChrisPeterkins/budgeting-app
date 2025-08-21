import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'

// Input validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
})

const updateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
})

export const categoriesRouter = router({
  // Get all categories (system + custom, hierarchical)
  getAll: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.category.findMany({
      include: {
        children: {
          include: {
            _count: {
              select: { transactions: true }
            }
          }
        },
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { name: 'asc' },
    })

    // Organize into hierarchy
    const parentCategories = categories.filter(c => !c.parentId)
    const childCategories = categories.filter(c => c.parentId)

    return parentCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parentId === parent.id)
    }))
  }),

  // Get categories organized for dropdowns/selects
  getForSelect: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        parent: true,
      }
    })

    return categories.map(category => ({
      id: category.id,
      name: category.parent 
        ? `${category.parent.name} > ${category.name}`
        : category.name,
      isParent: !category.parentId,
      parentId: category.parentId,
      icon: category.icon,
      color: category.color,
    }))
  }),

  // Get a single category by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        include: {
          parent: true,
          children: true,
          _count: {
            select: { transactions: true }
          }
        }
      })

      if (!category) {
        throw new Error('Category not found')
      }

      return category
    }),

  // Create a new custom category (protected, non-system)
  create: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      // Validate parent category exists if provided
      if (input.parentId) {
        const parentCategory = await ctx.db.category.findUnique({
          where: { id: input.parentId }
        })

        if (!parentCategory) {
          throw new Error('Parent category not found')
        }

        // Don't allow nesting beyond 2 levels
        if (parentCategory.parentId) {
          throw new Error('Cannot create subcategory of a subcategory')
        }
      }

      return await ctx.db.category.create({
        data: {
          ...input,
          isSystem: false,
        },
        include: {
          parent: true,
          children: true,
        }
      })
    }),

  // Update a custom category (cannot modify system categories)
  update: protectedProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const category = await ctx.db.category.findUnique({
        where: { id }
      })

      if (!category) {
        throw new Error('Category not found')
      }

      if (category.isSystem) {
        throw new Error('Cannot modify system categories')
      }

      // Validate parent category if being updated
      if (data.parentId) {
        const parentCategory = await ctx.db.category.findUnique({
          where: { id: data.parentId }
        })

        if (!parentCategory) {
          throw new Error('Parent category not found')
        }

        // Don't allow nesting beyond 2 levels
        if (parentCategory.parentId) {
          throw new Error('Cannot create subcategory of a subcategory')
        }

        // Prevent circular references
        if (data.parentId === id) {
          throw new Error('Category cannot be its own parent')
        }
      }

      return await ctx.db.category.update({
        where: { id },
        data,
        include: {
          parent: true,
          children: true,
        }
      })
    }),

  // Delete a custom category (cannot delete system categories)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        include: {
          children: true,
          _count: {
            select: { transactions: true }
          }
        }
      })

      if (!category) {
        throw new Error('Category not found')
      }

      if (category.isSystem) {
        throw new Error('Cannot delete system categories')
      }

      if (category.children.length > 0) {
        throw new Error('Cannot delete category with subcategories')
      }

      if (category._count.transactions > 0) {
        throw new Error('Cannot delete category with transactions. Consider archiving instead.')
      }

      return await ctx.db.category.delete({
        where: { id: input.id }
      })
    }),

  // Get category spending statistics
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        userId: input.userId || ctx.user.id
      }
      
      if (input.startDate || input.endDate) {
        whereClause.date = {}
        if (input.startDate) whereClause.date.gte = input.startDate
        if (input.endDate) whereClause.date.lte = input.endDate
      }

      const categoryStats = await ctx.db.transaction.groupBy({
        by: ['categoryId'],
        where: whereClause,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      })

      // Get category details
      const categoryIds = categoryStats.map(s => s.categoryId).filter(Boolean) as string[]
      const categories = await ctx.db.category.findMany({
        where: { id: { in: categoryIds } },
        include: { parent: true }
      })

      const categoryMap = new Map(categories.map(c => [c.id, c]))

      return categoryStats.map(stat => ({
        categoryId: stat.categoryId,
        category: stat.categoryId ? categoryMap.get(stat.categoryId) : null,
        totalAmount: stat._sum.amount || 0,
        transactionCount: stat._count,
        averageAmount: stat._avg.amount || 0,
        isExpense: (stat._sum.amount || 0) < 0,
        isIncome: (stat._sum.amount || 0) > 0,
      })).sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
    }),

  // Get popular categories for auto-categorization suggestions
  getPopular: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const stats = await ctx.db.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId: input.userId || ctx.user.id,
          categoryId: { not: null }
        },
        _count: true,
        orderBy: { _count: { categoryId: 'desc' } },
        take: input.limit,
      })

      const categoryIds = stats.map(s => s.categoryId).filter(Boolean) as string[]
      const categories = await ctx.db.category.findMany({
        where: { id: { in: categoryIds } }
      })

      const categoryMap = new Map(categories.map(c => [c.id, c]))

      return stats.map(stat => ({
        category: categoryMap.get(stat.categoryId!),
        usageCount: stat._count,
      })).filter(item => item.category)
    }),

  // Search categories by name
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.category.findMany({
                 where: {
           name: {
             contains: input.query
           }
         },
        include: {
          parent: true,
        },
        take: input.limit,
        orderBy: { name: 'asc' },
      })
    }),

  // Get category analytics with transaction counts and spending totals
  getAnalytics: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.category.findMany({
      orderBy: { name: 'asc' },
    })

    // Get spending totals for each category including both old and new relationships
    const categoryAnalytics = await Promise.all(
      categories.map(async (category) => {
        // Get transactions linked via old categoryId field
        const directResult = await ctx.db.transaction.aggregate({
          where: { categoryId: category.id },
          _sum: { amount: true },
          _count: { id: true },
        })

        // Get unique transactions linked via new TransactionCategory junction table
        const junctionTransactions = await ctx.db.transaction.findMany({
          where: { 
            transactionCategories: {
              some: { categoryId: category.id }
            }
          },
          select: {
            id: true,
            amount: true
          }
        })

        // For transactions that might be in both old and new systems, we need to avoid double counting
        // Get transaction IDs from direct relationships to exclude from junction count
        const directTransactionIds = await ctx.db.transaction.findMany({
          where: { categoryId: category.id },
          select: { id: true }
        })
        const directIds = new Set(directTransactionIds.map(tx => tx.id))

        // Filter out junction transactions that are already counted in direct relationships
        const uniqueJunctionTransactions = junctionTransactions.filter(tx => !directIds.has(tx.id))
        const uniqueJunctionAmount = uniqueJunctionTransactions.reduce((sum, tx) => sum + tx.amount, 0)
        const uniqueJunctionCount = uniqueJunctionTransactions.length

        // Combine counts and amounts from both relationships without double counting
        const totalTransactionCount = (directResult._count.id || 0) + uniqueJunctionCount
        const totalAmount = (directResult._sum.amount || 0) + uniqueJunctionAmount

        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isSystem: category.isSystem,
          transactionCount: totalTransactionCount,
          totalAmount: totalAmount,
        }
      })
    )

    return categoryAnalytics
  }),

  // Get total unique transaction count (for categories page stats)
  getTotalTransactionCount: publicProcedure.query(async ({ ctx }) => {
    const totalCount = await ctx.db.transaction.count()
    return totalCount
  }),

  // Auto-categorization endpoints
  getTransactionsNeedingReview: protectedProcedure.query(async ({ ctx }) => {
    const { getTransactionsNeedingReview } = await import('@/lib/auto-categorization')
    return await getTransactionsNeedingReview(ctx.user.id)
  }),

  seedDefaultRules: protectedProcedure.mutation(async ({ ctx }) => {
    const { seedDefaultRules } = await import('@/lib/auto-categorization')
    await seedDefaultRules()
    return { success: true }
  }),

  getCategorizationRules: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.categorizationRule.findMany({
      include: { category: true },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }]
    })
  }),

  getLearningPatterns: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.learningPattern.findMany({
      where: { userId: ctx.user.id },
      include: { category: true },
      orderBy: [{ confidence: 'desc' }, { matchCount: 'desc' }],
      take: 100 // Limit to top patterns
    })
  }),

  // Manually categorize a transaction and learn from it
  learnFromCategorization: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
      categoryId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the transaction
      const transaction = await ctx.db.transaction.findFirst({
        where: { id: input.transactionId, userId: ctx.user.id }
      })
      
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // Learn from this categorization
      const { learnFromCategorization } = await import('@/lib/auto-categorization')
      await learnFromCategorization(
        transaction.description,
        input.categoryId,
        ctx.user.id
      )

      return { success: true }
    }),
}) 