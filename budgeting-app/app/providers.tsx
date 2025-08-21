'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'
import { api } from '@/lib/trpc/client'
import { AuthProvider } from '@/lib/auth/auth-context'
import { Toaster } from '@/components/ui/sonner'
import { RealtimeDataManager } from '@/components/layout/realtime-data-manager'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds (reduced from 1 minute for fresher data)
        refetchOnWindowFocus: true, // Refetch when window gains focus
        refetchOnMount: true, // Refetch when component mounts
        refetchOnReconnect: true, // Refetch when reconnecting
        retry: 1, // Only retry once on failure
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export function TRPCProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc`,
          headers() {
            // Get auth token from localStorage
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
            return token ? { authorization: `Bearer ${token}` } : {}
          },
        }),
      ],
    })
  )

  return (
    <AuthProvider>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RealtimeDataManager>
            {children}
            <Toaster position="top-right" />
          </RealtimeDataManager>
        </QueryClientProvider>
      </api.Provider>
    </AuthProvider>
  )
} 