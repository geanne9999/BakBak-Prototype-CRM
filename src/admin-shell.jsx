// The BakBak CRM workspace: sidebar, top bar (search, create, notifications, role), pages and dialogs.
import { useStore, useNow, bus, toast, update, getState, setRole, ROLES, currentUser, readAllNotifs, itemsLabel, staffSignIn, staffSignOut } from './store.js';
import { Icon, Logo, Btn, Badge, Avatar, Popover, Toasts, Empty, Field } from './ui.jsx';
import { AdminCtx, NAV, PAGE_META, LANDING, canSee, NoAccess, openNotif, activeOrders, openTickets, OrderBadge } from './admin-common.jsx';
import { Dashboard, Reports, ReportDetail, NewReportModal, Kpi } from './p-insights.jsx';
import { DssToday, DssPrep, DssWhatIf, DssRules, DssLog, AddRuleModal } from './p-dss.jsx';
import { Customers, Record, CustomerForm, AdjustPointsModal, RedeemModal, Loyalty, ProgramSettingsModal, Segments, SegmentMembersModal, NewSegmentModal } from './p-customers.jsx';
import { Orders, OrderDrawer, NewOrderModal, SlipModal, Kitchen } from './p-orders.jsx';
import { Inbox, Tickets, TicketDrawer, NewTicketModal } from './p-service.jsx';
import { Campaigns, CampaignDrawer, NewCampaignModal } from './p-marketing.jsx';
import { Chatbot, FaqModal, Workflows, WorkflowDrawer, Settings, InviteModal } from './p-setup.jsx';
import { initials, fmtAgo, cx, peso } from './util.js';

const { useState, useEffect, useRef, useCallback } = React;
const PAGES = {
  dashboard: Dashboard, 'dss-today': DssToday, 'dss-prep': DssPrep, 'dss-whatif': DssWhatIf, 'dss-rules': DssRules, 'dss-log': DssLog,
  customers: Customers, record: Record, segments: Segments, loyalty: Loyalty, orders: Orders, kitchen: Kitchen, inbox: Inbox, tickets: Tickets,
  campaigns: Campaigns, chatbot: Chatbot, workflows: Workflows, reports: Reports, report: ReportDetail, kpi: Kpi, settings: Settings,
};
const MODALS = {
  newOrder: NewOrderModal, order: OrderDrawer, slip: SlipModal, addCustomer: CustomerForm, editCustomer: CustomerForm, adjustPoints: AdjustPointsModal,
  redeem: RedeemModal, programSettings: ProgramSettingsModal, newSegment: NewSegmentModal, segList: SegmentMembersModal, newTicket: NewTicketModal,
  ticket: TicketDrawer, newCampaign: NewCampaignModal, campaign: CampaignDrawer, faq: FaqModal, workflow: WorkflowDrawer, addRule: AddRuleModal,
  invite: InviteModal, newReport: NewReportModal,
};
const NAV_KEY = 'bakbak-crm-page';
function readNav() { try { const v = JSON.parse(sessionStorage.getItem(NAV_KEY) || 'null'); if (v && PAGES[v.page]) return v; } catch (e) { /* ignore */ } return null; }
function saveNav(v) { try { sessionStorage.setItem(NAV_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } }

export function Admin() {
  const s = useStore();
  const [nav, setNav] = useState(() => readNav() || { page: LANDING[s.role] || 'dashboard', params: {} });
  const [stack, setStack] = useState([]);
  const [menu, setMenu] = useState(false);
  const pageRef = useRef(null);
  const go = useCallback((page, params = {}) => {
    const p = page === 'home' ? LANDING[getState().role] || 'dashboard' : page;
    const v = { page: PAGES[p] ? p : 'notfound', params };
    setNav(v);
    saveNav(v);
    setMenu(false);
    setStack([]);
  }, []);
  const open = useCallback((name, props = {}) => setStack((st) => [...st, { name, props, key: Date.now() + Math.random() }]), []);
  const close = useCallback(() => setStack((st) => st.slice(0, -1)), []);
  useEffect(() => { if (pageRef.current) pageRef.current.scrollTop = 0; }, [nav]);
  useEffect(() => bus.on('admin:go', (d) => { go(d.page, d.params || {}); if (d.modal) setTimeout(() => open(d.modal, d.props || {}), 0); }), [go, open]);
  useEffect(() => bus.on('notif', (n) => { if (!n.quiet) toast(n.text, 'admin'); }), []);
  const firstRole = useRef(true);
  useEffect(() => {
    if (firstRole.current) { firstRole.current = false; return; }
    go(LANDING[s.role] || 'dashboard');
    toast(`Viewing as ${(ROLES.find((r) => r.id === s.role) || ROLES[0]).label}: ${currentUser(s)}`);
  }, [s.role]);
  const ctx = { page: nav.page, params: nav.params, go, open, close };
  const Page = PAGES[nav.page];
  const allowed = canSee(s.role, nav.page);
  if (!s.session) return <StaffSignIn s={s} />;
  return (
    <AdminCtx.Provider value={ctx}>
      <div className={cx('adm', menu && 'menu-open')}>
        <Sidebar s={s} page={nav.page} />
        {menu && <div className="side-scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
        <div className="adm-main">
          <Topbar s={s} page={nav.page} onMenu={() => setMenu(true)} />
          <main ref={pageRef} className={cx('adm-page', nav.page === 'kitchen' && allowed && 'flush')} aria-label={(PAGE_META[nav.page] || ['Page'])[0]}>
            {!Page ? <div className="card"><Empty icon="circle-alert" title="Page not found" text="This page doesn’t exist in BakBak CRM."><Btn kind="primary" onClick={() => go('home')}>Go to my start page</Btn></Empty></div>
              : !allowed ? <NoAccess /> : <Page key={nav.page} />}
          </main>
        </div>
        {stack.map((m) => { const C = MODALS[m.name]; return C ? <C key={m.key} {...m.props} onClose={close} /> : null; })}
        <Toasts scope="admin" />
      </div>
    </AdminCtx.Provider>
  );
}

function Sidebar({ s, page }) {
  const { go } = React.useContext(AdminCtx);
  const counts = { orders: activeOrders(s).length, inbox: s.convos.filter((c) => c.unread).length, tickets: openTickets(s).length };
  const pending = s.recs.filter((r) => r.status === 'pending').length;
  const b = s.settings.business;
  const item = ([id, ic, label]) => {
    if (!canSee(s.role, id)) return null;
    const on = page === id || (page === 'record' && id === 'customers') || (page === 'report' && id === 'reports');
    return (
      <button key={id} type="button" className={cx('nav', on && 'on')} aria-current={on ? 'page' : undefined} onClick={() => go(id)}>
        <Icon name={ic} size={17} />{label}
        {id === 'orders' && counts.orders > 0 && <span className="cnt">{counts.orders}</span>}
        {id === 'inbox' && counts.inbox > 0 && <span className="cnt">{counts.inbox}</span>}
        {id === 'tickets' && counts.tickets > 0 && <span className="cnt grey">{counts.tickets}</span>}
        {id === 'dss-today' && pending > 0 && <span className="pdot" aria-label={`${pending} to review`} />}
      </button>
    );
  };
  return (
    <aside className="side" aria-label="BakBak CRM navigation">
      <div className="side-brand"><Logo size={30} /><div><b>BakBak <span>CRM</span></b><small>Customer relationship management</small></div></div>
      <div className="side-biz"><span className="bb">BB</span><div className="grow" style={{ minWidth: 0 }}><div className="strong ellipsis">{b.name}</div><div className="faint ellipsis">{b.short}</div></div></div>
      {NAV.map((g, i) => {
        const items = g.items.map(item).filter(Boolean);
        if (!items.length) return null;
        return <React.Fragment key={i}>{g.sec && <div className="side-sec">{g.sec}</div>}{items}</React.Fragment>;
      })}
      <div className="side-foot">
        {item(['settings', 'settings', 'Settings'])}
        <button type="button" className="nav" onClick={() => bus.emit('guide:open')}><Icon name="circle-help" size={17} />Help and demo guide</button>
        <div className="sys-ok"><Icon name="cloud" size={14} />Cloud-hosted · all systems normal</div>
      </div>
    </aside>
  );
}

function Topbar({ s, page, onMenu }) {
  const { go, open } = React.useContext(AdminCtx);
  const t = useNow(30000);
  const [create, setCreate] = useState(false);
  const [bell, setBell] = useState(false);
  const [me, setMe] = useState(false);
  const meta = PAGE_META[page] || ['Not found', null];
  const unread = s.notifs.filter((n) => !n.read).length;
  const user = currentUser(s);
  const creates = [
    ['orders', 'shopping-bag', 'New order', () => open('newOrder')],
    ['customers', 'user-plus', 'Add customer', () => open('addCustomer')],
    ['tickets', 'ticket', 'New ticket', () => open('newTicket')],
    ['campaigns', 'megaphone', 'New campaign', () => open('newCampaign')],
    ['segments', 'layers', 'New segment', () => open('newSegment')],
  ].filter(([p]) => canSee(s.role, p));
  return (
    <header className="topbar">
      <Btn kind="ghost" icon="menu" className="menu-btn" aria-label="Open the menu" onClick={onMenu} />
      <div className="crumb">{meta[1] && <><span>{meta[1]}</span><Icon name="chevron-right" size={13} /></>}<b>{meta[0]}</b></div>
      <Search s={s} />
      {creates.length > 0 && (
        <div style={{ position: 'relative' }}>
          <Btn kind="primary" size="sm" icon="plus" onClick={() => setCreate((v) => !v)} aria-haspopup="menu" aria-expanded={create}><span className="tb-hide">Create</span></Btn>
          <Popover open={create} onClose={() => setCreate(false)}>
            {creates.map(([p, ic, label, fn]) => <button key={label} type="button" className="pop-item" onClick={() => { setCreate(false); fn(); }}><Icon name={ic} size={16} />{label}</button>)}
          </Popover>
        </div>
      )}
      <div className="tb-icon" style={{ position: 'relative' }}>
        <Btn kind="ghost" icon="bell" aria-label={`Notifications, ${unread} unread`} onClick={() => setBell((v) => !v)} />
        {unread > 0 && <span className="cnt">{unread > 9 ? '9+' : unread}</span>}
        <Popover open={bell} onClose={() => setBell(false)} width={340}>
          <div className="row between" style={{ padding: '6px 10px' }}><span className="strong">Notifications</span>{unread > 0 && <button type="button" className="link small" onClick={() => readAllNotifs()}>Mark all as read</button>}</div>
          <div className="pop-list">
            {s.notifs.slice(0, 14).map((n) => (
              <button key={n.id} type="button" className={cx('pop-item', !n.read && 'unread')} onClick={() => { update((st) => { const x = st.notifs.find((y) => y.id === n.id); if (x) x.read = true; }); setBell(false); openNotif(n, go, open); }}>
                <Icon name={n.icon || 'bell'} size={16} />
                <span className="grow small">{n.text}<div className="tiny faint">{fmtAgo(n.ts, t)}</div></span>
              </button>
            ))}
            {!s.notifs.length && <Empty icon="bell" title="You’re all caught up" />}
          </div>
        </Popover>
      </div>
      <Btn kind="ghost" icon="circle-help" className="tb-hide" aria-label="Help and demo guide" onClick={() => bus.emit('guide:open')} />
      <select className="role-sel" value={s.role} onChange={(e) => setRole(e.target.value)} aria-label="Viewing as">
        {ROLES.map((r) => <option key={r.id} value={r.id}>Viewing as {r.label}</option>)}
      </select>
      <div style={{ position: 'relative' }}>
        <button type="button" className="me-av" title={user} aria-label={`Account: ${user}`} aria-haspopup="menu" aria-expanded={me} onClick={() => setMe((v) => !v)}>{initials(user)}</button>
        <Popover open={me} onClose={() => setMe(false)} width={240}>
          <div style={{ padding: '6px 10px' }}><div className="strong small">{user}</div><div className="tiny faint">{(ROLES.find((r) => r.id === s.role) || ROLES[0]).label} · signed in on this computer</div></div>
          <button type="button" className="pop-item" onClick={() => { setMe(false); staffSignOut(); toast('Signed out of BakBak CRM', 'app'); }}><Icon name="log-out" size={16} />Sign out</button>
        </Popover>
      </div>
    </header>
  );
}

function Search({ s }) {
  const { go, open } = React.useContext(AdminCtx);
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const qq = q.trim().toLowerCase();
  const digits = qq.replace(/\D/g, '');
  const res = qq.length < 2 ? null : {
    customers: canSee(s.role, 'customers') ? s.customers.filter((c) => (c.name + ' ' + c.area).toLowerCase().includes(qq) || (digits.length >= 3 && c.phone.includes(digits))).slice(0, 4) : [],
    orders: canSee(s.role, 'orders') ? s.orders.filter((o) => (o.id + ' ' + o.name + ' ' + (o.code || '')).toLowerCase().includes(qq)).sort((a, b) => b.ts - a.ts).slice(0, 4) : [],
    tickets: canSee(s.role, 'tickets') ? s.tickets.filter((x) => (x.id + ' ' + x.subject).toLowerCase().includes(qq)).slice(0, 3) : [],
  };
  const none = res && !res.customers.length && !res.orders.length && !res.tickets.length;
  const pick = (fn) => { setQ(''); setShow(false); fn(); };
  return (
    <div className="tb-search">
      <div className="search"><Icon name="search" size={15} /><input id="crm-search" className="inp inp-sm" placeholder="Search customers, orders, tickets" value={q} onChange={(e) => { setQ(e.target.value); setShow(true); }} onFocus={() => setShow(true)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); setShow(false); } }} aria-label="Search BakBak CRM" autoComplete="off" /></div>
      <Popover open={show && !!res} onClose={() => setShow(false)} align="left" width="max(100%, 300px)">
        <div className="pop-list">
          {res && res.customers.length > 0 && <div className="pop-sec">Customers</div>}
          {res && res.customers.map((c) => <button key={c.id} type="button" className="pop-item" onClick={() => pick(() => go('record', { id: c.id }))}><Avatar name={c.name} size="sm" /><span className="grow"><span className="small strong">{c.name}</span><div className="tiny faint">{c.area} · {c.channel}</div></span></button>)}
          {res && res.orders.length > 0 && <div className="pop-sec">Orders</div>}
          {res && res.orders.map((o) => <button key={o.id} type="button" className="pop-item" onClick={() => pick(() => open('order', { id: o.id }))}><Icon name="shopping-bag" size={16} /><span className="grow"><span className="small strong">#{o.id} · {o.name}</span><div className="tiny faint">{itemsLabel(o.items)} · {peso(o.total)}</div></span><OrderBadge status={o.status} /></button>)}
          {res && res.tickets.length > 0 && <div className="pop-sec">Tickets</div>}
          {res && res.tickets.map((x) => <button key={x.id} type="button" className="pop-item" onClick={() => pick(() => open('ticket', { id: x.id }))}><Icon name="ticket" size={16} /><span className="grow small"><span className="strong">{x.id}</span> · {x.subject}</span></button>)}
          {none && <div className="small muted" style={{ padding: '10px 12px' }}>No results for “{q.trim()}”.</div>}
        </div>
      </Popover>
    </div>
  );
}

// ---------- staff sign-in (each person has an account; Owner and Admin also get a 2-step code) ----------
const ACCOUNTS = [
  { role: 'owner', email: 'liza@bakbak.ph', name: 'Liza Manalo', label: 'Owner', phone: '0917 ••• 2210' },
  { role: 'ordertaking', email: 'ana@bakbak.ph', name: 'Ana Reyes', label: 'Order-taking' },
  { role: 'ticket', email: 'kat@bakbak.ph', name: 'Kat Villareal', label: 'Ticket and inquiry' },
  { role: 'kitchen', email: 'ben@bakbak.ph', name: 'Ben Dizon', label: 'Kitchen' },
  { role: 'admin', email: 'group2@bakbak.ph', name: 'IS 306 Group 2', label: 'Admin', phone: '0917 ••• 3060' },
];
function StaffSignIn({ s }) {
  const [email, setEmail] = useState('liza@bakbak.ph');
  const [pw, setPw] = useState('bakbak-demo');
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(true);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [trust, setTrust] = useState(true);
  const [err, setErr] = useState('');
  const acct = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
  const twoStep = !!(acct && acct.phone);
  useEffect(() => { if (step === 2) { setOtp(''); const id = setTimeout(() => setOtp('730518'), 900); return () => clearTimeout(id); } return undefined; }, [step]);
  const submit = (e) => {
    if (e) e.preventDefault();
    if (!acct) return setErr('No staff account uses this email. Ask the owner to invite you from Settings · Users and roles.');
    if (pw.length < 6) return setErr('Enter your password.');
    setErr('');
    if (twoStep) setStep(2); else { staffSignIn(acct.role); toast(`Signed in as ${acct.name} (${acct.label})`, 'admin'); }
  };
  const verify = (e) => { if (e) e.preventDefault(); if (otp.length !== 6) return; staffSignIn(acct.role); toast(`Signed in as ${acct.name} (${acct.label})`, 'admin'); };
  return (
    <div className="signin-wrap">
      <div className="row gap-12"><Logo size={40} /><div><div className="strong" style={{ fontSize: 20 }}>BakBak <span style={{ color: 'var(--warn)' }}>CRM</span></div><div className="tiny faint">A little care. A lot of loyalty.</div></div></div>
      {step === 1 ? (
        <form className="card col gap-12 signin-card" onSubmit={submit}>
          <div><div className="h2">Sign in</div><div className="small muted">For Bak Bak staff. Each person has their own account, and each role sees only the pages it needs.</div></div>
          <Field label="Work email" htmlFor="si-email" error={err && !acct ? err : null}><input id="si-email" className="inp" type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} /></Field>
          <Field label="Password" htmlFor="si-pw" error={err && acct ? err : null}><div className="row gap-8"><input id="si-pw" className="inp grow" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} /><Btn size="sm" kind="ghost" type="button" onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</Btn></div></Field>
          <div className="row between"><label className="check small"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /><span>Keep me signed in on this computer</span></label><button type="button" className="link small" onClick={() => toast('Ask the owner to reset it in Settings · Users and roles.', 'admin')}>Forgot password?</button></div>
          <Btn kind="primary" size="lg" block type="submit">Sign in</Btn>
          <div className="row gap-8 tiny faint" style={{ alignItems: 'flex-start' }}><Icon name="shield-check" size={14} /><span>Owner and Admin accounts also enter a 6-digit code sent to their phone. After 5 wrong passwords, the account locks for 15 minutes.</span></div>
          <div className="col gap-4"><div className="tiny faint">Demo accounts (any password of 6+ characters works):</div><div className="row wrap gap-4">{ACCOUNTS.map((a) => <button key={a.role} type="button" className={cx('chip-btn', acct && acct.role === a.role && 'on')} onClick={() => { setEmail(a.email); setErr(''); }}>{a.label}</button>)}</div></div>
        </form>
      ) : (
        <form className="card col gap-12 signin-card" onSubmit={verify}>
          <div><div className="h2">Check it’s you</div><div className="small muted">We sent a 6-digit code by SMS to {acct.name.split(' ')[0]}’s phone, {acct.phone}. It works for 5 minutes. In this demo it fills in by itself.</div></div>
          <input id="si-otp" className="inp code-inp" inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <label className="check small"><input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} /><span>Trust this computer for 30 days</span></label>
          <Btn kind="primary" size="lg" block type="submit" disabled={otp.length !== 6}>Verify and sign in</Btn>
          <div className="tiny faint">Only Owner and Admin accounts get this step, because they can see full phone numbers and change prices.</div>
          <button type="button" className="link small" style={{ alignSelf: 'center' }} onClick={() => { setStep(1); setOtp(''); }}>Use a different account</button>
        </form>
      )}
      <div className="tiny faint" style={{ textAlign: 'center' }}>New staff? The owner sends you an invite from Settings · Users and roles.</div>
    </div>
  );
}
