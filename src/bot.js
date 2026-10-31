// Rule-based Messenger bot (as in the paper and Admin 13 Chatbot): saved answers, quick replies,
// hand-off keywords, and a person ready to step in. No AI: answers come from the Chatbot page.
import { normalize, peso, hm12, firstName, fmtTime } from './util.js';

export const WELCOME_QUICK = ['Order for pick-up', 'Menu and flavors', 'Prices', 'Store hours', 'Delivery (Foodpanda, Grab)', 'Order status', 'My points', 'Something else'];
export const QUICK_MAP = {
  'Order for pick-up': 'f-order', 'Menu and flavors': 'f-menu', Prices: 'f-prices', 'Store hours': 'f-hours',
  'Delivery (Foodpanda, Grab)': 'f-delivery', 'Delivery options and fees': 'f-delivery', 'Order status': 'f-status', 'Track my order': 'f-status',
  'My points': 'f-points', 'See my points': 'f-points', 'Something else': 'staff', 'Talk to staff': 'staff', 'Claim points': 'f-code',
};
const GREET = ['hi', 'hello', 'hey', 'helo', 'hii', 'hiii', 'good morning', 'good afternoon', 'good evening', 'musta', 'kumusta', 'yo', 'gm', 'hi po', 'hello po', 'magandang hapon', 'magandang umaga', 'magandang gabi'];
const STAFF = ['staff', 'human', 'person', 'agent', 'tao', 'representative', 'someone', 'talk to staff', 'something else', 'customer service', 'manager', 'kausap'];
const ACTIVE = ['awaiting', 'paid', 'preparing', 'ready'];

function hasTerm(t, tokens, term) {
  const k = normalize(term);
  if (!k) return false;
  if (k.includes(' ')) return (' ' + t + ' ').includes(' ' + k + ' ');
  return tokens.has(k);
}

export function matchFaq(s, text) {
  const t = normalize(text);
  const tokens = new Set(t.split(' '));
  let best = null, bestScore = 0;
  for (const f of s.faqs) {
    if (f.off) continue;
    let sc = normalize(f.q) === t ? 10 : 0;
    for (const k of f.kw || []) {
      const kn = normalize(k);
      if (!kn) continue;
      if (kn.includes(' ')) { if ((' ' + t + ' ').includes(' ' + kn + ' ')) sc += 3; }
      else if (tokens.has(kn)) sc += 2;
      else if (kn.length >= 4 && [...tokens].some((w) => w.length >= 4 && (w.startsWith(kn) || kn.startsWith(w)))) sc += 1;
    }
    if (sc > bestScore) { bestScore = sc; best = f; }
  }
  return bestScore > 0 ? best : null;
}

export function handoffCheck(s, text) {
  const t = normalize(text);
  const tokens = new Set(t.split(' '));
  for (const w of s.handoff) if (hasTerm(t, tokens, w)) return { reason: 'keyword', word: w };
  for (const w of STAFF) if (hasTerm(t, tokens, w)) return { reason: 'asked', word: w };
  return null;
}

function isGreeting(t) {
  if (!t) return false;
  if (GREET.includes(t)) return true;
  const tokens = t.split(' ');
  return tokens.length <= 3 && GREET.some((g) => t.startsWith(g + ' ') || t === g);
}

export function pricesText(s) {
  const get = (id) => s.menu.find((m) => m.id === id);
  const parts = [['half', 'Half'], ['whole', 'Whole'], ['rice', 'Rice Meal'], ['fries', 'Fries'], ['ranch', 'Dips'], ['rite', 'Rite & Lite']]
    .map(([id, label]) => (get(id) ? `${label} ${peso(get(id).price)}` : null))
    .filter(Boolean);
  return parts.join(' · ');
}

export function fillFaq(s, text, cust) {
  const b = s.settings.business;
  return String(text || '')
    .replace(/\{flavors\}/g, s.flavors.slice(0, -1).join(', ') + ' and ' + s.flavors[s.flavors.length - 1])
    .replace(/\{prices\}/g, pricesText(s))
    .replace(/\{hours\}/g, `${hm12(b.open)} to ${hm12(b.close)}`)
    .replace(/\{address\}/g, b.address)
    .replace(/\{name\}/g, cust ? firstName(cust.name) : 'there');
}

export function nextReward(s, points) {
  const sorted = s.rewards.slice().sort((a, b) => a.pts - b.pts);
  const next = sorted.find((r) => r.pts > points) || null;
  const ready = sorted.filter((r) => r.pts <= points);
  return { next, ready: ready[ready.length - 1] || null };
}

export function welcomeMsg(cust) {
  return { text: `Hi ${cust ? firstName(cust.name) : 'there'}! I'm the Bak Bak assistant. What can I help you with today?`, quick: 'WELCOME' };
}

function faqReply(s, f, cust) {
  if (f.special === 'status') {
    if (!cust) return { msgs: [{ text: '(Test) In Messenger, this looks up the customer’s latest order and its stage.' }] };
    const o = s.orders.filter((x) => x.cid === cust.id && ACTIVE.includes(x.status)).sort((a, b) => b.ts - a.ts)[0];
    if (!o) return { msgs: [{ text: "I can't find an open order for you right now. Want to order for pick-up?", buttons: [{ label: 'Open the order form', action: 'open:menu' }] }] };
    const lines = {
      awaiting: `Order #${o.id} is waiting for payment (${peso(o.total)}). Pay first and we start cooking right away.`,
      paid: `Order #${o.id} is confirmed and paid. The kitchen starts it shortly. Ready around ${fmtTime(o.readyBy)}.`,
      preparing: `Order #${o.id} is being prepared. 🍗 Ready around ${fmtTime(o.readyBy)}.`,
      ready: `Order #${o.id} is ready at the counter! Show this chat when you pick it up.`,
    };
    const buttons = [{ label: 'Track my order', action: 'open:track:' + o.id }];
    if (o.status === 'awaiting') buttons.unshift({ label: `Pay ${peso(o.total)}`, action: 'pay:' + o.id });
    return { msgs: [{ text: lines[o.status], buttons }] };
  }
  if (f.special === 'points') {
    if (!cust) return { msgs: [{ text: '(Test) In Messenger, this shows the customer’s points and next reward.' }] };
    if (!cust.member) return { msgs: [{ text: 'You’re not in Bak Bak Rewards yet. Tick “Join Bak Bak Rewards” on your next order form to start earning 1 point for every ₱10 of food.' }] };
    const { next, ready } = nextReward(s, cust.points);
    const extra = ready ? ` Your ${ready.short || ready.name} reward is ready to redeem.` : next ? ` ${next.pts - cust.points} more points to get ${next.short || next.name}.` : '';
    return { msgs: [{ text: `You have ${cust.points} points.${extra}`, buttons: [{ label: 'Open Bak Bak Rewards', action: 'open:rewards' }] }] };
  }
  const m = { text: fillFaq(s, f.a, cust) };
  if (f.action) m.buttons = [{ label: f.btn || 'Open', action: f.action }];
  return { msgs: [m], faq: f.id };
}

// Returns { msgs, handoff, reason } for one customer message. `c.misses` counts answers the bot could not find.
export function answer(s, c, text, meta = {}) {
  const cust = c.cid ? s.customers.find((x) => x.id === c.cid) : null;
  if (meta.faq === 'staff') return { handoff: true, reason: 'asked for staff', msgs: [{ text: "No problem. I'm passing you to our staff. Someone will reply in a few minutes." }] };
  if (meta.faq) {
    const f = s.faqs.find((x) => x.id === meta.faq && !x.off);
    if (f) { c.misses = 0; return faqReply(s, f, cust); }
  }
  const h = handoffCheck(s, text);
  if (h) {
    return {
      handoff: true,
      reason: h.reason === 'keyword' ? `keyword "${h.word}"` : 'asked for staff',
      msgs: [{ text: h.reason === 'keyword' ? "Sorry about that. I'm passing you to our staff right away. Someone will reply in a few minutes." : "No problem. I'm passing you to our staff. Someone will reply in a few minutes." }],
    };
  }
  const f = matchFaq(s, text);
  if (f) { c.misses = 0; return faqReply(s, f, cust); }
  if (isGreeting(normalize(text))) { c.misses = 0; return { msgs: [welcomeMsg(cust)] }; }
  c.misses = (c.misses || 0) + 1;
  if (c.misses >= 2) {
    c.misses = 0;
    return { handoff: true, reason: 'not sure', msgs: [{ text: "I'm not sure about that one, so I'm passing you to our staff. Someone will reply in a few minutes." }] };
  }
  return { msgs: [{ text: 'Sorry, I didn’t catch that. Pick a topic below, or type "staff" to talk to a person.', quick: 'WELCOME' }] };
}

export function ticketTypeFor(text) {
  const t = normalize(text);
  if (/\b(late|matagal|tagal|long|waiting|antagal)\b/.test(t)) return 'Long wait';
  if (/\b(wrong|missing|mali|kulang|walang)\b/.test(t)) return 'Wrong order';
  if (/\b(delivery|rider|grab|foodpanda|address)\b/.test(t)) return 'Delivery issue';
  return 'Other';
}
