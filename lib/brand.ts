import { flag } from './flags';
// NETBYFRIDAY product brand. Chartreuse accent, plum text on it, Plus Jakarta Sans headlines.
export const NBF = { ac: '#DFFF43', ink: '#32152F', text: '#4F5E00', soft: '#F3FFC4' } as const;

// Legacy white-label accents, used only when the 'whiteLabel' flag is on.
export const ACCENTS = {
  cobalt: { ac: '#2B4BD6', ink: '#FFFFFF', text: '#2B4BD6', soft: '#E8ECFB', label: 'Cobalt' },
  lime: { ac: '#C6F24E', ink: '#1C1B19', text: '#4B6A00', soft: '#EFF8D2', label: 'Electric lime' },
  ink: { ac: '#1C1B19', ink: '#FFFFFF', text: '#1C1B19', soft: '#ECEAE4', label: 'Ink' },
  clay: { ac: '#B4532A', ink: '#FFFFFF', text: '#A0461F', soft: '#F6E6DD', label: 'Clay' }
} as const;

export function brandVars(accent?: keyof typeof ACCENTS, font: 'serif' | 'sans' = 'sans'): Record<string, string> {
  const a = flag('whiteLabel') && accent ? ACCENTS[accent] ?? NBF : NBF;
  if (!flag('whiteLabel')) font = 'sans';
  return {
    '--ac': a.ac, '--ac-ink': a.ink, '--ac-text': a.text, '--ac-soft': a.soft,
    '--hf': font === 'sans' ? 'var(--font-head)' : 'Georgia, serif',
    '--hfw': font === 'sans' ? '800' : '400',
    '--hls': font === 'sans' ? '-0.04em' : '-0.01em'
  };
}

export const STAGE_LABEL: Record<string, string> = { lead: 'Lead', pitching: 'Pitching', negotiating: 'Negotiating', contracted: 'Contracted', in_progress: 'In Progress', completed: 'Completed', paid: 'Paid', lost: 'Lost / Declined' };
export const DELIVERABLE_LABEL: Record<string, string> = { not_started: 'Not started', in_progress: 'In progress', in_review: 'In review', approved: 'Approved', posted: 'Posted', scheduled: 'Scheduled' };
export const STREAM_LABEL: Record<string, string> = { brand: 'Brand partnerships', affiliate: 'Affiliate', events: 'Events', digital: 'Digital products', appearances: 'Appearances', other: 'Other' };
export const STREAM_COLOR: Record<string, string> = { brand: '#32152F', events: '#9B87D9', digital: '#DFFF43', affiliate: '#9A8396', appearances: '#CDB9C9', other: '#E0D5DE' };
