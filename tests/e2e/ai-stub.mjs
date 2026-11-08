// Local stand-in for the AI provider, used only by the e2e suite (ANTHROPIC_BASE_URL=http://127.0.0.1:4010).
// It answers the way the real model is instructed to: JSON whose facts cite refs and amounts copied from <records>.
// This tests NETBYFRIDAY's own pipeline (RLS load → context → verification → history), not model quality.
import http from 'node:http';
import fs from 'node:fs';

// Contract reading stand-in: pulls terms out of the document text with fixed patterns and copies the wording as the quote,
// the shape the real model is told to use. PDFs can't be read here, so a PDF upload is answered from the sample contract.
const SAMPLE = fs.readFileSync(new URL('./fixtures/sample-contract.txt', import.meta.url), 'utf8');
function readContract(text) {
  const fields = {}, grab = (key, re, value = m => m[1] ?? m[0]) => { const m = text.match(re); if (m) fields[key] = { value: value(m), quote: m[0].trim() }; };
  grab('title', /AGREEMENT:\s*(.+)/);
  grab('brandName', /between ([A-Z][\w&' ]+?(?: Co\.| Inc\.)?) \("Brand"\)/);
  grab('fee', /total fee of (\$[\d,]+(?:\.\d\d)?)/);
  grab('paymentTerms', /50% of the fee is due within 15 days of signing\. The balance is due Net 30 after the final deliverable goes live\./, () => '50% within 15 days of signing; balance Net 30 after the final deliverable goes live');
  grab('signedOn', /both parties sign, (\d{4}-\d{2}-\d{2})/);
  grab('usageRights', /paid social advertising on Meta \(Instagram, Facebook\) and TikTok for 90 days from the first post date/, () => 'Paid social on Meta and TikTok, plus organic reposting');
  grab('usageDays', /for (90) days from the first post date/, m => 90);
  grab('whitelisting', /run the deliverables as partnership ads or Spark Ads[^.]*/, () => 'Partnership ads / Spark Ads during the usage period, ad copy approved by you');
  grab('exclusivity', /not enter paid partnerships with competing color cosmetics brands/, () => 'No paid partnerships with competing color cosmetics brands');
  grab('exclusivityDays', /for (30) days after the final deliverable goes live/, m => 30);
  grab('revisions', /up to two rounds of revisions per deliverable/, () => 'Up to 2 rounds per deliverable');
  grab('killFee', /Brand will pay 50% of the fee as a kill fee/, () => '50% of the fee if the brand cancels after signing');
  grab('otherTerms', /Brand will review drafts within 3 business days/, () => 'Brand reviews drafts within 3 business days; disclose with #ad or the paid partnership label');
  const deliverables = [...text.matchAll(/\(([a-z])\) (.+?), live by (\d{4}-\d{2}-\d{2})/g)].map(m => ({ name: m[2].replace(/ with link sticker/, '').replace(/^(\w+) \((\d+)\) /, '$2 '), dueOn: m[3], quote: m[0].slice(4) }));
  return JSON.stringify({ fields, deliverables, warnings: ['Usage starts on the first post date, which the contract doesn’t give. Add it once you post.'] });
}

// Contract generator stand-in: reads deal terms from a brand message (or, for a screenshot, from the sample DM).
const SAMPLE_DM = fs.readFileSync(new URL('./fixtures/sample-deal-dm.txt', import.meta.url), 'utf8');
function readMessage(text) {
  const fields = {}, grab = (key, re, value = m => m[1] ?? m[0]) => { const m = text.match(re); if (m) fields[key] = { value: value(m), quote: m[0].trim() }; };
  grab('campaign', /on our (Spring Capsule) campaign/);
  grab('brandName', /Jordan Lee from (Petalwear)/);
  grab('contactName', /This is (Jordan Lee) from/);
  grab('contactEmail', /([\w.]+@[\w.]+\.test)/);
  grab('fee', /Budget is (\$[\d,]+) total/);
  grab('paymentTerms', /paid (Net 30 after the posts go live)/);
  grab('usageRights', /Usage: (organic reposting on Petalwear's channels) for 60 days/);
  grab('usageDays', /for (60) days/, m => 60);
  const deliverables = [...text.matchAll(/(\d (?:Instagram|TikTok) \w+) live by (\d{4}-\d{2}-\d{2})/g)].map(m => ({ name: m[1], dueOn: m[2], quote: m[0] }));
  return JSON.stringify({ fields, deliverables, warnings: ['Exclusivity: the brand said none is needed, so it was left empty.'] });
}

http.createServer((req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    const { system, messages = [] } = JSON.parse(body || '{}');
    if (String(system).startsWith('You read messages between a content creator')) {
      const doc = messages[0]?.content?.[0];
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [{ type: 'text', text: readMessage(doc?.type === 'document' && doc?.source?.type === 'text' ? doc.source.data : SAMPLE_DM) }] }));
    }
    if (String(system).startsWith('You read brand partnership contracts')) {
      const doc = messages[0]?.content?.[0];
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [{ type: 'text', text: readContract(doc?.source?.type === 'text' ? doc.source.data : SAMPLE) }] }));
    }
    const question = String(messages[messages.length - 1]?.content ?? '');
    const send = text => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text }] })); };
    if (system.startsWith('You write short business emails')) return send('Subject: Quick follow-up on the invoice\n\nHi [Name],\n\nJust checking in on the open balance. Thank you!\n\nAvery');
    const records = JSON.parse(system.slice(system.lastIndexOf('<records>') + 9, system.lastIndexOf('</records>')));
    const m = Object.fromEntries(records.metrics.map(x => [x.ref, x.value]));
    const inv = records.invoices[0];
    const reply = {
      answer: `You have received ${m['metric:revenue_this_month']} this month and ${m['metric:outstanding']} is still unpaid.`,
      facts: [
        { statement: `Revenue received this month is ${m['metric:revenue_this_month']}.`, evidence: ['metric:revenue_this_month'] },
        { statement: `Unpaid invoice balances total ${m['metric:outstanding']}.`, evidence: ['metric:outstanding'] },
        ...(inv ? [{ statement: `${inv.number} for ${inv.client} has ${inv.balance} left to pay.`, evidence: [inv.ref] }] : []),
        { statement: 'You are owed $999,999.', evidence: ['metric:outstanding'] } // deliberately unsupported: must be flagged
      ],
      forecasts: [], recommendations: inv ? [{ statement: `Send a friendly reminder before ${inv.due}.`, because: [inv.ref] }] : [], missing: []
    };
    if (/plate/i.test(question)) {
      // A weekly-agenda answer with one proposed task and one draft, exactly in the shape the real model must use.
      const deal = records.deals[0];
      reply.answer = `You have ${records.thisWeek.length} things this week.`;
      reply.facts = records.thisWeek.slice(0, 3).map(a => ({ statement: a.what.replace(/\$[\d,.]+/g, ''), evidence: [a.ref] }));
      reply.actions = deal ? [{ type: 'create_task', title: `Check in with ${deal.brand} on deliverables`, due: null, refs: [deal.ref], because: [deal.ref] },
                              { type: 'record_payment', ref: inv?.ref, amount: '$3,000' }] : [];
      reply.drafts = inv ? [{ kind: 'Following up on payment', ref: inv.ref, why: 'Balance still open.' }] : [];
    }
    send(JSON.stringify(reply));
  });
}).listen(4010, '127.0.0.1', () => console.log('ai stub on :4010'));
