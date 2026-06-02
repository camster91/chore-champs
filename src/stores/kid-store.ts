import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Kid {
  id: string
  name: string
  age: number
  avatarId: string
  points: number
  themeMode: string
  primaryColor: string
  secondaryColor: string
}

interface KidState {
  currentKid: Kid | null
  kids: Kid[]
  /**
   * Identifier of the user session this store was populated for. Used to
   * detect cross-user contamination (two users on the same browser) — if
   * the persisted hash on load differs from the current session hash,
   * the persisted state is discarded and the store starts fresh.
   */
  sessionHash: string | null

  setCurrentKid: (kid: Kid | null) => void
  setKids: (kids: Kid[]) => void
  addKid: (kid: Kid) => void
  updateKid: (kidId: string, updates: Partial<Kid>) => void
  removeKid: (kidId: string) => void
  syncFromServer: (kids: Kid[]) => void
  setSessionHash: (hash: string | null) => void
  clearStore: () => void
}

export const useKidStore = create<KidState>()(
  persist(
    (set, get) => ({
      currentKid: null,
      kids: [],
      sessionHash: null,

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
          currentKid: state.currentKid?.id === kidId ? null : state.currentKid,
        })),

      setSessionHash: (hash) => set({ sessionHash: hash }),

      // Wipe all kid state. Used on logout and on session-hash mismatch.
      // Also removes the localStorage entry so the next user starts clean.
      clearStore: () => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('kids-chore-kid')
          } catch {
            // localStorage may be disabled in some browsers; safe to ignore
          }
        }
        set({ currentKid: null, kids: [], sessionHash: null })
      },

      // Sync local store with server data, auto-selecting first kid if none selected
      syncFromServer: (serverKids) => {
        const state = get()
        const kids: Kid[] = serverKids.map((sk) => ({
          id: sk.id,
          name: sk.name,
          age: sk.age,
          avatarId: sk.avatarId,
          points: sk.points || 0,
          themeMode: sk.themeMode,
          primaryColor: sk.primaryColor,
          secondaryColor: sk.secondaryColor,
        }))

        // Auto-select first kid if currentKid is null and kids exist
        let currentKid = state.currentKid
        if (!currentKid && kids.length > 0) {
          currentKid = kids[0]
        } else if (currentKid) {
          // Verify currentKid still exists
          const exists = kids.find((k) => k.id === currentKid!.id)
          if (!exists) {
            currentKid = kids[0] || null
          } else {
            currentKid = kids.find((k) => k.id === currentKid!.id) || null
          }
        }

        set({ kids, currentKid })
      },
    }),
    {
      name: 'kids-chore-kid',
      partialize: (state) => ({
        currentKid: state.currentKid,
        kids: state.kids,
        sessionHash: state.sessionHash,
      }),
    }
  )
)
