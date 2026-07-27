'use client'

import { useState, useEffect, useCallback } from 'react'
import { getUserFriendlyError } from '@/lib/utils/error'

interface FetchState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  mutate: () => Promise<void>
}

function friendlyFetchError(err: unknown): string {
  if (err instanceof TypeError || (err instanceof Error && /failed to fetch|network/i.test(err.message))) {
    return 'You appear to be offline. Check your connection and try again.'
  }
  return getUserFriendlyError(err)
}

export function useFetch<T>(url: string | null): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!!url)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!url) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(url, { signal })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        // Prefer server-provided safe messages; never dump stack traces
        const msg =
          typeof body.error === 'string' && body.error.length < 200
            ? body.error
            : `Request failed (${res.status})`
        throw new Error(msg)
      }
      const json = await res.json()
      if (!signal?.aborted) {
        setData(json)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!signal?.aborted) {
        setError(friendlyFetchError(err))
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [url])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  const mutate = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return { data, error, isLoading, mutate }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw new Error(friendlyFetchError(err))
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed')
  return data
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(friendlyFetchError(err))
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed')
  return data
}

export async function apiDelete(url: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(url, { method: 'DELETE' })
  } catch (err) {
    throw new Error(friendlyFetchError(err))
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Delete failed' }))
    throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed')
  }
}
