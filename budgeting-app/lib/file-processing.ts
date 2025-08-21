import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { PROCESSED_DIR, moveToProcessed } from '@/lib/upload-utils'
import { categorizeTransaction } from '@/lib/auto-categorization'


export interface ParsedTransaction {
  date: Date
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category?: string
}

export interface ProcessingResult {
  success: boolean
  transactionsFound: number
  transactionsImported: number
  errors: string[]
  duplicates: number
  bankType?: string
  transactions?: ParsedTransaction[] // Store the actual parsed transactions for viewing
  statementBalance?: number // Balance found in the statement
  statementDate?: Date // Statement date
  finalAccountId?: string // The account ID where transactions were imported
  accounts?: any[] // Store extracted account information (e.g., from multi-account statements)
}

// Common CSV headers mapping for different banks
const HEADER_MAPPINGS = {
  date: ['date', 'transaction date', 'posted date', 'posting date', 'trans date'],
  description: ['description', 'memo', 'transaction', 'details', 'reference'],
  amount: ['amount', 'debit', 'credit', 'transaction amount'],
  debit: ['debit', 'debit amount', 'withdrawal'],
  credit: ['credit', 'credit amount', 'deposit']
}

// Simple CSV parser
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/['"]/g, '').trim().toLowerCase())
  const data: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/['"]/g, '').trim())
    if (values.length !== headers.length) continue // Skip malformed rows

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

// Map CSV headers to our standard format
function mapHeaders(row: Record<string, string>): {
  date?: string
  description?: string
  amount?: string
  debit?: string
  credit?: string
} {
  const result: any = {}
  const rowKeys = Object.keys(row)

  // Find date column
  for (const key of rowKeys) {
    for (const dateHeader of HEADER_MAPPINGS.date) {
      if (key.includes(dateHeader)) {
        result.date = row[key]
        break
      }
    }
    if (result.date) break
  }

  // Find description column
  for (const key of rowKeys) {
    for (const descHeader of HEADER_MAPPINGS.description) {
      if (key.includes(descHeader)) {
        result.description = row[key]
        break
      }
    }
    if (result.description) break
  }

  // Find amount columns
  for (const key of rowKeys) {
    for (const amountHeader of HEADER_MAPPINGS.amount) {
      if (key.includes(amountHeader)) {
        result.amount = row[key]
        break
      }
    }
    if (result.amount) break
  }

  // Find debit column
  for (const key of rowKeys) {
    for (const debitHeader of HEADER_MAPPINGS.debit) {
      if (key.includes(debitHeader)) {
        result.debit = row[key]
        break
      }
    }
    if (result.debit) break
  }

  // Find credit column
  for (const key of rowKeys) {
    for (const creditHeader of HEADER_MAPPINGS.credit) {
      if (key.includes(creditHeader)) {
        result.credit = row[key]
        break
      }
    }
    if (result.credit) break
  }

  return result
}

// Parse transaction from mapped row
function parseTransaction(mappedRow: ReturnType<typeof mapHeaders>, accountType?: string): ParsedTransaction | null {
  const { date, description, amount, debit, credit } = mappedRow

  // Parse date
  if (!date) return null
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) return null

  // Parse description
  if (!description || description.trim() === '') return null

  // Parse amount
  let transactionAmount = 0
  let transactionType: 'INCOME' | 'EXPENSE' = 'EXPENSE'

  // Credit cards work differently
  const isCreditCard = accountType === 'CREDIT_CARD' || accountType === 'CREDIT'

  if (amount) {
    // Single amount column
    const parsedAmount = parseFloat(amount.replace(/[,$]/g, ''))
    if (isNaN(parsedAmount)) return null
    
    transactionAmount = Math.abs(parsedAmount)
    
    if (isCreditCard) {
      // For credit cards: negative amounts are typically payments (INCOME), positive are expenses
      transactionType = parsedAmount < 0 ? 'INCOME' : 'EXPENSE'
    } else {
      // For checking/savings: positive = income, negative = expense
      transactionType = parsedAmount >= 0 ? 'INCOME' : 'EXPENSE'
    }
  } else if (debit || credit) {
    // Separate debit/credit columns
    if (debit && debit !== '0' && debit !== '') {
      const debitAmount = parseFloat(debit.replace(/[,$]/g, ''))
      if (!isNaN(debitAmount) && debitAmount > 0) {
        transactionAmount = debitAmount
        transactionType = isCreditCard ? 'EXPENSE' : 'EXPENSE' // Debits are always expenses
      }
    }
    
    if (credit && credit !== '0' && credit !== '') {
      const creditAmount = parseFloat(credit.replace(/[,$]/g, ''))
      if (!isNaN(creditAmount) && creditAmount > 0) {
        transactionAmount = creditAmount
        transactionType = isCreditCard ? 'INCOME' : 'INCOME' // Credits are payments for credit cards, income for others
      }
    }
  }

  if (transactionAmount === 0) return null

  return {
    date: parsedDate,
    description: description.trim(),
    amount: transactionAmount,
    type: transactionType
  }
}

// Process CSV file
export async function processCSVFile(
  filePath: string, 
  userId: string,
  accountId?: string,
  accountType: string = 'CHECKING',
  bankName?: string
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: false,
    transactionsFound: 0,
    transactionsImported: 0,
    errors: [],
    duplicates: 0,
    transactions: [] // Store parsed transactions for viewing
  }

  try {
    // Read file
    if (!fs.existsSync(filePath)) {
      result.errors.push('File not found')
      return result
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8')
    
    // Parse CSV
    const rows = parseCSV(csvContent)
    result.transactionsFound = rows.length

    if (rows.length === 0) {
      result.errors.push('No valid data found in CSV file')
      return result
    }

    // Parse all transactions first to store them for viewing
    const parsedTransactions: ParsedTransaction[] = []
    for (const row of rows) {
      const mappedRow = mapHeaders(row)
      const transaction = parseTransaction(mappedRow, accountType)
      if (transaction) {
        parsedTransactions.push(transaction)
      }
    }
    
    result.transactions = parsedTransactions

    // Get or create appropriate account
    let targetAccountId = accountId
    if (!targetAccountId) {
      // First, try to find an existing account that matches the bank and account type
      let existingAccount = null
      
      if (bankName) {
        // Look for an account with matching institution and type
        existingAccount = await db.account.findFirst({
          where: { 
            userId,
            type: accountType as any,
            institution: bankName
          }
        })
      }
      
      // If no specific match found, look for any account of this type
      if (!existingAccount) {
        existingAccount = await db.account.findFirst({
          where: { 
            userId,
            type: accountType as any
          }
        })
      }

      if (existingAccount) {
        targetAccountId = existingAccount.id
        console.log(`Using existing account: ${existingAccount.name} (${existingAccount.type})`)
      } else {
        // Create a new account with bank name and account type
        const accountName = bankName 
          ? `${bankName} ${accountType.charAt(0) + accountType.slice(1).toLowerCase().replace('_', ' ')}`
          : `Imported ${accountType.charAt(0) + accountType.slice(1).toLowerCase().replace('_', ' ')} Account`
        
        const newAccount = await db.account.create({
          data: {
            userId,
            name: accountName,
            type: accountType as any,
            institution: bankName || null
          }
        })
        targetAccountId = newAccount.id
        console.log(`Created new account: ${accountName} (${accountType})`)
      }
    }

    // Get default category
    const defaultCategory = await db.category.findFirst({
      where: { name: 'Other' }
    })
    
    if (!defaultCategory) {
      result.errors.push('Default category not found')
      return result
    }

    // Process each transaction
    for (const transaction of parsedTransactions) {
      try {
        // Check for duplicates (same date, amount, and description)
        const existing = await db.transaction.findFirst({
          where: {
            accountId: targetAccountId,
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.description
          }
        })

        if (existing) {
          result.duplicates++
          continue
        }

        // Create transaction with proper signed amount based on account type
        let signedAmount: number
        if (accountType === 'CREDIT_CARD' || accountType === 'CREDIT') {
          // For credit cards: expenses increase debt (positive), payments reduce debt (negative)
          signedAmount = transaction.type === 'EXPENSE' ? transaction.amount : -transaction.amount
        } else {
          // For checking/savings: expenses decrease balance (negative), income increases balance (positive)
          signedAmount = transaction.type === 'EXPENSE' ? -transaction.amount : transaction.amount
        }

        // Auto-categorize the transaction
        let finalCategoryId = defaultCategory.id
        let needsReview = false
        
        try {
          const categorizationResult = await categorizeTransaction(
            transaction.description,
            transaction.amount,
            userId
          )
          
          if (categorizationResult.categoryId) {
            finalCategoryId = categorizationResult.categoryId
            needsReview = categorizationResult.needsReview
            console.log(`Auto-categorized "${transaction.description}" -> ${categorizationResult.reason} (confidence: ${categorizationResult.confidence})`)
          } else {
            needsReview = true
            console.log(`Could not auto-categorize "${transaction.description}" -> ${categorizationResult.reason}`)
          }
        } catch (error) {
          console.warn(`Auto-categorization failed for "${transaction.description}":`, error)
          needsReview = true
        }

        // If needs review, use "Needs Review" category
        if (needsReview) {
          let needsReviewCategory = await db.category.findFirst({
            where: { name: 'Needs Review' }
          })
          
          if (!needsReviewCategory) {
            needsReviewCategory = await db.category.create({
              data: {
                name: 'Needs Review',
                icon: '🔍',
                color: '#FFA500',
                isSystem: true
              }
            })
          }
          
          finalCategoryId = needsReviewCategory.id
        }
        
        await db.transaction.create({
          data: {
            accountId: targetAccountId!,
            userId,
            categoryId: finalCategoryId,
            amount: signedAmount,
            description: transaction.description,
            date: transaction.date
          }
        })

        result.transactionsImported++

      } catch (error) {
        result.errors.push(`Error processing transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Recalculate account balance after importing transactions
    // Enhanced logic for proper chronological balance tracking
    if (result.transactionsImported > 0) {
      // For CSV files, we calculate balance from transactions since CSV doesn't contain statement balance
      // But we should be cautious about when to update the balance
      
      // Calculate balance first so we can use it later
      const balanceResult = await db.transaction.aggregate({
        where: { accountId: targetAccountId },
        _sum: { amount: true },
      })

      const calculatedBalance = balanceResult._sum.amount || 0
      
      // Check if there are any statements with ending balances for this account
      const statementsWithBalances = await db.statementAccountSection.findFirst({
        where: {
          accountId: targetAccountId,
          endingBalance: {
            not: null
          }
        }
      })
      
      let shouldUpdateBalance = true
      
      if (statementsWithBalances) {
        console.log(`📊 CSV Balance Update Check:`)
        console.log(`  Found existing statements with balances for this account`)
        console.log(`  Will use calculated balance (CSV import doesn't have statement balances)`)
        // For CSV imports, we still update with calculated balance since CSV doesn't provide statement balance
        // This is different from PDF processing where we prefer statement balances over calculated ones
      }
      
      if (shouldUpdateBalance) {
        await db.account.update({
          where: { id: targetAccountId! },
          data: { balance: calculatedBalance },
        })
        
        console.log(`✅ Updated account balance to calculated balance: $${calculatedBalance} (CSV import)`)
      } else {
        console.log(`⏭️ Skipped balance update for CSV import`)
      }

      // Create Statement record for CSV import
      try {
        // For CSV files, we don't have exact statement period dates
        // Use the date range of the imported transactions
        const transactionDates = parsedTransactions.map(t => t.date).sort((a, b) => a.getTime() - b.getTime())
        const periodStartDate = transactionDates[0]
        const periodEndDate = transactionDates[transactionDates.length - 1]

        // Calculate debits and credits
        let totalDebits = 0
        let totalCredits = 0
        
        for (const transaction of parsedTransactions) {
          if (transaction.type === 'EXPENSE') {
            totalDebits += transaction.amount
          } else {
            totalCredits += transaction.amount
          }
        }

        // Create Statement with StatementAccountSection for CSV import
        const createdStatement = await db.statement.create({
          data: {
            userId,
            uploadedFileId: null, // Will be set later when file is processed
            statementDate: periodEndDate,
            periodStartDate,
            periodEndDate,
            statementType: 'CUSTOM', // CSV imports are custom
            isReconciled: false,
            notes: `Imported from CSV file with ${result.transactionsImported} transactions`,
            accountSections: {
              create: [{
                accountId: targetAccountId!,
                beginningBalance: null, // CSV doesn't typically contain beginning balance
                endingBalance: calculatedBalance,
                totalDebits,
                totalCredits,
                transactionCount: result.transactionsImported,
              }]
            }
          }
        })

        console.log(`Created Statement record for CSV import: ${createdStatement.id}`)
        console.log(`  Period: ${periodStartDate.toISOString().split('T')[0]} to ${periodEndDate.toISOString().split('T')[0]}`)
        console.log(`  Ending Balance: $${calculatedBalance}`)
        console.log(`  Transactions: ${result.transactionsImported}`)
        console.log(`  Total Debits: $${totalDebits}`)
        console.log(`  Total Credits: $${totalCredits}`)

      } catch (error) {
        console.error('Error creating Statement record for CSV:', error)
        result.errors.push(`Error creating statement record: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Store the final target account ID in the result for linking the uploaded file
    result.finalAccountId = targetAccountId
    result.success = true

  } catch (error) {
    result.errors.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

// Main file processing function
export async function processUploadedFile(fileId: string): Promise<void> {
  try {
    // Get file record
    const file = await db.uploadedFile.findUnique({
      where: { id: fileId }
    }) as any

    if (!file) {
      throw new Error('File not found')
    }

    console.log('Retrieved file record from DB:', JSON.stringify({
      id: file.id,
      filename: file.filename,
      accountId: file.accountId,
      accountType: file.accountType,
      bankName: file.bankName,
      statementType: file.statementType
    }, null, 2))

    console.log('Retrieved file record from DB:', JSON.stringify({
      id: file.id,
      filename: file.filename,
      accountId: file.accountId,
      accountType: file.accountType,
      bankName: file.bankName,
      statementType: file.statementType
    }, null, 2))

    // Update status to processing
    await db.uploadedFile.update({
      where: { id: fileId },
      data: { status: 'PROCESSING' }
    })

    let result: ProcessingResult | null = null

    // Determine file type and process accordingly
    const ext = path.extname(file.filename).toLowerCase()
    
    // Get user ID (for now, use the first user - in production this would come from auth context)
    const users = await db.user.findMany({ take: 1 })
    if (users.length === 0) {
      throw new Error('No users found')
    }
    const userId = users[0].id
    
    console.log(`File uploaded successfully: ${file.id}, starting automatic processing...`)

    if (ext === '.csv') {
      console.log('About to call processCSVFile with:', {
        filePath: file.filePath,
        userId,
        accountId: file.accountId || undefined,
        accountType: file.accountType,
        bankName: file.bankName || undefined
      })
      result = await processCSVFile(file.filePath, userId, file.accountId || undefined, file.accountType, file.bankName || undefined)
    } else if (ext === '.pdf') {
      console.log('About to call processPDFFile with:', {
        filePath: file.filePath,
        userId,
        accountId: file.accountId || undefined,
        accountType: file.accountType,
        bankName: file.bankName || undefined,
        statementType: file.statementType || undefined
      })
      const { processPDFFile } = await import('./pdf-processing')
      result = await processPDFFile(file.filePath, userId, file.accountId || undefined, file.accountType, file.bankName || undefined, file.statementType || undefined)
    } else {
      throw new Error(`Unsupported file type: ${ext}. Supported formats: CSV, PDF`)
    }

    // Update file status based on result
    const status = result.success ? 'COMPLETED' : 'FAILED'
    const errorMessage = result.errors.length > 0 ? result.errors.join('; ') : null

    // Create processing details object
    const processingDetails = {
      transactionsFound: result.transactionsFound,
      transactionsImported: result.transactionsImported,
      duplicates: result.duplicates,
      errors: result.errors,
      bankType: result.bankType || null,
      fileType: ext,
      transactions: result.transactions || [], // Include parsed transactions for viewing
      accounts: result.accounts || [] // Include extracted account information
    }

    await db.uploadedFile.update({
      where: { id: fileId },
      data: { 
        status,
        errorMessage,
        processedAt: new Date(),
        transactionCount: result.transactionsImported,
        processingDetails: JSON.stringify(processingDetails),
        // Link the file to the account where transactions were imported
        // For multi-account statements, finalAccountId may be undefined to allow statement-based discovery
        accountId: result.finalAccountId || file.accountId || null
      } as any
    })

    // Move file to processed directory if successful
    if (result.success) {
      await moveToProcessed(file.filename)
    }

    console.log(`File ${file.filename} processed:`, {
      success: result.success,
      transactionsImported: result.transactionsImported,
      errors: result.errors
    })

  } catch (error) {
    console.error(`Error processing file ${fileId}:`, error)
    
    // Update file status to failed
    await db.uploadedFile.update({
      where: { id: fileId },
      data: { 
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date()
      }
    })
  }
} 