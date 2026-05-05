import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import prisma from '@/lib/db'

export async function getAuthenticatedFamily() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const parent = await prisma.parent.findUnique({
    where: { id: session.user.id },
    include: { family: true },
  })

  if (!parent?.family) return null

  return {
    parentId: parent.id,
    familyId: parent.family.id,
    family: parent.family,
  }
}

export async function verifyKidOwnership(kidId: string, familyId: string) {
  const kid = await prisma.kid.findFirst({
    where: {
      id: kidId,
      familyId: familyId,
    },
  })
  return !!kid
}

export async function verifyHabitOwnership(habitId: string, familyId: string) {
  const habit = await prisma.habit.findFirst({
    where: {
      id: habitId,
      familyId: familyId,
    },
  })
  return !!habit
}

export async function verifyChoreOwnership(choreId: string, familyId: string) {
  const chore = await prisma.chore.findFirst({
    where: {
      id: choreId,
      familyId: familyId,
    },
  })
  return !!chore
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}

// Simple in-memory rate limiting for sensitive endpoints
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>()

export function checkRateLimit(ip: string, limit = 5, windowMs = 60000) {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastRequest: now })
    return true
  }

  if (now - record.lastRequest > windowMs) {
    rateLimitMap.set(ip, { count: 1, lastRequest: now })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}
