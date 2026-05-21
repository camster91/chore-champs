import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required. Set a strong random secret.')
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL environment variable is required.')
}

const SECRET = process.env.NEXTAUTH_SECRET

export const authOptions: NextAuthOptions = {
  secret: SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const parent = await prisma.parent.findUnique({
          where: { email: credentials.email },
        })

        if (!parent) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          parent.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Find the family by parentId
        const family = await prisma.family.findFirst({
          where: { parentId: parent.id }
        })

        return {
          id: parent.id,
          email: parent.email,
          name: parent.name,
          familyId: family?.id,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.familyId = (user as any).familyId
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
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `__Secure-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
