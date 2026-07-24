'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserFriendlyError } from '@/lib/utils/error'

interface FetchState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  mutate: () => Promise<void>
}

export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!!url)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null)
      setIsLoading(false)
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You appear to be offline. Check your connection and try again.')
      setIsLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      if (!controller.signal.aborted) {
        setData(json)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError('You appear to be offline. Check your connection and try again.')
      } else {
        setError(getUserFriendlyError(err))
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [url])

  useEffect(() => {
    fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData])

  return { data, error, isLoading, mutate: fetchData }
}

// Generic mutation helper
export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Check your connection and try again.')
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Check your connection and try again.')
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function apiDelete(url: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Check your connection and try again.')
  }
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Delete failed' }))
    throw new Error(data.error || 'Delete failed')
  }
}
