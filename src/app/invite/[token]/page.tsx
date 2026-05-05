'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Mail, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { useKidStore } from '@/stores/kid-store'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { setKids, setCurrentKid } = useKidStore()
  
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    async function checkInvite() {
      try {
        const res = await fetch(`/api/invite/${token}`)
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || 'Invalid invitation')
        }
      } catch (e) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }
    checkInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (!res.ok) {
        if (data.requiresLeave) {
          setError(data.message + ' Would you like to leave your current family and join this one?')
        } else if (data.needsLogin) {
          setNeedsLogin(true)
        } else {
          setError(data.error || 'Failed to accept invitation')
        }
        return
      }
      
      setSuccess(true)
      
      // Refresh kids data
      const kidsRes = await fetch('/api/kids')
      const kids = await kidsRes.json()
      if (kids.length > 0) {
        setKids(kids)
        setCurrentKid(kids[0])
      }
      
      // Redirect to dashboard after delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (e) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !needsLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => router.push('/')}>Go Home</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Invited!</h1>
              <p className="text-gray-600 mb-6">
                Sign in or create an account to join the family.
              </p>
              <div className="space-y-3">
                <Button className="w-full" onClick={() => router.push(`/login?invite=${token}`)}>
                  Sign In
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/signup?invite=${token}`)}>
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Welcome to the Family!</h1>
              <p className="text-gray-600 mb-4">You&apos;ve been added to the family. Redirecting...</p>
              <div className="animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              You&apos;re Invited!
            </h1>
            <p className="text-gray-600 mb-6">
              Join the family adventure on ChoreChamps! Complete chores, earn rewards, and have fun together.
            </p>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Join the Family
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
