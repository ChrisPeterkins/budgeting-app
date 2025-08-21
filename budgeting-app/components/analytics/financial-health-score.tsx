'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, PiggyBank, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface FinancialHealthScoreProps {
  data: {
    overallScore: number
    savingsRate: number
    budgetAdherence: number
    goalProgress: number
    emergencyFund: number
    metrics: {
      totalIncome: number
      totalExpenses: number
      netIncome: number
      monthlyExpenses: number
      activeGoals: number
      completedGoals: number
      activeBudgets: number
    }
    recommendations: Array<{
      type: string
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
    }>
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

const getScoreLevel = (score: number) => {
  if (score >= 80) return { level: 'Excellent', color: 'bg-green-500' }
  if (score >= 60) return { level: 'Good', color: 'bg-yellow-500' }
  if (score >= 40) return { level: 'Fair', color: 'bg-orange-500' }
  return { level: 'Needs Work', color: 'bg-red-500' }
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertTriangle className="w-4 h-4 text-red-600" />
    case 'medium':
      return <Info className="w-4 h-4 text-yellow-600" />
    default:
      return <CheckCircle className="w-4 h-4 text-blue-600" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'border-red-200 bg-red-50'
    case 'medium':
      return 'border-yellow-200 bg-yellow-50'
    default:
      return 'border-blue-200 bg-blue-50'
  }
}

export function FinancialHealthScore({ data }: FinancialHealthScoreProps) {
  const scoreLevel = getScoreLevel(data.overallScore)

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Financial Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(data.overallScore)}`}>
                {data.overallScore}
              </div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Health Level</span>
                <Badge className={`${scoreLevel.color} text-white`}>
                  {scoreLevel.level}
                </Badge>
              </div>
              <Progress value={data.overallScore} className="h-3" />
              <p className="text-sm text-gray-600 mt-2">
                Your financial health is determined by savings rate, budget adherence, goal progress, and emergency fund status.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <PiggyBank className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Savings Rate</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(data.savingsRate)}`}>
              {data.savingsRate}%
            </div>
            <Progress value={data.savingsRate} className="h-2 mt-2" />
            <p className="text-xs text-gray-500 mt-1">Target: 20%+</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Budget Adherence</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(data.budgetAdherence)}`}>
              {data.budgetAdherence}%
            </div>
            <Progress value={data.budgetAdherence} className="h-2 mt-2" />
            <p className="text-xs text-gray-500 mt-1">How well you stick to budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Goal Progress</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(data.goalProgress)}`}>
              {data.goalProgress}%
            </div>
            <Progress value={data.goalProgress} className="h-2 mt-2" />
            <p className="text-xs text-gray-500 mt-1">Average progress on goals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Emergency Fund</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(data.emergencyFund)}`}>
              {data.emergencyFund}%
            </div>
            <Progress value={data.emergencyFund} className="h-2 mt-2" />
            <p className="text-xs text-gray-500 mt-1">3-6 months coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Income & Expenses</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Income:</span>
                  <span className="font-medium text-green-600">{formatCurrency(data.metrics.totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Expenses:</span>
                  <span className="font-medium text-red-600">{formatCurrency(data.metrics.totalExpenses)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Net Income:</span>
                  <span className={`font-medium ${data.metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.metrics.netIncome)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Goals & Budgets</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Goals:</span>
                  <span className="font-medium">{data.metrics.activeGoals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed Goals:</span>
                  <span className="font-medium text-green-600">{data.metrics.completedGoals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Budgets:</span>
                  <span className="font-medium">{data.metrics.activeBudgets}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Monthly Averages</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Expenses:</span>
                  <span className="font-medium">{formatCurrency(data.metrics.monthlyExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Savings Rate:</span>
                  <span className="font-medium">{data.savingsRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getPriorityIcon(rec.priority)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 