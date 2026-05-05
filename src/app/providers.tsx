'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/themes/ThemeProvider'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { AudioProvider } from '@/lib/audio-context'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  })
}

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <PHProvider client={posthog}>
        <AudioProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AudioProvider>
      </PHProvider>
    </SessionProvider>
  )
}
