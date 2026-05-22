import posthog from 'posthog-js'

export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties)
  }
}

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, properties)
  }
}

export const EVENTS = {
  CHORE_COMPLETED: 'chore_completed',
  CHORE_CREATED: 'chore_created',
  HABIT_LOGGED: 'habit_logged',
  HABIT_CREATED: 'habit_created',
  REWARD_REDEEMED: 'reward_redeemed',
  REWARD_CREATED: 'reward_created',
  LEVEL_UP: 'level_up',
  ITEM_UNLOCKED: 'item_unlocked',
  GOAL_CREATED: 'family_goal_created',
  PROFILE_SWITCHED: 'profile_switched',
}
