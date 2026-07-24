'use client'

import { useState, useEffect, useCallback } from 'react'

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
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      if (!signal?.aborted) {
        setData(json)
      }
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return
      }
      setError(err instanceof Error ? err.message : 'Unknown error')
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

// Generic mutation helper
export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
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
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Delete failed' }))
    throw new Error(data.error || 'Delete failed')
  }
}
