import { z } from 'zod'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'

export const authRouter = router({
  // Register a new user
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1).max(100),
      password: z.string().min(6).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, name, password } = input

      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        })
      }

      // User limit removed - allow unlimited registrations

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const user = await ctx.db.user.create({
        data: {
          email,
          name,
          // Note: We're not storing password in the User table for simplicity
          // In a real app, you'd want a separate UserCredentials table
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        }
      })

      // For local development, we'll store the hashed password in app settings
      // This is not ideal for production but works for our local-first approach
      await ctx.db.appSetting.create({
        data: {
          key: `user_password_${user.id}`,
          value: hashedPassword,
        }
      })

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      return {
        user,
        token,
      }
    }),

  // Login user
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input

      // Find user
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        }
      })

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Get stored password hash
      const passwordSetting = await ctx.db.appSetting.findUnique({
        where: { key: `user_password_${user.id}` }
      })

      if (!passwordSetting) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'User credentials not found',
        })
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, passwordSetting.value)

      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )

      return {
        user,
        token,
      }
    }),

  // Get current user (protected)
  me: protectedProcedure
    .query(({ ctx }) => {
      return ctx.user
    }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        }
      })

      return updatedUser
    }),

  // Simple endpoint to test if auth is working
  test: protectedProcedure
    .query(() => {
      return { message: 'Authentication working!' }
    }),
}) 