'use client'

import { useState } from 'react'
import { EnhancedFileDropzone } from '@/components/uploads/enhanced-file-dropzone'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FolderOpen, BarChart3 } from 'lucide-react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { useRouter } from 'next/navigation'

export default function UploadsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  const handleUploadComplete = (files: any[]) => {
    console.log('Files uploaded:', files)
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Files</h1>
          <p className="text-gray-600">
            Upload and automatically process your bank statements and financial documents
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="flex space-x-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/file-manager')}
            className="flex items-center space-x-2"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Manage Files</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/upload-stats')}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>View Statistics</span>
          </Button>
        </div>

        <EnhancedFileDropzone 
          onUploadComplete={handleUploadComplete}
          maxFiles={10}
        />
      </div>
    </ProtectedLayout>
  )
} 