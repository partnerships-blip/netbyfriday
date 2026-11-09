// Contract red flags: the terms creators most often get burned by, found by fixed rules (not the AI) and explained in
// plain English with what to ask for instead. The AI can add flags for reworded clauses, but every explanation shown to
// the creator comes from this file, so it doesn't change when the model does. This is not legal advice.

export type FlagId =
  | 'perpetual' | 'irrevocable' | 'ownership' | 'aiLikeness' | 'likeness' | 'worldwide' | 'editing'
  | 'payWhenPaid' | 'performancePay' | 'longPayment' | 'paymentOnApproval' | 'clawback'
  | 'cancelAnyTime' | 'indemnify' | 'exclusivityBroad' | 'paidAds' | 'unlimitedRevisions' | 'soleDiscretion'
  | 'autoRenew' | 'morality' | 'keepLive' | 'arbitration';

export type Severity = 'high' | 'watch';
export interface FlagInfo { id: FlagId; severity: Severity; title: string; means: string; burn: string; ask: string }
export interface RedFlag { id: FlagId | 'other'; severity: Severity; title: string; quote: string; found?: boolean; by: 'rule' | 'ai'; aiNote?: string }

export const FLAG_INFO: Record<FlagId, FlagInfo> = {
  perpetual: { id: 'perpetual', severity: 'high', title: 'Usage rights with no end date',
    means: '“In perpetuity”, “forever” or “for the life of the copyright” means the brand can keep using your content as long as it wants. It never expires.',
    burn: 'Your face and content can keep showing up in their ads years from now, including after you’ve moved on to a competitor, and you’re paid once.',
    ask: 'A set usage window (30–90 days is common for organic use), with a fee to extend. If they insist on longer, price it as a buyout, often several times your base fee.' },
  irrevocable: { id: 'irrevocable', severity: 'high', title: 'Rights you can’t take back',
    means: '“Irrevocable” means once you sign, you can’t cancel the rights you gave, even if the brand doesn’t pay or the relationship goes bad.',
    burn: 'If they pay late or not at all, they can still keep using your content.',
    ask: 'Make the license start only after you’re paid in full, and let it end if they don’t pay.' },
  ownership: { id: 'ownership', severity: 'high', title: 'You give up ownership of your content',
    means: '“Work made for hire”, “assigns all right, title and interest” or “brand owns the content” means the content stops being yours. The brand becomes the owner.',
    burn: 'You may not be allowed to repost your own work, use it in your portfolio, or stop them from editing and reselling it.',
    ask: 'You keep ownership and give the brand a license (a permission) for specific uses and a set time. If they truly need to own it, that’s a buyout and should cost much more.' },
  aiLikeness: { id: 'aiLikeness', severity: 'high', title: 'AI use of your face, voice or content',
    means: 'The brand may use your content or likeness to train AI or create digital replicas or synthetic versions of you.',
    burn: 'An AI version of you could appear in ads you never made or approved, with no extra pay and no end date.',
    ask: 'Strike it, or limit it in writing: no AI training, no digital replicas, nothing new made with your likeness without your written approval and a separate fee.' },
  likeness: { id: 'likeness', severity: 'watch', title: 'Use of your name, image or likeness',
    means: 'The brand can use your name, photo, voice or likeness, not just the posts you made.',
    burn: 'Without limits, they can put your face on packaging, in-store displays or ads you never saw.',
    ask: 'Limit it to promoting this campaign, during the usage window, and only in content you approved.' },
  worldwide: { id: 'worldwide', severity: 'watch', title: 'Worldwide use',
    means: 'The brand can use your content in any country.',
    burn: 'Combined with long or paid usage, this is worth far more than a local or social-only license.',
    ask: 'Limit it to the countries and channels they actually need, or price worldwide use higher.' },
  editing: { id: 'editing', severity: 'watch', title: 'The brand can edit or change your content',
    means: 'They can cut, edit, add to or remix what you made.',
    burn: 'Edited versions can change what you said or put your face next to claims you never made.',
    ask: 'Edits only with your approval, and no changes that alter what you said.' },
  payWhenPaid: { id: 'payWhenPaid', severity: 'high', title: 'You get paid only when they get paid',
    means: 'Common with agencies: they pay you only after their client pays them.',
    burn: 'If the client pays late or never, so do you, even though you delivered.',
    ask: 'A fixed due date after you deliver (for example Net 30 from your invoice), whatever happens between the agency and its client.' },
  performancePay: { id: 'performancePay', severity: 'high', title: 'Pay depends on views, sales or results',
    means: 'Some or all of your fee depends on performance: views, engagement, clicks or sales.',
    burn: 'You can do all the work and get paid less, or nothing, because of things you don’t control.',
    ask: 'A guaranteed base fee for the work, with any performance bonus on top.' },
  longPayment: { id: 'longPayment', severity: 'watch', title: 'A long wait to get paid',
    means: '“Net 60” or “Net 90” means they have 60 or 90 days to pay after the trigger (usually your invoice).',
    burn: 'You can wait three months or more after posting, and the clock often starts late.',
    ask: 'Net 30 or less, starting from your invoice, or a deposit (for example 50%) when you sign.' },
  paymentOnApproval: { id: 'paymentOnApproval', severity: 'watch', title: 'Payment waits on their approval or the campaign ending',
    means: 'The payment clock starts only when the brand approves your work or the whole campaign ends, not when you deliver.',
    burn: 'Slow approvals or a long campaign quietly push your payday back by weeks or months.',
    ask: 'The clock starts when you deliver or post, with a deadline for approvals (for example 3 business days, or it counts as approved).' },
  clawback: { id: 'clawback', severity: 'high', title: 'You may have to pay money back',
    means: 'Refund, repayment, clawback or “liquidated damages” clauses mean the brand can ask for the fee back, or charge you a penalty.',
    burn: 'A missed deadline or a post that gets taken down can cost you the whole fee, sometimes more.',
    ask: 'Remove it, or limit it to clear cases you control, with a chance to fix the problem first, and never more than the fee for that one piece.' },
  cancelAnyTime: { id: 'cancelAnyTime', severity: 'watch', title: 'The brand can cancel for any reason',
    means: 'They can end the deal at any time, without a reason.',
    burn: 'If there’s no kill fee, you can lose the whole fee after turning down other work or after you’ve started creating.',
    ask: 'A kill fee: for example 50% if they cancel after signing, and 100% once you’ve delivered.' },
  indemnify: { id: 'indemnify', severity: 'watch', title: 'You cover the brand’s legal costs',
    means: '“Indemnify” means you agree to pay the brand’s losses and legal costs if someone makes a claim about your content.',
    burn: 'You could be on the hook for claims about their own product, their claims or their edits.',
    ask: 'Make it mutual, limit it to things you control (like using music you didn’t license), and cap it at the fee.' },
  exclusivityBroad: { id: 'exclusivityBroad', severity: 'watch', title: 'Exclusivity that blocks other deals',
    means: 'You can’t work with competitors, or a whole category, for a period of time.',
    burn: 'A broad category or a long window can cost you more income than this deal pays.',
    ask: 'Name the specific competitors, keep it short (often the campaign plus 30 days), and charge for it: exclusivity is a separate fee.' },
  paidAds: { id: 'paidAds', severity: 'watch', title: 'Paid ads with your content or your handle',
    means: 'Whitelisting, Spark Ads or partnership ads let the brand run paid ads using your content, sometimes from your own account.',
    burn: 'Paid ads reach far more people than your post. Without a fee and an end date, you’re giving away your most valuable usage.',
    ask: 'A separate fee for paid use, a set length (for example 30 days), a spending cap, and approval of the ads that run from your account.' },
  unlimitedRevisions: { id: 'unlimitedRevisions', severity: 'watch', title: 'Unlimited revisions',
    means: 'They can ask for changes as many times as they want.',
    burn: 'One deliverable can turn into weeks of reshoots for the same fee.',
    ask: 'One or two rounds of revisions, with a fee for more or for reshoots.' },
  soleDiscretion: { id: 'soleDiscretion', severity: 'watch', title: 'Decisions at the brand’s “sole discretion”',
    means: 'The brand decides, and doesn’t have to be reasonable or explain why.',
    burn: 'If it’s tied to approvals or payment, they can reject your work and withhold payment with no real reason.',
    ask: 'Change it to “reasonable discretion”, with clear approval criteria agreed up front.' },
  autoRenew: { id: 'autoRenew', severity: 'watch', title: 'Automatic renewal',
    means: 'The agreement, including exclusivity or usage, renews by itself unless someone cancels in time.',
    burn: 'You can stay tied up for another term at the old rate without noticing.',
    ask: 'No automatic renewal: any extension needs both sides to agree in writing, at a new rate.' },
  morality: { id: 'morality', severity: 'watch', title: 'Morality clause',
    means: 'The brand can end the deal if you do something they think hurts their reputation.',
    burn: 'Vague wording lets them cancel, and sometimes withhold pay, over almost anything you post.',
    ask: 'Specific, serious conduct only, payment for work already done, and the same right for you if the brand has a scandal.' },
  keepLive: { id: 'keepLive', severity: 'watch', title: 'You must keep the posts up',
    means: 'You can’t delete or archive the posts for a set time, or ever.',
    burn: 'Your feed stays committed to the brand long after the deal, including if you later work with a competitor.',
    ask: 'A set time the posts stay live (for example 6–12 months), after which you can archive them.' },
  arbitration: { id: 'arbitration', severity: 'watch', title: 'Disputes go to private arbitration',
    means: 'If there’s a dispute, it’s decided by a private arbitrator instead of a court, often in the brand’s home state.',
    burn: 'Chasing an unpaid fee can cost more than the fee itself.',
    ask: 'Small claims court allowed for unpaid fees, and a location that works for you.' }
};

type Rule = { id: FlagId; re: RegExp; unless?: RegExp };
const RULES: Rule[] = [
  { id: 'perpetual', re: /\bin perpetuity\b|\bperpetual(ly)?\b|\bforever\b|\bfor all time\b|\bin perpetuum\b|now known or hereafter (devised|developed|invented)|for the (full |entire )?(life|duration|term) of (the |any )?copyright|\bwithout (any )?(time )?(limit|limitation|expiration)\b|\bno expiration\b|\bindefinitely\b|\bunlimited (duration|period|time)\b/i },
  { id: 'irrevocable', re: /\birrevocabl[ey]\b/i },
  { id: 'ownership', re: /\bworks? (made )?for hire\b|\bhereby (irrevocably )?assigns?\b|\bassigns? (to (brand|company|client) )?(all|any) (of (its|their|creator'?s|influencer'?s) )?(right|rights|ownership)|\ball right,? title,? and interest\b|\b(brand|company|client) (shall|will) (solely |exclusively )?own\b|\b(sole|exclusive) (owner|property) of (brand|company|client)\b|\btransfers? (all )?(ownership|copyright)/i },
  { id: 'aiLikeness', re: /\b(train(ing)?|fine-?tun(e|ing))\b.{0,60}\b(artificial intelligence|a\.?i\.?|machine learning|models?)\b|\bdigital (replica|twin|double|avatar)s?\b|\bsynthetic (media|content|voice|likeness|version)s?\b|\b(ai|artificial intelligence)[- ]generated\b.{0,80}\b(likeness|voice|image|persona)\b|\bvoice clon/i },
  { id: 'likeness', re: /\b(name,? )?(image,? |voice,? |)likeness\b|\bname and image\b|\bbiographical (information|material)\b|\bpersona\b/i },
  { id: 'worldwide', re: /\bworld-?wide\b|\bthroughout the (world|universe)\b|\bin all (territories|countries)\b/i },
  { id: 'editing', re: /\b(brand|company|client|agency)\b.{0,40}\b(may|can|is entitled to|shall have the right to|reserves the right to|has the right to)\b.{0,30}\b(edit|modify|alter|adapt|crop|remix|re-?cut|change)\b|\b(create|make|produce) derivative works?\b|\bderivative works\b/i },
  { id: 'payWhenPaid', re: /\bpay(ment)?[- ]when[- ]paid\b|\b(upon|after|following|within \d+ days (of|after)) (its |our |the agency'?s )?(receipt|receiving|collection) of (payment|funds|monies)\b.{0,40}\b(from )?(the )?(client|brand|advertiser|end client)\b|\bcontingent (up)?on (the )?(client|brand|advertiser)'?s? (payment|paying)\b|\bonly (after|once|when) (the )?(client|brand|advertiser) (has )?pa(ys|id)\b/i },
  { id: 'performancePay', re: /\b(payment|fee|compensation|bonus|pay)\b.{0,40}\b(contingent|conditional|dependent|based) (up)?on\b.{0,70}\b(views|impressions|engagement|performance|results|metrics|sales|conversions|clicks)\b|\bminimum (of |number of )?[\d,.]*\s*[km]?\s*(views|impressions|engagements?|clicks|conversions|sales)\b|\bcost per (acquisition|sale|click)\b|\bcommission[- ]only\b/i },
  { id: 'longPayment', re: /\bnet[\s-]?(4[6-9]|[5-9]\d|1\d\d)\b|\b(4[6-9]|[5-9]\d|1\d\d) days (after|from|following|of|upon)\b.{0,40}\b(invoice|posting|publication|delivery|campaign|receipt)/i },
  { id: 'paymentOnApproval', re: /\b(paid|payment|pay|invoice)\b.{0,50}\b(upon|after|following) (the )?(final |written )?(approval|acceptance)\b|\b(paid|payment|pay)\b.{0,50}\b(after|upon|following|at) the (end|conclusion|completion) of the (campaign|term|program)\b/i },
  { id: 'clawback', re: /\brefund (the|all|any|a portion)\b|\b(repay|reimburse) (the |all |any )?(fee|payment|compensation)\b|\bclaw[- ]?backs?\b|\bforfeit(s|ure)? (of )?(the |all |any )?(fee|payment|compensation)\b|\bliquidated damages\b|\breturn (the |all |any )?(fee|payment|compensation)/i },
  { id: 'cancelAnyTime', re: /\b(terminate|cancel)\b.{0,80}\b(at any time|for any reason|for convenience|without cause|in its sole discretion|with or without cause)\b/i },
  { id: 'indemnify', re: /\b(creator|influencer|talent|you|contractor)\b.{0,30}\b(shall|will|agrees? to|must)\b.{0,20}\bindemnif/i },
  { id: 'exclusivityBroad', re: /\bexclusiv(e|ity)\b.{0,120}\b(competitor|competing|category|industry|similar (products|brands)|any (other )?brand)s?\b|\b(not|never|refrain from)\b.{0,20}\b(work|partner|collaborate|promote|post|appear)\b.{0,40}\b(competitors?|competing (brands?|products?)|similar (products|brands))\b/i, unless: /\bnon-?exclusiv|\bno exclusivity\b|exclusivity:?\s*none\b/i },
  { id: 'paidAds', re: /\bwhite-?list(ing|ed)?\b|\bspark ads?\b|\bpartnership ads?\b|\bdark posts?\b|\bpaid (media|ads|advertising|amplification|social|usage|use)\b|\bboost(ed|ing)? (the )?(posts?|content)\b|\bbranded content ads?\b|\bad access\b/i, unless: /\b(no|not|without|excludes?|excluding)\b.{0,25}\b(paid|whitelist|spark|ads?)\b|\b(paid|whitelist\w*|spark|ads?)\b.{0,25}\b(not (included|permitted|allowed)|excluded|prohibited)\b/i },
  { id: 'unlimitedRevisions', re: /\bunlimited (revisions|edits|rounds|changes|reshoots)\b|\bas many (revisions|edits|changes|rounds) as\b|\buntil (brand|client|company) is (fully )?satisfied\b/i },
  { id: 'soleDiscretion', re: /\b(sole|absolute|complete) (and absolute )?discretion\b/i },
  { id: 'autoRenew', re: /\bautomatic(ally)? renew|\bauto-?renew|\brenews? automatically\b|\bevergreen\b/i },
  { id: 'morality', re: /\bmorals?[- ]clause\b|\bmorality clause\b|\b(public )?disrepute\b|\b(scandal|reputational (harm|damage))\b|\boffend(s)? public (morals|decency)\b/i },
  { id: 'keepLive', re: /\b(remain|stay|kept) (live|up|posted|published|active)\b.{0,30}\b(permanently|indefinitely|perpetu|forever|for the life)|\b(shall|will|may) not (delete|remove|archive|take down)\b|\bpermanently (live|posted|published)\b/i },
  { id: 'arbitration', re: /\b(binding )?arbitration\b/i }
];

/** The sentence (or clause) around a match, trimmed to 300 characters, so the creator sees the actual wording. */
function around(text: string, index: number, length: number) {
  const startCut = Math.max(text.lastIndexOf('.', index), text.lastIndexOf('\n', index), text.lastIndexOf(';', index));
  const endDot = [text.indexOf('.', index + length), text.indexOf('\n', index + length), text.indexOf(';', index + length)].filter(n => n >= 0);
  let s = text.slice(startCut + 1, endDot.length ? Math.min(...endDot) + 1 : text.length).replace(/\s+/g, ' ').trim();
  if (s.length > 300) { const m = text.slice(index, index + length); const i = s.indexOf(m); const from = Math.max(0, Math.min(i - 120, s.length - 300)); s = (from > 0 ? '…' : '') + s.slice(from, from + 298).trim() + '…'; }
  return s;
}

/** Fixed-rule scan of any contract or message text. One flag per kind, with the first wording that triggered it. */
export function scanText(text: string): RedFlag[] {
  if (!text) return [];
  const out: RedFlag[] = [];
  for (const r of RULES) {
    const m = r.re.exec(text);
    if (!m) continue;
    const quote = around(text, m.index, m[0].length);
    if (r.unless && r.unless.test(quote)) continue;
    const info = FLAG_INFO[r.id];
    out.push({ id: r.id, severity: info.severity, title: info.title, quote, found: true, by: 'rule' });
  }
  return sortFlags(out);
}

/** Scan the terms as they stand (also catches terms typed or edited by the creator, and contracts read from a PDF). */
export function scanTerms(values: Record<string, string | null | undefined>): RedFlag[] {
  return scanText(Object.values(values).filter(Boolean).join('\n'));
}

const ORDER: Record<Severity, number> = { high: 0, watch: 1 };
export function sortFlags(flags: RedFlag[]) {
  return [...flags].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

/** Rule flags win; AI flags add kinds the rules missed (reworded clauses). One flag per kind; 'other' flags kept (max 5). */
export function mergeFlags(...lists: (RedFlag[] | undefined)[]): RedFlag[] {
  const seen = new Set<string>(); const out: RedFlag[] = []; let other = 0;
  for (const list of lists) for (const f of list ?? []) {
    if (f.id === 'other') { if (other++ < 5) out.push(f); continue; }
    if (seen.has(f.id)) continue;
    seen.add(f.id); out.push(f);
  }
  return sortFlags(out);
}

export const FLAG_IDS = Object.keys(FLAG_INFO) as FlagId[];

/** Plain-English “What’s this?” for each contract term, shown next to the field. */
export const TERM_HELP: Record<string, string> = {
  fee: 'The total you’re paid for this deal. It counts as revenue only when the money actually arrives.',
  paymentTerms: 'When you get paid. “Net 30” means within 30 days of the trigger, usually your invoice. Check what starts the clock: your invoice, the post, their approval, or the campaign ending.',
  usageRights: 'What the brand can do with your content, where, and for how long. Organic usage means reposting on their own channels. Paid usage (ads) and long or unlimited time are worth more and should cost more.',
  whitelisting: 'Whitelisting (also Spark Ads or partnership ads) lets the brand run paid ads with your content, sometimes from your own account. It’s usually a separate fee, with an end date and approval of the ads.',
  exclusivity: 'Brands or categories you can’t work with, and for how long. Exclusivity costs you other deals, so it’s normally paid for separately and kept short and specific.',
  revisions: 'How many rounds of changes the brand can ask for before extra changes or reshoots cost more.',
  killFee: 'What you’re paid if the brand cancels. A kill fee protects the time you blocked and the work you’ve already done.',
  otherTerms: 'Anything else that affects you: approval deadlines, FTC disclosure, how long posts must stay up, morality clauses.'
};
