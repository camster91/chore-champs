'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { initI18n, t as translate } from '@/lib/i18n'
import { useEffect } from 'react'

// Map NextAuth error codes to user-friendly messages
const NEXT_AUTH_ERRORS: Record<string, string> = {
  Configuration: 'errors.configuration',
  CredentialsSignin: 'errors.credentialsSignin',
  AccessDenied: 'errors.accessDenied',
  Verification: 'errors.verification',
  OAuthSignin: 'errors.oauthSignin',
  OAuthCallback: 'errors.oauthCallback',
  OAuthCreateAccount: 'errors.oauthCreateAccount',
  EmailCreateAccount: 'errors.emailCreateAccount',
  Callback: 'errors.callback',
  SessionRequired: 'errors.sessionRequired',
  Default: 'errors.default',
}

function getErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) return null
  const key = NEXT_AUTH_ERRORS[errorCode] || NEXT_AUTH_ERRORS.Default
  return translate(key)
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
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
        setError(translate('auth.invalidCredentials'))
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError(translate('auth.somethingWentWrong'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
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
          {translate('common.back')}
        </Link>

        <Card variant="elevated">
          <CardContent className="p-4 sm:p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                ChoreChamps
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">
              {translate('auth.welcomeBack')}
            </h1>
            <p className="text-gray-500 text-center mb-6 sm:mb-8 text-sm sm:text-base">
              {translate('auth.signInToContinue')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={translate('auth.email')}
                type="email"
                autoComplete="email"
                placeholder={translate('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                required
              />

              <Input
                label={translate('auth.password')}
                type="password"
                autoComplete="current-password"
                placeholder={translate('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-5 h-5" />}
                required
              />

              {error && (
                <motion.div
                  role="alert"
                  aria-live="assertive"
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
                {translate('auth.signIn')}
              </Button>
            </form>

            <p className="text-center text-gray-500 mt-6">
              {translate('auth.dontHaveAccount')}{' '}
              <Link
                href="/signup"
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                {translate('auth.signUp')}
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
      </motion.div>
    </main>
  )
}

export default function LoginPage() {
  useEffect(() => {
    initI18n()
  }, [])

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
