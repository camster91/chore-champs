'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react'
import { useKidStore, Kid } from '@/stores/kid-store'
import { useThemeStore, ThemeMode } from '@/stores/theme-store'
import { Card, CardContent, Button, Input, Modal } from '@/components/ui'
import { PointsDisplay, StreakCounter, LevelBadge, AchievementBadge } from '@/components/gamification'
import { useFetch, apiPost, apiPatch, apiDelete } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

interface ServerKid {
  id: string
  name: string
  age: number
  avatarId: string
  themeMode: 'GIRL' | 'BOY' | 'NEUTRAL'
  primaryColor: string
  secondaryColor: string
  points: number
  totalPoints: number
  streakDays: number
  level: number
  experience: number
}

interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  category: string
  earned: boolean
  earnedAt: string | null
}

const avatarOptions = [
  { id: 'unicorn', emoji: '🦄' },
  { id: 'dragon', emoji: '🐉' },
  { id: 'robot', emoji: '🤖' },
  { id: 'astronaut', emoji: '👨‍🚀' },
  { id: 'fairy', emoji: '🧚' },
  { id: 'superhero', emoji: '🦸' },
  { id: 'cat', emoji: '🐱' },
  { id: 'dog', emoji: '🐶' },
  { id: 'panda', emoji: '🐼' },
  { id: 'lion', emoji: '🦁' },
  { id: 'owl', emoji: '🦉' },
  { id: 'star', emoji: '⭐' },
]

const themeOptions: { mode: ThemeMode; label: string; colors: [string, string] }[] = [
  { mode: 'GIRL', label: 'Pink', colors: ['#ec4899', '#a855f7'] },
  { mode: 'BOY', label: 'Blue', colors: ['#3b82f6', '#22c55e'] },
  { mode: 'NEUTRAL', label: 'Purple', colors: ['#6366f1', '#8b5cf6'] },
]

export default function ProfilePage() {
  const { currentKid, setCurrentKid, syncFromServer } = useKidStore()
  const { setMode, setCustomColors } = useThemeStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingKid, setEditingKid] = useState<Kid | null>(null)
  const [deletingKid, setDeletingKid] = useState<Kid | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    avatarId: 'unicorn',
    themeMode: 'NEUTRAL' as ThemeMode,
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  })

  const { data: serverKids, isLoading, mutate } = useFetch<ServerKid[]>('/api/kids')
  const { data: badges } = useFetch<BadgeData[]>(
    currentKid ? `/api/badges?kidId=${currentKid.id}` : null
  )

  // Sync server kids to local store
  useEffect(() => {
    if (serverKids) {
      syncFromServer(serverKids)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKids])

  const handleCreateKid = async () => {
    if (!formData.name || !formData.age) return

    try {
      const newKid = await apiPost<ServerKid>('/api/kids', {
        name: formData.name,
        age: parseInt(formData.age),
        avatarId: formData.avatarId,
        themeMode: formData.themeMode,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      })

      const kid: Kid = {
        ...newKid,
        experience: newKid.experience || 0,
      }

      setCurrentKid(kid)
      setMode(kid.themeMode)
      setCustomColors(kid.primaryColor, kid.secondaryColor)
      setIsCreateModalOpen(false)
      resetForm()
      mutate()
    } catch (err) {
      console.error('Failed to create kid:', err)
    }
  }

  const handleEditKid = async () => {
    if (!editingKid || !formData.name || !formData.age) return

    try {
      const updated = await apiPatch<ServerKid>(`/api/kids/${editingKid.id}`, {
        name: formData.name,
        age: parseInt(formData.age),
        avatarId: formData.avatarId,
        themeMode: formData.themeMode,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      })

      if (currentKid?.id === editingKid.id) {
        setMode(updated.themeMode)
        setCustomColors(updated.primaryColor, updated.secondaryColor)
      }

      setIsEditModalOpen(false)
      setEditingKid(null)
      resetForm()
      mutate()
    } catch (err) {
      console.error('Failed to update kid:', err)
    }
  }

  const handleDeleteKid = async () => {
    if (!deletingKid) return

    try {
      await apiDelete(`/api/kids/${deletingKid.id}`)
      if (currentKid?.id === deletingKid.id) {
        setCurrentKid(null)
      }
      setIsDeleteModalOpen(false)
      setDeletingKid(null)
      mutate()
    } catch (err) {
      console.error('Failed to delete kid:', err)
    }
  }

  const handleSelectKid = (kid: Kid) => {
    setCurrentKid(kid)
    setMode(kid.themeMode)
    setCustomColors(kid.primaryColor, kid.secondaryColor)
  }

  const openEditModal = (kid: Kid) => {
    setEditingKid(kid)
    setFormData({
      name: kid.name,
      age: kid.age.toString(),
      avatarId: kid.avatarId,
      themeMode: kid.themeMode,
      primaryColor: kid.primaryColor,
      secondaryColor: kid.secondaryColor,
    })
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (kid: Kid) => {
    setDeletingKid(kid)
    setIsDeleteModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      avatarId: 'unicorn',
      themeMode: 'NEUTRAL',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
    })
  }

  const getAvatarEmoji = (avatarId: string) => {
    return avatarOptions.find((a) => a.id === avatarId)?.emoji || '⭐'
  }

  const handleThemeSelect = (option: typeof themeOptions[number]) => {
    setFormData({
      ...formData,
      themeMode: option.mode,
      primaryColor: option.colors[0],
      secondaryColor: option.colors[1],
    })
  }

  const kids = useKidStore((s) => s.kids)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-12 h-12 text-[var(--color-primary)]" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold">Kid Profiles</h1>
        <p className="text-gray-500 mt-1">Manage your family&apos;s ChoreChamps</p>
      </motion.div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kids.map((kid, index) => (
          <motion.div
            key={kid.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all',
                currentKid?.id === kid.id && 'ring-4 ring-[var(--color-primary)]'
              )}
              hoverable
              onClick={() => handleSelectKid(kid)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{
                      background: `linear-gradient(135deg, ${kid.primaryColor}, ${kid.secondaryColor})`,
                    }}
                  >
                    {getAvatarEmoji(kid.avatarId)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(kid)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteModal(kid)
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold">{kid.name}</h3>
                <p className="text-gray-500 text-sm">Age {kid.age}</p>

                <div className="flex items-center gap-4 mt-4">
                  <PointsDisplay points={kid.points} size="sm" />
                  <StreakCounter days={kid.streakDays} size="sm" showLabel={false} />
                  <LevelBadge
                    level={kid.level}
                    experience={kid.experience}
                    experienceToNext={100}
                    size="sm"
                    showProgress={false}
                  />
                </div>

                {currentKid?.id === kid.id && (
                  <div className="flex items-center gap-2 mt-4 text-[var(--color-primary)]">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Active Profile</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Add New Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: kids.length * 0.1 }}
        >
          <Card
            className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-[var(--color-primary)] transition-colors"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-600">Add New Kid</p>
              <p className="text-sm text-gray-400 mt-1">Create a new profile</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Current Kid's Badges */}
      {currentKid && badges && badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">{currentKid.name}&apos;s Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <AchievementBadge
                    key={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    earned={badge.earned}
                    earnedAt={badge.earnedAt ? new Date(badge.earnedAt) : undefined}
                    size="md"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create Kid Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          resetForm()
        }}
        title="Create New Profile"
        description="Set up a new ChoreChamp!"
        size="lg"
      >
        <KidForm
          formData={formData}
          setFormData={setFormData}
          avatarOptions={avatarOptions}
          themeOptions={themeOptions}
          onThemeSelect={handleThemeSelect}
          onSubmit={handleCreateKid}
          onCancel={() => {
            setIsCreateModalOpen(false)
            resetForm()
          }}
          submitLabel="Create Profile"
        />
      </Modal>

      {/* Edit Kid Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingKid(null)
          resetForm()
        }}
        title="Edit Profile"
        description="Update ChoreChamp settings"
        size="lg"
      >
        <KidForm
          formData={formData}
          setFormData={setFormData}
          avatarOptions={avatarOptions}
          themeOptions={themeOptions}
          onThemeSelect={handleThemeSelect}
          onSubmit={handleEditKid}
          onCancel={() => {
            setIsEditModalOpen(false)
            setEditingKid(null)
            resetForm()
          }}
          submitLabel="Save Changes"
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingKid(null)
        }}
        title="Remove Profile?"
        size="sm"
      >
        <div className="text-center">
          <p className="text-gray-500 mb-6">
            Are you sure you want to remove <span className="font-bold">{deletingKid?.name}</span>?
            This will delete all their chores, badges, and rewards. This action cannot be undone.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDeletingKid(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={handleDeleteKid}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Extracted form component to avoid duplication
function KidForm({
  formData,
  setFormData,
  avatarOptions,
  themeOptions,
  onThemeSelect,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  formData: { name: string; age: string; avatarId: string; themeMode: ThemeMode; primaryColor: string; secondaryColor: string }
  setFormData: (data: typeof formData) => void
  avatarOptions: { id: string; emoji: string }[]
  themeOptions: { mode: ThemeMode; label: string; colors: [string, string] }[]
  onThemeSelect: (option: { mode: ThemeMode; label: string; colors: [string, string] }) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Name"
          placeholder="Kid's name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Input
          label="Age"
          type="number"
          placeholder="Age"
          min={1}
          max={18}
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Avatar
        </label>
        <div className="grid grid-cols-6 gap-2">
          {avatarOptions.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => setFormData({ ...formData, avatarId: avatar.id })}
              className={cn(
                'w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all',
                formData.avatarId === avatar.id
                  ? 'bg-[var(--color-primary)] scale-110 shadow-lg'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              {avatar.emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Theme
        </label>
        <div className="flex gap-3">
          {themeOptions.map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => onThemeSelect(option)}
              className={cn(
                'flex-1 p-4 rounded-xl border-2 transition-all text-center',
                formData.themeMode === option.mode
                  ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2"
                style={{
                  background: `linear-gradient(135deg, ${option.colors[0]}, ${option.colors[1]})`,
                }}
              />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={!formData.name || !formData.age}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
