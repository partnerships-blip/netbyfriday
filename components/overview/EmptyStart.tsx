'use client';
import { useState } from 'react';
import { Card, Btn } from '../ui';
import { FormModal } from '../FormModal';
import { dealFields, invoiceFields, incomeFields } from '../forms';
import { createDeal, createInvoice, addIncome, setDemoMode } from '@/app/(app)/actions';
import { useRouter } from 'next/navigation';

export function EmptyStart({ today }: { today: string }) {
  const [m, setM] = useState<'' | 'deal' | 'invoice' | 'income'>('');
  const router = useRouter();
  return (
    <Card className="flex flex-col gap-3.5 p-6">
      <h2 className="font-head text-[28px]">Your workspace is empty</h2>
      <p className="max-w-[620px] text-[15px] leading-relaxed text-muted">Every number here comes from records you add. Start with your most recent partnership, an open invoice, or income you've received.</p>
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={() => setM('deal')}>Add a partnership</Btn>
        <Btn onClick={() => setM('invoice')}>Add an invoice</Btn>
        <Btn onClick={() => setM('income')}>Record income</Btn>
        <Btn variant="ghost" onClick={async () => { await setDemoMode(true); router.refresh(); }}>Explore the demo</Btn>
      </div>
      <FormModal open={m === 'deal'} onClose={() => setM('')} title="New partnership" fields={dealFields} initial={{ stage: 'lead' }} submitLabel="Add partnership" action={createDeal} />
      <FormModal open={m === 'invoice'} onClose={() => setM('')} title="New invoice" fields={invoiceFields([])} initial={{ issuedOn: today, terms: 'Net 30', stream: 'brand' }} submitLabel="Create invoice" action={createInvoice} />
      <FormModal open={m === 'income'} onClose={() => setM('')} title="Record income" fields={incomeFields} initial={{ receivedOn: today, stream: 'affiliate' }} submitLabel="Add income" action={addIncome} />
    </Card>
  );
}
