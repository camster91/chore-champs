import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'SOLAR' | 'CANDY' | 'DEEP_SEA' | 'FOREST' | 'NEUTRAL'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textMuted: string
}

export const themePresets: Record<ThemeMode, ThemeColors> = {
  SOLAR: {
    primary: '#f59e0b',     // Amber
    secondary: '#ef4444',   // Red
    accent: '#facc15',      // Yellow
    background: '#fffbeb',  // Amber tint
    surface: '#ffffff',
    text: '#451a03',
    textMuted: '#92400e',
  },
  CANDY: {
    primary: '#ec4899',     // Pink
    secondary: '#06b6d4',   // Cyan
    accent: '#f472b6',      // Light pink
    background: '#fdf2f8',  // Pink tint
    surface: '#ffffff',
    text: '#500724',
    textMuted: '#9d174d',
  },
  DEEP_SEA: {
    primary: '#3b82f6',     // Blue
    secondary: '#1e40af',   // Dark Blue
    accent: '#06b6d4',      // Cyan
    background: '#eff6ff',  // Blue tint
    surface: '#ffffff',
    text: '#1e3a8a',
    textMuted: '#1e40af',
  },
  FOREST: {
    primary: '#22c55e',     // Green
    secondary: '#15803d',   // Dark Green
    accent: '#84cc16',      // Lime
    background: '#f0fdf4',  // Green tint
    surface: '#ffffff',
    text: '#064e3b',
    textMuted: '#166534',
  },
  NEUTRAL: {
    primary: '#6366f1',     // Indigo
    secondary: '#8b5cf6',   // Violet
    accent: '#f59e0b',      // Amber
    background: '#f5f3ff',  // Violet tint
    surface: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
  },
}

interface ThemeState {
  mode: ThemeMode
  customPrimary: string | null
  customSecondary: string | null
  kidId: string | null

  setMode: (mode: ThemeMode) => void
  setCustomColors: (primary: string, secondary: string) => void
  setKidId: (kidId: string | null) => void
  getColors: () => ThemeColors
  reset: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'NEUTRAL',
      customPrimary: null,
      customSecondary: null,
      kidId: null,

      setMode: (mode) => set({ mode }),

      setCustomColors: (primary, secondary) =>
        set({ customPrimary: primary, customSecondary: secondary }),

      setKidId: (kidId) => set({ kidId }),

      getColors: () => {
        const state = get()
        const preset = themePresets[state.mode]

        if (state.customPrimary && state.customSecondary) {
          return {
            ...preset,
            primary: state.customPrimary,
            secondary: state.customSecondary,
          }
        }

        return preset
      },

      reset: () =>
        set({
          mode: 'NEUTRAL',
          customPrimary: null,
          customSecondary: null,
          kidId: null,
        }),
    }),
    {
      name: 'kids-chore-theme',
    }
  )
)
