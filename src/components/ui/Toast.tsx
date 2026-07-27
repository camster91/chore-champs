'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { getUserFriendlyError } from '@/lib/utils/error'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number // ms, default 5000
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-400',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-400',
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-400',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-400',
    icon: <Info className="w-5 h-5 text-blue-500" />,
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => setToasts([]), [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast-${++counterRef.current}-${Date.now()}`
      const duration = t.duration ?? 5000
      setToasts((prev) => [...prev, { ...t, id }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const style = variantStyles[t.variant]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
                className={`pointer-events-auto flex gap-3 rounded-lg border p-3 shadow-lg ${style.bg} ${style.border}`}
                role="alert"
              >
                <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

/** Convenience wrapper for try/catch with automatic error toast */
export function tryOrToast<T>(
  fn: () => Promise<T>,
  toast: ToastContextValue['toast'],
  errorTitle = 'Something went wrong'
): Promise<T | undefined> {
  return fn().catch((err) => {
    toast({
      title: errorTitle,
      description: getUserFriendlyError(err),
      variant: 'error',
    })
    return undefined
  })
}

/**
 * useServerAction — wraps any server-action call with unified loading,
 * success, and error toast feedback. Replaces the duplicated try/catch +
 * manual toast blocks that were scattered across pages.
 *
 * Usage:
 *   const run = useServerAction(addSampleData, {
 *     success: { title: 'Sample data added!', getDescription: (r) => r?.message },
 *     error: { title: 'Failed to add sample data' },
 *   })
 *   await run()  // fires the action, shows toasts automatically
 */
export function useServerAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: {
    success?:
      | { title: string; description?: string; getDescription?: (result: TResult) => string | undefined }
      | false
    error?: { title?: string; getMessage?: (err: unknown) => string }
  } = {}
) {
  const { toast } = useToast()
  const [isPending, setIsPending] = useState(false)

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setIsPending(true)
      try {
        const result = await action(...args)
        if (options.success !== false) {
          const desc =
            options.success?.description ??
            options.success?.getDescription?.(result) ??
            undefined
          toast({
            title: options.success?.title ?? 'Done',
            description: desc,
            variant: 'success',
          })
        }
        return result
      } catch (err) {
        const msg = options.error?.getMessage?.(err) ?? getUserFriendlyError(err)
        toast({
          title: options.error?.title ?? 'Something went wrong',
          description: msg,
          variant: 'error',
        })
        return undefined
      } finally {
        setIsPending(false)
      }
    },
    [action, toast, options]
  )

  return { run, isPending }
}
