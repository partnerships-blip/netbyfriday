// Form definitions for Content Intelligence (shared by add and edit).
import type { FieldSpec } from '@/components/FormModal';
import { PLATFORMS, FORMATS, PERIODS, GOALS, METRICS, detectLink } from './model';

export const contentFields: FieldSpec[] = [
  { name: 'url', label: 'Link to the post (optional)', placeholder: 'https://www.instagram.com/reel/…', full: true },
  { name: 'title', label: 'Title', required: true, placeholder: 'Holiday glow routine' },
  { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS.map(([v, l]) => ({ v, l })) },
  { name: 'format', label: 'Format', type: 'select', options: FORMATS.map(([v, l]) => ({ v, l })) },
  { name: 'publishedOn', label: 'Published on', type: 'date' },
  { name: 'category', label: 'Category', placeholder: 'Beauty, travel, GRWM…' },
  { name: 'goal', label: 'Goal', type: 'select', options: ['', ...GOALS].map(g => ({ v: g, l: g || 'Choose a goal' })) },
  { name: 'caption', label: 'Caption', type: 'area', full: true },
  { name: 'description', label: 'What happens in it', type: 'area', placeholder: 'Opens on the finished look, then a 3-step routine…', full: true },
  { name: 'transcript', label: 'Voiceover or on-screen text (optional)', type: 'area', placeholder: 'Paste what you say or the text that appears. It helps the review of your hook and pacing.', full: true }
];

/** Pasting a supported link fills in the platform and format. */
export function deriveFromLink(v: Record<string, any>, changed: string) {
  if (changed !== 'url' || !v.url) return null;
  const d = detectLink(String(v.url));
  return d.ok ? { platform: d.platform, format: d.format } : null;
}

export const snapshotFields = (today: string): FieldSpec[] => [
  { name: 'period', label: 'These numbers cover', type: 'select', options: PERIODS.map(([v, l]) => ({ v, l })) },
  { name: 'measuredOn', label: 'Checked on', type: 'date', required: true },
  { name: 'periodNote', label: 'Period details', placeholder: 'e.g. first 3 days' },
  ...METRICS.map(([name, label]) => ({ name, label, type: 'number' as const }))
];
export const emptySnapshot = (today: string) => ({ period: '24h', measuredOn: today, periodNote: '' });
