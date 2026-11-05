import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/about', '/pricing', '/waitlist', '/privacy', '/terms'].map(p => ({ url: `${SITE.url}${p}`, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.6 }));
}
