'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  PieChart, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  BarChart3,
  Download
} from 'lucide-react'
import { useUploads } from '@/lib/hooks/use-file-upload'
import { useEffect } from 'react'

export default function UploadStatsPage() {
  const { uploads, loading, error, fetchUploads } = useUploads()

  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  // Calculate statistics
  const totalFiles = uploads.length
  const completedFiles = uploads.filter(f => f.status === 'COMPLETED').length
  const failedFiles = uploads.filter(f => f.status === 'FAILED').length
  const processingFiles = uploads.filter(f => f.status === 'PROCESSING').length
  const pendingFiles = uploads.filter(f => f.status === 'PENDING').length

  const totalTransactions = uploads
    .filter(f => f.status === 'COMPLETED')
    .reduce((sum, f) => sum + (f.transactionCount || 0), 0)

  const totalFileSize = uploads.reduce((sum, f) => sum + f.fileSize, 0)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const bankStats = uploads.reduce((acc, file) => {
    const bankName = (file as any).bankName || 'Unknown'
    if (!acc[bankName]) {
      acc[bankName] = { count: 0, transactions: 0 }
    }
    acc[bankName].count++
    if (file.status === 'COMPLETED') {
      acc[bankName].transactions += file.transactionCount || 0
    }
    return acc
  }, {} as Record<string, { count: number, transactions: number }>)

  const successRate = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Upload Statistics</h1>
            <p className="text-gray-600">Analysis and insights from your file uploads</p>
          </div>
          <Button onClick={() => fetchUploads()}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh Stats
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold">{totalFiles}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Size</p>
                  <p className="text-2xl font-bold">{formatFileSize(totalFileSize)}</p>
                </div>
                <Download className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                File Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{completedFiles}</span>
                    <Badge className="bg-green-100 text-green-800">
                      {totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Failed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{failedFiles}</span>
                    <Badge className="bg-red-100 text-red-800">
                      {totalFiles > 0 ? Math.round((failedFiles / totalFiles) * 100) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span>Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{processingFiles}</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {totalFiles > 0 ? Math.round((processingFiles / totalFiles) * 100) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{pendingFiles}</span>
                    <Badge className="bg-gray-100 text-gray-800">
                      {totalFiles > 0 ? Math.round((pendingFiles / totalFiles) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(bankStats).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(bankStats)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .map(([bank, stats]) => (
                      <div key={bank} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{bank}</span>
                          <p className="text-sm text-gray-500">
                            {stats.transactions} transactions
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {stats.count} {stats.count === 1 ? 'file' : 'files'}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No files uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="mt-8 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span>Error loading upload statistics: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
