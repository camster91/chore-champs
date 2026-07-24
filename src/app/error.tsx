'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-gray-500 max-w-md">
        We hit an unexpected error. You can try again, or head back home.
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
          href="/"
          className="px-4 py-2 rounded-xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold"
        >
          Home
        </Link>
      </div>
    </div>
  )
}
