'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Permanently delete the current user's account, family, and all
 * associated data (kids, chores, habits, rewards, invites, etc).
 *
 * Cascade rules in prisma/schema.prisma handle the child rows. This
 * function also deletes the Parent row (the auth principal) since
 * Family references Parent but Parent doesn't auto-cascade.
 *
 * After deletion the user's session is invalid — the caller is
 * responsible for redirecting to /signup.
 */
export async function deleteAccount(
  confirmEmail: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.user?.familyId || !session?.user?.email) {
    return { success: false, error: 'Not authenticated' }
  }

  // Require the user to type their email as a destructive-action guard.
  if (confirmEmail.trim().toLowerCase() !== session.user.email.toLowerCase()) {
    return { success: false, error: 'Email confirmation does not match' }
  }

  const familyId = session.user.familyId
  const parentId = session.user.id

  try {
    // Check if user is the family owner
    const family = await prisma.family.findFirst({
      where: { id: familyId, parentId }
    })

    if (family) {
      // Owner deleting account — delete the entire family (cascades to all data)
      await prisma.$transaction([
        prisma.family.delete({ where: { id: familyId } }),
        prisma.parent.delete({ where: { id: parentId } }),
      ])
    } else {
      // Member deleting account — just remove membership and parent
      await prisma.$transaction([
        prisma.familyMember.deleteMany({ where: { parentId } }),
        prisma.parent.delete({ where: { id: parentId } }),
      ])
    }

    revalidatePath('/')
    return { success: true }
  } catch (err) {
    console.error('[deleteAccount]', err)
    return {
      success: false,
      error: 'Failed to delete account. Please try again.',
    }
  }
}
