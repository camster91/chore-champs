'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ThemeMode } from '@prisma/client'

export async function getKids() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  return await prisma.kid.findMany({
    where: {
      familyId: session.user.familyId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

export async function createKid(data: {
  name: string
  age: number
  avatarId: string
  themeMode: ThemeMode
  primaryColor: string
  secondaryColor: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const kid = await prisma.kid.create({
    data: {
      ...data,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return kid
}

export async function updateKid(
  kidId: string,
  data: {
    name?: string
    age?: number
    avatarId?: string
    themeMode?: ThemeMode
    primaryColor?: string
    secondaryColor?: string
    points?: number
    totalPoints?: number
    streakDays?: number
    level?: number
    experience?: number
  }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Ensure the kid belongs to the family
  const existingKid = await prisma.kid.findFirst({
    where: {
      id: kidId,
      familyId: session.user.familyId,
    },
  })

  if (!existingKid) {
    throw new Error('Kid not found or unauthorized')
  }

  const kid = await prisma.kid.update({
    where: { id: kidId },
    data,
  })

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return kid
}

export async function deleteKid(kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Ensure the kid belongs to the family
  const existingKid = await prisma.kid.findFirst({
    where: {
      id: kidId,
      familyId: session.user.familyId,
    },
  })

  if (!existingKid) {
    throw new Error('Kid not found or unauthorized')
  }

  await prisma.kid.delete({
    where: { id: kidId },
  })

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}
