'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Kid } from '@/stores/kid-store'
import { updateKidSchema } from '@/lib/validation/schemas'
import { getAuthenticatedFamily } from '@/lib/auth/helpers'

export async function getKids(): Promise<Kid[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const kids = await prisma.kid.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { createdAt: 'asc' },
  })

  return kids.map((k) => ({
    id: k.id,
    name: k.name,
    age: k.age,
    avatarId: k.avatarId,
    points: k.points,
    currentStreak: k.currentStreak,
    longestStreak: k.longestStreak,
    lastCompletedAt: k.lastCompletedAt ? k.lastCompletedAt.toISOString() : null,
    themeMode: k.themeMode,
    primaryColor: k.primaryColor,
    secondaryColor: k.secondaryColor,
  }))
}

export async function createKid(data: {
  name: string
  age: number
  avatarId?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const kid = await prisma.kid.create({
    data: {
      name: data.name,
      age: data.age,
      avatarId: data.avatarId || 'default',
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/dashboard')
  return kid
}

/**
 * Profile/theme updates only. Points, streaks, and familyId are never
 * accepted from the client — those mutate via dedicated privileged paths.
 */
export async function updateKid(
  kidId: string,
  data: Partial<{
    name: string
    age: number
    avatarId: string
    themeMode: string
    primaryColor: string
    secondaryColor: string
  }>
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const parsed = updateKidSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid kid data')
  }

  const existing = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
  })
  if (!existing) {
    throw new Error('Kid not found')
  }

  const kid = await prisma.kid.update({
    where: { id: kidId },
    data: parsed.data,
  })

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return kid
}

export async function deleteKid(kidId: string) {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new Error('Unauthorized')
  }
  if (auth.role !== 'OWNER') {
    throw new Error('Only the family owner can delete kid profiles')
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: auth.familyId },
  })
  if (!kid) {
    throw new Error('Kid not found')
  }

  await prisma.kid.delete({ where: { id: kidId } })
  revalidatePath('/dashboard')
  revalidatePath('/chores')
  revalidatePath('/profile')
  revalidatePath('/habits')
}
