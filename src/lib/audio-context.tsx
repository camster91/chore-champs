'use client'

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react'

interface AudioContextType {
  play: (soundName: 'pop' | 'tada' | 'click' | 'unlock' | 'levelUp') => void
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

const SOUNDS = {
  pop: '/sounds/pop.mp3',
  tada: '/sounds/tada.mp3',
  click: '/sounds/click.mp3',
  unlock: '/sounds/unlock.mp3',
  levelUp: '/sounds/levelup.mp3',
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  // Stable per-provider audio cache. We mutate Map contents (set/clear), never
  // reassign `.current`, so the linter's `react-hooks/immutability` rule
  // (which only flags `ref.current = X` mutations inside effects) stays happy.
  const audioCache = useRef<Map<keyof typeof SOUNDS, HTMLAudioElement>>(new Map())

  useEffect(() => {
    const cache = audioCache.current
    return () => {
      // Pause + clear every cached audio element to release decoder resources
      // when the provider unmounts (e.g. SPA teardown, route change).
      cache.forEach((audio) => {
        audio.pause()
        audio.src = ''
        audio.load()
      })
      cache.clear()
    }
  }, [])

  const play = useCallback((soundName: keyof typeof SOUNDS) => {
    if (typeof window === 'undefined') return

    const cache = audioCache.current
    let audio = cache.get(soundName)
    if (!audio) {
      audio = new Audio(SOUNDS[soundName])
      cache.set(soundName, audio)
    }

    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore errors (usually due to user not interacting with page yet)
    })
  }, [])

  return (
    <AudioContext.Provider value={{ play }}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}