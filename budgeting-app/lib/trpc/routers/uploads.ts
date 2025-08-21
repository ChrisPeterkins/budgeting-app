import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { FileStatus } from '@prisma/client'

// Input validation schemas
const createUploadSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  filePath: z.string(),
  fileSize: z.number().min(0),
})

const updateUploadStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(FileStatus),
  errorMessage: z.string().optional(),
})

export const uploadsRouter = router({
  // Get all uploaded files
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.uploadedFile.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Get uploaded files by status
  getByStatus: protectedProcedure
    .input(z.object({ status: z.nativeEnum(FileStatus) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.uploadedFile.findMany({
        where: { status: input.status },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Get pending uploads (for processing queue)
  getPending: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.uploadedFile.findMany({
      where: { status: FileStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    })
  }),

  // Get a single upload by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const upload = await ctx.db.uploadedFile.findUnique({
        where: { id: input.id }
      })

      if (!upload) {
        throw new Error('Upload not found')
      }

      return upload
    }),

  // Create a new upload record
  create: protectedProcedure
    .input(createUploadSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.uploadedFile.create({
        data: input,
      })
    }),

  // Update upload status
  updateStatus: protectedProcedure
    .input(updateUploadStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status, errorMessage } = input

      const upload = await ctx.db.uploadedFile.findUnique({
        where: { id }
      })

      if (!upload) {
        throw new Error('Upload not found')
      }

      const updateData: any = { status }
      
      if (status === FileStatus.COMPLETED) {
        updateData.processedAt = new Date()
        updateData.errorMessage = null
      } else if (status === FileStatus.FAILED && errorMessage) {
        updateData.errorMessage = errorMessage
      }

      return await ctx.db.uploadedFile.update({
        where: { id },
        data: updateData,
      })
    }),

  // Delete an upload record and associated file
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.db.uploadedFile.findUnique({
        where: { id: input.id }
      })

      if (!upload) {
        throw new Error('Upload not found')
      }

      // TODO: Implement file deletion from filesystem
      // fs.unlinkSync(upload.filePath)

      return await ctx.db.uploadedFile.delete({
        where: { id: input.id },
      })
    }),

  // Get upload statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [total, pending, processing, completed, failed] = await Promise.all([
      ctx.db.uploadedFile.count(),
      ctx.db.uploadedFile.count({ where: { status: FileStatus.PENDING } }),
      ctx.db.uploadedFile.count({ where: { status: FileStatus.PROCESSING } }),
      ctx.db.uploadedFile.count({ where: { status: FileStatus.COMPLETED } }),
      ctx.db.uploadedFile.count({ where: { status: FileStatus.FAILED } }),
    ])

    const totalSize = await ctx.db.uploadedFile.aggregate({
      _sum: { fileSize: true }
    })

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      totalSizeBytes: totalSize._sum.fileSize || 0,
    }
  }),

  // Retry failed upload processing
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.db.uploadedFile.findUnique({
        where: { id: input.id }
      })

      if (!upload) {
        throw new Error('Upload not found')
      }

      if (upload.status !== FileStatus.FAILED) {
        throw new Error('Only failed uploads can be retried')
      }

      return await ctx.db.uploadedFile.update({
        where: { id: input.id },
        data: {
          status: FileStatus.PENDING,
          errorMessage: null,
        },
      })
    }),

  // Update metadata and trigger reprocessing
  updateMetadata: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      bankName: z.string(),
      accountType: z.string(),
      statementType: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const upload = await ctx.db.uploadedFile.findUnique({
        where: { id: input.fileId }
      })

      if (!upload) {
        throw new Error('Upload not found')
      }

      // Update metadata and reset to pending for reprocessing
      return await ctx.db.uploadedFile.update({
        where: { id: input.fileId },
        data: {
          bankName: input.bankName,
          accountType: input.accountType,
          statementType: input.statementType,
          status: FileStatus.PENDING,
          errorMessage: null,
          processedAt: null,
          transactionCount: null,
          processingDetails: null,
        } as any,
      })
    }),

  // Clean up old completed/failed uploads
  cleanup: protectedProcedure
    .input(z.object({ 
      olderThanDays: z.number().min(1).default(30),
      statusesToClean: z.array(z.nativeEnum(FileStatus)).default([FileStatus.COMPLETED, FileStatus.FAILED])
    }))
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays)

      const uploads = await ctx.db.uploadedFile.findMany({
        where: {
          status: { in: input.statusesToClean },
          createdAt: { lte: cutoffDate }
        }
      })

      // TODO: Delete associated files from filesystem
      // uploads.forEach(upload => {
      //   if (fs.existsSync(upload.filePath)) {
      //     fs.unlinkSync(upload.filePath)
      //   }
      // })

      const result = await ctx.db.uploadedFile.deleteMany({
        where: {
          status: { in: input.statusesToClean },
          createdAt: { lte: cutoffDate }
        }
      })

      return {
        deletedCount: result.count,
        deletedFiles: uploads.map(u => u.filename)
      }
    }),
}) 