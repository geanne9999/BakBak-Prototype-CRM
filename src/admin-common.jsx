// Shared pieces for the BakBak CRM workspace: navigation, roles, small badges and helpers.
import { Icon, Badge, Avatar, Btn, Empty } from './ui.jsx';
import { maskPhone, fmtPhone, cx, MIN, fmtTime, sameDay, sum, BASE, DAY, at } from './util.js';
import { STATUS_LABEL, ACTIVE, cust } from './store.js';

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
