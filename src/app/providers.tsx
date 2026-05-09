'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/theme-provider'
import { ServiceWorkerRegistration } from './service-worker-registration'
import { I18nProvider } from '@/components/I18nProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  )
}
