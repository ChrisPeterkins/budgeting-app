import { router } from '../trpc'
import { authRouter } from './auth'
import { accountsRouter } from './accounts'
import { transactionsRouter } from './transactions'
import { categoriesRouter } from './categories'
import { budgetsRouter } from './budgets'
import { goalsRouter } from './goals'
import { uploadsRouter } from './uploads'
import { analyticsRouter } from './analytics'
import { statementsRouter } from './statements'

export const appRouter = router({
  auth: authRouter,
  accounts: accountsRouter,
  transactions: transactionsRouter,
  categories: categoriesRouter,
  budgets: budgetsRouter,
  goals: goalsRouter,
  uploads: uploadsRouter,
  analytics: analyticsRouter,
  statements: statementsRouter,
})

export type AppRouter = typeof appRouter 