import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { FOUNDER_FILES } from '@/lib/marketing/founder-files';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/about', '/founder-files', '/pricing', '/waitlist', '/privacy', '/terms', ...FOUNDER_FILES.map(f => `/founder-files/${f.slug}`)];
  return pages.map(p => ({ url: `${SITE.url}${p}`, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.6 }));
}
