'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Kid } from '@/stores/kid-store'

export async function getKids(): Promise<Kid[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const kids = await prisma.kid.findMany({
    where: { familyId: session.user.familyId },
    include: {
      choreAssignments: true,
      habitLogs: true
    },
    orderBy: { createdAt: 'asc' }
  })

  return kids.map(k => ({
    id: k.id,
    name: k.name,
    age: k.age,
    avatarId: k.avatarId,
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
    }
  })

  revalidatePath('/dashboard')
  return kid
}

export async function updateKid(kidId: string, data: Partial<{
  name: string
  age: number
  avatarId: string
  themeMode: string
  primaryColor: string
  secondaryColor: string
}>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId }
  })
  if (!existing) {
    throw new Error('Kid not found')
  }

  const kid = await prisma.kid.update({
    where: { id: kidId },
    data
  })

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return kid
}

export async function deleteKid(kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId }
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
