'use client'

import { useThemeStore, ThemeMode, themePresets } from '@/stores/theme-store'
import { cn } from '@/lib/utils'
import { Sun, Candy, Waves, Trees, Palette } from 'lucide-react'

const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'SOLAR', label: 'Solar', icon: <Sun className="w-5 h-5" /> },
  { mode: 'CANDY', label: 'Candy', icon: <Candy className="w-5 h-5" /> },
  { mode: 'DEEP_SEA', label: 'Deep Sea', icon: <Waves className="w-5 h-5" /> },
  { mode: 'FOREST', label: 'Forest', icon: <Trees className="w-5 h-5" /> },
  { mode: 'NEUTRAL', label: 'Rainbow', icon: <Palette className="w-5 h-5" /> },
]

interface ThemeSwitcherProps {
  showColorPicker?: boolean
  className?: string
}

export function ThemeSwitcher({ showColorPicker = false, className }: ThemeSwitcherProps) {
  const { mode, setMode, customPrimary, customSecondary, setCustomColors } = useThemeStore()

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        {themeOptions.map((option) => {
          const colors = themePresets[option.mode]
          const isActive = mode === option.mode

          return (
            <button
              key={option.mode}
              onClick={() => setMode(option.mode)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                'border-2 hover:scale-105',
                isActive
                  ? 'border-current shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              style={{
                backgroundColor: isActive ? colors.background : undefined,
                color: colors.primary,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                {option.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {option.label}
              </span>
              <div className="flex gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.primary }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.secondary }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.accent }}
                />
              </div>
            </button>
          )
        })}
      </div>

      {showColorPicker && (
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-medium text-gray-600">Custom Colors</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="primary-color" className="text-sm text-gray-500">
                Primary
              </label>
              <input
                id="primary-color"
                type="color"
                value={customPrimary || themePresets[mode].primary}
                onChange={(e) =>
                  setCustomColors(
                    e.target.value,
                    customSecondary || themePresets[mode].secondary
                  )
                }
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="secondary-color" className="text-sm text-gray-500">
                Secondary
              </label>
              <input
                id="secondary-color"
                type="color"
                value={customSecondary || themePresets[mode].secondary}
                onChange={(e) =>
                  setCustomColors(
                    customPrimary || themePresets[mode].primary,
                    e.target.value
                  )
                }
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
