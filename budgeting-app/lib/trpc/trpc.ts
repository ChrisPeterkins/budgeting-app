import { initTRPC, TRPCError } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { db } from '../db'

// Create context for tRPC
export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const { req } = opts

  // Get the authorization header
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  let user = null
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true }
      })
    } catch (error) {
      // Token is invalid, but we don't throw here to allow public procedures
    }
  }

  return {
    req,
    db,
    user,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // User is guaranteed to be non-null here
    },
  })
}) 