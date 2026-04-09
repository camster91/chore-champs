'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, User, Users, ArrowLeft } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    familyName: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          familyName: formData.familyName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      // Sign in after successful registration
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/dashboard')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
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
          <CardContent className="p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                ChoreChamps
              </span>
            </div>

            <h1 className="text-2xl font-bold text-center mb-2">
              Create Your Family Account
            </h1>
            <p className="text-gray-500 text-center mb-8">
              Start your chore-conquering adventure!
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Your Name"
                name="name"
                type="text"
                placeholder="Mom, Dad, Guardian..."
                value={formData.name}
                onChange={handleChange}
                leftIcon={<User className="w-5 h-5" />}
                required
              />

              <Input
                label="Family Name"
                name="familyName"
                type="text"
                placeholder="The Smith Family"
                value={formData.familyName}
                onChange={handleChange}
                leftIcon={<Users className="w-5 h-5" />}
                required
              />

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="parent@example.com"
                value={formData.email}
                onChange={handleChange}
                leftIcon={<Mail className="w-5 h-5" />}
                required
              />

              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                leftIcon={<Lock className="w-5 h-5" />}
                required
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                leftIcon={<Lock className="w-5 h-5" />}
                required
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Create Account
              </Button>
            </form>

            <p className="text-center text-gray-500 mt-6">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Decorative elements */}
        <motion.div
          className="absolute top-20 right-10 text-4xl opacity-20"
          animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🎉
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-10 text-4xl opacity-20"
          animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          🚀
        </motion.div>
      </motion.div>
    </div>
  )
}
