// One shared store for the phone and the CRM. Every change is saved in this browser (localStorage)
// until "Reset demo", and other open tabs of the demo pick it up.
import { seed, makeReceiptCode, WAIT_DEFAULT } from './seed.js';
import { answer, ticketTypeFor, nextReward, QUICK_MAP } from './bot.js';
import { BASE, MAX_ELAPSED, MIN, DAY, peso, fmtTime, firstName, fmtMD, randCode, sum, minutesOfDay, normalize } from './util.js';

const KEY = 'bakbak-crm-demo-v4';
let state = load();
let version = 0;
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 4) { (s.convos || []).forEach((c) => { c.typing = false; }); return s; }
    }
  } catch (e) { /* storage blocked: run from memory */ }
  return seed();
}
let saveTimer = null;
function flush() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 120); }
try {
  window.addEventListener('pagehide', flush);
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { const s = JSON.parse(e.newValue); if (s && s.v === 4) { state = s; bump(); } } catch (err) { /* ignore */ }
  });
} catch (e) { /* ignore */ }

function bump() { version++; subs.forEach((f) => f()); }
export const getState = () => state;
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function useStore() { React.useSyncExternalStore(subscribe, () => version); return state; }
export function update(fn) { const r = fn(state); bump(); save(); return r; }
export function resetDemo() { state = seed(); flush(); bump(); }
export function now(s = state) { return BASE + Math.min(Math.max(0, Date.now() - s.clock.startedAt), MAX_ELAPSED); }
export function useNow(ms = 15000) {
  const [, setT] = React.useState(0);
  React.useEffect(() => { const id = setInterval(() => setT((t) => t + 1), ms); return () => clearInterval(id); }, [ms]);
  return now();
}

// ---------- event bus + toasts ----------
const listeners = {};
export const bus = {
  on(e, f) { (listeners[e] = listeners[e] || new Set()).add(f); return () => listeners[e].delete(f); },
  emit(e, d) { (listeners[e] || []).forEach((f) => f(d)); },
};
let toastId = 0;
export function toast(text, scope = 'admin', tone) { bus.emit('toast', { id: ++toastId, text, scope, tone }); }

// ---------- lookups ----------
export const cust = (s, id) => s.customers.find((c) => c.id === id) || null;
export const orderById = (s, id) => s.orders.find((o) => o.id === id) || null;
export const convoFor = (s, cid) => s.convos.find((c) => c.cid === cid && c.channel === 'Messenger') || null;
export const wf = (s, id) => s.workflows.find((w) => w.id === id);
export const wfOn = (s, id) => !!(wf(s, id) && wf(s, id).on);
function runWf(s, id) { const w = wf(s, id); if (w) { w.runs++; w.lastRun = now(s); } }
export const ROLES = [
  { id: 'owner', label: 'Owner', user: 'Liza Manalo' },
  { id: 'ordertaking', label: 'Order-taking', user: 'Ana Reyes' },
  { id: 'ticket', label: 'Ticket and inquiry', user: 'Kat Villareal' },
  { id: 'kitchen', label: 'Kitchen', user: 'Ben Dizon' },
  { id: 'admin', label: 'Admin', user: 'IS 306 Group 2' },
];
export const currentUser = (s) => (ROLES.find((r) => r.id === s.role) || ROLES[0]).user;
export const ACTIVE = ['awaiting', 'paid', 'preparing', 'ready', 'rider'];
export const STATUS_LABEL = { new: 'New', awaiting: 'Awaiting payment', paid: 'Confirmed and paid', preparing: 'Preparing', ready: 'Ready', rider: 'Handed to rider', completed: 'Completed', cancelled: 'Cancelled' };
export const isApp = (ch) => ch === 'Foodpanda' || ch === 'Grab';
export function itemLabel(i) {
  const base = i.flavors && i.flavors.length ? `${i.short} ${i.flavors.join(' + ')}` : i.short;
  return i.qty > 1 ? `${base} ×${i.qty}` : base;
}
export const itemsLabel = (items) => items.map(itemLabel).join(' · ');
export function fillTpl(tpl, vars) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); }
export function isOpen(s, t = now(s)) {
  const d = new Date(t);
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= minutesOfDay(s.settings.business.open) && m < minutesOfDay(s.settings.business.close);
}
export function waitModel({ orders = 17, batches = 0, cashiers = 1 }) {
  const needed = orders * 9;
  const pre = Math.min(batches * 24, needed);
  const cto = needed - pre;
  const perCashier = orders / Math.max(1, cashiers);
  const wait = Math.round(6 + 14 * (needed ? cto / needed : 0) + Math.max(0, (perCashier - 12) * 0.6));
  const held = Math.max(0, batches * 24 - Math.round(needed / 2));
  return { needed, pre, cto, perCashier, wait, held };
}
export function waitMinutes(s) { return s.prep && s.prep.batches ? waitModel({ batches: s.prep.batches, cashiers: s.prep.cashiers || 1 }).wait : WAIT_DEFAULT; }

function nid(s, prefix) { return prefix + (s.counters.misc++); }
function pushMsg(s, c, m) {
  const msg = { id: 'm' + s.counters.msg++, ts: now(s), ...m };
  c.messages.push(msg);
  c.updated = msg.ts;
  const t = c.ticketId ? s.tickets.find((x) => x.id === c.ticketId) : null;
  if (m.from === 'customer') {
    c.unread = true;
    if (t && t.status === 'waiting_contact') t.status = 'waiting_us';
  } else if (!m.adminOnly && !m.internal && c.cid === s.me) {
    s.phone.unread = (s.phone.unread || 0) + 1;
  }
  if (m.from === 'staff' && !m.internal && t && t.status !== 'closed') {
    if (!t.firstReply) t.firstReply = Math.max(1, Math.round((msg.ts - t.created) / MIN));
    t.status = 'waiting_contact';
  }
  return msg;
}
function notify(s, n) {
  s.notifs.unshift({ id: nid(s, 'n'), ts: now(s), read: false, ...n });
  if (s.notifs.length > 40) s.notifs.length = 40;
  bus.emit('notif', n);
}
function addLedger(s, cid, label, pts) { s.ledger.unshift({ id: nid(s, 'l'), cid, ts: now(s), label, pts }); }
const ticketNo = (s) => 'T-' + String(s.counters.ticket++).padStart(4, '0');

// Bot replies arrive after a short "typing" pause.
function botLater(convoId, fn, delay = 850) {
  update((s) => { const c = s.convos.find((x) => x.id === convoId); if (c) c.typing = true; });
  setTimeout(() => {
    update((s) => {
      const c = s.convos.find((x) => x.id === convoId);
      if (!c) return;
      c.typing = false;
      const msgs = fn(s, c) || [];
      for (const m of msgs) pushMsg(s, c, { from: 'bot', author: 'Bak Bak assistant', ...m });
    });
  }, delay);
}

function subjectFrom(text) {
  const t = String(text || '').trim();
  if (!t || QUICK_MAP[t] === 'staff') return 'Asked to talk to staff';
  const s = t.length > 64 ? t.slice(0, 61) + '…' : t;
  return s[0].toUpperCase() + s.slice(1);
}
function handoff(s, c, reason, text) {
  c.status = 'open';
  c.joined = null;
  s.base.handoffs++;
  let assignee = null;
  if (wfOn(s, 'routing')) {
    runWf(s, 'routing');
    assignee = wf(s, 'routing').assignee || 'Kat Villareal';
    const open = c.ticketId && s.tickets.find((x) => x.id === c.ticketId && x.status !== 'closed');
    if (!open) {
      const lastOrder = s.orders.filter((o) => o.cid && o.cid === c.cid).sort((a, b) => b.ts - a.ts)[0];
      const t = { id: ticketNo(s), subject: subjectFrom(text), type: ticketTypeFor(text), cid: c.cid, assignee, status: 'new', created: now(s), due: now(s) + 10 * MIN, convoId: c.id, orderId: lastOrder && ACTIVE.includes(lastOrder.status) ? lastOrder.id : null, notes: [], src: 'Bot hand-off' };
      s.tickets.unshift(t);
      c.ticketId = t.id;
    }
  }
  c.assignee = assignee;
  notify(s, { text: `Bot handed ${firstName(c.name)}'s chat to ${assignee || 'staff'}${c.ticketId ? ` · ticket ${c.ticketId}` : ''}`, icon: 'hand-helping', page: 'inbox', ref: c.id });
  return { from: 'system', adminOnly: true, text: `Bot handed off to ${assignee || 'staff'}: ${reason}` };
}

// ---------- customer (phone) ----------
export function customerSays(text, meta = {}) {
  const s0 = state;
  const c0 = convoFor(s0, s0.me);
  if (!c0 || !String(text).trim()) return;
  let botMode = false;
  update((s) => {
    const c = convoFor(s, s.me);
    pushMsg(s, c, { from: 'customer', text: String(text).trim(), kind: meta.kind });
    if (c.status === 'closed') c.status = 'bot';
    botMode = c.status === 'bot' && s.botLive !== false;
    if (!botMode) {
      if (c.status !== 'open') { c.status = 'open'; }
      notify(s, { text: `${firstName(c.name)} wrote in Messenger: “${String(text).slice(0, 60)}”`, icon: 'message-circle', page: 'inbox', ref: c.id });
    }
  });
  if (botMode) {
    botLater(c0.id, (s, c) => {
      const r = answer(s, c, text, meta);
      const msgs = r.msgs.slice();
      if (r.handoff) msgs.push(handoff(s, c, r.reason, text));
      return msgs;
    }, 650 + Math.random() * 450);
  }
}

export function linesToItems(s, lines) {
  const items = [];
  const add = (mid, qty, flavors = []) => {
    const m = s.menu.find((x) => x.id === mid);
    if (!m || qty <= 0) return;
    const key = mid + '|' + flavors.join('+');
    const ex = items.find((i) => i.key === key);
    if (ex) ex.qty += qty;
    else items.push({ key, mid, name: m.name, short: m.short, qty, price: m.price, flavors });
  };
  for (const l of lines) { add(l.mid, l.qty, l.flavors || []); for (const d of l.dips || []) add(d, l.qty); }
  return items.map(({ key, ...i }) => i);
}
export function bagTotals(s, lines, rewardId) {
  const items = linesToItems(s, lines);
  const sub = sum(items, (i) => i.price * i.qty);
  const reward = rewardId ? s.rewards.find((r) => r.id === rewardId) : null;
  const discount = reward ? Math.min(reward.value, sub) : 0;
  const total = sub - discount;
  return { items, sub, discount, total, pts: Math.floor(total / s.settings.earnPer), reward };
}
export function addToBag(line) {
  update((s) => {
    const key = line.mid + '|' + (line.flavors || []).join('+') + '|' + (line.dips || []).join('+');
    const ex = s.phone.bag.find((l) => l.key === key);
    if (ex) ex.qty += line.qty;
    else s.phone.bag.push({ ...line, key });
  });
}
export function setBagQty(key, qty) {
  update((s) => {
    const l = s.phone.bag.find((x) => x.key === key);
    if (!l) return;
    if (qty <= 0) s.phone.bag = s.phone.bag.filter((x) => x.key !== key);
    else l.qty = qty;
  });
}

export function sendOrderForm(form) {
  let orderId = null, convoId = null;
  update((s) => {
    const me = cust(s, s.me);
    const t = bagTotals(s, s.phone.bag, form.rewardId);
    if (!t.items.length) return;
    orderId = 'BB-' + s.counters.order++;
    if (form.join && !me.member) me.member = true;
    if (form.phone && !me.phone) me.phone = String(form.phone).replace(/\D/g, '');
    const earn = me.member ? t.pts : 0;
    const o = { id: orderId, cid: me.id, name: me.name, channel: 'Messenger', type: form.mode, items: t.items, sub: t.sub, discount: t.discount, rewardId: form.rewardId || null, total: t.total, status: 'awaiting', ts: now(s), pickupAt: form.when, note: form.note || '', consent: !!me.member, deals: !!form.deals, pts: earn, src: 'Order form' };
    s.orders.push(o);
    me.consent = form.deals ? 'Yes' : 'No';
    s.phone.bag = [];
    const c = convoFor(s, me.id);
    convoId = c.id;
    if (c.status === 'closed') c.status = 'bot';
    pushMsg(s, c, { from: 'customer', kind: 'form', text: `Sent an order form · ${peso(o.total)}`, data: { orderId } });
    notify(s, { text: `New Messenger order #${orderId} from ${firstName(me.name)} · waiting for payment`, icon: 'shopping-bag', page: 'orders', ref: orderId });
  });
  if (!orderId) return null;
  botLater(convoId, (s) => {
    if (wfOn(s, 'confirm')) { runWf(s, 'confirm'); return [{ kind: 'order', data: { orderId }, text: 'Please check your order. Advance payment only, no COD.' }]; }
    return [{ text: 'Thanks! We got your order form. A staff member will check it and send the payment details here.' }];
  }, 900);
  return orderId;
}

function markPaid(s, o, method, ref, quiet) {
  o.status = 'paid';
  o.paidAt = now(s);
  o.pay = method;
  o.payRef = ref || '';
  o.readyBy = now(s) + waitMinutes(s) * MIN;
  if (o.pickupAt && o.pickupAt !== 'asap' && o.pickupAt > o.readyBy) o.readyBy = o.pickupAt;
  const c = o.cid ? cust(s, o.cid) : null;
  if (c) { c.orders++; c.spend += o.total; c.last = o.ts; }
  if (o.rewardId && c) {
    const r = s.rewards.find((x) => x.id === o.rewardId);
    if (r) { c.points -= r.pts; r.redeemed++; addLedger(s, c.id, `${r.name} reward (order #${o.id})`, -r.pts); }
  }
  notify(s, { text: `#${o.id} paid via ${method} · ${peso(o.total)}`, icon: 'wallet', page: 'orders', ref: o.id, quiet });
}
function confirmationMsgs(s, orderId) {
  const o = orderById(s, orderId);
  if (!o) return [];
  const c = o.cid ? cust(s, o.cid) : null;
  const msgs = [];
  if (wfOn(s, 'wait')) {
    runWf(s, 'wait');
    msgs.push({ text: fillTpl(wf(s, 'wait').tpl, { amount: peso(o.total), method: o.pay, order: '#' + o.id, mode: o.type === 'Dine-in' ? 'dine-in' : 'pick-up', wait: Math.max(1, Math.round((o.readyBy - o.paidAt) / MIN)), time: fmtTime(o.readyBy) }) });
  } else msgs.push({ text: `Payment received for order #${o.id}. Thank you!` });
  if (c && c.member && o.consent && o.pts > 0) {
    msgs.push({ kind: 'points', data: { orderId }, text: `You'll get ${o.pts} points when you pick up #${o.id}. They go to your Bak Bak Rewards.`, buttons: [{ label: 'See my points', action: 'open:rewards' }, { label: 'Track my order', action: 'open:track:' + o.id }] });
  }
  else if (c && !c.member && o.channel === 'Messenger') {
    const pts = Math.floor(o.total / s.settings.earnPer);
    msgs.push({ kind: 'signup', data: { orderId }, text: `New here? Create your free Bak Bak account to get ${pts} points for #${o.id} and a free Ranch Dip. It takes a minute, no app needed.`, buttons: [{ label: 'Create my account', action: 'open:signup' }, { label: 'Track my order', action: 'open:track:' + o.id }] });
  }
  msgs[msgs.length - 1].quick = ['Track my order', 'Talk to staff'];
  return msgs;
}
export function payOrder(orderId, method, ref) {
  let convoId = null, ok = false;
  update((s) => {
    const o = orderById(s, orderId);
    if (!o || o.status !== 'awaiting') return;
    markPaid(s, o, method, ref);
    const c = convoFor(s, o.cid);
    if (c) { convoId = c.id; pushMsg(s, c, { from: 'customer', kind: 'paid', text: `Paid ${peso(o.total)} via ${method} pay link`, data: { orderId } }); }
    ok = true;
  });
  if (ok && convoId) botLater(convoId, (s) => confirmationMsgs(s, orderId), 1000);
  return ok;
}
export function itemsToLines(items) {
  const lines = [];
  for (const i of items) lines.push({ key: i.mid + '|' + (i.flavors || []).join('+') + '|' + Math.random().toString(36).slice(2, 6), mid: i.mid, qty: i.qty, flavors: i.flavors || [], dips: [] });
  return lines;
}
export function fixOrder(orderId) {
  update((s) => {
    const o = orderById(s, orderId);
    if (!o || o.status !== 'awaiting') return;
    o.status = 'cancelled';
    o.cancelReason = 'Customer reopened the order form to fix it';
    s.phone.bag = itemsToLines(o.items);
    const c = convoFor(s, o.cid);
    if (c) {
      pushMsg(s, c, { from: 'customer', text: 'Fix something' });
      pushMsg(s, c, { from: 'bot', author: 'Bak Bak assistant', text: `No problem. I reopened your bag so you can fix order #${o.id}. Send the form again when you're ready.` });
    }
  });
}
export function reorder(orderId) {
  update((s) => { const o = orderById(s, orderId); if (o) s.phone.bag = itemsToLines(o.items); });
}

// ---------- order stages (CRM, kitchen) ----------
export function setOrderStatus(orderId, status, opts = {}) {
  let convoId = null, msgsFn = null, delay = 500;
  update((s) => {
    const o = orderById(s, orderId);
    if (!o || o.status === status) return;
    const prev = o.status;
    const c = o.cid ? convoFor(s, o.cid) : null;
    if (status === 'awaiting' && prev === 'new') {
      o.status = 'awaiting';
      if (c) {
        convoId = c.id;
        msgsFn = (s2) => { if (wfOn(s2, 'confirm')) runWf(s2, 'confirm'); return [{ kind: 'order', data: { orderId }, text: 'Here is your order summary. Advance payment only, no COD.' }]; };
      }
    } else if (status === 'paid' && (prev === 'awaiting' || prev === 'new')) {
      markPaid(s, o, opts.method || (o.channel === 'Walk-in' ? 'Cash' : 'GCash'), opts.ref, true);
      if (c && o.channel === 'Messenger') { convoId = c.id; msgsFn = (s2) => confirmationMsgs(s2, orderId); }
    } else {
      o.status = status;
      if (status === 'preparing') o.prepAt = now(s);
      if (status === 'ready') {
        o.readyAt = now(s);
        if (c && o.channel === 'Messenger' && wfOn(s, 'ready')) {
          runWf(s, 'ready');
          convoId = c.id;
          const text = fillTpl(wf(s, 'ready').tpl, { order: '#' + o.id });
          msgsFn = () => [{ text, buttons: [{ label: 'Track my order', action: 'open:track:' + o.id }] }];
        }
      }
      if (status === 'rider') o.riderAt = now(s);
      if (status === 'completed') {
        o.doneAt = now(s);
        const r = completeOrder(s, o);
        if (c && r.length) { convoId = c.id; msgsFn = () => r; }
      }
      if (status === 'cancelled') {
        o.cancelReason = opts.reason || 'Cancelled by staff';
        if (c) { convoId = c.id; msgsFn = () => [{ text: `Order #${o.id} was cancelled. If you already paid, we’ll refund you through the same payment method. Message us anytime.` }]; }
      }
    }
    notify(s, { text: `#${o.id} moved to ${STATUS_LABEL[o.status]}`, icon: 'refresh-cw', page: 'orders', ref: o.id, quiet: true });
  });
  if (convoId && msgsFn) botLater(convoId, msgsFn, delay);
}
function completeOrder(s, o) {
  const msgs = [];
  const c = o.cid ? cust(s, o.cid) : null;
  if (!c || isApp(o.channel)) return msgs;
  if (!o.pts && c.member && o.consent !== false) o.pts = Math.floor(o.total / s.settings.earnPer);
  if (c.member && o.pts > 0 && wfOn(s, 'loyalty') && !o.ptsAdded) {
    runWf(s, 'loyalty');
    o.ptsAdded = true;
    c.points += o.pts;
    addLedger(s, c.id, `Order #${o.id}`, o.pts);
    if (o.channel === 'Messenger') msgs.push({ text: fillTpl(wf(s, 'loyalty').tpl, { points: o.pts, order: '#' + o.id, balance: c.points }), buttons: [{ label: 'See my points', action: 'open:rewards' }] });
  }
  if (o.channel === 'Messenger' && wfOn(s, 'survey')) {
    runWf(s, 'survey');
    msgs.push({ text: fillTpl(wf(s, 'survey').tpl, { order: '#' + o.id }), buttons: [{ label: 'Rate your order', action: 'rate:' + o.id }] });
  }
  return msgs;
}
export function delayNotice(orderId, addMin = 10) {
  let convoId = null, text = null;
  update((s) => {
    const o = orderById(s, orderId);
    if (!o) return;
    o.readyBy = Math.max(o.readyBy || now(s), now(s)) + addMin * MIN;
    o.delayed = (o.delayed || 0) + 1;
    const c = o.cid ? convoFor(s, o.cid) : null;
    if (c && o.channel === 'Messenger' && wfOn(s, 'delay')) {
      runWf(s, 'delay');
      convoId = c.id;
      text = fillTpl(wf(s, 'delay').tpl, { order: '#' + o.id, time: fmtTime(o.readyBy) });
    }
  });
  if (convoId) botLater(convoId, () => [{ text }], 400);
  return !!convoId;
}
export function sendOrderSummary(orderId) {
  const s = state;
  const o = orderById(s, orderId);
  const c = o && o.cid ? convoFor(s, o.cid) : null;
  if (!c) return false;
  botLater(c.id, () => [{ kind: 'order', data: { orderId }, text: 'Here is your order summary. Advance payment only, no COD.' }], 300);
  return true;
}
export function createOrder(f) {
  let id = null, convoId = null;
  update((s) => {
    const items = linesToItems(s, f.lines);
    if (!items.length) return;
    id = 'BB-' + s.counters.order++;
    const c = f.cid ? cust(s, f.cid) : null;
    const sub = sum(items, (i) => i.price * i.qty);
    const app = isApp(f.channel);
    const o = { id, cid: c ? c.id : null, name: c ? c.name : f.guestName || 'Guest', channel: f.channel, type: f.type, items, sub, discount: 0, total: sub, status: 'awaiting', ts: now(s), note: f.note || '', consent: c ? !!c.member : false, pts: c && c.member && !app ? Math.floor(sub / s.settings.earnPer) : 0, by: currentUser(s), src: app ? `Received in the ${f.channel} merchant app, entered in BakBak CRM` : 'Created in BakBak CRM' };
    s.orders.push(o);
    if (app) {
      o.ext = (f.channel === 'Foodpanda' ? '#FP-' : '#GR-') + (48500 + Math.floor(Math.random() * 1400));
      markPaid(s, o, 'Paid in ' + f.channel, '', true);
    } else if (f.paid) {
      markPaid(s, o, f.pay || 'Cash', '', true);
    } else if (f.channel === 'Messenger' && c) {
      const cv = convoFor(s, c.id);
      if (cv) convoId = cv.id;
    }
    notify(s, { text: `Order #${id} created for ${o.name} · ${f.channel}`, icon: 'shopping-bag', page: 'orders', ref: id, quiet: true });
  });
  if (convoId) botLater(convoId, (s2) => { if (wfOn(s2, 'confirm')) runWf(s2, 'confirm'); return [{ kind: 'order', data: { orderId: id }, text: 'Here is your order summary. Advance payment only, no COD.' }]; }, 400);
  return id;
}

// ---------- Bak Bak Rewards cards (scanned to Foodpanda and Grab orders at packing) + rewards ----------
export function linkCard(orderId) {
  return update((s) => {
    const o = orderById(s, orderId);
    if (!o || !isApp(o.channel) || o.code) return null;
    o.code = makeReceiptCode();
    s.codes.unshift({ code: o.code, app: o.channel, ref: o.ext, label: itemsLabel(o.items), orderId: o.id, date: now(s), food: o.sub, usedBy: null });
    notify(s, { text: `Bak Bak card ${o.code} linked to #${o.id} (${o.channel} ${o.ext})`, icon: 'qr-code', page: 'orders', ref: o.id, quiet: true });
    return o.code;
  });
}
export function staffSignIn(role) { update((s) => { s.role = role; s.session = { role, at: now(s) }; }); }
export function staffSignOut() { update((s) => { s.session = null; }); }
export function normalizeCode(raw) {
  const t = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (t.length === 10 && t.startsWith('BB')) return `BB-${t.slice(2, 6)}-${t.slice(6, 10)}`;
  return String(raw || '').toUpperCase().trim();
}
export function findCode(s, raw) {
  const code = normalizeCode(raw);
  if (!/^BB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { error: 'Codes look like BB-7K2Q-9XMA. Check the letters and numbers on your Bak Bak card.' };
  const c = s.codes.find((x) => x.code === code);
  if (!c) return { error: 'We couldn’t find that code. Check it against your Bak Bak card, or chat with us.' };
  if (c.usedBy) return { error: `This code was already claimed on ${fmtMD(c.usedAt)}. Each code works once.`, code: c };
  const exp = c.date + 7 * DAY;
  if (now(s) > exp) return { error: `This code expired on ${fmtMD(exp)}. Codes last 7 days after the order.`, code: c };
  return { code: c, pts: Math.floor(c.food / s.settings.earnPer), exp };
}
export function claimCode(raw, cid) {
  return update((s) => {
    const r = findCode(s, raw);
    if (r.error) return r;
    if (!wfOn(s, 'receipt')) return { error: 'Claiming is paused right now (the Bak Bak card claim workflow is off). Please try again later.' };
    const c = cust(s, cid);
    if (!c) return { error: 'Sign in first.' };
    r.code.usedBy = cid;
    r.code.usedAt = now(s);
    c.points += r.pts;
    if (!c.member) c.member = true;
    addLedger(s, cid, `${r.code.app} ${r.code.ref} (Bak Bak card)`, r.pts);
    let welcome = null;
    if (!c.welcomeDip && wfOn(s, 'receipt')) {
      c.welcomeDip = true;
      welcome = { code: 'WD-' + randCode(4), rewardId: 'r-ranch', name: 'Free Ranch Dip (welcome gift)', cid, ts: now(s), where: 'app', welcome: true };
      s.vouchers.unshift(welcome);
    }
    runWf(s, 'receipt');
    if (r.code.orderId) { const o = orderById(s, r.code.orderId); if (o) o.claimedBy = cid; }
    notify(s, { text: `${firstName(c.name)} claimed ${r.code.code} (${r.code.app} ${r.code.ref}) · +${r.pts} pts`, icon: 'qr-code', page: 'loyalty', ref: cid });
    return { ok: true, pts: r.pts, balance: c.points, code: r.code, welcome };
  });
}
export function redeemReward(cid, rewardId, where = 'app') {
  return update((s) => {
    const c = cust(s, cid);
    const r = s.rewards.find((x) => x.id === rewardId);
    if (!c || !r) return { error: 'Reward not found.' };
    if (c.points < r.pts) return { error: `You need ${r.pts - c.points} more points.` };
    c.points -= r.pts;
    r.redeemed++;
    const v = { code: 'RW-' + randCode(4), rewardId, name: r.name, cid, ts: now(s), where };
    s.vouchers.unshift(v);
    addLedger(s, cid, `${r.name} reward${where === 'store' ? ' (in store)' : ''}`, -r.pts);
    notify(s, { text: `${firstName(c.name)} redeemed ${r.name} (−${r.pts} pts) · voucher ${v.code}`, icon: 'gift', page: 'loyalty', ref: cid, quiet: where === 'store' });
    return { ok: true, voucher: v };
  });
}
export function adjustPoints(cid, delta, reason) {
  update((s) => {
    const c = cust(s, cid);
    if (!c || !delta) return;
    c.points = Math.max(0, c.points + delta);
    if (!c.member && delta > 0) c.member = true;
    addLedger(s, cid, reason || 'Points adjusted by staff', delta);
    notify(s, { text: `${currentUser(s)} adjusted ${firstName(c.name)}'s points by ${delta > 0 ? '+' : ''}${delta}`, icon: 'coins', page: 'loyalty', ref: cid, quiet: true });
  });
}
export function rateOrder(orderId, stars, tags, comment) {
  let convoId = null;
  update((s) => {
    const o = orderById(s, orderId);
    if (!o) return;
    o.rating = stars;
    s.ratings.unshift({ id: nid(s, 'rt'), orderId, cid: o.cid, stars, tags, comment, ts: now(s) });
    const c = o.cid ? convoFor(s, o.cid) : null;
    if (c) { convoId = c.id; pushMsg(s, c, { from: 'customer', kind: 'rating', text: `Rated order #${o.id}: ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}${comment ? `\n“${comment}”` : ''}` }); }
    if (stars <= 2) {
      const t = { id: ticketNo(s), subject: `Low rating (${stars}★) on #${o.id}`, type: 'Other', cid: o.cid, assignee: wf(s, 'routing').assignee || 'Kat Villareal', status: 'new', created: now(s), due: now(s) + 30 * MIN, orderId: o.id, convoId: c ? c.id : null, notes: comment ? [{ by: 'Customer', ts: now(s), text: comment }] : [], src: 'Satisfaction survey' };
      s.tickets.unshift(t);
      if (c) c.ticketId = t.id;
    }
    notify(s, { text: `${firstName(o.name)} rated #${o.id} ${stars} out of 5`, icon: 'star', page: 'kpi', ref: o.id });
  });
  if (convoId) botLater(convoId, () => [{ text: stars >= 4 ? 'Thank you for the rating! See you again soon. 🍗' : 'Thank you for telling us. We’re sorry it wasn’t great. A staff member will follow up here.' }], 700);
}

// ---------- inbox + tickets ----------
export function staffReply(convoId, text, internal = false) {
  update((s) => {
    const c = s.convos.find((x) => x.id === convoId);
    if (!c || !String(text).trim()) return;
    const me = currentUser(s);
    if (!internal) {
      if (c.joined !== me && c.channel === 'Messenger') pushMsg(s, c, { from: 'system', text: `${firstName(me)} from Bak Bak joined the chat` });
      c.joined = me;
      c.status = 'open';
      if (!c.assignee) c.assignee = me;
    }
    pushMsg(s, c, { from: 'staff', author: me, text: String(text).trim(), internal });
    c.unread = false;
  });
}
export function returnToBot(convoId) {
  update((s) => {
    const c = s.convos.find((x) => x.id === convoId);
    if (!c) return;
    c.status = 'bot';
    c.joined = null;
    c.misses = 0;
    pushMsg(s, c, { from: 'system', text: 'The Bak Bak assistant is back. Type "staff" anytime to talk to a person.' });
  });
}
export function closeConvo(convoId) {
  update((s) => {
    const c = s.convos.find((x) => x.id === convoId);
    if (!c) return;
    c.status = 'closed';
    c.joined = null;
    c.unread = false;
    pushMsg(s, c, { from: 'system', adminOnly: true, text: `Conversation closed by ${currentUser(s)}` });
  });
}
export function assignConvo(convoId, who) {
  update((s) => {
    const c = s.convos.find((x) => x.id === convoId);
    if (!c) return;
    c.assignee = who || null;
    if (c.ticketId) { const t = s.tickets.find((x) => x.id === c.ticketId); if (t) t.assignee = who || null; }
    pushMsg(s, c, { from: 'system', adminOnly: true, text: who ? `Assigned to ${who}` : 'Unassigned' });
  });
}
export function markRead(convoId) {
  const c = state.convos.find((x) => x.id === convoId);
  if (c && c.unread) update(() => { c.unread = false; });
}
export function openConvoFor(cid) {
  return update((s) => {
    let c = s.convos.find((x) => x.cid === cid);
    if (!c) {
      const cu = cust(s, cid);
      c = { id: nid(s, 'cv-'), cid, name: cu ? cu.name : 'Customer', channel: 'Messenger', status: 'open', assignee: currentUser(s), ticketId: null, unread: false, messages: [] };
      s.convos.unshift(c);
    }
    return c.id;
  });
}
export function createTicket(f) {
  return update((s) => {
    const t = { id: ticketNo(s), subject: f.subject.trim(), type: f.type || 'Other', cid: f.cid || null, assignee: f.assignee || null, status: 'new', created: now(s), due: now(s) + (Number(f.dueMins) || 60) * MIN, orderId: f.orderId || null, notes: f.note ? [{ by: currentUser(s), ts: now(s), text: f.note }] : [], src: 'Created in BakBak CRM' };
    if (t.cid) { const c = s.convos.find((x) => x.cid === t.cid); if (c) { t.convoId = c.id; if (!c.ticketId || s.tickets.find((x) => x.id === c.ticketId && x.status === 'closed')) c.ticketId = t.id; } }
    s.tickets.unshift(t);
    notify(s, { text: `Ticket ${t.id} created: ${t.subject}`, icon: 'ticket', page: 'tickets', ref: t.id, quiet: true });
    return t.id;
  });
}
export function updateTicket(id, patch) {
  update((s) => {
    const t = s.tickets.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    if (patch.status === 'closed') t.closedAt = now(s);
    if (patch.status && patch.status !== 'closed') t.closedAt = null;
  });
}
export function addTicketNote(id, text) {
  update((s) => { const t = s.tickets.find((x) => x.id === id); if (t && text.trim()) t.notes.push({ by: currentUser(s), ts: now(s), text: text.trim() }); });
}

// ---------- customers ----------
export function addCustomer(f) {
  return update((s) => {
    const id = 'c' + s.counters.cust++ + '-' + randCode(3).toLowerCase();
    s.customers.unshift({ id, name: f.name.trim(), phone: f.phone.replace(/\D/g, ''), area: f.area || 'Tikay', channel: f.channel || 'Walk-in', type: f.channel === 'Messenger' ? 'Pick-up' : isApp(f.channel) ? 'Delivery' : 'Takeout', last: null, orders: 0, spend: 0, points: 0, consent: f.consent ? 'Yes' : 'No', member: !!f.member, segs: [], since: now(s), fav: '—', note: f.note || '', owner: f.self ? null : currentUser(s), created: true, account: f.self ? { at: now(s), via: f.self, verified: true } : null });
    notify(s, f.self ? { text: `${f.name.trim()} created a Bak Bak account (${f.self})`, icon: 'user-plus', page: 'record', ref: id } : { text: `${f.name.trim()} was added as a customer`, icon: 'user-plus', page: 'record', ref: id, quiet: true });
    return id;
  });
}
// A new person messages the page: Messenger gives their name, so BakBak CRM keeps them as a contact
// (no number, no account) until they create a Bak Bak account themselves.
export function startNewCustomer() {
  update((s) => {
    s.me = 'miguel';
    s.phone.bag = [];
    if (!cust(s, 'miguel')) {
      s.customers.unshift({ id: 'miguel', name: 'Miguel Castillo', phone: '', area: '—', channel: 'Messenger', type: 'Pick-up', last: null, orders: 0, spend: 0, points: 0, consent: 'No', member: false, segs: [], since: now(s), fav: '—', note: '', owner: null, created: true, contact: true, account: null });
      const cv = { id: 'cv-miguel', cid: 'miguel', name: 'Miguel Castillo', channel: 'Messenger', status: 'bot', assignee: null, ticketId: null, unread: true, misses: 0, messages: [] };
      s.convos.unshift(cv);
      pushMsg(s, cv, { from: 'system', text: 'Miguel tapped Get Started' });
      pushMsg(s, cv, { from: 'bot', author: 'Bak Bak assistant', text: "Hi Miguel! I'm the Bak Bak assistant. First time here? You can order for pick-up right in this chat, no app needed. What can I help you with?", quick: 'WELCOME' });
      notify(s, { text: 'New Messenger chat from Miguel Castillo (no account yet)', icon: 'message-circle', page: 'inbox', ref: 'cv-miguel' });
    }
    s.phone.unread = 0;
  });
}
export function switchToReturning() { update((s) => { s.me = 'geanne'; s.phone.bag = []; s.phone.unread = 0; }); }

// The customer creates their own Bak Bak account (after paying in Messenger, or from Home).
export function createAccount(cid, f) {
  return update((s) => {
    const c = cust(s, cid);
    if (!c) return { error: 'Something went wrong. Please try again.' };
    const digits = String(f.phone || '').replace(/\D/g, '');
    const dupe = s.customers.find((x) => x.id !== cid && x.phone === digits && x.member);
    if (dupe) return { error: 'This number already has a Bak Bak account. Message us and we’ll link it to this chat.' };
    c.name = f.name.trim();
    c.phone = digits;
    c.member = true;
    c.contact = false;
    c.consent = f.deals ? 'Yes' : 'No';
    if (f.birthday) c.birthday = f.birthday;
    c.account = { at: now(s), via: f.via || 'Messenger', verified: true };
    let pending = 0;
    for (const o of s.orders) {
      if (o.cid === cid && o.channel === 'Messenger' && !o.pts && ['awaiting', 'paid', 'preparing', 'ready'].includes(o.status)) {
        o.pts = Math.floor(o.total / s.settings.earnPer); o.consent = true; o.name = c.name; pending += o.pts;
      }
    }
    let welcome = null;
    if (!c.welcomeDip) {
      c.welcomeDip = true;
      welcome = { code: 'WD-' + randCode(4), rewardId: 'r-ranch', name: 'Free Ranch Dip (welcome gift)', cid, ts: now(s), where: 'app', welcome: true };
      s.vouchers.unshift(welcome);
    }
    const cv = convoFor(s, cid);
    if (cv) {
      cv.name = c.name;
      pushMsg(s, cv, { from: 'bot', author: 'Bak Bak assistant', text: `Welcome to Bak Bak, ${firstName(c.name)}! Your account is ready.${pending ? ` ${pending} points from your order go in when you pick it up.` : ''} Your free Ranch Dip is in Rewards.`, buttons: [{ label: 'My account', action: 'open:account' }, { label: 'See my points', action: 'open:rewards' }] });
    }
    notify(s, { text: `${c.name} created a Bak Bak account in ${c.account.via}`, icon: 'user-plus', page: 'record', ref: cid });
    return { ok: true, pending, welcome };
  });
}
// Data Privacy Act requests from the customer's account page become tickets for the owner.
export function privacyRequest(cid, kind) {
  return update((s) => {
    const c = cust(s, cid);
    if (!c) return null;
    const subject = kind === 'delete' ? 'Delete my Bak Bak account (privacy request)' : 'Send me a copy of my data (privacy request)';
    const t = { id: ticketNo(s), subject, type: 'Other', cid, assignee: 'Liza Manalo', status: 'new', created: now(s), due: now(s) + 3 * DAY, orderId: null, notes: [{ by: 'Customer', ts: now(s), text: kind === 'delete' ? 'Asked from the My account page. Check it is them in Messenger, then delete the record and points.' : 'Asked from the My account page. Send the record, orders and points in Messenger.' }], src: 'My account page' };
    s.tickets.unshift(t);
    notify(s, { text: `${firstName(c.name)} sent a privacy request · ${t.id}`, icon: 'shield-check', page: 'tickets', ref: t.id });
    return t.id;
  });
}
export function updateCustomer(id, patch) { update((s) => { const c = cust(s, id); if (c) Object.assign(c, patch); }); }

// ---------- chatbot ----------
export function saveFaq(f) {
  update((s) => {
    const kw = (Array.isArray(f.kw) ? f.kw : String(f.kw || '').split(',')).map((k) => k.trim()).filter(Boolean);
    if (f.id) { const ex = s.faqs.find((x) => x.id === f.id); if (ex) Object.assign(ex, { q: f.q, a: f.a, kw }); }
    else s.faqs.push({ id: 'f-' + randCode(5).toLowerCase(), q: f.q.trim(), a: f.a.trim(), kw, custom: true });
  });
}
export function deleteFaq(id) { update((s) => { s.faqs = s.faqs.filter((f) => f.id !== id); }); }
export function toggleFaq(id) { update((s) => { const f = s.faqs.find((x) => x.id === id); if (f) f.off = !f.off; }); }
export function setHandoff(list) { update((s) => { s.handoff = list; }); }
export function setBotLive(on) { update((s) => { s.botLive = on; }); }

// ---------- workflows ----------
export function toggleWorkflow(id) { update((s) => { const w = wf(s, id); if (w) w.on = !w.on; }); }
export function saveWorkflow(id, patch) { update((s) => { const w = wf(s, id); if (w) Object.assign(w, patch); }); }

// ---------- segments + campaigns ----------
export const SEG_TYPES = [
  { id: 'channel', label: 'Ordered through a channel', make: (d) => `Ordered through ${d.channel} ${d.min} or more times` },
  { id: 'flavor', label: 'Favorite flavor', make: (d) => `Favorite flavor is ${d.flavor}` },
  { id: 'inactive', label: 'No order for a while', make: (d) => `No order in the last ${d.days} days` },
  { id: 'near', label: 'Close to a reward', make: (d) => `Within ${d.pts} points of their next reward` },
  { id: 'area', label: 'Lives in a barangay', make: (d) => `Lives in ${d.area}` },
  { id: 'spend', label: 'Lifetime spend', make: (d) => `Spent ${peso(d.min)} or more` },
  { id: 'members', label: 'Loyalty members', make: () => 'Joined Bak Bak Rewards' },
];
export function matchRule(s, d, c) {
  const t = now(s);
  switch (d.type) {
    case 'channel': return c.channel === d.channel && c.orders >= Number(d.min || 1);
    case 'flavor': return c.fav === d.flavor;
    case 'inactive': return !c.last || t - c.last >= Number(d.days || 30) * DAY;
    case 'near': { if (!c.member) return false; const { next } = nextReward(s, c.points); return !!next && next.pts - c.points <= Number(d.pts || 50); }
    case 'area': return c.area === d.area;
    case 'spend': return c.spend >= Number(d.min || 0);
    case 'members': return c.member;
    default: return false;
  }
}
export function segmentMembers(s, name) {
  if (name === 'Loyalty members') return s.customers.filter((c) => c.member);
  if (name === 'Everyone (public post)') return [];
  const seg = s.segments.find((x) => x.name === name);
  if (!seg) return [];
  if (seg.def) return s.customers.filter((c) => matchRule(s, seg.def, c));
  return s.customers.filter((c) => (c.segs || []).includes(name));
}
export function segmentCount(s, seg) {
  if (seg.def) return segmentMembers(s, seg.name).length;
  return seg.count + s.customers.filter((c) => c.created && (c.segs || []).includes(seg.name)).length;
}
export function createSegment(f) {
  return update((s) => {
    const t = SEG_TYPES.find((x) => x.id === f.def.type);
    const seg = { id: nid(s, 'sg-'), name: f.name.trim(), rule: t ? t.make(f.def) : '', def: f.def, usedBy: '', created: true };
    s.segments.push(seg);
    return seg.id;
  });
}
export function personalize(msg, c) { return String(msg || '').replace(/\{first name\}/gi, c ? firstName(c.name) : 'there'); }
function deliverCampaign(s, cp) {
  const members = segmentMembers(s, cp.audience).filter((c) => c.consent === 'Yes');
  const seg = s.segments.find((x) => x.name === cp.audience);
  cp.status = cp.channel === 'Facebook page' ? 'Posted' : 'Sent';
  cp.sentAt = now(s);
  cp.sent = cp.channel === 'Facebook page' ? 0 : seg && !seg.def ? segmentCount(s, seg) : cp.audience === 'Loyalty members' ? s.base.members + s.customers.filter((c) => c.created && c.member).length : members.length;
  cp.seen = cp.channel === 'SMS' ? null : 0;
  let delivered = 0;
  if (cp.channel === 'Messenger') {
    for (const c of members) {
      const cv = convoFor(s, c.id);
      if (!cv) continue;
      delivered++;
      pushMsg(s, cv, { from: 'bot', author: 'Bak Bak', kind: 'campaign', text: personalize(cp.msg, c), data: { campaignId: cp.id }, buttons: [{ label: 'Order now', action: 'open:menu' }] });
    }
  }
  cp.delivered = delivered;
  notify(s, { text: `Campaign “${cp.name}” ${cp.status === 'Posted' ? 'posted' : `sent to ${cp.sent} customers`}`, icon: 'megaphone', page: 'campaigns', ref: cp.id, quiet: true });
}
export function createCampaign(f) {
  return update((s) => {
    const cp = { id: nid(s, 'cp'), name: f.name.trim(), audience: f.audience, channel: f.channel, status: 'Draft', msg: f.msg, offer: f.offer || '—', sent: 0, seen: 0, redeemed: 0, sales: 0, created: now(s), by: currentUser(s) };
    s.campaigns.unshift(cp);
    if (f.when === 'now') deliverCampaign(s, cp);
    else if (f.when === 'schedule') { cp.status = 'Scheduled'; cp.schedule = f.schedule || 'Tomorrow, 11:00 AM'; }
    return cp.id;
  });
}
export function sendCampaign(id) { update((s) => { const cp = s.campaigns.find((x) => x.id === id); if (cp && cp.status !== 'Sent' && cp.status !== 'Posted') deliverCampaign(s, cp); }); }
export function updateCampaign(id, patch) { update((s) => { const cp = s.campaigns.find((x) => x.id === id); if (cp) Object.assign(cp, patch); }); }

// ---------- decision support ----------
const CHEESE_DRAFT = { id: 'cp2', name: 'Free Cheese Dip for Soy Garlic fans', audience: 'Frequent Soy Garlic buyers', channel: 'Messenger', status: 'Draft', src: 'From Decision Support · R4', msg: 'Hi {first name}! 🍗 Thanks for being one of our Soy Garlic regulars. Your next order comes with a free Cheese Dip, on us. Just show this message at the counter. Valid until Oct 31.', offer: 'Free Cheese Dip (₱25) with any Half or Whole', schedule: 'Today, 5:30 PM', sent: 0, seen: 0, redeemed: 0, sales: 0 };
export function decideRec(id, call) {
  update((s) => {
    const r = s.recs.find((x) => x.id === id);
    if (!r) return;
    r.status = call;
    r.decidedAt = now(s);
    r.by = currentUser(s);
    s.decisions.unshift({ id: nid(s, 'd'), ts: now(s), what: r.head, call, result: call === 'Dismissed' ? '—' : 'Results show after the rush', rule: id, by: currentUser(s) });
    if (call === 'Dismissed') return;
    s.prep = s.prep || { batches: 0, cashiers: 1, boxes: 0, done: [] };
    if (id === 'R1') s.prep.batches = 3;
    if (id === 'R2') s.prep.cashiers = 2;
    if (id === 'R3') s.prep.boxes = 45;
    if (id === 'R4' && !s.campaigns.find((c) => c.id === 'cp2')) { s.campaigns.unshift({ ...CHEESE_DRAFT, created: now(s) }); notify(s, { text: 'Draft campaign “Free Cheese Dip for Soy Garlic fans” is ready for review', icon: 'megaphone', page: 'campaigns', ref: 'cp2', quiet: true }); }
    if (id === 'R6') {
      const f = s.faqs.find((x) => x.id === 'f-delivery');
      if (f) {
        f.a = 'We’re pick-up and dine-in. For delivery, order Bak Bak on Foodpanda or Grab, then scan the QR on the Bak Bak card in your bag to claim points. 🎁';
        f.kw = Array.from(new Set([...f.kw, 'foodpanda', 'grab', 'rider', 'fee', 'delivery fee', 'padala']));
        f.tag = 'Updated from R6';
      }
      notify(s, { text: 'Chatbot answer “Delivery options and fees” updated from R6', icon: 'bot', page: 'chatbot', quiet: true });
    }
    if (id === 'R1' || id === 'R2' || id === 'R3') { const w = s.weekend.find((x) => x.day.startsWith('Sat')); if (w && w.status !== 'Approved') w.status = 'Approved'; }
  });
}
export function saveScenario(sc) {
  update((s) => {
    const m = waitModel(sc);
    s.prep = { ...(s.prep || { boxes: 0, done: [] }), batches: sc.batches, cashiers: sc.cashiers };
    const r1 = s.recs.find((x) => x.id === 'R1');
    const exact = sc.batches === 3 && sc.cashiers === 2;
    if (r1) { r1.status = exact ? 'Approved' : 'Adjusted'; r1.decidedAt = now(s); r1.by = currentUser(s); }
    s.decisions.unshift({ id: nid(s, 'd'), ts: now(s), what: `What-if saved: ${sc.batches} batches · ${sc.cashiers} cashier${sc.cashiers > 1 ? 's' : ''} (estimated wait ${m.wait} min)`, call: exact ? 'Approved' : 'Adjusted', result: 'Results show after the rush', rule: 'R1', by: currentUser(s) });
  });
}
export function toggleBatchDone(i) { update((s) => { if (!s.prep) return; s.prep.done = s.prep.done || []; s.prep.done[i] = !s.prep.done[i]; }); }
export function approveWeekend(i, status = 'Approved') { update((s) => { if (s.weekend[i]) s.weekend[i].status = status; }); }
export function updateRule(id, patch) { update((s) => { const r = s.rules.find((x) => x.id === id); if (r) Object.assign(r, patch); }); }
export function addRule(f) { update((s) => { s.rules.push({ id: 'R' + (s.rules.length + 1), name: f.name, when: f.when, then: f.then, threshold: Number(f.threshold) || 1, unit: f.unit || '', last: 'Not triggered yet', on: true, created: true }); }); }

// ---------- settings ----------
export function saveMenu(rows) { update((s) => { for (const r of rows) { const m = s.menu.find((x) => x.id === r.id); if (m) { m.price = Math.max(0, Math.round(Number(r.price) || 0)); m.available = r.available; } } }); }
export function saveBusiness(b) { update((s) => { Object.assign(s.settings.business, b); }); }
export function savePrivacy(p) { update((s) => { Object.assign(s.settings, p); }); }
export function invite(f) { update((s) => { s.team.push({ id: nid(s, 'u'), name: f.name.trim(), role: f.role, can: ROLE_CAN[f.role] || '', status: 'Invited', email: f.email.trim() }); }); }
export function setRole(role) { update((s) => { s.role = role; }); }
export function saveRewards(earnPer, rewards) { update((s) => { s.settings.earnPer = Math.max(1, Number(earnPer) || 10); for (const r of rewards) { const x = s.rewards.find((y) => y.id === r.id); if (x) x.pts = Math.max(1, Number(r.pts) || x.pts); } }); }
export const ROLE_CAN = { Owner: 'Everything, including approvals', 'Order-taking': 'Orders, customers, inbox', 'Ticket and inquiry': 'Inbox, tickets, customers', Kitchen: 'Kitchen display', Admin: 'Setup and settings' };
export function readAllNotifs() { update((s) => { s.notifs.forEach((n) => { n.read = true; }); }); }
export function clearPhoneUnread() { if (state.phone.unread) update((s) => { s.phone.unread = 0; }); }
export function addReport(f) { update((s) => { s.reports = s.reports || []; s.reports.push({ id: nid(s, 'rp'), name: f.name, kind: f.kind, cat: f.cat, created: now(s) }); }); }
export function setRange(id) { update((s) => { s.range = id; }); }

// Overdue ticket alerts (workflow "Overdue ticket alert").
setInterval(() => {
  const s = state;
  const t = now(s);
  const due = s.tickets.filter((x) => x.status !== 'closed' && x.due && x.due < t && !x.alerted);
  if (!due.length) return;
  update((s2) => {
    for (const x of due) {
      x.alerted = true;
      if (wfOn(s2, 'overdue')) { runWf(s2, 'overdue'); notify(s2, { text: `Ticket ${x.id} is overdue · ${x.assignee || 'Unassigned'}`, icon: 'circle-alert', page: 'tickets', ref: x.id }); }
    }
  });
}, 15000);

export { normalize };
