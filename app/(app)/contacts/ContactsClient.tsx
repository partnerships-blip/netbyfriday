'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Btn, Card, Empty, Eyebrow, Pill, cx } from '@/components/ui';
import { Drawer } from '@/components/Modal';
import { RecordView, dueLabel, type Column } from '@/components/RecordView';
import { FormModal } from '@/components/FormModal';
import { TaskList } from '@/components/TaskList';
import { contactFields } from '@/components/forms';
import { createContact, updateContact, deleteContact } from '@/app/(app)/actions';
import { formatCents, shortDate } from '@/lib/finance/core.js';
import { STAGE_LABEL } from '@/lib/brand';
import type { Contact, Task } from '@/lib/types';

export type BrandRow = {
  id: string; name: string; deals: { id: string; label: string; stage: string; feeCents: number; startedOn: string }[]; activeCount: number;
  receivedCents: number; openCents: number; invoices: { id: string; number: string; amountCents: number; balanceCents: number; state: string; dueOn: string }[];
  lastContactOn: string | null; contactIds: string[];
};
type DealLite = { id: string; brandId: string; contactId: string | null; label: string; stage: string };

export function ContactsClient({ contacts, brands, deals, tasks, today, readOnly, initialContact, initialBrand }: {
  contacts: Contact[]; brands: BrandRow[]; deals: DealLite[]; tasks: Task[]; today: string; readOnly: boolean; initialContact: string | null; initialBrand: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'contacts' | 'brands'>(initialBrand ? 'brands' : 'contacts');
  const [selC, setSelC] = useState<string | null>(initialContact);
  const [selB, setSelB] = useState<string | null>(initialBrand);
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const contactDeals = (c: Contact) => deals.filter(d => d.contactId === c.id);
  const openTasks = (pred: (t: Task) => boolean) => tasks.filter(t => t.status === 'open' && pred(t));
  const contact = contacts.find(c => c.id === selC) ?? null;
  const brand = brands.find(b => b.id === selB) ?? null;
  const refresh = () => router.refresh();

  const cCols: Column<Contact>[] = [
    { key: 'name', label: 'Name', sort: c => c.name.toLowerCase(), render: c => <span className="flex flex-col"><span className="font-semibold">{c.name}</span>{c.role && <span className="text-xs text-muted">{c.role}</span>}</span> },
    { key: 'brand', label: 'Brand', sort: c => (c.brandName ?? '').toLowerCase(), render: c => c.brandName ?? <span className="text-muted">—</span> },
    { key: 'email', label: 'Email', hideOnMobile: true, render: c => c.email ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-sub underline underline-offset-2">{c.email}</a> : <span className="text-muted">—</span> },
    { key: 'follow', label: 'Follow up', sort: c => c.followUpOn, render: c => c.followUpOn ? <span className={cx('font-mono text-xs', c.followUpOn < today ? 'text-danger' : 'text-sub')}>{dueLabel(c.followUpOn, today)}</span> : <span className="text-muted">—</span> },
    { key: 'deals', label: 'Partnerships', sort: c => contactDeals(c).length, render: c => <span className="tnum">{contactDeals(c).length}</span> },
    { key: 'tasks', label: 'Open tasks', hideOnMobile: true, sort: c => openTasks(t => t.contactId === c.id).length, render: c => <span className="tnum">{openTasks(t => t.contactId === c.id).length}</span> }
  ];
  const bCols: Column<BrandRow>[] = [
    { key: 'name', label: 'Brand', sort: b => b.name.toLowerCase(), render: b => <span className="font-semibold">{b.name}</span> },
    { key: 'deals', label: 'Partnerships', sort: b => b.deals.length, render: b => <span className="tnum">{b.deals.length}{b.activeCount ? <span className="text-muted"> · {b.activeCount} active</span> : ''}</span> },
    { key: 'received', label: 'Received', sort: b => b.receivedCents, render: b => <span className="tnum">{formatCents(b.receivedCents)}</span> },
    { key: 'open', label: 'Unpaid', sort: b => b.openCents, render: b => <span className={cx('tnum', b.invoices.some(v => v.state === 'overdue') && 'text-danger')}>{formatCents(b.openCents)}</span> },
    { key: 'contacts', label: 'Contacts', hideOnMobile: true, sort: b => b.contactIds.length, render: b => <span className="tnum">{b.contactIds.length}</span> },
    { key: 'last', label: 'Last contact', hideOnMobile: true, sort: b => b.lastContactOn, render: b => <span className="font-mono text-xs text-sub">{shortDate(b.lastContactOn)}</span> }
  ];

  return (
    <>
      <div className="flex gap-1 self-start rounded-[10px] bg-lavender p-[3px]" role="tablist">
        {(['contacts', 'brands'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('h-9 rounded-[8px] px-4 text-sm font-semibold', tab === t ? 'bg-white shadow-sm' : 'text-sub')}>{t === 'contacts' ? `Contacts · ${contacts.length}` : `Brands · ${brands.length}`}</button>)}
      </div>
      {tab === 'contacts' ? (
        <RecordView<Contact> storageKey="contacts" rows={contacts} getId={c => c.id} today={today} noun="contact" views={['table']} columns={cCols} onOpen={c => setSelC(c.id)}
          search={c => `${c.name} ${c.brandName ?? ''} ${c.email} ${c.role}`}
          filters={[{ key: 'all', label: 'All', test: () => true }, { key: 'follow', label: 'Follow up due', test: c => !!c.followUpOn && c.followUpOn <= today }]}
          toolbar={!readOnly && <div className="flex items-center gap-2"><Link href="/import?kind=contacts" className="inline-flex h-9 items-center rounded-[10px] border border-line2 bg-white px-3.5 text-[13px] font-medium">Import CSV</Link><Btn variant="primary" onClick={() => setEditing('new')}>New contact</Btn></div>}
          empty={<Empty>No contacts yet. Add the people you work with at each brand or agency, then link them to partnerships and tasks.{!readOnly && <> <button className="underline" onClick={() => setEditing('new')}>Add a contact</button> or <Link href="/import?kind=contacts" className="underline">import them from a spreadsheet</Link>.</>}</Empty>} />
      ) : (
        <RecordView<BrandRow> storageKey="brands" rows={brands} getId={b => b.id} today={today} noun="brand" views={['table']} columns={bCols} onOpen={b => setSelB(b.id)} search={b => b.name}
          empty={<Empty>No brands yet. Brands collect every partnership, invoice and contact you have with them, so you can see the whole relationship. They appear when you add a partnership or a contact with a brand name.{!readOnly && <div className="mt-3"><Btn variant="primary" onClick={() => setEditing('new')}>Add a brand contact</Btn></div>}</Empty>} />
      )}

      {contact && (
        <Drawer open onClose={() => { setSelC(null); router.replace('/contacts', { scroll: false }); }}>
          <div className="flex flex-col gap-5 px-6 py-[22px]">
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-1"><Eyebrow>{contact.brandName ?? 'No brand'}{contact.role ? ` · ${contact.role}` : ''}</Eyebrow><h2 className="font-head text-[32px] leading-[1.08]">{contact.name}</h2></div>
              <Btn onClick={() => setSelC(null)}>Close</Btn>
            </div>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-soft bg-soft sm:grid-cols-2">
              {([['Email', contact.email ? <a key="e" className="underline" href={`mailto:${contact.email}`}>{contact.email}</a> : ''], ['Phone', contact.phone], ['Last contacted', shortDate(contact.lastContactedOn)], ['Follow up', contact.followUpOn ? dueLabel(contact.followUpOn, today) : '']] as const).map(([k, v]) =>
                <div key={k} className="flex flex-col gap-0.5 bg-white px-3 py-2.5"><dt className="text-[11px] text-muted">{k}</dt><dd className="break-words text-sm">{v || '—'}</dd></div>)}
            </dl>
            {contact.notes && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#4A2A45]">{contact.notes}</p>}
            <section className="flex flex-col gap-1.5"><Eyebrow>Partnerships</Eyebrow>
              {contactDeals(contact).map(d => <Link key={d.id} href={`/partnerships?deal=${d.id}`} className="flex justify-between gap-2 border-t border-soft2 py-2 text-sm hover:underline"><span>{d.label}</span><Pill>{STAGE_LABEL[d.stage]}</Pill></Link>)}
              {!contactDeals(contact).length && <p className="text-sm text-muted">Not linked to a partnership. Link one from the partnership's page.</p>}
            </section>
            <section className="flex flex-col gap-1.5"><Eyebrow>Tasks</Eyebrow>
              <TaskList tasks={tasks.filter(t => t.contactId === contact.id)} today={today} readOnly={readOnly} link={{ contactId: contact.id }} showDone />
            </section>
            {!readOnly && <div className="flex gap-2 border-t border-soft pt-4"><Btn onClick={() => setEditing(contact)}>Edit contact</Btn></div>}
          </div>
        </Drawer>
      )}

      {brand && (
        <Drawer open onClose={() => { setSelB(null); router.replace('/contacts', { scroll: false }); }}>
          <div className="flex flex-col gap-5 px-6 py-[22px]">
            <div className="flex items-start gap-3"><div className="flex flex-1 flex-col gap-1"><Eyebrow>Brand</Eyebrow><h2 className="font-head text-[32px] leading-[1.08]">{brand.name}</h2></div><Btn onClick={() => setSelB(null)}>Close</Btn></div>
            <div className="grid grid-cols-3 gap-2.5">{[['Received', formatCents(brand.receivedCents)], ['Unpaid', formatCents(brand.openCents)], ['Partnerships', String(brand.deals.length)]].map(([k, v]) =>
              <Card key={k} className="flex flex-col gap-1 px-3 py-2.5"><span className="text-[11px] text-muted">{k}</span><span className="font-head tnum text-2xl">{v}</span></Card>)}</div>
            <p className="text-xs text-muted">Received counts recorded payments only. Unpaid is the open balance on this brand's invoices.</p>
            <section className="flex flex-col gap-1.5"><Eyebrow>Contacts</Eyebrow>
              {brand.contactIds.map(id => contacts.find(c => c.id === id)!).map(c => <button key={c.id} onClick={() => { setSelB(null); setTab('contacts'); setSelC(c.id); }} className="flex justify-between border-t border-soft2 py-2 text-left text-sm hover:underline"><span>{c.name}</span><span className="text-xs text-muted">{c.role || c.email}</span></button>)}
              {!brand.contactIds.length && <p className="text-sm text-muted">No contacts for this brand yet.</p>}
            </section>
            <section className="flex flex-col gap-1.5"><Eyebrow>Partnerships</Eyebrow>
              {brand.deals.map(d => <Link key={d.id} href={`/partnerships?deal=${d.id}`} className="flex justify-between gap-2 border-t border-soft2 py-2 text-sm hover:underline"><span>{d.label} <span className="text-xs text-muted">· {shortDate(d.startedOn)}</span></span><span className="flex items-center gap-2"><span className="tnum text-xs text-sub">{formatCents(d.feeCents)}</span><Pill>{STAGE_LABEL[d.stage]}</Pill></span></Link>)}
            </section>
            <section className="flex flex-col gap-1.5"><Eyebrow>Invoices</Eyebrow>
              {brand.invoices.map(v => <Link key={v.id} href="/money" className="tnum flex justify-between gap-2 border-t border-soft2 py-2 text-sm hover:underline"><span>{v.number} · due {shortDate(v.dueOn)}</span><span className={v.state === 'overdue' ? 'text-danger' : 'text-sub'}>{v.balanceCents ? `${formatCents(v.balanceCents)} unpaid` : 'Paid'} of {formatCents(v.amountCents)}</span></Link>)}
              {!brand.invoices.length && <p className="text-sm text-muted">No invoices for this brand.</p>}
            </section>
          </div>
        </Drawer>
      )}

      <FormModal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New contact' : 'Edit contact'} fields={contactFields(brands.map(b => b.name))}
        submitLabel={editing === 'new' ? 'Add contact' : 'Save contact'}
        initial={editing && editing !== 'new' ? { name: editing.name, brand: editing.brandName ?? '', role: editing.role, email: editing.email, phone: editing.phone, followUpOn: editing.followUpOn ?? '', lastContactedOn: editing.lastContactedOn ?? '', notes: editing.notes } : {}}
        action={async v => { const r = editing && editing !== 'new' ? await updateContact({ ...v, id: editing.id }) : await createContact(v); if (r.ok) refresh(); return r; }}
        onDelete={editing && editing !== 'new' ? async () => { const r = await deleteContact(editing.id); if (r.ok) { setSelC(null); refresh(); } return r; } : undefined} deleteLabel="Delete contact" />
    </>
  );
}
