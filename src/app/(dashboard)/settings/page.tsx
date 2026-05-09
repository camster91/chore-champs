'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Bell, 
  Share2, 
  Copy, 
  Check, 
  Mail, 
  Loader2, 
  Shield, 
  Smartphone,
  Link,
  UserPlus,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import { 
  getPendingInvites, 
  cancelInvite, 
  createFamilyInvite 
} from '@/actions/invites'
import { useAudio } from '@/lib/audio-context'

interface PendingInvite {
  id: string
  email: string
  role: string
  createdAt: string | Date
  expiresAt: string | Date
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'family' | 'notifications' | 'account'>('family')
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ message: string; inviteUrl?: string; direct?: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  
  const { play } = useAudio()

  useEffect(() => {
    loadInvites()
    checkNotificationPermission()
  }, [])

  async function loadInvites() {
    try {
      const data = await getPendingInvites()
      setInvites(data as PendingInvite[])
    } catch (error) {
      console.error('Failed to load invites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function checkNotificationPermission() {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      setPushEnabled(Notification.permission === 'granted')
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail) return
    setIsSending(true)
    setInviteResult(null)
    
    try {
      const result = await createFamilyInvite(inviteEmail)
      setInviteResult(result)
      
      if (result.direct || result.inviteUrl) {
        play('pop')
        loadInvites()
      }
      
      if (result.inviteUrl && !result.direct) {
        // Copy link to clipboard
        await navigator.clipboard.writeText(result.inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      
      setInviteEmail('')
    } catch (error) {
      console.error('Failed to send invite:', error)
      setInviteResult({ message: 'Failed to send invitation' })
    } finally {
      setIsSending(false)
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      await cancelInvite(inviteId)
      setInvites(invites.filter(i => i.id !== inviteId))
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  async function handleEnableNotifications() {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in your browser')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    setPushEnabled(permission === 'granted')

    if (permission === 'granted') {
      // Subscribe to push
      const { subscribeToPush } = await import('@/lib/push-notifications')
      await subscribeToPush()
    }
  }

  const tabs = [
    { id: 'family', label: 'Family', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: Shield },
  ]

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your family and preferences</p>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
              activeTab === tab.id 
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Family Tab */}
      {activeTab === 'family' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Invite Family Members
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Invite your spouse or other family members to join
                  </p>
                </div>
                <Button onClick={() => setShowInviteModal(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
                  Send Invite
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : invites.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700">Pending Invitations</h3>
                  {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-xs text-gray-500">
                            Sent {new Date(invite.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No pending invitations
                </p>
              )}
            </CardContent>
          </Card>

          {/* Share Link Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5" />
                Share Link
              </h2>
              <p className="text-gray-600 mb-4">
                Share this link with family members to invite them:
              </p>
              <div className="flex gap-2">
                <Input 
                  label="Invite Link"
                  value={typeof window !== 'undefined' ? `${window.location.origin}/signup` : ''} 
                  readOnly 
                  className="flex-1"
                />
                <Button 
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/signup`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Anyone with this link can create an account and will be added to your family automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">Push Notifications</h2>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    Get notified when chores are completed, rewards are earned, or it&apos;s time for chores
                  </p>
                  
                  {notificationPermission === 'denied' ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 text-sm">
                        Notifications are blocked. Please enable them in your browser settings.
                      </p>
                    </div>
                  ) : pushEnabled ? (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-green-700 font-medium">Notifications enabled</span>
                      <Button variant="outline" size="sm" onClick={() => setPushEnabled(false)}>
                        Disable
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={handleEnableNotifications} leftIcon={<Bell className="w-4 h-4" />}>
                      Enable Notifications
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { id: 'chore_completed', label: 'Chore Completed', desc: 'When a child completes a chore' },
                  { id: 'reward_earned', label: 'Reward Earned', desc: 'When a child earns enough points for a reward' },
                  { id: 'daily_reminder', label: 'Daily Reminder', desc: 'Reminder to complete daily chores' },
                  { id: 'family_goal', label: 'Family Goal Updates', desc: 'Progress on family goals' },
                ].map(item => (
                  <label key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Account Security</h2>
              <p className="text-gray-600 mb-4">
                No password required! We use magic links to sign in securely. 
                Your spouse can invite you and you&apos;ll get an email to join instantly.
              </p>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800 text-sm">
                  <strong>How it works:</strong> When someone invites you, you&apos;ll receive an email with a magic link. 
                  Click it to create your account and join the family automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => { setShowInviteModal(false); setInviteResult(null) }} title="Invite Family Member">
        <div className="space-y-4">
          <p className="text-gray-600">
            Enter the email address of the person you want to invite. They&apos;ll receive a link to join your family.
          </p>
          
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="spouse@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          
          {inviteResult && (
            <div className={cn(
              'p-4 rounded-lg',
              inviteResult.inviteUrl ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
            )}>
              <p className={inviteResult.inviteUrl ? 'text-green-800' : 'text-amber-800'}>
                {inviteResult.message}
              </p>
              {inviteResult.inviteUrl && (
                <div className="mt-2">
                  <p className="text-sm text-green-700 mb-2">Share this link:</p>
                  <div className="flex gap-2">
                    <Input 
                      label="Invite Link"
                      value={inviteResult.inviteUrl} 
                      readOnly 
                      className="text-sm"
                    />
                    <Button 
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteResult.inviteUrl!)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <Button 
            className="w-full" 
            onClick={handleSendInvite}
            disabled={isSending || !inviteEmail}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
