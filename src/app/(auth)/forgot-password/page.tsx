'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Input } from '@/components/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ResetFlowProps {
  email: string
  resetToken: string
  parentId: string
  onClose: () => void
}

function ResetPasswordForm({ email, resetToken, onClose }: ResetFlowProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/recovery-codes/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reset password')
        return
      }

      setSuccess('Password updated! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Enter a new password for <strong>{email}</strong>.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="relative">
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <button
          type="button"
          className="absolute right-3 top-[32px] text-gray-400"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={isSubmitting || password.length < 8}
      >
        Reset Password
      </Button>
    </div>
  )
}

// Main use form
function UseCodeForm({ onToken }: { onToken: (data: { email: string; resetToken: string; parentId: string }) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email || !code) {
      setError('Email and code are required')
      return
    }
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/recovery-codes/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid code')
        return
      }

      onToken({ email, resetToken: data.resetToken, parentId: data.parentId })
    } catch {
      setError('Network error. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Enter your email and one of your recovery codes to reset your password.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />

      <Input
        label="Recovery Code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        className="font-mono tracking-wider"
      />

      <Button
        className="w-full"
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={isSubmitting || !email || !code}
      >
        Verify Code
      </Button>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'use' | 'reset'>('use')
  const [resetData, setResetData] = useState<{
    email: string
    resetToken: string
    parentId: string
  } | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-6 border-b bg-purple-50">
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'use' ? 'Recover Your Account' : 'Set New Password'}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {step === 'use'
              ? 'Use a recovery code to regain access.'
              : 'Choose a new password for your account.'}
          </p>
        </div>

        <div className="p-6">
          {step === 'use' ? (
            <UseCodeForm
              onToken={(data) => {
                setResetData(data)
                setStep('reset')
              }}
            />
          ) : resetData ? (
            <ResetPasswordForm
              email={resetData.email}
              resetToken={resetData.resetToken}
              parentId={resetData.parentId}
              onClose={() => {}}
            />
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
