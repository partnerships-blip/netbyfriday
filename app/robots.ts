import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Public pages are crawlable; the signed-in app and auth flows are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/overview', '/partnerships', '/content', '/money', '/contacts', '/tasks', '/advisor', '/settings', '/admin', '/intelligence', '/audience', '/opportunities', '/onboarding', '/api/', '/auth/', '/reset'] },
    sitemap: `${SITE.url}/sitemap.xml`
  };
}
