// Shared pieces for the BakBak CRM workspace: navigation, roles, small badges and helpers.
import { Icon, Badge, Avatar, Btn, Empty, Seg } from './ui.jsx';
import { maskPhone, fmtPhone, fmtMD, cx, MIN, fmtTime, sameDay, sum, BASE, DAY, at } from './util.js';
import { STATUS_LABEL, ACTIVE, cust, setRange } from './store.js';
import { HISTORY, FIG8 } from './seed.js';

export const AdminCtx = React.createContext(null);
export const useAdmin = () => React.useContext(AdminCtx);

export const NAV = [
  { items: [['dashboard', 'layout-dashboard', 'Dashboard']] },
  { sec: 'Decision support', items: [['dss-today', 'sparkles', 'Today’s plan'], ['dss-prep', 'calendar-days', 'Prep planner'], ['dss-whatif', 'sliders-horizontal', 'What-if'], ['dss-rules', 'book-open', 'Rules'], ['dss-log', 'history', 'Decision log']] },
  { sec: 'Customers', items: [['customers', 'users', 'Customers'], ['segments', 'layers', 'Segments'], ['loyalty', 'gift', 'Loyalty']] },
  { sec: 'Sales and service', items: [['orders', 'shopping-bag', 'Orders'], ['kitchen', 'chef-hat', 'Kitchen display'], ['inbox', 'inbox', 'Inbox'], ['tickets', 'ticket', 'Tickets']] },
  { sec: 'Marketing', items: [['campaigns', 'megaphone', 'Campaigns']] },
  { sec: 'Automation', items: [['chatbot', 'bot', 'Chatbot'], ['workflows', 'workflow', 'Workflows']] },
  { sec: 'Reports', items: [['reports', 'chart-no-axes-combined', 'Reports'], ['kpi', 'target', 'KPI tracker']] },
];
const TITLES = {};
NAV.forEach((g) => g.items.forEach(([id, , label]) => { TITLES[id] = [label, g.sec || null]; }));
export const PAGE_META = { ...TITLES, record: ['Customer record', 'Customers'], report: ['Report', 'Reports'], settings: ['Settings', null] };

export const ROLE_PAGES = {
  owner: null, // everything
  ordertaking: ['dashboard', 'customers', 'record', 'orders', 'kitchen', 'inbox', 'loyalty', 'dss-today'],
  ticket: ['dashboard', 'customers', 'record', 'orders', 'inbox', 'tickets'],
  kitchen: ['kitchen', 'orders'],
  admin: ['dashboard', 'chatbot', 'workflows', 'settings', 'reports', 'report', 'kpi'],
};
export const LANDING = { owner: 'dashboard', ordertaking: 'orders', ticket: 'inbox', kitchen: 'kitchen', admin: 'settings' };
export const canSee = (role, page) => !ROLE_PAGES[role] || ROLE_PAGES[role].includes(page);
export const canApprove = (role) => role === 'owner';

export function PageHead({ title, sub, eyebrow, children }) {
  return (
    <div className="ph">
      <div className="grow">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {sub && <div className="ph-sub">{sub}</div>}
      </div>
      {children && <div className="ph-act">{children}</div>}
    </div>
  );
}

const ORDER_TONE = { new: 'violet', awaiting: 'orange', paid: 'blue', preparing: 'teal', ready: 'green', rider: 'blue', completed: null, cancelled: 'red' };
export const ORDER_LABEL = { ...STATUS_LABEL, new: 'New in chat', paid: 'Paid' };
export function OrderBadge({ status, lg }) { return <Badge tone={ORDER_TONE[status]} lg={lg}>{ORDER_LABEL[status] || status}</Badge>; }

export const TICKET_STATUS = { new: ['New', 'blue'], waiting_us: ['Waiting on us', 'orange'], waiting_contact: ['Waiting on customer', 'violet'], closed: ['Closed', null] };
export function TicketBadge({ status }) { const [l, t] = TICKET_STATUS[status] || [status, null]; return <Badge tone={t}>{l}</Badge>; }
export const TICKET_TYPES = ['Long wait', 'Wrong order', 'Delivery issue', 'Payment', 'Loyalty points', 'Other'];

export function dueText(t, due) {
  if (!due) return '—';
  const d = Math.round((due - t) / MIN);
  if (d < 0) return `Overdue ${-d} min`;
  if (d > 90) return `Due ${sameDay(due, t) ? fmtTime(due) : 'later'}`;
  return `Due in ${d} min`;
}

export function phoneText(s, c, reveal) {
  if (!c) return '—';
  if (!c.phone) return 'No number yet';
  if (!c.member && c.consent === 'No') return 'Not shared';
  return s.settings.maskPhones && !reveal ? maskPhone(c.phone) : fmtPhone(c.phone);
}

export function CustName({ s, cid, name, sub }) {
  const { go } = useAdmin();
  const c = cid ? cust(s, cid) : null;
  if (!c) return <span className="row"><Avatar name={name || 'Guest'} size="sm" /><span className="grow"><span className="strong">{name || 'Guest'}</span>{sub && <div className="tiny faint">{sub}</div>}</span></span>;
  return (
    <button type="button" className="row" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={(e) => { e.stopPropagation(); go('record', { id: c.id }); }}>
      <Avatar name={c.name} size="sm" />
      <span className="grow"><span className="strong">{c.name}</span>{sub && <div className="tiny faint">{sub}</div>}</span>
    </button>
  );
}

export function Stat({ label, value, sub, icon, tone }) {
  return (
    <div className="card stat-tile">
      <div className="row between"><span className="lbl">{label}</span>{icon && <span className={cx('wf-ic', 'tone-' + (tone || 'blue'))} style={{ width: 28, height: 28, borderRadius: 8 }}><Icon name={icon} size={15} /></span>}</div>
      <div className="val">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function NoAccess() {
  const { go } = useAdmin();
  return (
    <div className="card"><Empty icon="lock-keyhole" title="You don’t have access to this page" text="Your role can’t open it. Ask the owner if you need it, or switch the “Viewing as” role at the top.">
      <Btn kind="primary" className="mt-8" onClick={() => go('home')}>Go to my start page</Btn>
    </Empty></div>
  );
}

// ---------- numbers shared by the dashboard, reports and KPI tracker ----------
export const MONTH_START = at(1, 0, 0);
export const isLive = (o) => o.status !== 'cancelled';
export function todayOrders(s, t) { return s.orders.filter((o) => sameDay(o.ts, t) && isLive(o)); }
export function paidSales(list) { return sum(list.filter((o) => o.paidAt), (o) => o.total); }
export function monthOrders(s) { return s.orders.filter((o) => o.ts >= MONTH_START && isLive(o)); }
export function avgWaitToday(s, t) {
  const done = todayOrders(s, t).filter((o) => o.paidAt && o.readyAt);
  if (!done.length) return null;
  return Math.round(sum(done, (o) => (o.readyAt - o.paidAt) / MIN) / done.length);
}
export function satisfaction(s) {
  const fresh = s.ratings.filter((r) => r.ts >= BASE);
  const n = s.base.surveys + fresh.length;
  return { avg: (s.base.satisfaction * s.base.surveys + sum(fresh, (r) => r.stars)) / n, n, fresh };
}
export function membersCount(s) { return s.base.members + s.customers.filter((c) => c.created && c.member).length; }
export function customersCount(s) { return s.base.customers + s.customers.filter((c) => c.created).length; }
export function openTickets(s) { return s.tickets.filter((x) => x.status !== 'closed'); }

// ---------- time ranges for the dashboard, Prep planner and chat stats ----------
const dayStart = (ts, add = 0) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add).getTime(); };
const yearDate = (ts) => `${fmtMD(ts)}, ${new Date(ts).getFullYear()}`;
export const RANGES = [
  { value: '4w', label: 'Last 4 weeks', phrase: 'in the last 4 weeks' },
  { value: 'week', label: 'This week', phrase: 'in this week' },
  { value: 'month', label: 'This month', phrase: 'in this month' },
  { value: 'year', label: 'This year', phrase: 'in this year' },
  { value: 'all', label: 'All time', phrase: 'across all time' },
];
// "Last 4 weeks" is the 4 full reporting weeks before this one. Reporting weeks run Wednesday to Tuesday, as in the paper's Figure 8.
export function rangeOf(s, t) {
  const def = RANGES.find((r) => r.value === s.range) || RANGES[0];
  const today = dayStart(t);
  const d = new Date(today);
  let from, to = dayStart(t, 1);
  if (def.value === '4w') {
    to = dayStart(t, -((new Date(today).getDay() + 4) % 7));
    from = dayStart(to, -FIG8.weeks * 7);
  } else if (def.value === 'week') from = dayStart(t, -d.getDay());
  else if (def.value === 'month') from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  else if (def.value === 'year') from = new Date(d.getFullYear(), 0, 1).getTime();
  else from = HISTORY.days[0].ts;
  const last = dayStart(to, -1);
  return { ...def, from, to, today, dates: `${yearDate(from)} to ${yearDate(last)}`, has: (ts) => ts >= from && ts < to };
}
export function RangeBar({ s, t }) {
  const r = rangeOf(s, t);
  return (
    <div className="row between wrap">
      <Seg options={RANGES} value={r.value} onChange={setRange} label="Time range" />
      <span className="small muted">{r.dates}{r.value === '4w' ? ' · Full weeks only. Today’s orders count under This week and longer.' : ''}</span>
    </div>
  );
}

// Every number for a range: the daily history, plus the sample and live records dated inside it.
export function rangeStats(s, r) {
  const days = HISTORY.days.filter((d) => r.has(d.ts));
  const add = (key) => sum(days, (d) => d[key]);
  const orders = s.orders.filter((o) => isLive(o) && r.has(o.ts));
  const channels = HISTORY.channels.map((label, c) => {
    const live = orders.filter((o) => o.channel === label);
    return { label, orders: sum(days, (d) => d.chOrders[c]) + live.length, value: sum(days, (d) => d.chSales[c]) + paidSales(live) };
  });
  const flavors = {};
  HISTORY.flavors.forEach((f, i) => { flavors[f] = sum(days, (d) => d.flavors[i]); });
  for (const o of orders) for (const i of o.items) for (const f of i.flavors || []) flavors[f] = (flavors[f] || 0) + i.qty;
  // Retention: of the customers who ordered in the range, the share who ordered more than once.
  let active = 0, repeat = 0;
  for (const v of HISTORY.visits) { let n = 0; for (const ts of v) if (r.has(ts)) n++; if (n) active++; if (n > 1) repeat++; }
  const named = {};
  for (const o of orders) if (o.cid) named[o.cid] = (named[o.cid] || 0) + 1;
  Object.values(named).forEach((n) => { active++; if (n > 1) repeat++; });
  // Chats and hand-offs come from the conversation records themselves.
  const started = s.convos.filter((c) => c.messages[0] && r.has(c.messages[0].ts)).length;
  const handed = sum(s.convos, (c) => c.messages.filter((m) => m.from === 'system' && m.adminOnly && r.has(m.ts) && String(m.text).startsWith('Bot handed off')).length);
  const conversations = add('conversations') + started;
  const handoffs = add('handoffs') + handed;
  const confirmed = channels.find((c) => c.label === 'Messenger').orders - orders.filter((o) => o.channel === 'Messenger' && !o.paidAt).length;
  // Tickets: resolution time (created to closed) and first reply are separate measures.
  const opened = s.tickets.filter((x) => r.has(x.created));
  const closed = s.tickets.filter((x) => x.status === 'closed' && x.closedAt && r.has(x.closedAt));
  const replied = opened.filter((x) => x.firstReply);
  const closedN = add('closed') + closed.length;
  const repliedN = add('replied') + replied.length;
  const ticketsN = add('tickets') + opened.length;
  const ratings = s.ratings.filter((x) => r.has(x.ts));
  const ratingN = add('ratings') + ratings.length;
  const encoded = add('orders') + orders.length + ticketsN;
  const handled = encoded + add('notEncoded');
  return {
    orders: add('orders') + orders.length,
    sales: add('sales') + paidSales(orders),
    channels,
    flavors: Object.entries(flavors).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    active, repeat, retention: active ? (repeat / active) * 100 : null,
    conversations, handoffs, botAlone: conversations ? ((conversations - handoffs) / conversations) * 100 : null,
    confirmed, conversion: conversations ? (confirmed / conversations) * 100 : null,
    tickets: ticketsN, closed: closedN,
    resolution: closedN ? (add('resolutionMin') + sum(closed, (x) => (x.closedAt - x.created) / MIN)) / closedN : null,
    firstReply: repliedN ? (add('replyMin') + sum(replied, (x) => x.firstReply)) / repliedN : null,
    ratings: ratingN, satisfaction: ratingN ? (add('stars') + sum(ratings, (x) => x.stars)) / ratingN : null,
    encoded, handled, crmUsage: handled ? (encoded / handled) * 100 : null,
  };
}

// Sales over the range: by day for one week, by reporting week for a month or less, by calendar month beyond that.
export function salesBuckets(s, r) {
  const edges = [r.from];
  const by = r.value === 'week' ? 'day' : r.value === '4w' || r.value === 'month' ? 'week' : 'month';
  while (edges[edges.length - 1] < r.to) {
    const e = edges[edges.length - 1];
    const d = new Date(e);
    const next = by === 'day' ? dayStart(e, 1) : by === 'week' ? dayStart(e, ((3 - d.getDay() + 7) % 7) || 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    edges.push(Math.min(next, r.to));
  }
  const MON = (ts) => fmtMD(ts).split(' ')[0];
  const DAYNUM = (ts) => new Date(ts).getDate();
  const span = (a, b) => (MON(a) === MON(b) ? `${DAYNUM(a)} to ${DAYNUM(b)} ${MON(b)}` : `${DAYNUM(a)} ${MON(a)} to ${DAYNUM(b)} ${MON(b)}`);
  const bars = edges.slice(0, -1).map((from, i) => {
    const to = edges[i + 1];
    const value = sum(HISTORY.days.filter((d) => d.ts >= from && d.ts < to), (d) => d.sales) + paidSales(s.orders.filter((o) => isLive(o) && o.ts >= from && o.ts < to));
    if (by === 'day') return { value, label: new Date(from).toLocaleDateString('en-US', { weekday: 'short' }), sub: `${DAYNUM(from)} ${MON(from)}` };
    if (by === 'week') return { value, label: `Week ${i + 1}`, sub: span(from, dayStart(to, -1)) };
    return { value, label: MON(from), sub: String(new Date(from).getFullYear()) };
  });
  return { by, bars, title: by === 'day' ? 'Daily sales' : by === 'week' ? 'Weekly sales' : 'Monthly sales', open: r.to > r.today };
}

// Average orders by hour for each day of the week. Today is left out because it isn't over, unless it is
// the only one of its weekday in the range; then its row shows today so far and is listed in `todayOnly`.
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function hourlyByDay(s, r) {
  const todayName = WEEK.find((w) => DOW_INDEX[w] === new Date(r.today).getDay());
  const todayInRange = r.has(r.today);
  const todayOnly = [];
  const rows = WEEK.map((name) => {
    const dow = DOW_INDEX[name];
    const days = HISTORY.days.filter((d) => d.dow === dow && r.has(d.ts));
    const useToday = !days.length && name === todayName && todayInRange;
    if (useToday) todayOnly.push(name);
    const totals = Array(11).fill(0);
    for (const d of days) d.hours.forEach((v, h) => { totals[h] += v; });
    for (const o of s.orders) {
      if (!isLive(o) || !r.has(o.ts)) continue;
      const when = new Date(o.ts);
      const isToday = o.ts >= r.today;
      if (when.getDay() !== dow || isToday !== useToday) continue;
      const h = when.getHours() - 10;
      if (h >= 0 && h < 11) totals[h]++;
    }
    const n = useToday ? 1 : days.length;
    return [name, totals.map((v) => (n ? Math.round(v / n) : 0))];
  });
  return { rows, todayOnly };
}
export function activeOrders(s) { return s.orders.filter((o) => o.status === 'new' || ACTIVE.includes(o.status)); }
export function nextStep(o) {
  const app = o.channel === 'Foodpanda' || o.channel === 'Grab';
  switch (o.status) {
    case 'new': return ['awaiting', 'Send summary'];
    case 'awaiting': return ['paid', 'Mark paid'];
    case 'paid': return ['preparing', 'Start cooking'];
    case 'preparing': return ['ready', 'Mark ready'];
    case 'ready': return app ? ['rider', 'Handed to rider'] : ['completed', 'Picked up'];
    case 'rider': return ['completed', 'Delivered'];
    default: return null;
  }
}
export const lateBy = (o, t) => (o.readyBy && ['paid', 'preparing'].includes(o.status) && t > o.readyBy ? Math.round((t - o.readyBy) / MIN) : 0);
export const daysAgo = (ts, t) => (ts ? Math.floor((t - ts) / DAY) : null);

// Where a notification leads when clicked (bell, dashboard activity).
export function openNotif(n, go, open) {
  if (n.page === 'orders' && n.ref) return open('order', { id: n.ref });
  if (n.page === 'tickets' && n.ref) return open('ticket', { id: n.ref });
  if (n.page === 'campaigns' && n.ref) { go('campaigns'); return open('campaign', { id: n.ref }); }
  if (n.page === 'inbox') return go('inbox', n.ref ? { id: n.ref } : {});
  if ((n.page === 'record' || n.page === 'loyalty') && n.ref) return go('record', { id: n.ref });
  return go(n.page || 'dashboard');
}
