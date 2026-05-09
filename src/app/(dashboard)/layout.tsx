'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
import { useTranslation } from 'react-i18next'
import { useKidStore } from '@/stores/kid-store'
import { Avatar, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { currentKid } = useKidStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { t } = useTranslation()

  const navItems = [
    { href: '/dashboard', icon: Home, label: t('nav.home') },
    { href: '/chores', icon: CheckSquare, label: t('nav.chores') },
    { href: '/habits', icon: Sparkles, label: t('nav.habits') },
    { href: '/rewards', icon: Gift, label: t('nav.rewards') },
    { href: '/avatar-shop', icon: ShoppingBag, label: t('nav.avatarShop') },
    { href: '/profile', icon: User, label: t('nav.profiles') },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ]

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Sparkles className="w-12 h-12 text-[var(--color-primary)]" />
      </motion.div>
    </div>
  )

  if (!session) return null

  return (
    <div className="min-h-screen flex">
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg">
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <motion.aside className={cn('fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white shadow-xl flex flex-col transform transition-transform lg:translate-x-0', isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
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
                <p className="text-sm text-gray-500">{t('nav.yearsOld', { age: currentKid.age })}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b"><Link href="/profile"><Button variant="outline" className="w-full">{t('nav.selectProfile')}</Button></Link></div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)}>
              <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl transition-colors', pathname === item.href ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-gray-100 text-gray-600')}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => signOut({ callbackUrl: '/login' })} leftIcon={<LogOut className="w-4 h-4" />}>
            {t('nav.signOut')}
          </Button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 bg-[var(--color-background)]">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  )
}
