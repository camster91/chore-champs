import jwt from 'jsonwebtoken'

const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export async function signToken(payload: any) {
  return jwt.sign(payload, secret, { expiresIn: '30d' })
}

export async function verifyToken(token: string) {
  try {
    return jwt.verify(token, secret)
  } catch {
    return null
  }
}
