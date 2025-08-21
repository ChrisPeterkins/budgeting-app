'use client'

import { useRealtimeData } from '@/lib/hooks/use-realtime-data'
import { useEffect, useRef } from 'react'

export function RealtimeDataManager({ children }: { children: React.ReactNode }) {
  const { triggerDataInvalidation } = useRealtimeData()
  const lastInvalidationRef = useRef<number>(0)

  // Listen for file upload completion events
  useEffect(() => {
    const handleFileProcessed = () => {
      console.log('File processing completed, triggering data invalidation...')
      
      // Dispatch event for notifications
      window.dispatchEvent(new CustomEvent('dataRefreshStarted'))
      
      // Trigger data invalidation
      triggerDataInvalidation()
      
      // After a delay, show completion notification
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('fileProcessingCompleted'))
      }, 2000)
    }

    // Listen for custom events that might be triggered after file processing
    window.addEventListener('fileProcessingCompleted', handleFileProcessed)
    
    // Also listen for focus events to refresh data when returning to the app
    const handleWindowFocus = () => {
      const now = Date.now()
      // Only trigger if more than 30 seconds have passed since last invalidation
      if (now - lastInvalidationRef.current > 30000) {
        console.log('Window focused, triggering data refresh...')
        window.dispatchEvent(new CustomEvent('dataRefreshStarted'))
        triggerDataInvalidation()
        lastInvalidationRef.current = now
      }
    }
    
    window.addEventListener('focus', handleWindowFocus)

    // Listen for storage events from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'data-invalidation-trigger') {
        window.dispatchEvent(new CustomEvent('dataRefreshStarted'))
      }
    }
    
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('fileProcessingCompleted', handleFileProcessed)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [triggerDataInvalidation])

  return <>{children}</>
} 