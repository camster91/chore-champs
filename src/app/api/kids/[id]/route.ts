import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, props: Props) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id } = await props.params

  const kid = await prisma.kid.findFirst({
    where: { id, familyId: auth.familyId },
    include: { choreAssignments: { where: { status: 'COMPLETED' } } }
  })

  if (!kid) return unauthorized()

  return NextResponse.json(kid)
}
