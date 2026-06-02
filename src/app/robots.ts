import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://chores.ashbi.ca'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup'],
        // Block all authenticated routes from indexing
        disallow: ['/dashboard', '/chores', '/habits', '/rewards', '/avatar-shop', '/profile', '/settings', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
