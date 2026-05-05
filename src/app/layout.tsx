import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from './providers'
import { Suspense } from 'react'
import PostHogPageView from '@/components/PostHogPageView'

const geistSans = localFont({
  src: './fonts/GeistVF.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'ChoreChamps - Fun Chores for Kids!',
  description: 'A fun, gamified chore and habit tracker for kids. Complete tasks, earn rewards, and become a ChoreChamp!',
  keywords: ['kids', 'chores', 'habits', 'gamification', 'rewards', 'family'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {/* Analytics Provider Setup */}
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  )
}
