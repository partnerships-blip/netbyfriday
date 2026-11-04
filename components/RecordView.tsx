'use client';
// One fixed record type ("database"), shown as a Table, Board or Calendar. Fixed columns: no custom properties.
// The last view, filter and sort are remembered per record type in this browser only (a convenience, never data).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cx } from './ui';
import { addDays, dayNumber, shortDate } from '@/lib/finance/core.js';

export type ViewKind = 'table' | 'board' | 'calendar';
export type Column<T> = { key: string; label: string; render: (r: T) => ReactNode; sort?: (r: T) => string | number | null; className?: string; hideOnMobile?: boolean };
export type Filter<T> = { key: string; label: string; test: (r: T) => boolean };

const VIEW_LABEL: Record<ViewKind, string> = { table: 'Table', board: 'Board', calendar: 'Calendar' };
const load = (k: string) => { try { return JSON.parse(localStorage.getItem('nbf:view:' + k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem('nbf:view:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export function RecordView<T>({ storageKey, rows, getId, views, columns, filters = [], search, onOpen, today, empty, noun = 'record', board, renderBoard, calendar, toolbar }: {
  storageKey: string; rows: T[]; getId: (r: T) => string; views: ViewKind[]; columns: Column<T>[]; filters?: Filter<T>[];
  search?: (r: T) => string; onOpen?: (r: T) => void; today: string; empty: ReactNode; noun?: string; toolbar?: ReactNode;
  board?: { groups: { key: string; label: string }[]; groupOf: (r: T) => string; card: (r: T) => ReactNode; onMove?: (id: string, group: string) => void };
  renderBoard?: (rows: T[]) => ReactNode;
  calendar?: { dateOf: (r: T) => string | null; label: (r: T) => ReactNode; tone?: (r: T) => 'late' | 'done' | 'normal' };
}) {
  const [view, setView] = useState<ViewKind>(views[0]);
  const [filter, setFilter] = useState<string>(filters[0]?.key ?? '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    const s = load(storageKey);
    if (s?.view && views.includes(s.view)) setView(s.view);
    if (s?.filter && filters.some(f => f.key === s.filter)) setFilter(s.filter);
    if (s?.sort) setSort(s.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  const remember = (patch: Record<string, unknown>) => save(storageKey, { view, filter, sort, ...patch });

  const shown = useMemo(() => {
    const f = filters.find(x => x.key === filter);
    const needle = q.trim().toLowerCase();
    let out = rows.filter(r => (!f || f.test(r)) && (!needle || !search || search(r).toLowerCase().includes(needle)));
    const col = sort && columns.find(c => c.key === sort.key);
    if (col?.sort) out = [...out].sort((a, b) => {
      const x = col.sort!(a), y = col.sort!(b);
      if (x === y) return 0; if (x === null || x === '') return 1; if (y === null || y === '') return -1;
      return (x < y ? -1 : 1) * sort!.dir;
    });
    return out;
  }, [rows, filters, filter, q, search, sort, columns]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {views.length > 1 && (
          <div className="flex gap-1 rounded-[10px] bg-lavender p-[3px]" role="tablist" aria-label="View">
            {views.map(v => <button key={v} role="tab" aria-selected={view === v} onClick={() => { setView(v); remember({ view: v }); }}
              className={cx('h-8 rounded-[8px] px-3 text-[13px] font-semibold', view === v ? 'bg-white text-ink shadow-sm' : 'text-sub hover:text-ink')}>{VIEW_LABEL[v]}</button>)}
          </div>
        )}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{filters.map(f => (
            <button key={f.key} aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); remember({ filter: f.key }); }}
              className={cx('h-8 rounded-full border px-3 text-[13px]', filter === f.key ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink')}>
              {f.label} <span className="tnum opacity-70">{rows.filter(f.test).length}</span></button>))}</div>
        )}
        {search && <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${noun}s`} aria-label={`Search ${noun}s`}
          className="h-8 min-w-[160px] flex-1 rounded-full border border-line2 bg-white px-3.5 text-[13px] outline-none focus:border-ink sm:max-w-[260px]" />}
        <div className="ml-auto flex gap-2">{toolbar}</div>
      </div>

      {!rows.length ? empty : view === 'table' ? (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full border-collapse text-left text-sm md:min-w-[640px]">
            <thead><tr className="border-b border-line">{columns.map(c => (
              <th key={c.key} className={cx('px-3 py-2.5 font-mono md:px-4 text-[10px] font-normal uppercase tracking-[.08em] text-muted', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                {c.sort ? <button className="uppercase hover:text-ink" onClick={() => { const s = { key: c.key, dir: (sort?.key === c.key ? -sort.dir : 1) as 1 | -1 }; setSort(s); remember({ sort: s }); }}>
                  {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button> : c.label}
              </th>))}</tr></thead>
            <tbody>{shown.map(r => (
              <tr key={getId(r)} onClick={onOpen ? () => onOpen(r) : undefined} className={cx('border-b border-soft2 last:border-0', onOpen && 'cursor-pointer hover:bg-paper')}>
                {columns.map(c => <td key={c.key} className={cx('px-3 py-3 align-top md:px-4', c.hideOnMobile && 'hidden md:table-cell', c.className)}>{c.render(r)}</td>)}
              </tr>))}</tbody>
          </table>
          {!shown.length && <p className="px-4 py-5 text-sm text-muted">Nothing matches this filter.</p>}
        </div>
      ) : view === 'board' ? (renderBoard ? renderBoard(shown) : board && (
        <div className="flex gap-3 overflow-x-auto pb-2">{board.groups.map(g => {
          const items = shown.filter(r => board.groupOf(r) === g.key);
          return (
            <div key={g.key} onDragOver={e => { if (board.onMove) { e.preventDefault(); setOver(g.key); } }} onDragLeave={() => setOver(null)}
              onDrop={() => { if (drag && board.onMove) board.onMove(drag, g.key); setDrag(null); setOver(null); }}
              className={cx('flex w-[264px] flex-none flex-col gap-2 rounded-card bg-lavender p-2.5', over === g.key && 'outline outline-2 outline-ac')}>
              <div className="flex items-center justify-between px-1 py-1 text-[13px] font-bold">{g.label}<span className="tnum font-mono text-xs text-muted">{items.length}</span></div>
              {items.map(r => (
                <div key={getId(r)} draggable={!!board.onMove} onDragStart={() => setDrag(getId(r))} onClick={onOpen ? () => onOpen(r) : undefined}
                  className={cx('rounded-xl border border-line bg-white p-3 text-sm', onOpen && 'cursor-pointer hover:border-faint')}>{board.card(r)}</div>))}
              {!items.length && <div className="px-1 py-3 text-xs text-muted">Nothing here.</div>}
            </div>);
        })}</div>
      )) : calendar && <Calendar rows={shown} month={month} setMonth={setMonth} today={today} cal={calendar} getId={getId} onOpen={onOpen} />}
    </div>
  );
}

function Calendar<T>({ rows, month, setMonth, today, cal, getId, onOpen }: {
  rows: T[]; month: string; setMonth: (m: string) => void; today: string; getId: (r: T) => string; onOpen?: (r: T) => void;
  cal: { dateOf: (r: T) => string | null; label: (r: T) => ReactNode; tone?: (r: T) => 'late' | 'done' | 'normal' };
}) {
  const first = month + '-01';
  const startDow = new Date(dayNumber(first) * 86400000).getUTCDay();
  const gridStart = addDays(first, -startDow);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDay = new Map<string, T[]>();
  for (const r of rows) { const d = cal.dateOf(r); if (d) byDay.set(d, [...(byDay.get(d) ?? []), r]); }
  const undated = rows.filter(r => !cal.dateOf(r)).length;
  const shift = (n: number) => { const y = +month.slice(0, 4), m = +month.slice(5, 7) - 1 + n; setMonth(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)); };
  const title = new Date(dayNumber(first) * 86400000).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const tone = { late: 'bg-[#F3DDD6] text-danger', done: 'bg-[#F0EBF2] text-faint line-through', normal: 'bg-[#F3FFC4] text-ink' };
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-3">
      <div className="flex items-center gap-2 px-1">
        <span className="flex-1 text-[15px] font-bold">{title}</span>
        <button className="h-8 rounded-lg border border-line2 px-2.5 text-[13px]" onClick={() => shift(-1)} aria-label="Previous month">←</button>
        <button className="h-8 rounded-lg border border-line2 px-2.5 text-[13px]" onClick={() => setMonth(today.slice(0, 7))}>Today</button>
        <button className="h-8 rounded-lg border border-line2 px-2.5 text-[13px]" onClick={() => shift(1)} aria-label="Next month">→</button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="bg-paper px-2 py-1.5 font-mono text-[10px] uppercase text-muted">{d}</div>)}
        {days.map(d => {
          const items = byDay.get(d) ?? [];
          return (
            <div key={d} className={cx('flex min-h-[84px] flex-col gap-1 bg-white p-1.5', d.slice(0, 7) !== month && 'bg-paper opacity-60')}>
              <span className={cx('tnum w-fit rounded-full px-1.5 text-xs', d === today ? 'bg-ink font-bold text-white' : 'text-muted')}>{+d.slice(8)}</span>
              {items.slice(0, 3).map(r => (
                <button key={getId(r)} onClick={onOpen ? () => onOpen(r) : undefined} title={typeof cal.label(r) === 'string' ? String(cal.label(r)) : undefined}
                  className={cx('truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium', tone[cal.tone?.(r) ?? 'normal'])}>{cal.label(r)}</button>))}
              {items.length > 3 && <span className="px-1 text-[11px] text-muted">+{items.length - 3} more</span>}
            </div>);
        })}
      </div>
      {undated > 0 && <p className="px-1 text-xs text-muted">{undated} without a date {undated === 1 ? 'is' : 'are'} not shown on the calendar.</p>}
    </div>
  );
}

export const dueLabel = (iso: string | null, today: string) => {
  if (!iso) return 'No date';
  const n = dayNumber(iso) - dayNumber(today);
  return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? `${-n}d late` : n <= 7 ? `In ${n}d` : shortDate(iso);
};
