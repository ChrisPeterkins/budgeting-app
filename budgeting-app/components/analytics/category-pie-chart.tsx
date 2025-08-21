'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface CategoryPieChartProps {
  data: {
    categories: Array<{
      categoryId: string
      categoryName: string
      amount: number
      transactionCount: number
      averageAmount: number
      color: string
      percentage: number
    }>
    totalAmount: number
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#6366F1'
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium mb-1">{data.categoryName}</p>
        <p className="text-sm text-gray-600">Amount: {formatCurrency(data.amount)}</p>
        <p className="text-sm text-gray-600">Percentage: {data.percentage.toFixed(1)}%</p>
        <p className="text-sm text-gray-600">Transactions: {data.transactionCount}</p>
      </div>
    )
  }
  return null
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage < 5) return null // Don't show labels for small slices
  
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  )
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data.categories || data.categories.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No category data available</p>
          <p className="text-sm">Add some transactions to see category breakdown</p>
        </div>
      </div>
    )
  }

  // Filter out categories with zero amounts and transactions to prevent label stacking
  const categoriesWithData = data.categories.filter(cat => 
    cat.amount > 0 && cat.transactionCount > 0
  )

  if (categoriesWithData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No transaction data available</p>
          <p className="text-sm">Categories exist but have no transactions yet</p>
        </div>
      </div>
    )
  }

  // Only show top 8 categories with actual data and group the rest
  const topCategories = categoriesWithData.slice(0, 8)
  const remainingCategories = categoriesWithData.slice(8)
  
  let chartData = [...topCategories]
  
  if (remainingCategories.length > 0) {
    const othersAmount = remainingCategories.reduce((sum, cat) => sum + cat.amount, 0)
    const totalAmount = categoriesWithData.reduce((sum, cat) => sum + cat.amount, 0)
    const othersPercentage = (othersAmount / totalAmount) * 100
    
    chartData.push({
      categoryId: 'others',
      categoryName: 'Others',
      amount: othersAmount,
      transactionCount: remainingCategories.reduce((sum, cat) => sum + cat.transactionCount, 0),
      averageAmount: othersAmount / remainingCategories.length,
      color: '#6B7280',
      percentage: othersPercentage,
    })
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="amount"
            minAngle={1} // Prevent tiny slices that cause label overlap
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {entry.payload.categoryName} ({formatCurrency(entry.payload.amount)})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
} 