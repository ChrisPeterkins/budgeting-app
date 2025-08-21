import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default categories
  const categories = [
    // Income categories
    { name: 'Salary', icon: '💼', color: '#10B981' },
    { name: 'Freelance', icon: '💻', color: '#059669' },
    { name: 'Investments', icon: '📈', color: '#0D9488' },
    { name: 'Interest Income', icon: '💰', color: '#0891B2' },
    { name: 'Other Income', icon: '💰', color: '#0891B2' },

    // Transfer categories
    { name: 'Transfer In', icon: '⬇️', color: '#10B981' },
    { name: 'Transfer Out', icon: '⬆️', color: '#EF4444' },

    // Expense categories - Housing
    { name: 'Housing', icon: '🏠', color: '#DC2626' },
    { name: 'Rent/Mortgage', icon: '🏠', color: '#DC2626', parentName: 'Housing' },
    { name: 'Utilities', icon: '⚡', color: '#DC2626', parentName: 'Housing' },
    { name: 'Internet', icon: '🌐', color: '#DC2626', parentName: 'Housing' },
    { name: 'Home Maintenance', icon: '🔧', color: '#DC2626', parentName: 'Housing' },

    // Transportation
    { name: 'Transportation', icon: '🚗', color: '#EA580C' },
    { name: 'Gas', icon: '⛽', color: '#EA580C', parentName: 'Transportation' },
    { name: 'Car Payment', icon: '🚗', color: '#EA580C', parentName: 'Transportation' },
    { name: 'Car Insurance', icon: '🛡️', color: '#EA580C', parentName: 'Transportation' },
    { name: 'Public Transit', icon: '🚌', color: '#EA580C', parentName: 'Transportation' },

    // Food
    { name: 'Food & Dining', icon: '🍽️', color: '#D97706' },
    { name: 'Groceries', icon: '🛒', color: '#D97706', parentName: 'Food & Dining' },
    { name: 'Restaurants', icon: '🍽️', color: '#D97706', parentName: 'Food & Dining' },
    { name: 'Coffee', icon: '☕', color: '#D97706', parentName: 'Food & Dining' },
    { name: 'Takeout', icon: '🥡', color: '#D97706', parentName: 'Food & Dining' },

    // Entertainment
    { name: 'Entertainment', icon: '🎬', color: '#CA8A04' },
    { name: 'Movies', icon: '🎬', color: '#CA8A04', parentName: 'Entertainment' },
    { name: 'Streaming', icon: '📺', color: '#CA8A04', parentName: 'Entertainment' },
    { name: 'Games', icon: '🎮', color: '#CA8A04', parentName: 'Entertainment' },
    { name: 'Books', icon: '📚', color: '#CA8A04', parentName: 'Entertainment' },

    // Health
    { name: 'Health & Fitness', icon: '🏥', color: '#65A30D' },
    { name: 'Doctor Visits', icon: '🏥', color: '#65A30D', parentName: 'Health & Fitness' },
    { name: 'Pharmacy', icon: '💊', color: '#65A30D', parentName: 'Health & Fitness' },
    { name: 'Gym', icon: '💪', color: '#65A30D', parentName: 'Health & Fitness' },
    { name: 'Health Insurance', icon: '🛡️', color: '#65A30D', parentName: 'Health & Fitness' },

    // Shopping
    { name: 'Shopping', icon: '🛍️', color: '#7C3AED' },
    { name: 'Clothing', icon: '👕', color: '#7C3AED', parentName: 'Shopping' },
    { name: 'Electronics', icon: '📱', color: '#7C3AED', parentName: 'Shopping' },
    { name: 'Home Goods', icon: '🏺', color: '#7C3AED', parentName: 'Shopping' },

    // Other
    { name: 'Other', icon: '📋', color: '#6B7280' },
  ]

  // Create parent categories first
  const parentCategories = categories.filter(cat => !cat.parentName)
  const createdParents: Record<string, any> = {}

  for (const category of parentCategories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        isSystem: true,
      },
    })
    createdParents[category.name] = created
    console.log(`✅ Created category: ${category.name}`)
  }

  // Create child categories
  const childCategories = categories.filter(cat => cat.parentName)
  for (const category of childCategories) {
    const parent = createdParents[category.parentName!]
    if (parent) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          parentId: parent.id,
          isSystem: true,
        },
      })
      console.log(`✅ Created subcategory: ${category.name} under ${category.parentName}`)
    }
  }

  // Create app settings with default values
  const defaultSettings = [
    { key: 'app_version', value: '1.0.0' },
    { key: 'currency', value: 'USD' },
    { key: 'date_format', value: 'MM/DD/YYYY' },
    { key: 'backup_enabled', value: 'true' },
    { key: 'max_users', value: '2' },
  ]

  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
    console.log(`⚙️ Created setting: ${setting.key} = ${setting.value}`)
  }

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 