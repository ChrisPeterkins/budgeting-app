import { db } from '@/lib/db'

export interface CategorizationResult {
  categoryId: string | null
  confidence: number
  reason: string // Why this category was chosen
  needsReview: boolean
}

export interface CategorizationMatch {
  categoryId: string
  confidence: number
  source: 'rule' | 'learning' | 'default'
  details: string
}

// Normalize transaction description for pattern matching
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

// Extract merchant name from description (common patterns)
function extractMerchantName(description: string): string {
  const normalized = normalizeDescription(description)
  
  // Common patterns for merchant extraction
  const patterns = [
    /^([^0-9*]+?)(?:\s+\d|\s*\*|$)/, // Everything before numbers or asterisks
    /^(.*?)\s+(?:purchase|payment|debit|credit)/i,
    /^(.*?)\s+\d{2}\/\d{2}/i, // Before date patterns
  ]
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match && match[1].trim().length > 2) {
      return match[1].trim()
    }
  }
  
  // Fallback: first 3-4 meaningful words
  const words = normalized.split(' ').filter(w => w.length > 2)
  return words.slice(0, Math.min(3, words.length)).join(' ')
}

// Default categorization rules (will be seeded into database)
export const DEFAULT_RULES = [
  // Ally Bank Specific Rules (high priority)
  { name: 'Ally Interest Paid', pattern: 'interest paid', category: 'Interest Income', confidence: 0.98 },
  { name: 'Ally NOW Withdrawal', pattern: 'now withdrawal', category: 'Transfer Out', confidence: 0.98 },
  { name: 'Ally ACH Deposit', pattern: 'ach deposit', category: 'Transfer In', confidence: 0.98 },
  
  // General Banking Rules
  { name: 'Interest Payments', pattern: 'interest.*paid|interest.*earned|interest.*income', category: 'Interest Income', confidence: 0.95 },
  { name: 'Bank Transfers Out', pattern: 'transfer.*out|withdrawal|wire.*out|now.*withdrawal', category: 'Transfer Out', confidence: 0.90 },
  { name: 'Bank Transfers In', pattern: 'transfer.*in|deposit|wire.*in|ach.*deposit|direct.*deposit', category: 'Transfer In', confidence: 0.90 },
  
  // Fast Food & Restaurants
  { name: 'DoorDash/Delivery', pattern: 'doordash|ubereats|grubhub|postmates|delivery', category: 'Dining Out', confidence: 0.95 },
  { name: 'Fast Food Chains', pattern: 'mcdonalds|burger king|subway|taco bell|kfc|wendys|chipotle|panera', category: 'Dining Out', confidence: 0.9 },
  { name: 'Coffee Shops', pattern: 'starbucks|dunkin|coffee|cafe', category: 'Dining Out', confidence: 0.85 },
  
  // Entertainment & Streaming
  { name: 'Streaming Services', pattern: 'netflix|hulu|disney|amazon prime|spotify|apple music|youtube premium', category: 'Entertainment', confidence: 0.95 },
  { name: 'Movie Theaters', pattern: 'amc|regal|cinemark|movie|theater|cinema', category: 'Entertainment', confidence: 0.9 },
  
  // Transportation
  { name: 'Gas Stations', pattern: 'shell|exxon|bp|chevron|mobil|gas|fuel', category: 'Transportation', confidence: 0.9 },
  { name: 'Rideshare', pattern: 'uber|lyft|taxi|ride', category: 'Transportation', confidence: 0.9 },
  { name: 'Public Transit', pattern: 'metro|bus|train|transit|mta|bart', category: 'Transportation', confidence: 0.9 },
  
  // Shopping
  { name: 'Grocery Stores', pattern: 'kroger|safeway|whole foods|trader joe|costco|walmart|target.*grocery', category: 'Groceries', confidence: 0.85 },
  { name: 'Amazon', pattern: 'amazon|amzn', category: 'Shopping', confidence: 0.8 },
  { name: 'Department Stores', pattern: 'target|walmart|macy|nordstrom|sears', category: 'Shopping', confidence: 0.8 },
  
  // Utilities & Bills
  { name: 'Electric/Gas Utilities', pattern: 'electric|gas.*utility|power.*company|pge|edison', category: 'Utilities', confidence: 0.9 },
  { name: 'Internet/Phone', pattern: 'verizon|att|t.mobile|comcast|xfinity|internet|phone.*bill', category: 'Utilities', confidence: 0.9 },
  
  // Healthcare
  { name: 'Pharmacy', pattern: 'cvs|walgreens|rite aid|pharmacy', category: 'Healthcare', confidence: 0.9 },
  { name: 'Medical', pattern: 'medical|doctor|dentist|clinic|hospital', category: 'Healthcare', confidence: 0.85 },
  
  // Financial
  { name: 'ATM Fees', pattern: 'atm.*fee|withdrawal.*fee', category: 'Bank Fees', confidence: 0.95 },
  { name: 'General Bank Transfers', pattern: 'transfer|deposit|withdrawal', category: 'Transfer', confidence: 0.7 },
]

// Auto-categorize a transaction
export async function categorizeTransaction(
  description: string,
  amount: number,
  userId: string
): Promise<CategorizationResult> {
  const normalized = normalizeDescription(description)
  const merchantName = extractMerchantName(description)
  
  console.log(`Categorizing: "${description}" -> normalized: "${normalized}", merchant: "${merchantName}"`)
  
  const matches: CategorizationMatch[] = []
  
  // 1. Check user learning patterns first (highest priority)
  const learningPatterns = await db.learningPattern.findMany({
    where: {
      userId,
      OR: [
        { pattern: { contains: merchantName } },
        { pattern: { contains: normalized } }
      ]
    },
    include: { category: true },
    orderBy: { confidence: 'desc' }
  })
  
  for (const pattern of learningPatterns) {
    const similarity = calculateSimilarity(normalized, pattern.pattern)
    if (similarity > 0.6) {
      matches.push({
        categoryId: pattern.categoryId,
        confidence: pattern.confidence * similarity,
        source: 'learning',
        details: `Learned from previous categorizations (${pattern.matchCount} times)`
      })
    }
  }
  
  // 2. Check predefined rules
  const rules = await db.categorizationRule.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { priority: 'desc' }
  })
  
  for (const rule of rules) {
    const regex = new RegExp(rule.pattern, 'i')
    if (regex.test(normalized) || regex.test(description)) {
      matches.push({
        categoryId: rule.categoryId,
        confidence: rule.confidence,
        source: 'rule',
        details: `Matched rule: ${rule.name}`
      })
    }
  }
  
  // 3. Sort matches by confidence and pick the best one
  matches.sort((a, b) => b.confidence - a.confidence)
  
  if (matches.length > 0) {
    const bestMatch = matches[0]
    return {
      categoryId: bestMatch.categoryId,
      confidence: bestMatch.confidence,
      reason: bestMatch.details,
      needsReview: bestMatch.confidence < 0.8 // Flag for review if confidence is low
    }
  }
  
  // 4. No matches found - needs manual categorization
  return {
    categoryId: null,
    confidence: 0,
    reason: 'No matching patterns found',
    needsReview: true
  }
}

// Calculate similarity between two strings (simple Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(' '))
  const set2 = new Set(str2.split(' '))
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

// Learn from user categorization
export async function learnFromCategorization(
  description: string,
  categoryId: string,
  userId: string
): Promise<void> {
  const normalized = normalizeDescription(description)
  const merchantName = extractMerchantName(description)
  
  // Try to find existing pattern
  const existingPattern = await db.learningPattern.findFirst({
    where: {
      userId,
      pattern: merchantName,
      categoryId
    }
  })
  
  if (existingPattern) {
    // Update existing pattern - increase confidence and match count
    await db.learningPattern.update({
      where: { id: existingPattern.id },
      data: {
        confidence: Math.min(1.0, existingPattern.confidence + 0.1),
        matchCount: existingPattern.matchCount + 1,
        lastUsed: new Date()
      }
    })
  } else {
    // Create new learning pattern
    await db.learningPattern.create({
      data: {
        userId,
        pattern: merchantName,
        categoryId,
        confidence: 0.8, // Start with moderate confidence
        matchCount: 1
      }
    })
  }
  
  console.log(`Learned pattern: "${merchantName}" -> ${categoryId}`)
}

// Seed default categorization rules
export async function seedDefaultRules(): Promise<void> {
  console.log('Seeding default categorization rules...')
  
  for (const rule of DEFAULT_RULES) {
    // Find the category by name
    const category = await db.category.findFirst({
      where: { name: rule.category }
    })
    
    if (!category) {
      console.warn(`Category "${rule.category}" not found, skipping rule "${rule.name}"`)
      continue
    }
    
    // Check if rule already exists
    const existingRule = await db.categorizationRule.findFirst({
      where: {
        name: rule.name,
        pattern: rule.pattern
      }
    })
    
    if (!existingRule) {
      await db.categorizationRule.create({
        data: {
          name: rule.name,
          pattern: rule.pattern,
          categoryId: category.id,
          confidence: rule.confidence,
          priority: 1
        }
      })
      console.log(`Created rule: ${rule.name}`)
    }
  }
  
  console.log('Default rules seeding completed')
}

// Get transactions that need review
export async function getTransactionsNeedingReview(userId: string) {
  // Find the "Needs Review" category or create it
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
  
  // Get transactions in "Needs Review" category or with no categories
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      OR: [
        { categoryId: needsReviewCategory.id },
        { 
          AND: [
            { categoryId: null },
            { transactionCategories: { none: {} } }
          ]
        }
      ]
    },
    include: {
      account: true,
      category: true,
      transactionCategories: {
        include: { category: true }
      }
    },
    orderBy: { date: 'desc' },
    take: 50 // Limit to recent transactions
  })
  
  return transactions
} 