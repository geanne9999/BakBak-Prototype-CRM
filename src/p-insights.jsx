// Dashboard, Reports library, report detail, and the KPI tracker.
import { useStore, useNow, toast, currentUser, decideRec, waitModel, waitMinutes, segmentCount, wf, isApp, addReport } from './store.js';
import { Icon, Btn, Badge, ChannelBadge, Modal, Seg, Field, Empty, Bars, HBars, Donut, Spark } from './ui.jsx';
import {
  useAdmin, PageHead, Stat, canApprove, todayOrders, monthOrders, paidSales, avgWaitToday, satisfaction, membersCount, customersCount,
  openTickets, openNotif,
} from './admin-common.jsx';
import { HEAT, HOURS } from './p-dss.jsx';
import { peso, pesoK, num, fmtTime, fmtWhen, fmtAgo, fmtLongDate, firstName, cx, sum, sameDay, BASE } from './util.js';

const { useState } = React;
const CH_COLORS = { 'Walk-in': 'var(--ch-walk)', Messenger: 'var(--ch-msgr)', Foodpanda: 'var(--ch-fp)', Grab: 'var(--ch-grab)' };
const BASE_SPLIT = { 'Walk-in': 0.46, Messenger: 0.28, Foodpanda: 0.16, Grab: 0.1 };
const BASE_FLAVORS = { 'Soy Garlic': 312, 'Bak Bak Special': 248, 'Garlic Parmesan': 190, 'Yang Nyeom': 160, "Jack Daniel's": 120, 'Smoke BBQ': 96, 'White Cheddar': 74 };

function channelSales(s) {
  const month = monthOrders(s).filter((o) => o.paidAt);
  return Object.keys(BASE_SPLIT).map((ch) => ({ label: ch, value: Math.round(s.base.sales * BASE_SPLIT[ch]) + sum(month.filter((o) => o.channel === ch), (o) => o.total), color: CH_COLORS[ch] }));
}
function flavorCounts(s) {
  const c = { ...BASE_FLAVORS };
  for (const o of monthOrders(s)) for (const i of o.items) for (const f of i.flavors || []) c[f] = (c[f] || 0) + i.qty;
  return Object.entries(c).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function Dashboard() {
  const s = useStore();
  const t = useNow(15000);
  const { go, open } = useAdmin();
  const user = currentUser(s);
  const h = new Date(t).getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const today = todayOrders(s, t);
  const month = monthOrders(s);
  const r1 = s.recs.find((r) => r.id === 'R1');
  const pending = s.recs.filter((r) => r.status === 'pending').length;
  const sat = satisfaction(s);
  const wait = avgWaitToday(s, t);
  const ptsToday = sum(s.ledger.filter((l) => l.pts > 0 && sameDay(l.ts, t)), (l) => l.pts);
  const plan = waitModel({ batches: 3, cashiers: 2 });
  const chan = channelSales(s);
  return (
    <>
      <PageHead title={`${greet}, ${firstName(user)}`} sub={`${fmtLongDate(t)} · Here’s how Bak Bak is doing.`}>
        <Btn icon="plus" onClick={() => open('newOrder')}>New order</Btn>
      </PageHead>
      <div className="dss-banner">
        <span className="spark"><Icon name="sparkles" size={22} /></span>
        <div className="grow">
          {r1 && r1.status === 'pending' ? (
            <><div className="h3">Today’s plan is ready: {r1.head}</div><div className="small muted">For the 5 to 6 PM rush. Estimated wait {waitModel({}).wait} → {plan.wait} min. {pending > 1 ? `${pending} recommendations in all.` : ''}</div></>
          ) : (
            <><div className="h3">{r1 && r1.status === 'Dismissed' ? 'Rush plan dismissed' : 'Rush plan approved'}</div><div className="small muted">Estimated wait right now: {waitMinutes(s)} min.{pending ? ` ${pending} more recommendation${pending > 1 ? 's' : ''} to review.` : ' Everything is reviewed.'}</div></>
          )}
        </div>
        <div className="row wrap">
          {r1 && r1.status === 'pending' && canApprove(s.role) && <Btn kind="primary" onClick={() => { decideRec('R1', 'Approved'); toast('Rush plan approved. The kitchen display shows 3 batches.'); }}>Approve</Btn>}
          <Btn onClick={() => go('dss-today')}>See today’s plan</Btn>
        </div>
      </div>
      <div className="grid g4 keep2">
        <Stat label="Sales this month" value={peso(s.base.sales + paidSales(month))} sub="Oct 1 to today" icon="wallet" tone="green" />
        <Stat label="Orders this month" value={num(s.base.orders + month.length)} sub="All channels" icon="shopping-bag" />
        <Stat label="Customers" value={num(customersCount(s))} sub={`${num(membersCount(s))} in Bak Bak Rewards`} icon="users" tone="orange" />
        <Stat label="Satisfaction" value={`${sat.avg.toFixed(2)} / 5`} sub={`${num(sat.n)} ratings`} icon="smile" tone="teal" />
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Today so far</div>
        <div className="strip">
          <div><div className="lbl">Orders</div><div className="val">{today.length}</div></div>
          <div><div className="lbl">Sales</div><div className="val">{peso(paidSales(today))}</div></div>
          <div><div className="lbl">Average wait</div><div className="val">{wait != null ? `${wait} min` : '—'}</div></div>
          <div><div className="lbl">Open tickets</div><div className="val">{openTickets(s).length}</div></div>
          <div><div className="lbl">Points given</div><div className="val">{ptsToday}</div></div>
        </div>
      </div>
      <div className="grid g2">
        <div className="card">
          <div className="card-h"><div><div className="card-t">Orders by hour on Saturdays</div><div className="card-s">Average of the last 4 Saturdays. The 5 PM rush drives today’s plan.</div></div></div>
          <Bars values={HEAT[5][1]} labels={HOURS} hi={[7]} />
        </div>
        <div className="card">
          <div className="card-h"><div><div className="card-t">Sales by channel</div><div className="card-s">This month. Delivery comes only through Foodpanda and Grab.</div></div><button type="button" className="link small" onClick={() => go('report', { id: 'sales-channel' })}>Report</button></div>
          <Donut parts={chan.map((c) => ({ ...c, fmt: pesoK(c.value) }))} label="Sales by channel" />
        </div>
        <div className="card">
          <div className="card-h"><div><div className="card-t">Top flavors</div><div className="card-s">Pieces ordered this month</div></div><button type="button" className="link small" onClick={() => go('report', { id: 'flavors' })}>Report</button></div>
          <HBars rows={flavorCounts(s)} />
        </div>
        <div className="card">
          <div className="card-h"><div><div className="card-t">Recent activity</div><div className="card-s">Orders, chats, tickets and points as they happen</div></div></div>
          <div className="col gap-4">
            {s.notifs.slice(0, 7).map((n) => (
              <button key={n.id} type="button" className="pop-item" onClick={() => openNotif(n, go, open)}>
                <span className="tile sm blue" style={{ width: 30, height: 30, borderRadius: 9 }}><Icon name={n.icon || 'bell'} size={15} /></span>
                <span className="grow small">{n.text}<div className="tiny faint">{fmtAgo(n.ts, t)}</div></span>
              </button>
            ))}
            {!s.notifs.length && <Empty icon="activity" title="Nothing yet" />}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------- reports ----------------
export const REPORTS = [
  { id: 'sales-channel', name: 'Sales by channel', cat: 'Sales', desc: 'Walk-in, Messenger, Foodpanda and Grab', live: true, icon: 'wallet' },
  { id: 'sales-hour', name: 'Orders by hour', cat: 'Sales', desc: 'Busy hours across the week', live: true, icon: 'clock' },
  { id: 'flavors', name: 'Top flavors and items', cat: 'Sales', desc: 'What sells, by flavor and item', live: true, icon: 'flame' },
  { id: 'customers', name: 'New and returning customers', cat: 'Customers', desc: 'Growth and repeat visits', live: true, icon: 'users' },
  { id: 'segments', name: 'Segments', cat: 'Customers', desc: 'Size of each customer group', live: true, icon: 'layers' },
  { id: 'loyalty', name: 'Points and rewards', cat: 'Loyalty', desc: 'Points given and rewards redeemed', live: true, icon: 'gift' },
  { id: 'codes', name: 'Bak Bak card claims', cat: 'Loyalty', desc: 'Foodpanda and Grab buyers who joined', live: true, icon: 'qr-code' },
  { id: 'tickets', name: 'Tickets and first reply', cat: 'Service', desc: 'Volume, types and reply times', live: true, icon: 'ticket' },
  { id: 'chatbot', name: 'Chatbot hand-offs', cat: 'Service', desc: 'What the bot answered and passed on', live: true, icon: 'bot' },
  { id: 'campaigns', name: 'Campaign results', cat: 'Marketing', desc: 'Sent, seen, redeemed and sales', live: false, icon: 'megaphone' },
  { id: 'decisions', name: 'Decision outcomes', cat: 'Decision support', desc: 'Approved plans and what happened', live: false, icon: 'history' },
  { id: 'satisfaction', name: 'Customer satisfaction', cat: 'Service', desc: 'Ratings after each order', live: false, icon: 'smile' },
];
const CATS = ['All', 'Sales', 'Customers', 'Loyalty', 'Service', 'Marketing', 'Decision support'];

export function Reports() {
  const s = useStore();
  const { go, open } = useAdmin();
  const [cat, setCat] = useState('All');
  const custom = (s.reports || []).map((r) => ({ ...REPORTS.find((x) => x.id === r.kind), id: r.id, name: r.name, cat: r.cat, custom: true }));
  const all = [...REPORTS, ...custom].filter((r) => cat === 'All' || r.cat === cat);
  const total = REPORTS.length + custom.length;
  const live = REPORTS.filter((r) => r.live).length + custom.filter((r) => r.live).length;
  return (
    <>
      <PageHead title="Reports" sub={`${live} of your ${total} reports, updated with every order.`}>
        <Btn kind="primary" icon="plus" onClick={() => open('newReport')}>New report</Btn>
      </PageHead>
      <div className="chips">{CATS.map((c) => <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="grid g3">
        {all.map((r) => (
          <button key={r.id} type="button" className="card col" style={{ textAlign: 'left', cursor: 'pointer', gap: 10 }} onClick={() => go('report', { id: r.id })}>
            <div className="row between"><span className="tile sm blue"><Icon name={r.icon || 'chart-no-axes-combined'} size={18} /></span>{r.live ? <Badge tone="green">Live</Badge> : <Badge>Weekly</Badge>}</div>
            <div><div className="strong">{r.name}</div><div className="small muted">{r.desc}</div></div>
            <div className="tiny faint">{r.cat}{r.custom ? ' · made by you' : ''}</div>
          </button>
        ))}
      </div>
    </>
  );
}

export function NewReportModal({ onClose }) {
  const { go } = useAdmin();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('sales-channel');
  const [cat, setCat] = useState('Sales');
  const [err, setErr] = useState('');
  return (
    <Modal title="New report" sub="Start from one of the report types and give it your own name." onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (name.trim().length < 3) return setErr('Name the report.'); addReport({ name: name.trim(), kind, cat }); toast(`Report “${name.trim()}” saved`); onClose(); go('reports'); }}>Save report</Btn></>}>
      <Field label="Name" htmlFor="nr-name" error={err}><input id="nr-name" className={cx('inp', err && 'err')} value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Weekend sales by channel" /></Field>
      <Field label="Report type" htmlFor="nr-kind"><select id="nr-kind" className="inp" value={kind} onChange={(e) => { setKind(e.target.value); setCat(REPORTS.find((r) => r.id === e.target.value).cat); }}>{REPORTS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
      <Field label="Category" htmlFor="nr-cat"><select id="nr-cat" className="inp" value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.slice(1).map((c) => <option key={c}>{c}</option>)}</select></Field>
    </Modal>
  );
}

export function ReportDetail() {
  const s = useStore();
  const t = useNow(30000);
  const { params, go } = useAdmin();
  const [day, setDay] = useState('Sat');
  const custom = (s.reports || []).find((r) => r.id === params.id);
  const def = REPORTS.find((r) => r.id === (custom ? custom.kind : params.id));
  if (!def) return <div className="card"><Empty icon="chart-no-axes-combined" title="Report not found"><Btn onClick={() => go('reports')}>All reports</Btn></Empty></div>;
  const kind = def.id;
  let body = null;
  if (kind === 'sales-channel') {
    const chan = channelSales(s);
    const total = sum(chan, (c) => c.value);
    body = (<div className="grid g2"><div className="card"><Donut parts={chan.map((c) => ({ ...c, fmt: pesoK(c.value) }))} size={150} label="Sales by channel" /></div>
      <div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Channel</th><th className="r">Sales</th><th className="r">Share</th></tr></thead><tbody>{chan.map((c) => <tr key={c.label}><td><ChannelBadge channel={c.label} /></td><td className="r num">{peso(c.value)}</td><td className="r num">{Math.round((c.value / total) * 100)}%</td></tr>)}<tr><td className="strong">Total</td><td className="r num strong">{peso(total)}</td><td /></tr></tbody></table></div></div>);
  } else if (kind === 'sales-hour') {
    const row = HEAT.find((h) => h[0] === day)[1];
    body = (<div className="card col"><Seg options={HEAT.map((h) => h[0])} value={day} onChange={setDay} label="Day" /><Bars values={row} labels={HOURS} hi={[row.indexOf(Math.max(...row))]} height={200} /><div className="small muted">Busiest hour on {day}: {HOURS[row.indexOf(Math.max(...row))]} with about {Math.max(...row)} orders.</div></div>);
  } else if (kind === 'flavors') {
    const items = {};
    for (const o of monthOrders(s)) for (const i of o.items) items[i.name] = (items[i.name] || 0) + i.qty;
    body = (<div className="grid g2"><div className="card"><div className="card-t">Flavors</div><div className="mt-12"><HBars rows={flavorCounts(s)} /></div></div><div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Item</th><th className="r">Sold in the sample orders</th></tr></thead><tbody>{Object.entries(items).sort((a, b) => b[1] - a[1]).map(([k, v]) => <tr key={k}><td>{k}</td><td className="r num">{v}</td></tr>)}</tbody></table></div></div>);
  } else if (kind === 'customers') {
    const created = s.customers.filter((c) => c.created).length;
    body = (<div className="grid g2"><div className="card"><div className="card-t">New customers per week</div><Bars values={[21, 26, 31, 34 + created]} labels={['Sep 26', 'Oct 3', 'Oct 10', 'Oct 17']} hi={[3]} green /></div><div className="card col"><Stat label="Returning customers" value="62%" sub="Ordered 2 or more times this month" /><Stat label="All customers" value={num(customersCount(s))} /></div></div>);
  } else if (kind === 'segments') {
    body = (<div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Segment</th><th>Rule</th><th className="r">Customers</th></tr></thead><tbody>{s.segments.map((g) => <tr key={g.id}><td className="strong">{g.name}</td><td className="small muted">{g.rule}</td><td className="r num">{segmentCount(s, g)}</td></tr>)}</tbody></table></div>);
  } else if (kind === 'loyalty') {
    body = (<div className="grid g2"><div className="card"><div className="card-t">Rewards redeemed</div><div className="mt-12"><HBars rows={s.rewards.map((r) => ({ label: r.name, value: r.redeemed }))} /></div></div><div className="card col"><Stat label="Members" value={num(membersCount(s))} /><Stat label="Points given this month" value={num(s.base.pointsOut + sum(s.ledger.filter((l) => l.ts >= BASE && l.pts > 0), (l) => l.pts))} /></div></div>);
  } else if (kind === 'codes') {
    body = (<div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Code</th><th>Order</th><th className="r">Points</th><th>Status</th></tr></thead><tbody>{s.codes.map((c) => <tr key={c.code}><td className="num strong">{c.code}</td><td><ChannelBadge channel={c.app} /> <span className="small muted">{c.ref}</span></td><td className="r num">{Math.floor(c.food / s.settings.earnPer)}</td><td>{c.usedBy ? <Badge tone="green">Claimed</Badge> : t > c.date + 7 * 86400000 ? <Badge>Expired</Badge> : <Badge tone="orange">Not claimed</Badge>}</td></tr>)}</tbody></table><div className="card-f" style={{ margin: 0, padding: '10px 14px' }}><span className="faint">{wf(s, 'receipt').runs} codes claimed this month in all.</span></div></div>);
  } else if (kind === 'tickets') {
    const types = {};
    s.tickets.forEach((x) => { types[x.type] = (types[x.type] || 0) + 1; });
    const replied = s.tickets.filter((x) => x.firstReply);
    body = (<div className="grid g2"><div className="card"><div className="card-t">Tickets by type</div><div className="mt-12"><HBars rows={Object.entries(types).map(([label, value]) => ({ label, value }))} /></div></div><div className="card col"><Stat label="Open tickets" value={openTickets(s).length} /><Stat label="Average first reply" value={replied.length ? `${(sum(replied, (x) => x.firstReply) / replied.length).toFixed(1)} min` : '—'} sub="Target: 5 min or less" /></div></div>);
  } else if (kind === 'chatbot') {
    const conv = s.base.conversations;
    const ho = s.base.handoffs;
    body = (<div className="grid g2"><div className="card col"><Stat label="Conversations this month" value={num(conv)} /><Stat label="Answered by the bot alone" value={`${Math.round(((conv - ho) / conv) * 100)}%`} sub={`${ho} handed to staff`} /></div><div className="card"><div className="card-t">Why the bot handed off</div><div className="mt-12"><HBars rows={[{ label: 'Delivery fees', value: 26 }, { label: 'Late order', value: 21 }, { label: 'Order status', value: 14 }, { label: 'Wrong or missing', value: 12 }, { label: 'Asked for staff', value: 9 }, { label: 'Not sure', value: ho - 82 }]} /></div></div></div>);
  } else if (kind === 'campaigns') {
    body = (<div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Campaign</th><th>Status</th><th className="r">Sent</th><th className="r">Redeemed</th><th className="r">Sales</th></tr></thead><tbody>{s.campaigns.map((c) => <tr key={c.id}><td className="strong">{c.name}</td><td>{c.status}</td><td className="r num">{c.sent || '—'}</td><td className="r num">{c.redeemed || '—'}</td><td className="r num">{c.sales ? peso(c.sales) : '—'}</td></tr>)}</tbody></table></div>);
  } else if (kind === 'decisions') {
    body = (<div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Decision</th><th>Call</th><th>Result</th></tr></thead><tbody>{s.decisions.map((d) => <tr key={d.id}><td className="small strong">{d.what}</td><td>{d.call}</td><td className="small">{d.result}</td></tr>)}</tbody></table></div>);
  } else if (kind === 'satisfaction') {
    const sat = satisfaction(s);
    const dist = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} star${n > 1 ? 's' : ''}`, value: [104, 52, 18, 7, 5][5 - n] + sat.fresh.filter((r) => r.stars === n).length }));
    body = (<div className="grid g2"><div className="card"><div className="card-t">Ratings</div><div className="mt-12"><HBars rows={dist} /></div></div><div className="card col"><Stat label="Average" value={`${sat.avg.toFixed(2)} / 5`} sub={`${sat.n} ratings`} /><div className="small muted">Low ratings (2 stars or less) open a ticket for follow-up.</div></div></div>);
  }
  return (
    <>
      <button type="button" className="link" onClick={() => go('reports')}><Icon name="arrow-left" size={15} />Reports</button>
      <PageHead title={custom ? custom.name : def.name} sub={`${def.desc} · ${def.live ? 'Updated with every order' : 'Updated every Monday'}`}>
        <Btn icon="download" onClick={() => toast('Downloads are off in this demo. In BakBak CRM this saves a CSV file.')}>Download CSV</Btn>
      </PageHead>
      {body}
    </>
  );
}

// ---------------- KPI tracker ----------------
export function Kpi() {
  const s = useStore();
  const t = useNow(15000);
  const sat = satisfaction(s);
  const wait = avgWaitToday(s, t) || 18;
  const replied = s.tickets.filter((x) => x.firstReply);
  const firstReply = replied.length ? sum(replied, (x) => x.firstReply) / replied.length : 4;
  const conv = s.base.conversations;
  const kpis = [
    { name: 'Average wait time', value: wait, fmt: (v) => `${v} min`, target: 15, lower: true, note: 'Paid to ready, today', live: true, spark: [24, 22, 21, 19, 18, wait] },
    { name: 'First reply to a ticket', value: firstReply, fmt: (v) => `${v.toFixed(1)} min`, target: 5, lower: true, note: 'Average this month', live: true, spark: [9, 8, 6, 5.5, 4.8, firstReply] },
    { name: 'Customer satisfaction', value: sat.avg, fmt: (v) => `${v.toFixed(2)} / 5`, target: 4.5, note: `${sat.n} ratings`, live: true, spark: [4.05, 4.1, 4.16, 4.2, 4.22, sat.avg] },
    { name: 'Answered by the chatbot alone', value: ((conv - s.base.handoffs) / conv) * 100, fmt: (v) => `${Math.round(v)}%`, target: 80, note: `${s.base.handoffs} hand-offs this month`, spark: [70, 72, 75, 77, 78, ((conv - s.base.handoffs) / conv) * 100] },
    { name: 'Loyalty members', value: (membersCount(s) / customersCount(s)) * 100, fmt: (v) => `${Math.round(v)}%`, target: 40, note: `${membersCount(s)} of ${customersCount(s)} customers`, live: true, spark: [28, 30, 31, 33, 34, (membersCount(s) / customersCount(s)) * 100] },
    { name: 'Returning customers', value: 62, fmt: (v) => `${v}%`, target: 65, note: 'Ordered 2 or more times this month', spark: [55, 57, 58, 60, 61, 62] },
    { name: 'Bak Bak cards claimed', value: (wf(s, 'receipt').runs / 120) * 100, fmt: (v) => `${Math.round(v)}%`, target: 40, note: `${wf(s, 'receipt').runs} of 120 Foodpanda and Grab orders`, live: true, spark: [18, 22, 25, 28, 30, (wf(s, 'receipt').runs / 120) * 100] },
    { name: 'Tickets closed on time', value: 87, fmt: (v) => `${v}%`, target: 90, note: 'Closed before the due time', spark: [78, 80, 83, 85, 86, 87] },
  ];
  return (
    <>
      <PageHead title="KPI tracker" sub="The measures from the paper, against their targets. Live ones change as orders, chats and ratings come in." />
      <div className="grid g4 keep2">
        {kpis.map((k) => {
          const ok = k.lower ? k.value <= k.target : k.value >= k.target;
          const pct = k.lower ? Math.min(100, (k.target / Math.max(0.1, k.value)) * 100) : Math.min(100, (k.value / k.target) * 100);
          return (
            <div key={k.name} className="card col" style={{ gap: 8 }}>
              <div className="row between"><span className="small strong">{k.name}</span>{k.live && <Badge tone="green">Live</Badge>}</div>
              <div className="row between"><span className="big">{k.fmt(k.value)}</span><Spark values={k.spark} width={80} color={ok ? 'var(--ok)' : 'var(--warn)'} /></div>
              <div className={cx('prog', ok ? 'green' : 'orange')}><i style={{ width: pct + '%' }} /></div>
              <div className="row between tiny"><span className="faint">Target {k.lower ? '≤' : '≥'} {k.fmt(k.target)}</span><span className={ok ? 'ok strong' : 'warn strong'}>{ok ? 'On track' : 'Needs work'}</span></div>
              <div className="tiny faint">{k.note}</div>
            </div>
          );
        })}
      </div>
      <div className="card">
        <div className="card-h"><div><div className="card-t">Latest ratings</div><div className="card-s">From the survey sent after each Messenger order</div></div></div>
        {s.ratings.slice(0, 6).map((r) => (
          <div key={r.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="small"><span className="strong">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span> · #{r.orderId}{r.comment ? ` · “${r.comment}”` : ''}</span>
            <span className="tiny faint">{fmtWhen(r.ts, t)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
