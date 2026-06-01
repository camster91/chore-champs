import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Nunito } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const nunito = Nunito({ 
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  // Use NEXTAUTH_URL (set in deploy to https://chores.ashbi.ca) so og:image
  // and other absolute social URLs resolve to production, not localhost.
  // Fallback to NEXT_PUBLIC_SITE_URL, then production URL, then localhost for dev.
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://chores.ashbi.ca' : 'http://localhost:3000')
  ),
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
  maximumScale: 5,
  userScalable: true,
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
