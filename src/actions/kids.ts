'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Kid } from '@/stores/kid-store'
import { createKidSchema, updateKidSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'

export async function getKids(): Promise<Kid[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const kids = await prisma.kid.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { createdAt: 'asc' },
  })

  return kids.map(k => ({
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
    throw new AppError('Unauthorized', 401)
  }

  const parsed = createKidSchema.parse({
    name: data.name,
    age: data.age,
    avatarId: data.avatarId || 'default',
  })

  const kid = await prisma.kid.create({
    data: {
      name: parsed.name,
      age: parsed.age,
      avatarId: parsed.avatarId,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/dashboard')
  return kid
}

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
    throw new AppError('Unauthorized', 401)
  }

  const existing = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
  })
  if (!existing) {
    throw new AppError('Kid not found', 404)
  }

  // Strict Zod parse rejects unknown fields (points, familyId, streaks, etc.)
  const parsed = updateKidSchema.parse(data)

  const kid = await prisma.kid.update({
    where: { id: kidId },
    data: {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.age !== undefined && { age: parsed.age }),
      ...(parsed.avatarId !== undefined && { avatarId: parsed.avatarId }),
      ...(parsed.themeMode !== undefined && { themeMode: parsed.themeMode }),
      ...(parsed.primaryColor !== undefined && { primaryColor: parsed.primaryColor }),
      ...(parsed.secondaryColor !== undefined && { secondaryColor: parsed.secondaryColor }),
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return kid
}

export async function deleteKid(kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
  })
  if (!kid) {
    throw new AppError('Kid not found', 404)
  }

  await prisma.kid.delete({ where: { id: kidId } })
  revalidatePath('/dashboard')
  revalidatePath('/chores')
  revalidatePath('/profile')
  revalidatePath('/habits')
}
