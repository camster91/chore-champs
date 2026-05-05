import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authOptions } from '@/lib/auth/auth'

// This re-exports the auth options configured in auth.ts
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
