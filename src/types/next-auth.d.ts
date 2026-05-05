import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      familyId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    familyId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    familyId?: string
  }
}
