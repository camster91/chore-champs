import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const SECRET = process.env.NEXTAUTH_SECRET

if (!SECRET) {
  console.error('FATAL: NEXTAUTH_SECRET is not set. Auth will not function securely.')
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname
    // NextAuth middleware augments req with `nextauth` property — not in NextRequest type
    const token = (req as any).nextauth?.token
    
    let response = NextResponse.next()
    
    // If authenticated and trying to access auth pages, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/signup')) {
      response = NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    // Security headers for all responses
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    return response
  },
  {
    secret: SECRET,
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = (req as any).nextUrl?.pathname || ''

        // Public routes
        const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/invite/']
        if (publicPaths.some(p => pathname === p || pathname.startsWith(p))) {
          return true
        }

        // Public API routes
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/register') ||
          pathname.startsWith('/api/health') ||
          pathname.startsWith('/api/recovery-codes') ||
          pathname.startsWith('/api/test-auth')
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
