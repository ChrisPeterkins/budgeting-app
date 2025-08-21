'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Building,
  CreditCard,
  Banknote,
  PiggyBank,
  Search,
  RefreshCw,
  X
} from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function StatementsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [selectedStatement, setSelectedStatement] = useState<any>(null)

  // Fetch data
  const { data: accounts } = api.accounts.getAll.useQuery()
  const { data: statementsData, isLoading, refetch } = api.statements.getAll.useQuery({
    accountId: selectedAccountId === 'all' ? undefined : selectedAccountId || undefined,
    limit: 50,
    offset: 0,
  })
  const { data: analytics } = api.statements.getAnalytics.useQuery()

  const statements = statementsData?.statements || []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'MMM dd, yyyy')
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CHECKING':
        return <Banknote className="w-4 h-4" />
      case 'SAVINGS':
        return <PiggyBank className="w-4 h-4" />
      case 'CREDIT_CARD':
        return <CreditCard className="w-4 h-4" />
      default:
        return <Building className="w-4 h-4" />
    }
  }

  const getStatementTypeColor = (type: string) => {
    switch (type) {
      case 'MONTHLY':
        return 'bg-blue-100 text-blue-800'
      case 'QUARTERLY':
        return 'bg-green-100 text-green-800'
      case 'ANNUAL':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter statements based on search term
  const filteredStatements = statements.filter((statement: any) => {
    const matchesSearch = !searchTerm || 
      statement.accountSections.some((section: any) => 
        section.account?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.account?.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.accountName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    return matchesSearch
  })

  // Helper function to get primary account section (for single-account statements)
  const getPrimaryAccountSection = (statement: any) => {
    return statement.accountSections[0] || {}
  }

  // Helper function to get all accounts in a statement
  const getStatementAccounts = (statement: any) => {
    return statement.accountSections
  }

  // Helper function to check if statement has multiple accounts
  const isMultiAccountStatement = (statement: any) => {
    return statement.accountSections.length > 1
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <FileText className="mr-3 h-8 w-8 text-blue-600" />
              Statements
            </h1>
            <p className="text-gray-600">Track and manage your financial statements</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Total Statements</p>
                    <p className="text-2xl font-bold">{analytics.totalStatements}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Reconciled</p>
                    <p className="text-2xl font-bold">{analytics.reconciledStatements}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold">{analytics.unreconciledStatements}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{analytics.totalTransactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="account-filter">Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accounts</SelectItem>
                    {accounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center space-x-2">
                          {getAccountIcon(account.type)}
                          <span>{account.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by account or bank..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="period-filter">Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All periods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All periods</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statements List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Statements</CardTitle>
            <CardDescription>
              View and manage your imported financial statements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStatements.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No statements found</h3>
                <p className="text-gray-600 mb-4">
                  {statements.length === 0 
                    ? "Upload some bank statements to get started tracking your financial history."
                    : "Try adjusting your search or filter criteria."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStatements.map((statement) => (
                  <div
                    key={statement.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getAccountIcon(statement.accountSections[0].account?.type || 'CHECKING')}
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {statement.accountSections[0].account?.name || 'N/A'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {statement.accountSections[0].account?.institution || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Statement Date</p>
                            <p className="font-medium">{formatDate(statement.statementDate)}</p>
                          </div>
                          
                          <div>
                            <p className="text-gray-500">Period</p>
                            <p className="font-medium">
                              {formatDate(statement.periodStartDate)} - {formatDate(statement.periodEndDate)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-500">Balance Range</p>
                            <p className="font-medium">
                              {(() => {
                                const primarySection = getPrimaryAccountSection(statement)
                                const beginningBalance = primarySection.beginningBalance
                                const endingBalance = primarySection.endingBalance
                                
                                if (beginningBalance !== null && endingBalance !== null) {
                                  return (
                                    <>
                                      {formatCurrency(beginningBalance)} → {formatCurrency(endingBalance)}
                                      <span className={`ml-2 text-xs ${
                                        endingBalance >= beginningBalance 
                                          ? 'text-green-600 flex items-center'
                                          : 'text-red-600 flex items-center'
                                      }`}>
                                        {endingBalance >= beginningBalance ? (
                                          <TrendingUp className="w-3 h-3 mr-1" />
                                        ) : (
                                          <TrendingDown className="w-3 h-3 mr-1" />
                                        )}
                                        {formatCurrency(Math.abs(endingBalance - beginningBalance))}
                                      </span>
                                    </>
                                  )
                                } else {
                                  return 'Not available'
                                }
                              })()}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-500">Transactions</p>
                            <p className="font-medium">{getPrimaryAccountSection(statement).transactionCount || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={getStatementTypeColor(statement.statementType)}>
                          {statement.statementType}
                        </Badge>
                        
                        {statement.isReconciled ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Reconciled
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pending Review
                          </Badge>
                        )}
                        
                        {statement.uploadedFile && (
                          <Badge variant="outline">
                            📄 {statement.uploadedFile.originalName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <Dialog open={selectedStatement?.id === statement.id} onOpenChange={(open) => setSelectedStatement(open ? statement : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedStatement(statement)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              {getAccountIcon(statement.accountSections[0].account?.type || 'CHECKING')}
                              <span>Statement Details - {statement.accountSections[0].account?.name || 'N/A'}</span>
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedStatement && (
                            <div className="space-y-6">
                              {/* Statement Overview */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Account Information</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Account:</span>
                                      <span className="font-medium">{selectedStatement.accountSections[0].account?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Institution:</span>
                                      <span className="font-medium">{selectedStatement.accountSections[0].account?.institution || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Account Type:</span>
                                      <span className="font-medium">{selectedStatement.accountSections[0].account?.type || 'CHECKING'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Statement Type:</span>
                                      <Badge className={getStatementTypeColor(selectedStatement.statementType)}>
                                        {selectedStatement.statementType}
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Statement Period</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Statement Date:</span>
                                      <span className="font-medium">{formatDate(selectedStatement.statementDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Period Start:</span>
                                      <span className="font-medium">{formatDate(selectedStatement.periodStartDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Period End:</span>
                                      <span className="font-medium">{formatDate(selectedStatement.periodEndDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Reconciled:</span>
                                      {selectedStatement.isReconciled ? (
                                        <Badge className="bg-green-100 text-green-800">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Yes
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-orange-100 text-orange-800">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Pending
                                        </Badge>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                              
                              {/* Balance Information */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Balance & Transaction Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {(() => {
                                    const primarySection = getPrimaryAccountSection(selectedStatement)
                                    return (
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                          <div className="text-sm text-gray-600">Beginning Balance</div>
                                          <div className="text-lg font-bold text-blue-600">
                                            {primarySection.beginningBalance !== null 
                                              ? formatCurrency(primarySection.beginningBalance)
                                              : 'N/A'
                                            }
                                          </div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                          <div className="text-sm text-gray-600">Ending Balance</div>
                                          <div className="text-lg font-bold text-green-600">
                                            {primarySection.endingBalance !== null 
                                              ? formatCurrency(primarySection.endingBalance)
                                              : 'N/A'
                                            }
                                          </div>
                                        </div>
                                        <div className="text-center p-4 bg-red-50 rounded-lg">
                                          <div className="text-sm text-gray-600">Total Debits</div>
                                          <div className="text-lg font-bold text-red-600">
                                            {primarySection.totalDebits !== null 
                                              ? formatCurrency(primarySection.totalDebits)
                                              : 'N/A'
                                            }
                                          </div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                          <div className="text-sm text-gray-600">Total Credits</div>
                                          <div className="text-lg font-bold text-purple-600">
                                            {primarySection.totalCredits !== null 
                                              ? formatCurrency(primarySection.totalCredits)
                                              : 'N/A'
                                            }
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  
                                  <div className="mt-4 pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Total Transactions:</span>
                                      <span className="font-bold text-lg">{getPrimaryAccountSection(selectedStatement).transactionCount || 0}</span>
                                    </div>
                                    {(() => {
                                      const primarySection = getPrimaryAccountSection(selectedStatement)
                                      if (primarySection.beginningBalance !== null && primarySection.endingBalance !== null) {
                                        return (
                                          <div className="flex justify-between items-center mt-2">
                                            <span className="text-gray-600">Net Change:</span>
                                            <div className={`font-bold text-lg flex items-center ${
                                              primarySection.endingBalance >= primarySection.beginningBalance 
                                                ? 'text-green-600' 
                                                : 'text-red-600'
                                            }`}>
                                              {primarySection.endingBalance >= primarySection.beginningBalance ? (
                                                <TrendingUp className="w-4 h-4 mr-1" />
                                              ) : (
                                                <TrendingDown className="w-4 h-4 mr-1" />
                                              )}
                                              {formatCurrency(Math.abs(primarySection.endingBalance - primarySection.beginningBalance))}
                                            </div>
                                          </div>
                                        )
                                      }
                                      return null
                                    })()}
                                  </div>
                                </CardContent>
                              </Card>
                              
                              {/* Notes and File Information */}
                              {(selectedStatement.notes || selectedStatement.uploadedFile) && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Additional Information</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    {selectedStatement.notes && (
                                      <div>
                                        <h4 className="font-medium text-sm mb-2">Notes</h4>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                          {selectedStatement.notes}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {selectedStatement.uploadedFile && (
                                      <div>
                                        <h4 className="font-medium text-sm mb-2">Source File</h4>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                          <div className="flex items-center space-x-2">
                                            <FileText className="w-4 h-4 text-gray-600" />
                                            <span className="text-sm">{selectedStatement.uploadedFile.originalName}</span>
                                          </div>
                                          <Button variant="outline" size="sm">
                                            <Download className="w-4 h-4 mr-1" />
                                            Download
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {statement.uploadedFile && (
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statement Details Dialog */}
      {selectedStatement && (
        <Dialog open={!!selectedStatement} onOpenChange={() => setSelectedStatement(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Statement Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Add your statement details components here */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ProtectedLayout>
  )
} 