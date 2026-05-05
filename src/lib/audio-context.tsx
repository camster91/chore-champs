'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'

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
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  const play = useCallback((soundName: keyof typeof SOUNDS) => {
    if (typeof window === 'undefined') return

    let audio = audioRefs.current[soundName]
    if (!audio) {
      audio = new Audio(SOUNDS[soundName])
      audioRefs.current[soundName] = audio
    }

    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore errors (usually due to user not interacting with page yet)
      console.log(`Audio play failed for ${soundName} - interactions required first.`)
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
