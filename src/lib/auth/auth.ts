import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error('NEXTAUTH_SECRET is not set. Authentication will fail.')
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('Auth error: Missing email or password')
            return null
          }

          const parent = await prisma.parent.findUnique({
            where: { email: credentials.email },
            include: { family: true },
          })

          if (!parent) {
            console.log('Auth: User not found')
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            parent.password
          )

          if (!isPasswordValid) {
            console.log('Auth: Invalid password')
            return null
          }

          return {
            id: parent.id,
            email: parent.email,
            name: parent.name,
            familyId: parent.family?.id,
          }
        } catch (error) {
          console.error('Auth error in authorize:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.familyId = user.familyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.familyId = token.familyId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
}

export const NEXTAUTH_COOKIE_NAME = '__Host-next-auth.session-token'

// Parse our custom session token format
export function parseCustomSessionToken(token: string): any | null {
  try {
    // Our token is base64url encoded JSON
    const decoded = Buffer.from(token, 'base64url').toString()
    const data = JSON.parse(decoded)
    
    // Validate required fields
    if (!data.id || !data.email) {
      return null
    }
    
    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        familyId: data.familyId,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  } catch {
    return null
  }
}
