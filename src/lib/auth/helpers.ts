// Simple token signing without jsonwebtoken
// Uses base64 encoding for simplicity

const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export async function signToken(payload: any): Promise<string> {
  const data = JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000
  })
  
  // Simple encoding - not secure, just for compatibility
  return Buffer.from(data).toString('base64url')
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const data = Buffer.from(token, 'base64url').toString()
    const payload = JSON.parse(data)
    
    if (payload.exp < Date.now()) {
      return null // Token expired
    }
    
    return payload
  } catch {
    return null
  }
}
