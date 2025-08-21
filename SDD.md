# Software Design Document (SDD)
## Personal Finance & Budgeting Application (Local-First)

### 1. Introduction

#### 1.1 Purpose
This document outlines the software architecture for a local-first personal finance application designed for couples. The system runs entirely on a local machine with zero ongoing costs and no external dependencies.

#### 1.2 Scope
This SDD covers the full-stack Next.js application, SQLite database, local file processing, and deployment architecture optimized for personal use.

#### 1.3 Definitions
- **Transaction**: Individual financial record from bank statements
- **Category**: Classification of transactions (e.g., groceries, utilities)
- **Budget**: Planned spending limits for categories over time periods
- **Goal**: Financial target with timeline (savings, debt payoff, etc.)
- **Local-First**: Application that runs entirely on local machine without external services

### 2. System Overview

#### 2.1 Architecture Pattern
**Local-First Full-Stack**: Next.js application with SQLite database, designed for 2-user personal use with zero operational costs

#### 2.2 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Local Computer                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────┐ │
│  │   Next.js App   │    │   SQLite DB     │    │  Local   │ │
│  │  (localhost)    │◄──►│  (app.db file)  │◄──►│  Files   │ │
│  │   + tRPC API    │    │                 │    │ Storage  │ │
│  └─────────────────┘    └─────────────────┘    └──────────┘ │
│           │                       │                   │     │
│           │              ┌─────────────────┐          │     │
│           │              │   Node.js       │          │     │
│           │              │   Background    │          │     │
│           │              │   Processing    │          │     │
│           │              └─────────────────┘          │     │
│           │                       │                   │     │
│           └───────────────────────┼───────────────────┘     │
│                                   │                         │
│                    Access via: http://localhost:3000       │
│                    Display on: Office Monitor              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Technology Stack

#### 3.1 Core Framework
- **Next.js 14+** with App Router (React Server Components)
- **TypeScript** for complete type safety
- **tRPC** for end-to-end type-safe APIs
- **Prisma** with SQLite adapter

#### 3.2 Database & Storage
- **SQLite** database (single file, no server required)
- **Local filesystem** for file uploads and storage
- **Node.js fs module** for file operations
- **Better-sqlite3** for high-performance SQLite operations

#### 3.3 Frontend & UI
- **React 18+** with Server Components
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for accessible, beautiful components
- **Recharts** for financial data visualization
- **React Hook Form** with Zod validation

#### 3.4 File Processing
- **Node.js** server-side processing
- **csv-parser** for CSV file processing
- **pdf-parse** for PDF statement extraction
- **multer** for file upload handling

#### 3.5 Development & Deployment
- **Local development** with hot reload
- **PM2** for production process management
- **Local HTTPS** with mkcert for secure local access
- **Git** for version control and backups

### 4. System Architecture

#### 4.1 Project Structure
```
budgeting-app/
├── package.json
├── next.config.js
├── tailwind.config.js
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── dev.db                 # SQLite database file
├── data/
│   ├── uploads/               # Bank statement files
│   ├── exports/               # Generated reports
│   └── backups/               # Database backups
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/
│   │   │   ├── trpc/
│   │   │   └── upload/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── analytics/
│   │   ├── settings/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── charts/           # Financial visualizations
│   │   ├── forms/            # Form components
│   │   └── layout/           # Layout components
│   ├── lib/
│   │   ├── db.ts             # SQLite connection
│   │   ├── trpc/             # tRPC setup
│   │   ├── file-processor.ts # Bank statement processing
│   │   ├── utils.ts
│   │   └── validations.ts
│   ├── types/
│   └── hooks/
├── scripts/
│   ├── backup.js             # Database backup script
│   ├── restore.js            # Database restore script
│   └── setup.js              # Initial setup script
└── docs/
```

#### 4.2 Database Schema (SQLite + Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  accounts     Account[]
  transactions Transaction[]
  budgets      Budget[]
  goals        Goal[]
  
  @@map("users")
}

model Account {
  id           String      @id @default(cuid())
  userId       String
  name         String
  type         AccountType
  institution  String?
  lastFour     String?
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  
  @@map("accounts")
}

model Transaction {
  id          String   @id @default(cuid())
  accountId   String
  userId      String
  date        DateTime
  amount      Real     // SQLite uses REAL for decimals
  description String
  categoryId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category? @relation(fields: [categoryId], references: [id])
  
  @@index([accountId, date])
  @@index([userId, date])
  @@map("transactions")
}

model Category {
  id           String        @id @default(cuid())
  name         String        @unique
  icon         String?
  color        String?
  parentId     String?
  
  parent       Category?     @relation("CategoryParent", fields: [parentId], references: [id])
  children     Category[]    @relation("CategoryParent")
  transactions Transaction[]
  budgetItems  BudgetItem[]
  
  @@map("categories")
}

model Budget {
  id        String       @id @default(cuid())
  userId    String
  name      String
  period    BudgetPeriod
  startDate DateTime
  endDate   DateTime
  isActive  Boolean      @default(true)
  createdAt DateTime     @default(now())
  
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     BudgetItem[]
  
  @@map("budgets")
}

model BudgetItem {
  id         String   @id @default(cuid())
  budgetId   String
  categoryId String
  amount     Real
  
  budget     Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  
  @@unique([budgetId, categoryId])
  @@map("budget_items")
}

model Goal {
  id          String   @id @default(cuid())
  userId      String
  name        String
  type        GoalType
  targetAmount Real
  currentAmount Real    @default(0)
  targetDate  DateTime
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("goals")
}

model UploadedFile {
  id        String     @id @default(cuid())
  filename  String
  originalName String
  filePath  String
  fileSize  Int
  status    FileStatus @default(PENDING)
  processedAt DateTime?
  createdAt DateTime   @default(now())
  
  @@map("uploaded_files")
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT_CARD
  INVESTMENT
  LOAN
}

enum BudgetPeriod {
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

enum GoalType {
  SAVINGS
  DEBT_PAYOFF
  INVESTMENT
  EMERGENCY_FUND
}

enum FileStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 5. API Design with tRPC

#### 5.1 Local tRPC Router Structure
```typescript
// src/lib/trpc/routers/_app.ts
import { router } from '../trpc'
import { authRouter } from './auth'
import { transactionsRouter } from './transactions'
import { budgetsRouter } from './budgets'
import { goalsRouter } from './goals'
import { uploadsRouter } from './uploads'
import { analyticsRouter } from './analytics'

export const appRouter = router({
  auth: authRouter,
  transactions: transactionsRouter,
  budgets: budgetsRouter,
  goals: goalsRouter,
  uploads: uploadsRouter,
  analytics: analyticsRouter,
})

export type AppRouter = typeof appRouter
```

#### 5.2 Example Router Implementation
```typescript
// src/lib/trpc/routers/transactions.ts
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../../db'

export const transactionsRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      categoryId: z.string().optional(),
      dateRange: z.object({
        from: z.date(),
        to: z.date()
      }).optional()
    }))
    .query(async ({ input, ctx }) => {
      const { page, limit, categoryId, dateRange } = input
      
      const where = {
        userId: ctx.user.id,
        ...(categoryId && { categoryId }),
        ...(dateRange && {
          date: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        })
      }
      
      const [transactions, total] = await Promise.all([
        db.transaction.findMany({
          where,
          include: {
            account: true,
            category: true
          },
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        db.transaction.count({ where })
      ])
      
      return {
        transactions,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    }),

  create: protectedProcedure
    .input(z.object({
      accountId: z.string(),
      date: z.date(),
      amount: z.number(),
      description: z.string(),
      categoryId: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      return await db.transaction.create({
        data: {
          ...input,
          userId: ctx.user.id
        },
        include: {
          account: true,
          category: true
        }
      })
    })
})
```

### 6. File Processing System

#### 6.1 Local File Upload Handler
```typescript
// src/lib/file-processor.ts
import fs from 'fs/promises'
import path from 'path'
import csvParser from 'csv-parser'
import { db } from './db'

export class FileProcessor {
  private uploadDir = path.join(process.cwd(), 'data', 'uploads')
  
  async processUpload(file: File, userId: string): Promise<string> {
    // Save file locally
    const filename = `${Date.now()}-${file.name}`
    const filePath = path.join(this.uploadDir, filename)
    
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()))
    
    // Create upload record
    const uploadRecord = await db.uploadedFile.create({
      data: {
        filename,
        originalName: file.name,
        filePath,
        fileSize: file.size,
        status: 'PENDING'
      }
    })
    
    // Process file in background
    this.processFileAsync(uploadRecord.id, userId)
    
    return uploadRecord.id
  }
  
  private async processFileAsync(uploadId: string, userId: string) {
    try {
      await db.uploadedFile.update({
        where: { id: uploadId },
        data: { status: 'PROCESSING' }
      })
      
      const upload = await db.uploadedFile.findUnique({
        where: { id: uploadId }
      })
      
      if (!upload) throw new Error('Upload not found')
      
      let transactions: any[] = []
      
      if (upload.filename.endsWith('.csv')) {
        transactions = await this.parseCSV(upload.filePath)
      } else if (upload.filename.endsWith('.pdf')) {
        transactions = await this.parsePDF(upload.filePath)
      }
      
      // Save transactions to database
      for (const txn of transactions) {
        await db.transaction.create({
          data: {
            ...txn,
            userId,
            // Auto-categorize based on description
            categoryId: await this.categorizeTransaction(txn.description)
          }
        })
      }
      
      await db.uploadedFile.update({
        where: { id: uploadId },
        data: { 
          status: 'COMPLETED',
          processedAt: new Date()
        }
      })
      
    } catch (error) {
      await db.uploadedFile.update({
        where: { id: uploadId },
        data: { status: 'FAILED' }
      })
      console.error('File processing failed:', error)
    }
  }
  
  private async parseCSV(filePath: string): Promise<any[]> {
    const transactions: any[] = []
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          // Parse common CSV formats
          transactions.push({
            date: new Date(row.Date || row.date),
            description: row.Description || row.description,
            amount: parseFloat(row.Amount || row.amount)
          })
        })
        .on('end', () => resolve(transactions))
        .on('error', reject)
    })
  }
  
  private async categorizeTransaction(description: string): Promise<string | null> {
    // Simple rule-based categorization
    const rules = [
      { keywords: ['grocery', 'supermarket', 'food'], category: 'Groceries' },
      { keywords: ['gas', 'fuel', 'exxon', 'shell'], category: 'Transportation' },
      { keywords: ['restaurant', 'cafe', 'dining'], category: 'Dining Out' },
      // Add more rules as needed
    ]
    
    const desc = description.toLowerCase()
    
    for (const rule of rules) {
      if (rule.keywords.some(keyword => desc.includes(keyword))) {
        const category = await db.category.findFirst({
          where: { name: rule.category }
        })
        return category?.id || null
      }
    }
    
    return null
  }
}
```

### 7. Local Authentication

#### 7.1 Simple Local Auth
```typescript
// src/lib/auth.ts
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-local-secret-key'

export class LocalAuth {
  async register(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await db.user.create({
      data: {
        email,
        name,
        // Store hashed password in separate table or skip for simple setup
      }
    })
    
    return this.generateToken(user.id)
  }
  
  async login(email: string, password: string) {
    const user = await db.user.findUnique({
      where: { email }
    })
    
    if (!user) throw new Error('User not found')
    
    // For simplicity, you could skip password validation for local use
    // Or implement proper password checking
    
    return this.generateToken(user.id)
  }
  
  private generateToken(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
  }
  
  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      return decoded.userId
    } catch {
      return null
    }
  }
}
```

### 8. Local Deployment & Setup

#### 8.1 Development Setup
```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Create upload directories
mkdir -p data/uploads data/exports data/backups

# Start development server
npm run dev
```

#### 8.2 Production Setup Script
```javascript
// scripts/setup.js
const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

async function setup() {
  console.log('Setting up local budgeting app...')
  
  // Create data directories
  const dirs = ['data/uploads', 'data/exports', 'data/backups']
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true })
    console.log(`✓ Created ${dir}`)
  }
  
  // Initialize database
  await execAsync('npx prisma generate')
  await execAsync('npx prisma db push')
  console.log('✓ Database initialized')
  
  // Create default categories
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  
  const defaultCategories = [
    'Groceries', 'Transportation', 'Dining Out', 'Utilities',
    'Entertainment', 'Healthcare', 'Shopping', 'Income'
  ]
  
  for (const name of defaultCategories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }
  
  console.log('✓ Default categories created')
  console.log('\nSetup complete! Run "npm run build && npm start" to start the app.')
}

setup().catch(console.error)
```

#### 8.3 Production Startup with PM2
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'budgeting-app',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    autorestart: true,
    max_restarts: 10,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### 9. Backup & Data Management

#### 9.1 Automated Backup Script
```javascript
// scripts/backup.js
const fs = require('fs').promises
const path = require('path')

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join('data', 'backups')
  
  // Backup database
  const dbPath = path.join('prisma', 'dev.db')
  const dbBackupPath = path.join(backupDir, `database-${timestamp}.db`)
  await fs.copyFile(dbPath, dbBackupPath)
  
  // Backup uploads folder
  const uploadsPath = path.join('data', 'uploads')
  const uploadsBackupPath = path.join(backupDir, `uploads-${timestamp}`)
  await fs.cp(uploadsPath, uploadsBackupPath, { recursive: true })
  
  console.log(`✓ Backup created: ${timestamp}`)
  
  // Clean old backups (keep last 30)
  const backups = await fs.readdir(backupDir)
  const dbBackups = backups.filter(f => f.startsWith('database-')).sort()
  
  if (dbBackups.length > 30) {
    const toDelete = dbBackups.slice(0, -30)
    for (const file of toDelete) {
      await fs.unlink(path.join(backupDir, file))
    }
  }
}

backup().catch(console.error)
```

### 10. Performance Considerations

#### 10.1 SQLite Optimizations
```sql
-- Enable WAL mode for better concurrent access
PRAGMA journal_mode=WAL;

-- Optimize for faster queries
PRAGMA cache_size=10000;
PRAGMA temp_store=memory;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(userId, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryId);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(accountId);
```

#### 10.2 Next.js Optimizations
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for local deployment
  output: 'standalone',
  
  // Disable telemetry for privacy
  telemetry: false,
  
  // Optimize images for local use
  images: {
    unoptimized: true
  },
  
  // Use SQLite-compatible build
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'better-sqlite3']
  }
}

module.exports = nextConfig
```

### 11. Security Considerations

#### 11.1 Local Security Measures
- **File Access**: Restrict file permissions to user only
- **Database**: SQLite file permissions set to 600
- **Network**: Bind to localhost only (127.0.0.1)
- **HTTPS**: Optional local HTTPS with self-signed certificates
- **Firewall**: Ensure no external access to port 3000

#### 11.2 Data Privacy
- **No External Services**: All data stays on local machine
- **No Analytics**: No external tracking or telemetry
- **Backup Encryption**: Optional encryption for backup files
- **Secure Deletion**: Proper file deletion when removing data

This local-first architecture provides all the benefits of modern development while ensuring zero ongoing costs and complete data privacy. 