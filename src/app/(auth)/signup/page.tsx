'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui'
import { initI18n, t as translate } from '@/lib/i18n'
import { useEffect } from 'react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [step, setStep] = useState<'info' | 'creating'>('info')
  const [formData, setFormData] = useState({
    name: '',
    email: searchParams.get('email') || '',
    password: '',
    inviteToken: inviteToken,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setStep('creating')

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          inviteToken: formData.inviteToken,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || translate('auth.failedToCreateAccount'))
        setStep('info')
        return
      }

      // Auto sign in after successful registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Account created but auto sign-in failed — redirect to login
        setError(translate('auth.accountCreated'))
        setStep('info')
        return
      }

      router.push('/dashboard')
    } catch {
      setError(translate('auth.somethingWentWrong'))
      setStep('info')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'creating') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">{translate('auth.creatingYourAccount')}</h2>
          <p className="text-gray-500 mb-4">
            {inviteToken ? translate('auth.joiningFamily') : translate('auth.settingUpFamily')}
          </p>
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {translate('common.back')}
        </Link>

        <div className="rounded-2xl bg-white shadow-xl">
          {inviteToken && <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl" />}
          <div className="p-4 sm:p-8">
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                ChoreChamps
              </span>
            </div>

            <h1 className="text-2xl font-bold text-center mb-2">
              {inviteToken ? translate('auth.joinFamily') : translate('auth.createYourFamily')}
            </h1>
            <p className="text-gray-500 text-center mb-8">
              {inviteToken ? translate('auth.createAccountJoinFamily') : translate('auth.startAdventure')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input id="name" label={translate('common.name') || 'Your Name'} type="text" autoComplete="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Mom, Dad, Guardian..." />
              <Input id="email" label={translate('auth.email')} type="email" autoComplete="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={translate('auth.emailPlaceholder')} />
              <Input id="password" label={translate('auth.password')} type="password" autoComplete="new-password" required minLength={8} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={translate('common.passwordMin')} />

              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

              <button type="submit" disabled={isLoading} className="w-full py-3 px-6 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> {inviteToken ? translate('auth.joinFamily') : translate('auth.createAccount')}</>}
              </button>
            </form>

            <p className="text-center text-gray-500 mt-6">
              {translate('auth.alreadyHaveAccount')} <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">{translate('auth.signIn')}</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function SignupPage() {
  useEffect(() => {
    initI18n()
  }, [])

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
      <SignupForm />
    </Suspense>
  )
}