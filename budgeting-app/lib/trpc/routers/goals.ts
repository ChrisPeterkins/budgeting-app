import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { GoalType } from '@prisma/client'

// Input validation schemas
const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  type: z.nativeEnum(GoalType),
  targetAmount: z.number().min(0.01, 'Target amount must be greater than 0'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative').default(0),
  targetDate: z.coerce.date(),
  description: z.string().optional(),
})

const updateGoalSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  type: z.nativeEnum(GoalType).optional(),
  targetAmount: z.number().min(0.01).optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.coerce.date().optional(),
  description: z.string().optional(),
  isCompleted: z.boolean().optional(),
})

const updateProgressSchema = z.object({
  id: z.string(),
  amount: z.number(),
  action: z.enum(['add', 'subtract', 'set']),
})

// Helper functions for goal category creation
function getGoalIcon(goalType: GoalType): string {
  switch (goalType) {
    case 'SAVINGS':
      return '🎯'
    case 'DEBT_PAYOFF':
      return '💳'
    case 'INVESTMENT':
      return '📈'
    case 'EMERGENCY_FUND':
      return '🛡️'
    default:
      return '🎯'
  }
}

function getGoalColor(goalType: GoalType): string {
  switch (goalType) {
    case 'SAVINGS':
      return '#10B981' // Green
    case 'DEBT_PAYOFF':
      return '#EF4444' // Red
    case 'INVESTMENT':
      return '#3B82F6' // Blue
    case 'EMERGENCY_FUND':
      return '#F59E0B' // Orange
    default:
      return '#6B7280' // Gray
  }
}

export const goalsRouter = router({
  // Get all goals for the authenticated user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const goals = await ctx.db.goal.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate progress and time remaining for each goal
    return goals.map(goal => {
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
      const today = new Date()
      const targetDate = new Date(goal.targetDate)
      const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate monthly contribution needed
      const monthsRemaining = Math.max(1, daysRemaining / 30)
      const monthlyNeeded = remaining / monthsRemaining

      return {
        ...goal,
        progress: Math.min(progress, 100),
        remaining,
        daysRemaining,
        monthsRemaining: Math.max(1, Math.ceil(monthsRemaining)),
        monthlyNeeded: Math.max(0, monthlyNeeded),
        isOverdue: daysRemaining < 0 && !goal.isCompleted,
        isAchievable: monthlyNeeded <= 1000, // Arbitrary threshold for "achievable"
      }
    })
  }),

  // Get active goals (not completed)
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const goals = await ctx.db.goal.findMany({
      where: { 
        userId: ctx.user.id,
        isCompleted: false 
      },
      orderBy: { targetDate: 'asc' },
    })

    return goals.map(goal => {
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
      const today = new Date()
      const targetDate = new Date(goal.targetDate)
      const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...goal,
        progress: Math.min(progress, 100),
        remaining,
        daysRemaining,
        isOverdue: daysRemaining < 0,
      }
    })
  }),

  // Get a single goal by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.db.goal.findFirst({
        where: { 
          id: input.id,
          userId: ctx.user.id 
        }
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
      const today = new Date()
      const targetDate = new Date(goal.targetDate)
      const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const monthsRemaining = Math.max(1, daysRemaining / 30)
      const monthlyNeeded = remaining / monthsRemaining

      return {
        ...goal,
        progress: Math.min(progress, 100),
        remaining,
        daysRemaining,
        monthsRemaining: Math.max(1, Math.ceil(monthsRemaining)),
        monthlyNeeded: Math.max(0, monthlyNeeded),
        isOverdue: daysRemaining < 0 && !goal.isCompleted,
        isAchievable: monthlyNeeded <= 1000,
      }
    }),

  // Create a new goal
  create: protectedProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate target date is in the future
      const today = new Date()
      if (input.targetDate <= today) {
        throw new Error('Target date must be in the future')
      }

      // Create the goal and matching category in a transaction
      return await ctx.db.$transaction(async (tx) => {
        // Create the goal first
        const goal = await tx.goal.create({
          data: {
            ...input,
            userId: ctx.user.id,
          }
        })

        // Create a matching category for goal tracking
        const categoryName = `Goal: ${input.name}`
        const categoryIcon = getGoalIcon(input.type)
        const categoryColor = getGoalColor(input.type)

        try {
          // Check if a category with this name already exists
          const existingCategory = await tx.category.findFirst({
            where: { name: categoryName }
          })

          if (!existingCategory) {
            await tx.category.create({
              data: {
                name: categoryName,
                icon: categoryIcon,
                color: categoryColor,
                isSystem: false
              }
            })
            console.log(`✅ Created matching category: "${categoryName}" for goal: "${input.name}"`)
          } else {
            console.log(`ℹ️ Category "${categoryName}" already exists - skipping creation`)
          }
        } catch (error) {
          // If category creation fails, log it but don't fail the goal creation
          console.warn('Failed to create matching category for goal:', error)
        }

        return goal
      })
    }),

  // Update a goal
  update: protectedProcedure
    .input(updateGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Verify goal belongs to user
      const goal = await ctx.db.goal.findFirst({
        where: { id, userId: ctx.user.id }
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      // Validate target date if provided
      if (data.targetDate && data.targetDate <= new Date()) {
        throw new Error('Target date must be in the future')
      }

      // Auto-complete goal if current amount reaches target
      const updatedData = { ...data }
      if (data.currentAmount !== undefined && data.targetAmount !== undefined) {
        if (data.currentAmount >= data.targetAmount) {
          updatedData.isCompleted = true
        }
      } else if (data.currentAmount !== undefined && data.currentAmount >= goal.targetAmount) {
        updatedData.isCompleted = true
      }

      return await ctx.db.goal.update({
        where: { id },
        data: updatedData
      })
    }),

  // Update goal progress
  updateProgress: protectedProcedure
    .input(updateProgressSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify goal belongs to user
      const goal = await ctx.db.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      let newAmount = goal.currentAmount

      switch (input.action) {
        case 'add':
          newAmount += input.amount
          break
        case 'subtract':
          newAmount = Math.max(0, newAmount - input.amount)
          break
        case 'set':
          newAmount = Math.max(0, input.amount)
          break
      }

      // Auto-complete goal if target is reached
      const isCompleted = newAmount >= goal.targetAmount

      return await ctx.db.goal.update({
        where: { id: input.id },
        data: {
          currentAmount: newAmount,
          isCompleted
        }
      })
    }),

  // Delete a goal
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify goal belongs to user
      const goal = await ctx.db.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      return await ctx.db.goal.delete({
        where: { id: input.id }
      })
    }),

  // Get goal statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const goals = await ctx.db.goal.findMany({
      where: { userId: ctx.user.id }
    })

    const totalGoals = goals.length
    const completedGoals = goals.filter(g => g.isCompleted).length
    const activeGoals = goals.filter(g => !g.isCompleted).length
    const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0)
    const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0)
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0

    // Goals by type
    const goalsByType = goals.reduce((acc, goal) => {
      acc[goal.type] = (acc[goal.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Overdue goals
    const today = new Date()
    const overdueGoals = goals.filter(g => 
      !g.isCompleted && new Date(g.targetDate) < today
    ).length

    return {
      totalGoals,
      completedGoals,
      activeGoals,
      overdueGoals,
      completionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
      totalTargetAmount,
      totalCurrentAmount,
      totalRemaining: Math.max(0, totalTargetAmount - totalCurrentAmount),
      overallProgress: Math.min(overallProgress, 100),
      goalsByType,
    }
  }),

  // Mark goal as completed
  markCompleted: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify goal belongs to user
      const goal = await ctx.db.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      return await ctx.db.goal.update({
        where: { id: input.id },
        data: {
          isCompleted: true,
          currentAmount: goal.targetAmount // Set to target when manually marked complete
        }
      })
    }),

  // Reopen a completed goal
  reopen: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify goal belongs to user
      const goal = await ctx.db.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id }
      })

      if (!goal) {
        throw new Error('Goal not found')
      }

      return await ctx.db.goal.update({
        where: { id: input.id },
        data: {
          isCompleted: false
        }
      })
    }),
}) 