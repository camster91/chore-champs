import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const SECRET = process.env.NEXTAUTH_SECRET || 'INSECURE-FALLBACK-ONLY-FOR-DEVELOPMENT'

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname
    const token = req.nextauth.token
    
    // If authenticated and trying to access auth pages, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    return NextResponse.next()
  },
  {
    secret: SECRET,
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes - no auth required
        const publicRoutes = ['/', '/login', '/signup']
        if (publicRoutes.includes(pathname)) {
          return true
        }

        // Public API routes
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/register') ||
          pathname.startsWith('/api/health') ||
          pathname.startsWith('/api/test-auth')
        ) {
          return true
        }

        // Require authentication for everything else
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
