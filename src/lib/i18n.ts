import i18next from 'i18next'
import enSample from '@/locales/en/sample.json'

let initialized = false

export async function initI18n(locale: string = 'en') {
  if (!initialized) {
    await i18next.init({
      lng: locale,
      fallbackLng: 'en',
      resources: {
        en: { translation: enSample },
      },
      interpolation: {
        escapeValue: false,
      },
    })
    initialized = true
  }
}

export function getLocalizedSampleData() {
  const t = i18next.getFixedT('en')

  const kids = t('kids', { returnObjects: true }) as Array<{
    name: string
    age: number
    avatarId: string
  }>

  const choreDefs = t('chores', { returnObjects: true }) as Array<{
    key: string
    title: string
    description: string
  }>

  // Chore definitions with metadata not in locale files
  const choreMetadata: Record<
    string,
    { basePoints: number; icon: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }
  > = {
    make_bed: { basePoints: 5, icon: '🛏️', difficulty: 'EASY' },
    brush_teeth: { basePoints: 5, icon: '🦷', difficulty: 'EASY' },
    clean_room: { basePoints: 15, icon: '✨', difficulty: 'MEDIUM' },
    feed_pet: { basePoints: 10, icon: '🐕', difficulty: 'EASY' },
    do_homework: { basePoints: 20, icon: '📚', difficulty: 'MEDIUM' },
    set_table: { basePoints: 5, icon: '🍽️', difficulty: 'EASY' },
    take_out_trash: { basePoints: 10, icon: '🗑️', difficulty: 'MEDIUM' },
    read_20_min: { basePoints: 15, icon: '📖', difficulty: 'EASY' },
    help_dishes: { basePoints: 10, icon: '🍳', difficulty: 'EASY' },
    practice_instrument: { basePoints: 15, icon: '🎵', difficulty: 'MEDIUM' },
  }

  const chores = choreDefs.map((c) => ({
    ...c,
    ...choreMetadata[c.key],
  }))

  const rewardDefs = t('rewards', { returnObjects: true }) as Array<{
    key: string
    title: string
    description: string
  }>

  const rewardMetadata: Record<string, { cost: number; icon: string; category: string }> = {
    extra_screen_time: { cost: 25, icon: '📱', category: 'Entertainment' },
    pick_movie: { cost: 30, icon: '🎬', category: 'Entertainment' },
    stay_up_late: { cost: 40, icon: '🌙', category: 'Special' },
    ice_cream_trip: { cost: 100, icon: '🍦', category: 'Treats' },
    new_book: { cost: 75, icon: '📚', category: 'Education' },
    friend_sleepover: { cost: 150, icon: '🎉', category: 'Special' },
    game_night_choice: { cost: 35, icon: '🎲', category: 'Fun' },
    skip_chore: { cost: 50, icon: '⏭️', category: 'Special' },
  }

  const rewards = rewardDefs.map((r) => ({
    ...r,
    ...rewardMetadata[r.key],
  }))

  const habitDefs = t('habits', { returnObjects: true }) as Array<{
    key: string
    title: string
    description: string
  }>

  const habitMetadata: Record<string, { icon: string; points: number }> = {
    drink_water: { icon: '💧', points: 5 },
    exercise: { icon: '🏃', points: 10 },
    practice_gratitude: { icon: '🙏', points: 5 },
    read_before_bed: { icon: '📖', points: 5 },
  }

  const habits = habitDefs.map((h) => ({
    ...h,
    ...habitMetadata[h.key],
  }))

  const familyGoal = t('familyGoal', { returnObjects: true }) as {
    title: string
    description: string
    reward: string
  }

  const messages = t('messages', { returnObjects: true }) as {
    alreadyHasData: string
    sampleAdded: string
    unauthorized: string
  }

  return { kids, chores, rewards, habits, familyGoal, messages }
}
