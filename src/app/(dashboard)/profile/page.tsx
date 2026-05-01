'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react'
import { useKidStore, Kid } from '@/stores/kid-store'
import { useThemeStore, ThemeMode } from '@/stores/theme-store'
import { Card, CardContent, Button, Input, Modal } from '@/components/ui'
import { ThemeSwitcher } from '@/components/themes/ThemeSwitcher'
import { PointsDisplay, StreakCounter, LevelBadge, AchievementBadge } from '@/components/gamification'
import { cn } from '@/lib/utils'
import { getKids, createKid, updateKid, deleteKid } from '@/actions/kids'
import { getEarnedBadges } from '@/actions/gamification'

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

export default function ProfilePage() {
  const { currentKid, kids, setCurrentKid, setKids } = useKidStore()
  const { setMode, setCustomColors } = useThemeStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingKid, setEditingKid] = useState<Kid | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [earnedBadges, setEarnedBadges] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    avatarId: 'unicorn',
    themeMode: 'NEUTRAL' as ThemeMode,
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  })

  useEffect(() => {
    async function loadKids() {
      try {
        const dbKids = await getKids()
        const formattedKids: Kid[] = dbKids.map(k => ({ ...k, themeMode: k.themeMode as ThemeMode }))
        setKids(formattedKids)

        if (!currentKid && formattedKids.length > 0) {
          const firstKid = formattedKids[0]
          setCurrentKid(firstKid)
          setMode(firstKid.themeMode)
          setCustomColors(firstKid.primaryColor, firstKid.secondaryColor)
        }
      } catch (error) {
        console.error('Failed to load kids:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadKids()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function loadBadges() {
      if (!currentKid) return
      try {
        const badges = await getEarnedBadges(currentKid.id)
        setEarnedBadges(badges)
      } catch (error) {
        console.error('Failed to load badges:', error)
      }
    }
    loadBadges()
  }, [currentKid])

  const handleCreateKid = async () => {
    if (!formData.name || !formData.age) return
    setIsSubmitting(true)
    try {
      const dbKid = await createKid({
        name: formData.name,
        age: parseInt(formData.age),
        avatarId: formData.avatarId,
        themeMode: formData.themeMode,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      })
      const newKid: Kid = { ...dbKid, themeMode: dbKid.themeMode as ThemeMode }
      setKids([...kids, newKid])
      setCurrentKid(newKid)
      setIsCreateModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Failed to create kid:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditKid = async () => {
    if (!editingKid || !formData.name || !formData.age) return
    setIsSubmitting(true)
    try {
      const dbKid = await updateKid(editingKid.id, {
        name: formData.name,
        age: parseInt(formData.age),
        avatarId: formData.avatarId,
        themeMode: formData.themeMode,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      })
      const updatedKid: Kid = { ...dbKid, themeMode: dbKid.themeMode as ThemeMode }
      setKids(kids.map(k => k.id === updatedKid.id ? updatedKid : k))
      if (currentKid?.id === editingKid.id) setCurrentKid(updatedKid)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update kid:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteKid = async (kid: Kid) => {
    if (!confirm(`Are you sure you want to remove ${kid.name}?`)) return
    try {
      await deleteKid(kid.id)
      setKids(kids.filter(k => k.id !== kid.id))
      if (currentKid?.id === kid.id) setCurrentKid(null)
    } catch (error) {
      console.error('Failed to delete kid:', error)
    }
  }

  const handleSelectKid = (kid: Kid) => {
    setCurrentKid(kid)
    setMode(kid.themeMode)
    setCustomColors(kid.primaryColor, kid.secondaryColor)
  }

  const resetForm = () => {
    setFormData({ name: '', age: '', avatarId: 'unicorn', themeMode: 'NEUTRAL', primaryColor: '#6366f1', secondaryColor: '#8b5cf6' })
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Kid Profiles</h1>
        <p className="text-gray-500">Manage your family&apos;s ChoreChamps</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kids.map((kid, index) => (
          <motion.div key={kid.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className={cn('cursor-pointer', currentKid?.id === kid.id && 'ring-4 ring-[var(--color-primary)]')} onClick={() => handleSelectKid(kid)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: `linear-gradient(135deg, ${kid.primaryColor}, ${kid.secondaryColor})` }}>
                    {avatarOptions.find(a => a.id === kid.avatarId)?.emoji || '⭐'}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingKid(kid); setFormData({ ...kid, age: kid.age.toString() }); setIsEditModalOpen(true) }}><Pencil className="w-4 h-4 text-gray-400" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteKid(kid) }}><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
                <h3 className="text-xl font-bold mt-4">{kid.name}</h3>
                <div className="flex items-center gap-4 mt-4">
                  <PointsDisplay points={kid.points} size="sm" />
                  <LevelBadge level={kid.level} experience={kid.experience} experienceToNext={100} size="sm" showProgress={false} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        <Card className="cursor-pointer border-2 border-dashed border-gray-300" onClick={() => setIsCreateModalOpen(true)}>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[160px]">
            <Plus className="w-8 h-8 text-gray-400" />
            <p className="font-medium text-gray-600 mt-2">Add New Kid</p>
          </CardContent>
        </Card>
      </div>

      {currentKid && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">{currentKid.name}&apos;s Badges</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {earnedBadges.length > 0 ? (
                earnedBadges.map(eb => <AchievementBadge key={eb.id} name={eb.badge.name} description={eb.badge.description} icon={eb.badge.icon} earned earnedAt={eb.earnedAt} />)
              ) : <p className="text-gray-400 italic">No badges yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Profile">
        <div className="space-y-6">
          <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Age" type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
          <ThemeSwitcher showColorPicker />
          <Button className="w-full" onClick={handleCreateKid} disabled={isSubmitting}>Create Profile</Button>
        </div>
      </Modal>
    </div>
  )
}
