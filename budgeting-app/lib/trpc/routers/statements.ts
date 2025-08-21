import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const statementsRouter = router({
  // Get all statements for a user
  getAll: protectedProcedure
    .input(z.object({
      accountId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const { accountId, limit, offset } = input
      const userId = ctx.user.id

      const statements = await ctx.db.statement.findMany({
        where: {
          userId,
          ...(accountId && { 
            accountSections: {
              some: {
                accountId
              }
            }
          }),
        },
        include: {
          accountSections: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  institution: true,
                },
              },
            },
          },
          uploadedFile: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              fileSize: true,
            },
          },
        },
        orderBy: {
          statementDate: 'desc',
        },
        take: limit,
        skip: offset,
      })

      const total = await ctx.db.statement.count({
        where: {
          userId,
          ...(accountId && { 
            accountSections: {
              some: {
                accountId
              }
            }
          }),
        },
      })

      return {
        statements,
        total,
        hasMore: offset + limit < total,
      }
    }),

  // Get statement by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { id } = input
      const userId = ctx.user.id

      const statement = await ctx.db.statement.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          accountSections: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  institution: true,
                },
              },
            },
          },
          uploadedFile: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              fileSize: true,
              processingDetails: true,
            },
          },
        },
      })

      if (!statement) {
        throw new Error('Statement not found')
      }

      return statement
    }),

  // Get statements for a specific account
  getByAccount: protectedProcedure
    .input(z.object({
      accountId: z.string(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const { accountId, limit } = input
      const userId = ctx.user.id

      const statements = await ctx.db.statement.findMany({
        where: {
          userId,
          accountSections: {
            some: {
              accountId
            }
          }
        },
        include: {
          accountSections: {
            where: {
              accountId
            },
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  institution: true,
                },
              },
            },
          },
          uploadedFile: {
            select: {
              id: true,
              filename: true,
              originalName: true,
            },
          },
        },
        orderBy: {
          statementDate: 'desc',
        },
        take: limit,
      })

      return statements
    }),

  // Create a new statement with account sections
  create: protectedProcedure
    .input(z.object({
      uploadedFileId: z.string().optional(),
      statementDate: z.date(),
      periodStartDate: z.date(),
      periodEndDate: z.date(),
      statementType: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TRANSACTION_HISTORY', 'CUSTOM']).default('MONTHLY'),
      notes: z.string().optional(),
      accountSections: z.array(z.object({
        accountId: z.string().optional(),
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        lastFour: z.string().optional(),
        beginningBalance: z.number().optional(),
        endingBalance: z.number().optional(),
        totalDebits: z.number().optional(),
        totalCredits: z.number().optional(),
        transactionCount: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { accountSections, ...statementData } = input
      const userId = ctx.user.id

      const statement = await ctx.db.statement.create({
        data: {
          ...statementData,
          userId,
          accountSections: {
            create: accountSections,
          },
        },
        include: {
          accountSections: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  institution: true,
                },
              },
            },
          },
        },
      })

      return statement
    }),

  // Update a statement
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      statementDate: z.date().optional(),
      periodStartDate: z.date().optional(),
      periodEndDate: z.date().optional(),
      statementType: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TRANSACTION_HISTORY', 'CUSTOM']).optional(),
      isReconciled: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      const userId = ctx.user.id

      const statement = await ctx.db.statement.update({
        where: {
          id,
          userId,
        },
        data,
        include: {
          accountSections: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  institution: true,
                },
              },
            },
          },
        },
      })

      return statement
    }),

  // Delete a statement
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input
      const userId = ctx.user.id

      await ctx.db.statement.delete({
        where: {
          id,
          userId,
        },
      })

      return { success: true }
    }),

  // Get analytics for statements
  getAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id

      const [
        totalStatements,
        reconciledStatements,
        unreconciledStatements,
        statementStats
      ] = await Promise.all([
        ctx.db.statement.count({
          where: { userId }
        }),
        ctx.db.statement.count({
          where: { userId, isReconciled: true }
        }),
        ctx.db.statement.count({
          where: { userId, isReconciled: false }
        }),
        ctx.db.statementAccountSection.aggregate({
          where: {
            statement: {
              userId
            }
          },
          _avg: {
            beginningBalance: true,
            endingBalance: true,
          },
          _sum: {
            totalDebits: true,
            totalCredits: true,
            transactionCount: true,
          },
        })
      ])

      return {
        totalStatements,
        reconciledStatements,
        unreconciledStatements,
        averageBeginningBalance: statementStats._avg.beginningBalance || 0,
        averageEndingBalance: statementStats._avg.endingBalance || 0,
        totalDebits: statementStats._sum.totalDebits || 0,
        totalCredits: statementStats._sum.totalCredits || 0,
        totalTransactions: statementStats._sum.transactionCount || 0,
      }
    }),

  // Toggle reconciliation status
  toggleReconciliation: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input
      const userId = ctx.user.id

      const statement = await ctx.db.statement.findFirst({
        where: { id, userId },
        select: { isReconciled: true },
      })

      if (!statement) {
        throw new Error('Statement not found')
      }

      const updated = await ctx.db.statement.update({
        where: { id },
        data: { isReconciled: !statement.isReconciled },
        include: {
          accountSections: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  institution: true,
                },
              },
            },
          },
        },
      })

      return updated
    }),
}) 