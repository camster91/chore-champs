'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'

// Map NextAuth error codes to user-friendly messages
const NEXT_AUTH_ERRORS: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration. Please try again later or contact support.',
  CredentialsSignin: 'Invalid email or password.',
  AccessDenied: 'Access denied. You do not have permission to sign in.',
  Verification: 'The verification link has expired or is invalid. Please request a new one.',
  OAuthSignin: 'There was a problem signing in with that provider.',
  OAuthCallback: 'There was a problem completing the sign-in process.',
  OAuthCreateAccount: 'Could not create an account with that provider.',
  EmailCreateAccount: 'Could not create an account with that email.',
  Callback: 'There was a problem processing your sign-in.',
  SessionRequired: 'You must be signed in to access this page.',
  Default: 'An unexpected error occurred. Please try again.',
}

function getErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) return null
  return NEXT_AUTH_ERRORS[errorCode] || NEXT_AUTH_ERRORS.Default
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    // Check for NextAuth error in URL on initial load
    return getErrorMessage(searchParams.get('error'))
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card variant="elevated">
          <CardContent className="p-5 sm:p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                ChoreChamps
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-bold text-center mb-1 sm:mb-2">Welcome back!</h1>
            <p className="text-gray-500 text-center mb-5 sm:mb-8 text-sm sm:text-base">
              Sign in to continue your adventure
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>

            <p className="text-center text-gray-500 mt-6">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Decorative elements */}
        <motion.div
          className="absolute top-20 left-10 text-4xl opacity-20 hidden sm:block"
          animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🌟
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-10 text-4xl opacity-20 hidden sm:block"
          animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          🏆
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
