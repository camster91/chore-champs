import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes
        const publicRoutes = ['/', '/login', '/signup']
        if (publicRoutes.includes(pathname)) {
          return true
        }

        // Public API routes
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/register') ||
          pathname.startsWith('/api/health') ||
          pathname.startsWith('/api/test-auth') ||
          pathname.startsWith('/api/debug-login')
        ) {
          return true
        }

        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
