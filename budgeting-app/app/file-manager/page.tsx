'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FileText, RefreshCw } from 'lucide-react'
import { FileManager } from '@/components/uploads/file-manager'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function FileManagerPage() {
  const router = useRouter()

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">File Manager</h1>
            <p className="text-gray-600">Manage your uploaded bank statements and documents</p>
          </div>
          <Button onClick={() => router.push('/uploads')}>
            <FileText className="w-4 h-4 mr-2" />
            Upload New Files
          </Button>
        </div>

        <FileManager />
      </div>
    </ProtectedLayout>
  )
}
