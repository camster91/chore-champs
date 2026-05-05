import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Kid {
  id: string
  name: string
  age: number
  avatarId: string
  themeMode: 'SOLAR' | 'CANDY' | 'DEEP_SEA' | 'FOREST' | 'NEUTRAL'
  primaryColor: string
  secondaryColor: string
  points: number
  totalPoints: number
  gems: number
  totalGems: number
  streakDays: number
  level: number
  experience: number
}

interface KidState {
  currentKid: Kid | null
  kids: Kid[]

  setCurrentKid: (kid: Kid | null) => void
  setKids: (kids: Kid[]) => void
  addKid: (kid: Kid) => void
  updateKid: (kidId: string, updates: Partial<Kid>) => void
  removeKid: (kidId: string) => void
  addPoints: (amount: number) => void
  syncFromServer: (kids: Kid[]) => void
}

export const useKidStore = create<KidState>()(
  persist(
    (set, get) => ({
      currentKid: null,
      kids: [],

      setCurrentKid: (kid) => set({ currentKid: kid }),

      setKids: (kids) => set({ kids }),

      addKid: (kid) =>
        set((state) => ({
          kids: [...state.kids, kid],
        })),

      updateKid: (kidId, updates) =>
        set((state) => ({
          kids: state.kids.map((k) =>
            k.id === kidId ? { ...k, ...updates } : k
          ),
          currentKid:
            state.currentKid?.id === kidId
              ? { ...state.currentKid, ...updates }
              : state.currentKid,
        })),

      removeKid: (kidId) =>
        set((state) => ({
          kids: state.kids.filter((k) => k.id !== kidId),
          currentKid:
            state.currentKid?.id === kidId ? null : state.currentKid,
        })),

      addPoints: (amount) => {
        const state = get()
        if (!state.currentKid) return

        const newPoints = state.currentKid.points + amount
        const newTotalPoints = state.currentKid.totalPoints + amount

        set({
          currentKid: {
            ...state.currentKid,
            points: newPoints,
            totalPoints: newTotalPoints,
          },
          kids: state.kids.map((k) =>
            k.id === state.currentKid!.id
              ? { ...k, points: newPoints, totalPoints: newTotalPoints }
              : k
          ),
        })
      },

      // Sync local store with server data, preserving current kid selection
      syncFromServer: (serverKids) => {
        const state = get()
        const kids: Kid[] = serverKids.map((sk) => ({
          id: sk.id,
          name: sk.name,
          age: sk.age,
          avatarId: sk.avatarId,
          themeMode: sk.themeMode,
          primaryColor: sk.primaryColor,
          secondaryColor: sk.secondaryColor,
          points: sk.points,
          totalPoints: sk.totalPoints,
          gems: sk.gems,
          totalGems: sk.totalGems,
          streakDays: sk.streakDays,
          level: sk.level,
          experience: sk.experience,
        }))

        const currentKid = state.currentKid
          ? kids.find((k) => k.id === state.currentKid!.id) || null
          : null

        set({ kids, currentKid })
      },
    }),
    {
      name: 'kids-chore-kid',
    }
  )
)
