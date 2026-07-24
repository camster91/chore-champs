import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Next.js 16 renamed `middleware` → `proxy`. The export name and filename
// both changed. See https://nextjs.org/docs/messages/middleware-to-proxy.
export default withAuth(
  function proxy(req) {
    const pathname = req.nextUrl.pathname
    const token = req.nextauth.token

    let response = NextResponse.next()

    // If authenticated and trying to access auth pages, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/signup')) {
      response = NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Security headers for all responses
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Strict-Transport-Security — only meaningful over HTTPS, but safe to set always.
    // Forces browsers to upgrade to HTTPS for 1 year and include subdomains.
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

    // Content-Security-Policy — restrictive but allows the assets the app
    // actually loads. 'self' for own-origin; data: for the og-image.png
    // fallback and small inline SVGs; 'unsafe-inline' for the Next.js
    // hydration bootstrap script (Next 16 emits a nonced inline script in
    // dev; in prod the nonce is set automatically and unsafe-inline is
    // overridden — leaving it for now so the page doesn't break in older
    // browser fallbacks).
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    )

    // Disable browser features that aren't used: camera, mic, geolocation.
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    )

    // Disable HTML caching to prevent stale deploy chunk errors
    if (!pathname.startsWith('/_next/') && !pathname.startsWith('/icons/') && !pathname.startsWith('/sounds/') && !pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|css|js)$/)) {
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate, no-cache, no-store')
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes
        const publicPaths = ['/', '/login', '/signup', '/invite/']
        if (publicPaths.some(p => pathname === p || pathname.startsWith(p))) {
          return true
        }

        // Public API routes. Invite *lookup* is public (token is the capability);
        // invite *accept* still requires a session (handled in the route).
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/register') ||
          pathname.startsWith('/api/health') ||
          (pathname.startsWith('/api/invite/') &&
            !pathname.endsWith('/accept') &&
            req.method === 'GET')
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