'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession, signOut } from 'next-auth/react'
import {
  User,
  Palette,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useThemeStore, ThemeMode, themePresets } from '@/stores/theme-store'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { mode, setMode, setCustomColors } = useThemeStore()
  const { currentKid } = useKidStore()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  const themeOptions: { mode: ThemeMode; label: string; icon: string; colors: [string, string] }[] = [
    { mode: 'GIRL', label: 'Pink Dream', icon: '🌸', colors: ['#ec4899', '#a855f7'] },
    { mode: 'BOY', label: 'Ocean Blue', icon: '🌊', colors: ['#3b82f6', '#22c55e'] },
    { mode: 'NEUTRAL', label: 'Royal Purple', icon: '💜', colors: ['#6366f1', '#8b5cf6'] },
  ]

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Customize your ChoreChamps experience</p>
      </motion.div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold">Account</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">{session?.user?.name || 'Parent'}</p>
                  <p className="text-sm text-gray-500">{session?.user?.email}</p>
                </div>
              </div>

              {currentKid && (
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="text-sm text-gray-500">Active Profile</p>
                    <p className="font-medium">{currentKid.name}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Level {currentKid.level}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold">Theme</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => {
                    setMode(option.mode)
                    setCustomColors(option.colors[0], option.colors[1])
                  }}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-center',
                    mode === option.mode
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-primary)]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${option.colors[0]}, ${option.colors[1]})`,
                    }}
                  />
                  <span className="text-lg">{option.icon}</span>
                  <p className="text-sm font-medium mt-1">{option.label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preferences Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold">Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-gray-500" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">Sound Effects</p>
                    <p className="text-sm text-gray-500">Play sounds on chore completion</p>
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    soundEnabled ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
                  )}
                >
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full absolute top-1"
                    animate={{ left: soundEnabled ? 26 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Reminders</p>
                    <p className="text-sm text-gray-500">Get reminded about pending chores</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={cn(
                    'w-12 h-7 rounded-full transition-colors relative',
                    notificationsEnabled ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
                  )}
                >
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full absolute top-1"
                    animate={{ left: notificationsEnabled ? 26 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          variant="outline"
          className="w-full text-red-500 border-red-200 hover:bg-red-50"
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign Out
        </Button>
      </motion.div>
    </div>
  )
}
