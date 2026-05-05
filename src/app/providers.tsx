'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/theme-provider'
import { ServiceWorkerRegistration } from './service-worker-registration'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <ServiceWorkerRegistration />
      </ThemeProvider>
    </SessionProvider>
  )
}
