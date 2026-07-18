/** Analytics stub — replace with real analytics provider when ready.
 *  Currently logs events to console in development only.
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[Analytics]', eventName, properties)
  }
}

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[Analytics] identify', userId, properties)
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
