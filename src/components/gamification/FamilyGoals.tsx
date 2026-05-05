'use client'

import { motion } from 'framer-motion'
import { Target, Trophy } from 'lucide-react'
import { Card, CardContent, Progress } from '@/components/ui'
import { cn } from '@/lib/utils'

interface FamilyGoal {
  id: string
  title: string
  description?: string | null
  targetPoints: number
  currentPoints: number
  reward?: string | null
}

interface FamilyGoalsProps {
  goals: FamilyGoal[]
  className?: string
}

export function FamilyGoals({ goals, className }: FamilyGoalsProps) {
  if (goals.length === 0) return null

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-[var(--color-primary)]" />
        <h2 className="text-xl font-bold">Family Quests</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {goals.map((goal, index) => {
          const progress = Math.min((goal.currentPoints / goal.targetPoints) * 100, 100)
          const isCompleted = progress >= 100

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn('overflow-hidden', isCompleted && 'bg-green-50 border-green-200')}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={cn('font-bold text-lg', isCompleted && 'text-green-700')}>
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-gray-500 text-sm">{goal.description}</p>
                      )}
                    </div>
                    {isCompleted ? (
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <Trophy className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase">Target</p>
                        <p className="font-bold text-[var(--color-primary)]">{goal.targetPoints} pts</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-600">
                        {goal.currentPoints.toLocaleString()} / {goal.targetPoints.toLocaleString()}
                      </span>
                      <span className="font-bold text-[var(--color-primary)]">{Math.floor(progress)}%</span>
                    </div>
                    <Progress value={progress} max={100} className="h-3" />
                  </div>

                  {goal.reward && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Reward:</span>
                      <span className="font-bold text-amber-600">{goal.reward}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
