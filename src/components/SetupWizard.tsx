'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Users, Star, Trophy, CheckCircle, ArrowRight, Loader2, PartyPopper } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'
import { useKidStore } from '@/stores/kid-store'
import { useAudio } from '@/lib/audio-context'
import { addSampleData } from '@/actions/sampleData'
import { useRouter } from 'next/navigation'

interface SetupWizardProps {
  onComplete: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome to ChoreChamps!
          </h1>
          <p className="text-gray-600 mt-2">
            Let&apos;s set up your family&apos;s chore adventure in just a few steps
          </p>
        </div>

        <SetupSteps onComplete={onComplete} />
      </motion.div>
    </div>
  )
}

function SetupSteps({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; added: boolean } | null>(null)
  const { play } = useAudio()
  const router = useRouter()
  const { syncFromServer } = useKidStore()

  const steps = [
    { title: 'Add Your Kids', icon: Users, description: 'Create profiles for each child in your family' },
    { title: 'Set Up Chores', icon: Star, description: 'Add chores and assign point values' },
    { title: 'Create Rewards', icon: Trophy, description: 'Define rewards kids can earn' },
    { title: 'Start Earning!', icon: PartyPopper, description: 'Watch your family thrive!' },
  ]

  const handleAddSampleData = async () => {
    setIsLoading(true)
    try {
      const res = await addSampleData()
      setResult(res)
      
      if (res.added) {
        play('tada')
        
        // Refresh the store
        const kidsRes = await fetch('/api/kids')
        const kids = await kidsRes.json()
        syncFromServer(kids)
        
        setTimeout(() => {
          onComplete()
          router.refresh()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to add sample data:', error)
      setResult({ message: 'Failed to add sample data. Please try again.', added: false })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    onComplete()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i <= step ? 'w-8 bg-purple-500' : 'w-2 bg-gray-200'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Step 1: Add Your Kids</h2>
                    <p className="text-gray-500 text-sm">Create profiles for each child</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">
                  Start by adding the children in your family. You can add their names, ages, and choose fun avatars!
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <p className="text-amber-800 text-sm">
                    💡 <strong>Tip:</strong> You can add up to 5 kids on the free plan. Each child gets their own progress tracking and rewards.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => setStep(1)} className="flex-1">
                    Add Kids Later <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Step 2: Set Up Chores</h2>
                    <p className="text-gray-500 text-sm">Add tasks and point values</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">
                  Create a list of chores for your kids. Assign point values based on difficulty - harder tasks = more points!
                </p>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                  <p className="text-indigo-800 text-sm">
                    🎯 <strong>Good starting chores:</strong> Make bed (5pts), Clean room (15pts), Help with dishes (10pts)
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(2)} className="flex-1">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Step 3: Create Rewards</h2>
                    <p className="text-gray-500 text-sm">Motivate with prizes they&apos;ll love</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">
                  Set up rewards that kids can redeem with their earned points. Mix small daily rewards with bigger goals!
                </p>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                  <p className="text-emerald-800 text-sm">
                    🏆 <strong>Reward ideas:</strong> Extra screen time (25pts), Choose dinner (40pts), Sleepover (150pts)
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <PartyPopper className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ready to Start!</h2>
                    <p className="text-gray-500 text-sm">Choose how to begin</p>
                  </div>
                </div>

                {result ? (
                  <div className="text-center py-4">
                    {result.added ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-green-600 mb-2">You&apos;re all set!</h3>
                        <p className="text-gray-600">{result.message}</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-amber-600 mb-2">Already Set Up</h3>
                        <p className="text-gray-600">{result.message}</p>
                        <Button onClick={onComplete} className="mt-4">
                          Go to Dashboard
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 mb-6 text-center">
                      Want a head start? We can add sample kids, chores, and rewards to help you see how it works!
                    </p>

                    <div className="space-y-3 mb-6">
                      <Button 
                        onClick={handleAddSampleData} 
                        disabled={isLoading}
                        className="w-full justify-center"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Add Sample Data (Recommended)
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={handleSkip}
                        className="w-full justify-center"
                      >
                        Start Fresh (No Sample Data)
                      </Button>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      You can always add sample data later from Settings
                    </p>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pt-4">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => i < step && setStep(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === step ? 'bg-purple-500 scale-125' : i < step ? 'bg-purple-300 cursor-pointer hover:bg-purple-400' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
