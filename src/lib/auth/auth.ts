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
        console.log('[AUTH] authorize() called')
        console.log('[AUTH] Credentials received:', {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        })
        
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('[AUTH] Missing credentials')
            return null
          }

          console.log('[AUTH] Looking up user in database...')
          const parent = await prisma.parent.findUnique({
            where: { email: credentials.email },
            include: { family: true },
          })
          
          console.log('[AUTH] User lookup result:', parent ? {
            id: parent.id,
            email: parent.email,
            hasPassword: !!parent.password,
            passwordLength: parent.password?.length
          } : 'null')

          if (!parent) {
            console.log('[AUTH] User not found in database')
            return null
          }

          console.log('[AUTH] Comparing passwords...')
          console.log('[AUTH] Input:', credentials.password)
          console.log('[AUTH] Stored hash:', parent.password.substring(0, 20) + '...')
          
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            parent.password
          )
          
          console.log('[AUTH] Password validation result:', isPasswordValid)

          if (!isPasswordValid) {
            console.log('[AUTH] Password mismatch')
            return null
          }

          const user = {
            id: parent.id,
            email: parent.email,
            name: parent.name,
            familyId: parent.family?.id,
          }
          
          console.log('[AUTH] Success! Returning user:', user)
          return user
        } catch (error) {
          console.error('[AUTH] Exception in authorize:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('[AUTH] jwt() callback - user:', !!user, 'token:', !!token)
      if (user) {
        token.id = user.id
        token.familyId = user.familyId
      }
      return token
    },
    async session({ session, token }) {
      console.log('[AUTH] session() callback - token:', !!token)
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
  debug: true,
}
