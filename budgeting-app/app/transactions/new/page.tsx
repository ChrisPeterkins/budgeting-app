'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewTransactionPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold">Add Transaction</h1>
            <p className="text-gray-600">Record a new income or expense</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              New Transaction Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Transaction Form Coming Soon</h3>
              <p className="mb-4">This feature will be available in the next phase of development</p>
              <Button variant="outline" onClick={() => router.push('/uploads')}>
                Upload Statement Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
} 