'use client'

import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, User, Shield, Bell, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  const settingsSections = [
    {
      icon: User,
      title: 'Profile Settings',
      description: 'Update your personal information and preferences',
      href: '/settings/profile'
    },
    {
      icon: Shield,
      title: 'Security & Privacy',
      description: 'Manage your password and privacy settings',
      href: '/settings/security'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure alerts and notification preferences',
      href: '/settings/notifications'
    },
    {
      icon: Database,
      title: 'Data & Backup',
      description: 'Export your data and manage backups',
      href: '/settings/data'
    }
  ]

  return (
    <ProtectedLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section) => {
            const Icon = section.icon
            return (
              <Card 
                key={section.title}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(section.href)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{section.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Application Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Version</span>
              <span className="text-sm text-gray-500">1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database</span>
              <span className="text-sm text-gray-500">SQLite (Local)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Storage</span>
              <span className="text-sm text-gray-500">Local File System</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  )
} 