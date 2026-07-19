'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  CheckSquare,
  Gift,
  User,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  ShoppingBag,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useKidStore } from '@/stores/kid-store'
import { Avatar, Button } from '@/components/ui'
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/chores', icon: CheckSquare, label: 'Chores' },
  { href: '/habits', icon: Sparkles, label: 'Habits' },
  { href: '/rewards', icon: Gift, label: 'Rewards' },
  { href: '/avatar-shop', icon: ShoppingBag, label: 'Avatar Shop' },
  { href: '/profile', icon: User, label: 'Profiles' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { currentKid, clearStore } = useKidStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Persist the kid store per-session. If the persisted sessionHash on
  // load differs from the current session (e.g. user signed out and a
  // different user signed in on the same browser), wipe the store so we
  // don't leak the previous user's kids.
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userId = session.user.id || session.user.email || 'unknown'
      const state = useKidStore.getState()
      if (state.sessionHash && state.sessionHash !== userId) {
        state.clearStore()
      }
      state.setSessionHash(userId)
    }
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router, session])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin" />
    </div>
  )

  if (!session) return null

  return (
    <div className="min-h-screen flex">
      {/* Skip navigation link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg" aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside className={cn('fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white shadow-xl flex flex-col transform transition-transform lg:translate-x-0', isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="p-6 border-b flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">ChoreChamps</span>
        </div>

        {currentKid ? (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-background)]">
              <Avatar name={currentKid.name} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{currentKid.name}</p>
                <p className="text-sm text-gray-500">{currentKid.age} years old</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b"><Link href="/profile" className="block w-full px-4 py-2 text-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-xl font-semibold transition-colors">Select Profile</Link></div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                pathname === item.href
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              clearStore()
              signOut({ callbackUrl: '/login' })
            }}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main id="main-content" className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 bg-[var(--color-background)]">
          <div className="max-w-4xl mx-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <PwaInstallPrompt />
    </div>
  )
}
