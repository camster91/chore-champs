'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent } from './Card'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
