'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MobileLiveDashboard } from '@/components/mobile-live-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { useOptimisticUpdates } from '@/lib/hooks/use-optimistic-updates'
import { 
  Smartphone, 
  Monitor, 
  Zap, 
  RefreshCw, 
  Bell, 
  Wifi, 
  Target,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function RealtimeDemoPage() {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [demoActions, setDemoActions] = useState<string[]>([])

  const realtimeData = useRealtimeData({
    enableBudgets: true,
    enableGoals: true,
    enableTransactions: true,
    enableAnalytics: true,
    enableAccounts: true
  })

  const optimisticUpdates = useOptimisticUpdates()

  const addDemoAction = (action: string) => {
    setDemoActions(prev => [action, ...prev.slice(0, 9)]) // Keep last 10 actions
  }

  const handleDemoTransaction = async () => {
    addDemoAction('Creating optimistic transaction...')
    try {
      await optimisticUpdates.createTransactionOptimistic.mutateAsync({
        accountId: 'demo-account',
        categoryId: 'demo-category',
        amount: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : -Math.floor(Math.random() * 100),
        description: `Demo Transaction ${Math.floor(Math.random() * 1000)}`,
        date: new Date()
      })
      addDemoAction('✅ Transaction created with optimistic update')
    } catch (error) {
      addDemoAction('❌ Transaction creation failed')
    }
  }

  const handleDemoGoalUpdate = async () => {
    const goals = realtimeData.data.goals
    if (!goals?.length) {
      addDemoAction('❌ No goals available for demo')
      return
    }

    const randomGoal = goals[Math.floor(Math.random() * goals.length)]
    const amount = Math.floor(Math.random() * 100) + 10

    addDemoAction(`Updating goal "${randomGoal.name}" with +$${amount}...`)
    try {
      await optimisticUpdates.updateGoalProgressOptimistic.mutateAsync({
        id: randomGoal.id,
        action: 'add',
        amount
      })
      addDemoAction(`✅ Goal updated with optimistic feedback`)
    } catch (error) {
      addDemoAction('❌ Goal update failed')
    }
  }

  const handleRefreshDemo = async () => {
    addDemoAction('Triggering manual refresh...')
    await realtimeData.refreshAll()
    addDemoAction('✅ Manual refresh completed')
  }

  const getFeatureStatus = (feature: keyof typeof realtimeData.isFetching) => {
    if (realtimeData.isFetching[feature]) return { icon: RefreshCw, text: 'Syncing', color: 'text-blue-500' }
    if (realtimeData.errors[feature]) return { icon: AlertCircle, text: 'Error', color: 'text-red-500' }
    return { icon: CheckCircle, text: 'Live', color: 'text-green-500' }
  }

  if (viewMode === 'mobile') {
    return (
      <ProtectedRoute>
        <div className="relative">
          {/* Mobile View Controls */}
          <div className="fixed top-4 left-4 z-50 flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('desktop')}
              className="bg-white shadow-lg"
            >
              <Monitor className="w-4 h-4 mr-1" />
              Desktop
            </Button>
            <Badge variant="secondary">Mobile Demo</Badge>
          </div>

          {/* Mobile Dashboard */}
          <MobileLiveDashboard />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Real-time Features Demo
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Experience live data updates, optimistic UI, and mobile-first design
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setViewMode('mobile')}
                className="flex items-center"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile View
              </Button>
              <Button
                onClick={handleRefreshDemo}
                disabled={Object.values(realtimeData.isFetching).some(Boolean)}
                className="flex items-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${Object.values(realtimeData.isFetching).some(Boolean) ? 'animate-spin' : ''}`} />
                Refresh All
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="features" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="features">Real-time Features</TabsTrigger>
            <TabsTrigger value="status">Connection Status</TabsTrigger>
            <TabsTrigger value="optimistic">Optimistic Updates</TabsTrigger>
            <TabsTrigger value="mobile">Mobile Experience</TabsTrigger>
          </TabsList>

          <TabsContent value="features">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Data Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Live Data Streams
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(['transactions', 'budgets', 'goals', 'accounts'] as const).map(feature => {
                    const status = getFeatureStatus(feature)
                    const StatusIcon = status.icon
                    
                    return (
                      <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className={`w-4 h-4 ${status.color} ${realtimeData.isFetching[feature] ? 'animate-spin' : ''}`} />
                          <span className="font-medium capitalize">{feature}</span>
                        </div>
                        <Badge variant={status.text === 'Live' ? 'default' : 'secondary'}>
                          {status.text}
                        </Badge>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Connection Quality */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wifi className="w-5 h-5 mr-2" />
                    Connection Quality
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Network Status</span>
                    <Badge variant={realtimeData.isOnline ? 'default' : 'destructive'}>
                      {realtimeData.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>API Connection</span>
                    <Badge variant={realtimeData.isConnected ? 'default' : 'destructive'}>
                      {realtimeData.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Polling Status</span>
                    <Badge variant={Object.values(realtimeData.isFetching).some(Boolean) ? 'secondary' : 'default'}>
                      {Object.values(realtimeData.isFetching).some(Boolean) ? 'Active' : 'Idle'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Real-time Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Freshness</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-green-600">
                    {realtimeData.data.recentTransactions?.totalCount || 0}
                  </div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <div className="text-2xl font-bold text-blue-600">
                    {realtimeData.data.goalStats?.totalGoals || 0}
                  </div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update Intervals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Transactions</span>
                    <Badge variant="outline">30s</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Budgets</span>
                    <Badge variant="outline">45s</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Goals</span>
                    <Badge variant="outline">60s</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Analytics</span>
                    <Badge variant="outline">2m</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Background Updates</span>
                    <Badge variant="default">✓ Enabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Window Focus Refresh</span>
                    <Badge variant="default">✓ Enabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Offline Detection</span>
                    <Badge variant="default">✓ Enabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Error Recovery</span>
                    <Badge variant="default">✓ Auto</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="optimistic">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demo Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Optimistic Updates Demo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={handleDemoTransaction}
                      disabled={optimisticUpdates.isCreatingTransaction}
                      className="flex items-center justify-center"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      {optimisticUpdates.isCreatingTransaction ? 'Creating...' : 'Add Demo Transaction'}
                    </Button>
                    
                    <Button
                      onClick={handleDemoGoalUpdate}
                      disabled={optimisticUpdates.isUpdatingGoal}
                      variant="outline"
                      className="flex items-center justify-center"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      {optimisticUpdates.isUpdatingGoal ? 'Updating...' : 'Update Goal Progress'}
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>These actions use optimistic updates for instant UI feedback:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>UI updates immediately</li>
                      <li>Real API call happens in background</li>
                      <li>Reverts if API call fails</li>
                      <li>Shows toast notifications</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Action Log */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {demoActions.length > 0 ? (
                      demoActions.map((action, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
                          <span>{action}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No actions yet. Try the demo buttons!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mobile">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mobile Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="w-5 h-5 mr-2" />
                    Mobile Optimizations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pull-to-Refresh</span>
                      <Badge variant="default">✓ Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Touch Gestures</span>
                      <Badge variant="default">✓ Responsive</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quick Actions FAB</span>
                      <Badge variant="default">✓ Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Offline Support</span>
                      <Badge variant="default">✓ Graceful</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Live Status Bar</span>
                      <Badge variant="default">✓ Real-time</Badge>
                    </div>
                  </div>

                  <Button
                    onClick={() => setViewMode('mobile')}
                    className="w-full flex items-center justify-center"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Switch to Mobile View
                  </Button>
                </CardContent>
              </Card>

              {/* Mobile Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Mobile Features Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Pull-to-Refresh</p>
                        <p className="text-xs text-gray-600">Swipe down to refresh data</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Target className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Quick Goal Updates</p>
                        <p className="text-xs text-gray-600">Tap +$50/+$100 buttons</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Bell className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Live Notifications</p>
                        <p className="text-xs text-gray-600">Real-time progress alerts</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
} 