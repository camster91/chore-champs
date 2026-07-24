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
    take: 50,
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
    throw new AppError('Unauthorized', 401)
  }

  const parsed = createKidSchema.safeParse({
    ...data,
    avatarId: data.avatarId || 'default',
  })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  const kid = await prisma.kid.create({
    data: {
      name: parsed.data.name,
      age: parsed.data.age,
      avatarId: parsed.data.avatarId || 'default',
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

  const parsed = updateKidSchema.safeParse(data)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  // Explicit allowlist — never pass raw client `data` to Prisma (blocks points/streak mass-assignment).
  const allowed = parsed.data
  const kid = await prisma.kid.update({
    where: { id: kidId },
    data: {
      ...(allowed.name !== undefined ? { name: allowed.name } : {}),
      ...(allowed.age !== undefined ? { age: allowed.age } : {}),
      ...(allowed.avatarId !== undefined ? { avatarId: allowed.avatarId } : {}),
      ...(allowed.themeMode !== undefined ? { themeMode: allowed.themeMode } : {}),
      ...(allowed.primaryColor !== undefined ? { primaryColor: allowed.primaryColor } : {}),
      ...(allowed.secondaryColor !== undefined ? { secondaryColor: allowed.secondaryColor } : {}),
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return kid
}

export async function deleteKid(kidId: string) {
  const { getAuthenticatedFamily } = await import('@/lib/auth/helpers')
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new AppError('Unauthorized', 401)
  }
  if (!auth.isOwner) {
    throw new AppError('Only the family owner can remove kids', 403)
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: auth.familyId },
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
