import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Nunito } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const nunito = Nunito({ 
  subsets: ['latin'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'ChoreChamps - Make Chores Fun!',
  description: 'A fun, gamified chore and habit tracker for kids. Turn household responsibilities into exciting adventures with points, rewards, and family goals!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ChoreChamps',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'ChoreChamps',
    title: 'ChoreChamps - Make Chores Fun!',
    description: 'A fun, gamified chore and habit tracker for kids.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary',
    title: 'ChoreChamps - Make Chores Fun!',
    description: 'A fun, gamified chore and habit tracker for kids.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${nunito.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ChoreChamps" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
