import type { MetadataRoute } from 'next'

// Public routes only — dashboard / settings / etc. require auth and should
// not be indexed. /invite/[token] is dynamic per-invite and excluded.
const SITE_URL = process.env.NEXTAUTH_URL || 'https://chores.ashbi.ca'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
