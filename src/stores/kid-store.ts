import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Kid {
  id: string
  name: string
  age: number
  avatarId: string
  points: number
  /**
   * Current consecutive-day streak. Reset to 0 when a day is missed,
   * incremented by 1 on each daily completion. Used by the dashboard
   * streak widget + the celebration modal milestones.
   */
  currentStreak: number
  /**
   * All-time longest streak. Never decreases. Used to display "best ever"
   * alongside the live streak.
   */
  longestStreak: number
  /**
   * ISO timestamp of the kid's most recent chore completion. Used by the
   * streak engine to compute whether the next completion is same-day,
   * consecutive-day, or a streak-breaking gap. Null if the kid has never
   * completed a chore.
   */
  lastCompletedAt: string | null
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
                currentStreak: sk.currentStreak ?? 0,
                longestStreak: sk.longestStreak ?? 0,
                lastCompletedAt: sk.lastCompletedAt ?? null,
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
          // Bump version on every schema change so the `migrate` callback runs
          // once per upgrade and backfills missing fields without losing user data.
          version: 2,
          migrate: (persistedState: unknown, version: number): unknown => {
            // v1 → v2: streak fields were added. Backfill defaults so the
            // persisted shape matches the current Kid interface.
            if (version < 2 && persistedState && typeof persistedState === 'object') {
              const state = persistedState as {
                kids?: Array<Record<string, unknown>>
                currentKid?: Record<string, unknown> | null
              }
              const backfill = (k: Record<string, unknown>) => ({
                currentStreak: 0,
                longestStreak: 0,
                lastCompletedAt: null,
                ...k,
              })
              return {
                ...state,
                kids: state.kids?.map(backfill),
                currentKid: state.currentKid ? backfill(state.currentKid) : null,
              }
            }
            return persistedState
          },
          partialize: (state) => ({
            currentKid: state.currentKid,
            kids: state.kids,
            sessionHash: state.sessionHash,
          }),
        }
      )
)
