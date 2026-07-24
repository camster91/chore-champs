'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard/error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Dashboard error</h1>
      <p className="text-gray-500 max-w-md">
        Something went wrong loading this page. Your data is safe — try again.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-semibold"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold"
        >
          Dashboard home
        </Link>
      </div>
    </div>
  )
}
