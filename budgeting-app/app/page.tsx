'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Test tRPC connection (this will fail until we have auth, but that's OK)
  const { data: authTest, error } = api.auth.test.useQuery(undefined, {
    retry: false,
    enabled: isAuthenticated,
  })

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Personal Budgeting App
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A local-first budgeting solution for couples to manage their finances together
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* System Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                System Status
              </CardTitle>
              <CardDescription>Check if the backend is running</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span className="text-green-600 font-medium">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span>tRPC API:</span>
                  {error ? (
                    <span className="text-yellow-600 font-medium">Auth Required</span>
                  ) : authTest ? (
                    <span className="text-green-600 font-medium">Working</span>
                  ) : (
                    <span className="text-gray-500">Testing...</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your budgeting journey</CardDescription>
            </CardHeader>
                                     <CardContent className="space-y-3">
              <Link href="/auth">
                <Button className="w-full" variant="default">
                  Sign Up / Login
                </Button>
              </Link>
               <Button className="w-full" variant="outline" disabled>
                 Upload Bank Statement
               </Button>
               <Button className="w-full" variant="outline" disabled>
                 View Dashboard
               </Button>
               <p className="text-xs text-gray-500 text-center mt-2">
                 Sign in to access all features
               </p>
             </CardContent>
          </Card>

          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>What you can do with this app</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Track expenses and income
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Set and monitor budgets
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Financial goal tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Upload bank statements
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Analytics and insights
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Technical Information */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Local-First Architecture</CardTitle>
              <CardDescription>Zero ongoing costs, complete privacy</CardDescription>
            </CardHeader>
            <CardContent className="text-left">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Technology Stack:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Next.js 15 with TypeScript</li>
                    <li>• SQLite Database</li>
                    <li>• tRPC for API</li>
                    <li>• Tailwind CSS + shadcn/ui</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Benefits:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Runs entirely on your computer</li>
                    <li>• No monthly subscription fees</li>
                    <li>• Complete data privacy</li>
                    <li>• Works offline</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
