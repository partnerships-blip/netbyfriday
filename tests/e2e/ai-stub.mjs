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

http.createServer((req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    const { system, messages = [] } = JSON.parse(body || '{}');
    if (String(system).startsWith('You read brand partnership contracts')) {
      const doc = messages[0]?.content?.[0];
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [{ type: 'text', text: readContract(doc?.source?.type === 'text' ? doc.source.data : SAMPLE) }] }));
    }
    if (String(system).startsWith('You are the creator’s content strategist inside NETBYFRIDAY') || String(system).startsWith("You are the creator's content strategist inside NETBYFRIDAY")) {
      const instr = (messages[0]?.content ?? []).find(b => b.type === 'text')?.text ?? '';
      const srcs = JSON.parse(instr.slice(instr.indexOf('<sources>') + 9, instr.indexOf('</sources>')));
      const q = instr.slice(instr.lastIndexOf('Question:') + 9).trim();
      const skip = srcs.find(x => x.ref === 'm:skipRate');
      const visual = srcs.some(x => x.ref === 'frame:1') ? ['frame:1'] : ['description'];
      const reply = /hook/i.test(q)
        ? { answer: 'Here are three openings that put the result first. Most creators see 70% better retention with these.', cites: visual,
            points: [{ lead: 'Lead with the payoff', point: 'Your opening frame is a title card, so the finished look arrives later than it could.', cites: visual }],
            ideas: [{ text: 'Open on the finished glow, then: “This takes 3 steps.”' }, { text: '“Your skin, but holiday-party ready.” Close-up first, title second.' }, { text: 'Start mid-application with the glow drops catching the light.' }] }
        : { answer: skip ? `A skip rate of ${skip.text.split(': ')[1].split(' ')[0]} means a good share of viewers left early. One possibility is that the opening frame doesn’t show the result yet.` : 'There aren’t numbers for this yet.', cites: skip ? ['m:skipRate', ...visual] : [], points: [], ideas: [] };
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(reply) }], usage: { input_tokens: 3100, output_tokens: 420 }, stop_reason: 'end_turn' }));
    }
    if (String(system).startsWith('You are a sharp, kind content strategist')) {
      // Stand-in for a content report: cites only the sources it was given, plus one ungrounded claim that the checker must remove.
      const parts = messages[0]?.content ?? [];
      const instr = parts.find(b => b.type === 'text')?.text ?? '';
      const srcs = JSON.parse(instr.slice(instr.indexOf('<sources>') + 9, instr.indexOf('</sources>')));
      const has = r => srcs.some(x => x.ref === r), txt = r => srcs.find(x => x.ref === r)?.text ?? '';
      const visual = has('frame:1') ? ['frame:1'] : has('image') ? ['image'] : ['description'];
      const perf = has('m:views');
      const improve = [{ point: 'Videos under 7 seconds always get 300% more reach.', cites: [] }];
      const working = [];
      if (perf && has('c:views')) improve.push({ point: txt('c:views') + '.', cites: ['c:views'] });
      else if (perf && has('m:skipRate')) improve.push({ point: `A ${txt('m:skipRate').split(': ')[1].split(' ')[0]} skip rate means many viewers left early; the payoff may come too late in the opening.`, cites: ['m:skipRate', ...visual] });
      improve.push({ point: 'The title card holds the screen before anything happens, so the result arrives later than it could.', cites: visual });
      if (has('b:summary')) {
        working.unshift({ lead: 'This post sits next to real business', point: txt('b:summary'), cites: ['b:summary'] });
      }
      const reply = {
        summary: perf ? 'Your glow routine Reel is still early, and there is nothing to compare it with yet, so read these numbers on their own.' : 'A short beauty tutorial that walks through a holiday glow routine step by step.',
        working: [...working, { lead: 'Your payoff is visible from the start', point: 'The finished look is clear and bright in the opening frame, which gives viewers a reason to stay.', cites: visual },
                  ...(has('caption') ? [{ lead: 'Your caption sets up the save', point: 'The caption promises a simple routine and asks people to save it, which fits a tutorial.', cites: ['caption'] }] : [])],
        improve,
        recommendations: [{ point: 'Open on the finished glow and say the payoff out loud before the first step.', cites: visual }],
        tests: [{ point: 'Start on a close-up of the finished skin instead of the title card.', cites: visual },
                { point: 'Put the step count on screen in the opening frame.', cites: visual },
                { point: 'Try a voiceover that names the problem first, then the fix.', cites: visual }],
        next: [{ title: 'Glow routine, party edition', point: 'A follow-up that builds on the same routine for evening looks.', cites: visual },
               { title: 'Before and after', point: 'Show the change side by side, since the result is the strongest visual here.', cites: visual },
               { title: 'Product deep-dive', point: 'One product from the routine, up close, with how you use it.', cites: has('description') ? ['description'] : visual }],
        business: has('category') ? { point: 'A clean, step-by-step beauty tutorial is the kind of piece a skincare brand can picture its product in; it works as a portfolio example in a pitch.', cites: ['category', ...visual] } : null,
        limitations: []
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(reply) }], usage: { input_tokens: 4200, output_tokens: 900 }, stop_reason: 'end_turn' }));
    }
    if (String(system).startsWith('You read screenshots of social media analytics')) {
      // Stand-in for the vision model: confirms it was sent a real PNG, then returns what tests/e2e/fixtures/sample-insights.png shows.
      const img = (messages[0]?.content ?? []).find(b => b.type === 'image');
      const png = img && Buffer.from(img.source.data, 'base64').subarray(1, 4).toString() === 'PNG';
      const reading = png ? { platform: 'instagram', period_text: 'Last 24 hours', date_text: 'Nov 6', notes: '', metrics: [
        { key: 'views', label: 'Views', value_text: '2,599', legible: true }, { key: 'reach', label: 'Accounts reached', value_text: '1,842', legible: true },
        { key: 'likes', label: 'Likes', value_text: '211', legible: true }, { key: 'comments', label: 'Comments', value_text: '29', legible: true },
        { key: 'shares', label: 'Shares', value_text: '26', legible: true }, { key: 'saves', label: 'Saves', value_text: '48', legible: true },
        { key: 'avgWatchSeconds', label: 'Average watch time', value_text: '4.2 sec', legible: true }, { key: 'skipRate', label: 'Skip rate', value_text: '41.8%', legible: true },
        { key: 'profileVisits', label: 'Profile visits', value_text: '17', legible: true }] }
        : { platform: 'unknown', period_text: '', date_text: '', metrics: [], notes: 'Not an analytics screenshot' };
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(reading) }], usage: { input_tokens: 1650, output_tokens: 310 } }));
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
