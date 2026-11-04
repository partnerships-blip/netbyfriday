// Local stand-in for the AI provider, used only by the e2e suite (ANTHROPIC_BASE_URL=http://127.0.0.1:4010).
// It answers the way the real model is instructed to: JSON whose facts cite refs and amounts copied from <records>.
// This tests NETBYFRIDAY's own pipeline (RLS load → context → verification → history), not model quality.
import http from 'node:http';
http.createServer((req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    const { system } = JSON.parse(body || '{}');
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
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(reply) }] }));
  });
}).listen(4010, '127.0.0.1', () => console.log('ai stub on :4010'));
