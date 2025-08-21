'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Trash2, 
  Database, 
  RefreshCw, 
  AlertTriangle,
  Info,
  Code,
  Bug,
  TestTube,
  Download,
  Upload,
  Eye
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { toast } from 'sonner'

export default function DevToolsPage() {
  const [isClearing, setIsClearing] = useState<string | null>(null)
  
  const deleteAllTransactionsMutation = api.transactions.deleteAll.useMutation()
  const recalculateAllBalancesMutation = api.accounts.recalculateAllBalances.useMutation()
  const clearAllDataMutation = api.accounts.clearAllData.useMutation()
  
  // Get some stats for display
  const { data: accounts } = api.accounts.getAll.useQuery()
  const { data: transactions } = api.transactions.getAll.useQuery({ limit: 1, offset: 0 })
  const { data: budgets } = api.budgets.getAll.useQuery()
  const { data: goals } = api.goals.getAll.useQuery()

  const handleClearAllTransactions = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL transactions from the database.\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to proceed?'
    )
    
    if (!confirmed) return

    const doubleConfirmed = window.confirm(
      '🚨 FINAL WARNING: You are about to delete ALL transaction data.\n\n' +
      'Type "DELETE" in your mind and click OK to confirm, or Cancel to abort.'
    )
    
    if (!doubleConfirmed) return

    try {
      setIsClearing('transactions')
      await deleteAllTransactionsMutation.mutateAsync()
      toast.success('All transactions deleted successfully')
    } catch (error) {
      toast.error('Failed to delete transactions')
      console.error('Delete transactions error:', error)
    } finally {
      setIsClearing(null)
    }
  }

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      '🚨 EXTREME WARNING: This will permanently delete ALL DATA from the database.\n\n' +
      'This includes:\n' +
      '• ALL Accounts\n' +
      '• ALL Transactions\n' +
      '• ALL Uploaded Files\n' +
      '• ALL Budgets\n' +
      '• ALL Goals\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to proceed?'
    )
    
    if (!confirmed) return

    const doubleConfirmed = window.confirm(
      '🚨 FINAL WARNING: You are about to delete EVERYTHING.\n\n' +
      'This will completely reset your entire account to a clean state.\n' +
      'Type "DELETE EVERYTHING" in your mind and click OK to confirm, or Cancel to abort.'
    )
    
    if (!doubleConfirmed) return

    const tripleConfirmed = window.confirm(
      '🚨 LAST CHANCE: Are you 100% certain you want to delete ALL your data?\n\n' +
      'Click OK to permanently delete everything, or Cancel to abort.'
    )
    
    if (!tripleConfirmed) return

    try {
      setIsClearing('allData')
      const result = await clearAllDataMutation.mutateAsync()
      toast.success(result.message || 'All data deleted successfully')
    } catch (error) {
      toast.error('Failed to delete all data')
      console.error('Clear all data error:', error)
    } finally {
      setIsClearing(null)
    }
  }

  const handleRecalculateAllBalances = async () => {
    try {
      setIsClearing('balances')
      await recalculateAllBalancesMutation.mutateAsync()
      toast.success('All account balances recalculated successfully')
    } catch (error) {
      toast.error('Failed to recalculate balances')
      console.error('Recalculate balances error:', error)
    } finally {
      setIsClearing(null)
    }
  }

  const handleExportData = () => {
    // TODO: Implement data export functionality
    toast.info('Data export feature coming soon')
  }

  const handleViewLogs = () => {
    // TODO: Implement log viewer
    toast.info('Log viewer feature coming soon')
  }

  const totalTransactions = transactions?.totalCount || 0
  const totalAccounts = accounts?.length || 0
  const totalBudgets = budgets?.length || 0
  const totalGoals = goals?.length || 0

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-blue-600" />
            Developer Tools
          </h1>
          <p className="text-gray-600">
            Development utilities and debugging tools for the budgeting app
          </p>
          <div className="mt-4">
            <Badge variant="destructive" className="text-xs">
              ⚠️ Use with caution - These tools can modify or delete data
            </Badge>
          </div>
        </div>

        {/* Database Stats */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Database Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalAccounts}</div>
                <p className="text-sm text-gray-600">Accounts</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalTransactions}</div>
                <p className="text-sm text-gray-600">Transactions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalBudgets}</div>
                <p className="text-sm text-gray-600">Budgets</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalGoals}</div>
                <p className="text-sm text-gray-600">Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dangerous Operations */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Dangerous Operations
              </CardTitle>
              <p className="text-red-600 text-sm">
                ⚠️ These operations can permanently delete data
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-red-300 rounded-lg bg-white">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Transactions
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently delete all transactions from the database. This is useful for testing 
                  file uploads without duplicate detection issues.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearAllTransactions}
                  disabled={isClearing === 'transactions'}
                  className="w-full"
                >
                  {isClearing === 'transactions' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Transactions
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 border border-red-500 rounded-lg bg-red-100">
                <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Clear ALL Data
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  🚨 <strong>EXTREME DANGER:</strong> Permanently delete ALL data including accounts, 
                  transactions, files, budgets, and goals. This completely resets your account.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearAllData}
                  disabled={isClearing === 'allData'}
                  className="w-full bg-red-700 hover:bg-red-800 border-red-800"
                >
                  {isClearing === 'allData' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Deleting Everything...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Clear ALL Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Database Maintenance */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800 flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Database Maintenance
              </CardTitle>
              <p className="text-yellow-600 text-sm">
                Tools for maintaining data integrity
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-yellow-300 rounded-lg bg-white">
                <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate All Balances
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Recalculate account balances from transaction history. Use this if balances 
                  seem incorrect or after bulk data operations.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRecalculateAllBalances}
                  disabled={isClearing === 'balances'}
                  className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  {isClearing === 'balances' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Recalculate Balances
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Development Utilities */}
          <Card className="border-gray-200 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center">
                <Code className="w-5 h-5 mr-2" />
                Development Utilities
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Useful tools for development and debugging
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Database (JSON)
              </Button>
              
              <Button
                variant="outline"
                onClick={handleViewLogs}
                className="w-full justify-start"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Application Logs
              </Button>
              
              <Button
                variant="outline"
                onClick={() => toast.info('API testing feature coming soon')}
                className="w-full justify-start"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test API Endpoints
              </Button>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-mono text-blue-600">
                    {process.env.NODE_ENV || 'development'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Build Time:</span>
                  <span className="font-mono text-blue-600">
                    {new Date().toISOString().split('T')[0]}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Database:</span>
                  <span className="font-mono text-blue-600">SQLite</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Framework:</span>
                  <span className="font-mono text-blue-600">Next.js 15</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bug className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/uploads'}
                className="flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/transactions'}
                className="flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Transactions
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/accounts'}
                className="flex items-center"
              >
                <Database className="w-4 h-4 mr-2" />
                Manage Accounts
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 