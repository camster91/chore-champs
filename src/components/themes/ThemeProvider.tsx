'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme-store'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { getColors, mode } = useThemeStore()

  useEffect(() => {
    const colors = getColors()
    const root = document.documentElement

    // Apply theme colors as CSS variables
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-secondary', colors.secondary)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-background', colors.background)
    root.style.setProperty('--color-surface', colors.surface)
    root.style.setProperty('--color-text', colors.text)
    root.style.setProperty('--color-text-muted', colors.textMuted)

    // Set theme mode class for conditional styling
    root.classList.remove('theme-girl', 'theme-boy', 'theme-neutral')
    root.classList.add(`theme-${mode.toLowerCase()}`)
  }, [getColors, mode])

  return <>{children}</>
}
