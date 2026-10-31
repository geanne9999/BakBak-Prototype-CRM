// Customers, the customer record, Loyalty (Bak Bak Rewards) and Segments.
import {
  useStore, useNow, bus, toast, cust, addCustomer, updateCustomer, adjustPoints, redeemReward, saveRewards, openConvoFor, isApp,
  SEG_TYPES, matchRule, segmentMembers, segmentCount, createSegment, wf,
} from './store.js';
import { nextReward } from './bot.js';
import { Icon, Btn, Badge, ChannelBadge, Avatar, Modal, Seg, Tabs, Field, Empty } from './ui.jsx';
import { useAdmin, PageHead, OrderBadge, ORDER_LABEL, TicketBadge, CustName, phoneText, Stat, customersCount, membersCount, daysAgo } from './admin-common.jsx';
import { peso, fmtTime, fmtWhen, fmtMD, fmtDate, fmtFull, firstName, cx, sum, DAY, BASE, num, fmtPhone } from './util.js';

const { useState, useEffect } = React;
export const AREAS = ['Tikay', 'Guinhawa', 'Bulihan', 'Sumapang Matanda', 'Look 1st', 'Longos', 'Mojon', 'Santisima Trinidad', 'Other'];

export function Customers() {
  const s = useStore();
  const t = useNow(60000);
  const { go, open } = useAdmin();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const qq = q.trim().toLowerCase();
  const list = s.customers
    .filter((c) => (tab === 'all' ? true : tab === 'members' ? c.member : tab === 'apps' ? isApp(c.channel) : tab === 'inactive' ? !c.last || t - c.last >= 30 * DAY : c.channel === tab))
    .filter((c) => !qq || (c.name + ' ' + c.area + ' ' + (c.segs || []).join(' ')).toLowerCase().includes(qq) || (qq.replace(/\D/g, '').length >= 3 && c.phone.includes(qq.replace(/\D/g, ''))))
    .sort((a, b) => (b.created ? 1 : 0) - (a.created ? 1 : 0) || (b.last || 0) - (a.last || 0));
  const newMonth = s.base.newCustomers + s.customers.filter((c) => c.created).length;
  return (
    <>
      <PageHead title="Customers" sub="Everyone who ordered by Messenger, at the counter, or through Foodpanda and Grab.">
        <Btn kind="primary" icon="user-plus" onClick={() => open('addCustomer')}>Add customer</Btn>
      </PageHead>
      <div className="grid g4 keep2">
        <Stat label="Customers" value={num(customersCount(s))} sub="All channels" icon="users" />
        <Stat label="New this month" value={num(newMonth)} sub="Since Oct 1" icon="user-plus" tone="green" />
        <Stat label="Loyalty members" value={num(membersCount(s))} sub="Joined Bak Bak Rewards" icon="gift" tone="orange" />
        <Stat label="Inactive 30+ days" value={num(s.base.inactive)} sub="Win-back list" icon="clock" tone="violet" />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="row between wrap" style={{ padding: '10px 14px 0' }}>
          <Tabs tabs={[{ value: 'all', label: 'All' }, { value: 'members', label: 'Loyalty members' }, { value: 'Messenger', label: 'Messenger' }, { value: 'Walk-in', label: 'Walk-in' }, { value: 'apps', label: 'Foodpanda and Grab' }, { value: 'inactive', label: 'Inactive 30+ days' }]} value={tab} onChange={setTab} />
          <div className="search" style={{ width: 240 }}><Icon name="search" size={15} /><input id="cust-search" className="inp inp-sm" placeholder="Search name, area or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Phone</th><th>Channel</th><th className="r">Orders</th><th className="r">Spent</th><th className="r">Points</th><th>Last order</th><th>Promos</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="click" onClick={() => go('record', { id: c.id })}>
                  <td><span className="row"><Avatar name={c.name} size="sm" /><span><span className="strong">{c.name}</span>{c.created && <Badge tone="green">New</Badge>}<div className="tiny faint">{c.account ? `Signed up in ${c.account.via}` : c.contact ? 'Messenger contact · no account yet' : c.area}</div></span></span></td>
                  <td className="small num">{phoneText(s, c)}</td>
                  <td><ChannelBadge channel={c.channel} /></td>
                  <td className="r num">{c.orders}</td>
                  <td className="r num">{peso(c.spend)}</td>
                  <td className="r num">{c.member ? c.points : '—'}</td>
                  <td className="small muted">{c.last ? fmtWhen(c.last, t) : 'No orders yet'}</td>
                  <td><Badge tone={c.consent === 'Yes' ? 'green' : null}>{c.consent}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <Empty icon="users" title="No customers found" text="Try another search or tab." />}
        </div>
        <div className="card-f" style={{ margin: 0, padding: '10px 14px' }}><span className="faint">Showing {list.length} sample customers. The other {num(customersCount(s) - s.customers.length)} are counted in the totals and reports.</span></div>
      </div>
    </>
  );
}

export function Record() {
  const s = useStore();
  const t = useNow(30000);
  const { params, go, open } = useAdmin();
  const c = cust(s, params.id);
  const [tab, setTab] = useState('activity');
  const [note, setNote] = useState(c ? c.note : '');
  const [reveal, setReveal] = useState(false);
  useEffect(() => { setNote(c ? c.note : ''); setReveal(false); setTab('activity'); }, [params.id]);
  if (!c) return <div className="card"><Empty icon="users" title="Customer not found"><Btn onClick={() => go('customers')}>Back to customers</Btn></Empty></div>;
  const orders = s.orders.filter((o) => o.cid === c.id).sort((a, b) => b.ts - a.ts);
  const tickets = s.tickets.filter((x) => x.cid === c.id);
  const ledger = s.ledger.filter((l) => l.cid === c.id);
  const convo = s.convos.find((x) => x.cid === c.id);
  const { next } = nextReward(s, c.points);
  const prev = s.rewards.filter((r) => r.pts <= c.points).sort((a, b) => b.pts - a.pts)[0];
  const activity = [
    ...orders.map((o) => ({ ts: o.ts, icon: 'shopping-bag', text: `Order #${o.id} · ${peso(o.total)} · ${ORDER_LABEL[o.status]}`, sub: o.items.map((i) => `${i.qty}× ${i.short}${i.flavors.length ? ' ' + i.flavors.join(' + ') : ''}`).join(', '), act: () => open('order', { id: o.id }) })),
    ...tickets.map((x) => ({ ts: x.created, icon: 'ticket', text: `Ticket ${x.id}: ${x.subject}`, sub: x.status === 'closed' ? 'Closed' : 'Open', act: () => open('ticket', { id: x.id }) })),
    ...ledger.map((l) => ({ ts: l.ts, icon: 'star', text: `${l.pts > 0 ? '+' : ''}${l.pts} points`, sub: l.label })),
    ...(convo ? convo.messages.filter((m) => m.from === 'customer').slice(-4).map((m) => ({ ts: m.ts, icon: 'message-circle', text: `${convo.channel}: “${m.text.length > 80 ? m.text.slice(0, 77) + '…' : m.text}”`, act: () => go('inbox', { id: convo.id }) })) : []),
    ...s.ratings.filter((r) => r.cid === c.id).map((r) => ({ ts: r.ts, icon: 'smile', text: `Rated #${r.orderId} ${r.stars} out of 5`, sub: r.comment ? `“${r.comment}”` : (r.tags || []).join(', ') })),
    ...s.vouchers.filter((v) => v.cid === c.id).map((v) => ({ ts: v.ts, icon: 'gift', text: v.welcome ? `Got ${v.name}` : `Redeemed ${v.name}`, sub: `Voucher ${v.code}` })),
  ].sort((a, b) => b.ts - a.ts);
  const avg = c.orders ? Math.round(c.spend / c.orders) : 0;
  return (
    <>
      <button type="button" className="link" onClick={() => go('customers')}><Icon name="arrow-left" size={15} />Customers</button>
      <div className="card row wrap gap-16">
        <Avatar name={c.name} size="xl" />
        <div className="grow col gap-4">
          <h1 className="h1">{c.name}</h1>
          <div className="row wrap gap-4">
            <ChannelBadge channel={c.channel} />
            {c.member ? <Badge tone="orange" icon="star">Bak Bak Rewards member</Badge> : <Badge>{c.contact ? 'Messenger contact · no account yet' : 'Not a member'}</Badge>}
            {c.account && <Badge tone="green" icon="badge-check">Account made by the customer · {c.account.via} · {fmtMD(c.account.at)}</Badge>}
            <Badge tone={c.consent === 'Yes' ? 'green' : null}>Promos: {c.consent}</Badge>
            {(c.segs || []).map((x) => <Badge key={x}>{x}</Badge>)}
          </div>
        </div>
        <div className="row wrap">
          <Btn icon="message-circle" onClick={() => { const id = openConvoFor(c.id); go('inbox', { id }); }}>Send message</Btn>
          <Btn icon="ticket" onClick={() => open('newTicket', { cid: c.id })}>Create ticket</Btn>
          <Btn icon="pencil" onClick={() => open('editCustomer', { id: c.id })}>Edit</Btn>
          <Btn kind="primary" icon="plus" onClick={() => open('newOrder', { cid: c.id })}>New order</Btn>
        </div>
      </div>
      <div className="grid g-side">
        <div className="col gap-16">
          <div className="grid g4 keep2">
            <Stat label="Orders" value={c.orders} />
            <Stat label="Spent" value={peso(c.spend)} />
            <Stat label="Average order" value={peso(avg)} />
            <Stat label="Points" value={c.member ? c.points : '—'} />
          </div>
          <div className="card" style={{ paddingTop: 6 }}>
            <Tabs tabs={[{ value: 'activity', label: 'Activity' }, { value: 'orders', label: `Orders ${orders.length}` }, { value: 'tickets', label: `Tickets ${tickets.length}` }, { value: 'points', label: 'Points history' }]} value={tab} onChange={setTab} />
            <div className="mt-12">
              {tab === 'activity' && (activity.length ? (
                <div className="timeline">
                  {activity.map((a, i) => (
                    <div key={i} className="tl done" style={a.act ? { cursor: 'pointer' } : undefined} onClick={a.act}>
                      <span className="tl-dot" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name={a.icon} size={13} /></span>
                      <div className="small"><div className="strong">{a.text}</div>{a.sub && <div className="muted">{a.sub}</div>}<div className="tiny faint">{fmtWhen(a.ts, t)}</div></div>
                    </div>
                  ))}
                </div>
              ) : <Empty icon="history" title="No activity yet" />)}
              {tab === 'orders' && (orders.length ? (
                <table className="tbl"><thead><tr><th>Order</th><th>Items</th><th className="r">Total</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>{orders.map((o) => <tr key={o.id} className="click" onClick={() => open('order', { id: o.id })}><td className="strong">#{o.id}</td><td className="muted small">{o.items.map((i) => `${i.qty}× ${i.short}`).join(', ')}</td><td className="r num">{peso(o.total)}</td><td><OrderBadge status={o.status} /></td><td className="small muted">{fmtWhen(o.ts, t)}</td></tr>)}</tbody></table>
              ) : <Empty icon="shopping-bag" title="No orders in this demo yet" text={`${c.orders} orders before Oct 17 are in the totals.`} />)}
              {tab === 'tickets' && (tickets.length ? tickets.map((x) => <button key={x.id} type="button" className="ib-item" onClick={() => open('ticket', { id: x.id })}><Icon name="ticket" size={16} /><span className="grow"><span className="strong small">{x.id} · {x.subject}</span><div className="tiny faint">{x.type} · {fmtWhen(x.created, t)}</div></span><TicketBadge status={x.status} /></button>) : <Empty icon="ticket" title="No tickets" text="Nice. No complaints from this customer." />)}
              {tab === 'points' && (ledger.length ? (
                <table className="tbl"><thead><tr><th>Date</th><th>What</th><th className="r">Points</th></tr></thead>
                  <tbody>{ledger.map((l) => <tr key={l.id}><td className="small muted">{fmtWhen(l.ts, t)}</td><td>{l.label}</td><td className={cx('r num strong', l.pts > 0 ? 'ok' : 'bad')}>{l.pts > 0 ? '+' : ''}{l.pts}</td></tr>)}</tbody></table>
              ) : <Empty icon="star" title="No points yet" />)}
            </div>
          </div>
        </div>
        <div className="col gap-16">
          <div className="card col">
            <div className="card-t">About</div>
            <dl className="kv" style={{ gridTemplateColumns: '92px minmax(0,1fr)' }}>
              <dt>PHONE</dt><dd className="row gap-4"><span className="num">{phoneText(s, c, reveal)}</span>{c.consent === 'Yes' && s.settings.maskPhones && <button type="button" className="link tiny" onClick={() => setReveal((v) => !v)}>{reveal ? 'Hide' : 'Show'}</button>}</dd>
              <dt>AREA</dt><dd>{c.area}</dd>
              <dt>USUAL ORDER</dt><dd>{c.type} · {c.fav}</dd>
              <dt>SINCE</dt><dd>{fmtFull(c.since)}</dd>
              <dt>LAST ORDER</dt><dd>{c.last ? fmtWhen(c.last, t) : '—'}</dd>
              <dt>OWNER</dt><dd>{c.owner}</dd>
            </dl>
          </div>
          <div className="card col">
            <div className="row between"><span className="card-t">Bak Bak Rewards</span>{c.member && <span className="big" style={{ fontSize: 22 }}>{c.points} pts</span>}</div>
            {c.member ? (
              <>
                {next ? <><div className="prog orange"><i style={{ width: `${Math.min(100, ((c.points - (prev ? prev.pts : 0)) / (next.pts - (prev ? prev.pts : 0))) * 100)}%` }} /></div><div className="small muted">{next.pts - c.points} more points to {next.short || next.name}</div></> : <div className="small muted">Every reward is unlocked.</div>}
                <div className="row wrap"><Btn size="sm" icon="gift" onClick={() => open('redeem', { cid: c.id })}>Redeem in store</Btn><Btn size="sm" icon="coins" onClick={() => open('adjustPoints', { cid: c.id })}>Adjust points</Btn></div>
              </>
            ) : <div className="small muted">{isApp(c.channel) ? 'Delivery-app buyers join by claiming the code on the Bak Bak card in their bag.' : 'No Bak Bak account yet. Messenger customers are invited to create one after they pay. Staff can also add them with Edit.'}</div>}
          </div>
          <div className="card col">
            <div className="card-t">Note</div>
            <textarea id="rec-note" className="inp" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Preferences, allergies, anything the team should know" aria-label="Customer note" />
            <Btn size="sm" disabled={note === c.note} onClick={() => { updateCustomer(c.id, { note }); toast('Note saved'); }} style={{ alignSelf: 'flex-start' }}>Save note</Btn>
          </div>
        </div>
      </div>
    </>
  );
}

export function CustomerForm({ id, onClose }) {
  const s = useStore();
  const { go } = useAdmin();
  const c = id ? cust(s, id) : null;
  const [f, setF] = useState(() => (c ? { name: c.name, phone: fmtPhone(c.phone), area: c.area, channel: c.channel, consent: c.consent === 'Yes', member: c.member, note: c.note } : { name: '', phone: '', area: 'Tikay', channel: 'Walk-in', consent: false, member: true, note: '' }));
  const [err, setErr] = useState({});
  const set = (k) => (e) => { const v = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e; setF((x) => ({ ...x, [k]: v })); setErr({}); };
  const save = () => {
    const digits = f.phone.replace(/\D/g, '');
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter the customer’s name.';
    if (!/^09\d{9}$/.test(digits)) e.phone = 'Use an 11-digit mobile number that starts with 09.';
    else if (s.customers.some((x) => x.phone === digits && x.id !== id)) e.phone = 'Another customer already has this number.';
    if (Object.keys(e).length) return setErr(e);
    if (c) {
      updateCustomer(c.id, { name: f.name.trim(), phone: digits, area: f.area, channel: f.channel, consent: f.consent ? 'Yes' : 'No', member: f.member, note: f.note });
      toast('Customer saved');
      onClose();
    } else {
      const nid = addCustomer({ ...f, phone: digits, member: f.member });
      toast(`${f.name.trim()} was added`);
      onClose();
      go('record', { id: nid });
    }
  };
  return (
    <Modal title={c ? 'Edit customer' : 'Add customer'} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>{c ? 'Save' : 'Add customer'}</Btn></>}>
      <Field label="Full name" htmlFor="cf-name" error={err.name}><input id="cf-name" className={cx('inp', err.name && 'err')} value={f.name} onChange={set('name')} placeholder="Juan Dela Cruz" /></Field>
      <div className="grid g2">
        <Field label="Mobile number" htmlFor="cf-phone" error={err.phone}><input id="cf-phone" className={cx('inp', err.phone && 'err')} inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0917 123 4567" /></Field>
        <Field label="Barangay" htmlFor="cf-area"><select id="cf-area" className="inp" value={f.area} onChange={set('area')}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></Field>
      </div>
      <Field label="Usual channel"><Seg options={['Walk-in', 'Messenger', 'Foodpanda', 'Grab']} value={f.channel} onChange={set('channel')} label="Channel" /></Field>
      <label className="check"><input type="checkbox" checked={f.member} onChange={set('member')} /><span><span className="strong">Join Bak Bak Rewards</span><div className="muted small">Bak Bak keeps the number for points and order history. Earns 1 point for every ₱{s.settings.earnPer} of food.</div></span></label>
      <label className="check"><input type="checkbox" checked={f.consent} onChange={set('consent')} /><span><span className="strong">Said yes to promos (optional)</span><div className="muted small">“{s.settings.consentText}” Ask the customer; never tick it for them.</div></span></label>
      <Field label="Note (optional)" htmlFor="cf-note"><input id="cf-note" className="inp" value={f.note} onChange={set('note')} placeholder="Extra crispy, sauce on the side" /></Field>
    </Modal>
  );
}

export function AdjustPointsModal({ cid, onClose }) {
  const s = useStore();
  const c = cust(s, cid);
  const [dir, setDir] = useState('Add');
  const [amt, setAmt] = useState('10');
  const [reason, setReason] = useState('Goodwill for a late order');
  const [other, setOther] = useState('');
  if (!c) return null;
  const n = Math.max(0, Math.round(Number(amt) || 0));
  const delta = dir === 'Add' ? n : -Math.min(n, c.points);
  const why = reason === 'Other' ? other.trim() : reason;
  return (
    <Modal size="sm" title="Adjust points" sub={`${c.name} has ${c.points} points.`} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!n || !why} onClick={() => { adjustPoints(c.id, delta, why); toast(`${delta > 0 ? '+' : ''}${delta} points for ${firstName(c.name)}`); onClose(); }}>Save</Btn></>}>
      <Seg full options={['Add', 'Remove']} value={dir} onChange={setDir} label="Add or remove" />
      <Field label="Points" htmlFor="ap-amt"><input id="ap-amt" className="inp" type="number" min="1" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
      <Field label="Reason" htmlFor="ap-reason"><select id="ap-reason" className="inp" value={reason} onChange={(e) => setReason(e.target.value)}>{['Goodwill for a late order', 'Missing points from an order', 'Correction', 'Other'].map((r) => <option key={r}>{r}</option>)}</select></Field>
      {reason === 'Other' && <input className="inp" placeholder="Write the reason" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Other reason" />}
      <div className="small muted">New balance: <b>{c.points + delta}</b> points. This shows in the points history.</div>
    </Modal>
  );
}

export function RedeemModal({ cid, onClose }) {
  const s = useStore();
  const c = cust(s, cid);
  const [v, setV] = useState(null);
  if (!c) return null;
  return (
    <Modal size="sm" title={v ? 'Reward redeemed' : 'Redeem in store'} sub={v ? 'Give the reward and keep the code on the slip.' : `${c.name} has ${c.points} points.`} onClose={onClose} footer={<Btn kind="primary" onClick={onClose}>{v ? 'Done' : 'Cancel'}</Btn>}>
      {v ? (<><div className="codebox">{v.code}</div><div className="small center">{v.name} · {firstName(c.name)} now has {c.points} points</div></>) : s.rewards.map((r) => (
        <div key={r.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
          <div><div className="strong small">{r.name}</div><div className="tiny faint">{r.pts} points · worth {peso(r.value)}</div></div>
          <Btn size="sm" kind="primary" disabled={c.points < r.pts} onClick={() => { const res = redeemReward(c.id, r.id, 'store'); if (res.ok) { setV(res.voucher); toast(`${r.name} redeemed for ${firstName(c.name)}`); } }}>{c.points < r.pts ? `Needs ${r.pts - c.points} more` : 'Redeem'}</Btn>
        </div>
      ))}
    </Modal>
  );
}

// ---------------- loyalty ----------------
export function Loyalty() {
  const s = useStore();
  const t = useNow(30000);
  const { open, go } = useAdmin();
  const [tab, setTab] = useState('members');
  const members = s.customers.filter((c) => c.member).sort((a, b) => b.points - a.points);
  const given = s.base.pointsOut + sum(s.ledger.filter((l) => l.ts >= BASE && l.pts > 0), (l) => l.pts);
  const claimed = s.codes.filter((c) => c.usedBy).length;
  return (
    <>
      <PageHead title="Loyalty" sub={`Bak Bak Rewards: 1 point for every ₱${s.settings.earnPer} of food. Foodpanda and Grab buyers join by claiming the code on the Bak Bak card in their bag.`}>
        <Btn icon="settings" onClick={() => open('programSettings')}>Program settings</Btn>
      </PageHead>
      <div className="grid g4 keep2">
        <Stat label="Members" value={num(membersCount(s))} icon="users" tone="orange" />
        <Stat label="Points given this month" value={num(given)} icon="star" tone="orange" />
        <Stat label="Rewards redeemed" value={num(sum(s.rewards, (r) => r.redeemed))} icon="gift" tone="green" />
        <Stat label="Bak Bak cards claimed" value={num(wf(s, 'receipt').runs)} sub={`${claimed} of the ${s.codes.length} sample codes`} icon="qr-code" tone="red" />
      </div>
      <div className="grid g4 keep2">
        {s.rewards.map((r) => (
          <div key={r.id} className="card tight row">
            <span className="tile sm"><Icon name={r.icon} size={18} /></span>
            <div className="grow"><div className="strong small">{r.name}</div><div className="tiny faint">{r.pts} points · {r.redeemed} redeemed</div></div>
          </div>
        ))}
      </div>
      <div className="card" style={{ paddingTop: 6 }}>
        <Tabs tabs={[{ value: 'members', label: 'Members' }, { value: 'ledger', label: 'Points history' }, { value: 'codes', label: 'Bak Bak cards' }]} value={tab} onChange={setTab} />
        <div className="tbl-wrap mt-8">
          {tab === 'members' && (
            <table className="tbl">
              <thead><tr><th>Member</th><th className="r">Points</th><th>Next reward</th><th>Last order</th><th /></tr></thead>
              <tbody>{members.map((c) => { const { next } = nextReward(s, c.points); return (
                <tr key={c.id}>
                  <td><CustName s={s} cid={c.id} sub={c.channel} /></td>
                  <td className="r num strong">{c.points}</td>
                  <td style={{ minWidth: 160 }}>{next ? <><div className="prog orange"><i style={{ width: `${Math.min(100, (c.points / next.pts) * 100)}%` }} /></div><div className="tiny faint mt-4">{next.pts - c.points} to {next.short || next.name}</div></> : <span className="small ok">All rewards unlocked</span>}</td>
                  <td className="small muted">{c.last ? fmtWhen(c.last, t) : '—'}</td>
                  <td className="r"><span className="row end"><Btn size="sm" onClick={() => open('redeem', { cid: c.id })}>Redeem</Btn><Btn size="sm" kind="ghost" icon="coins" aria-label={`Adjust points for ${c.name}`} onClick={() => open('adjustPoints', { cid: c.id })} /></span></td>
                </tr>
              ); })}</tbody>
            </table>
          )}
          {tab === 'ledger' && (
            <table className="tbl">
              <thead><tr><th>Date</th><th>Customer</th><th>What</th><th className="r">Points</th></tr></thead>
              <tbody>{s.ledger.slice().sort((a, b) => b.ts - a.ts).map((l) => <tr key={l.id}><td className="small muted">{fmtWhen(l.ts, t)}</td><td><CustName s={s} cid={l.cid} /></td><td>{l.label}</td><td className={cx('r num strong', l.pts > 0 ? 'ok' : 'bad')}>{l.pts > 0 ? '+' : ''}{l.pts}</td></tr>)}</tbody>
            </table>
          )}
          {tab === 'codes' && (
            <table className="tbl">
              <thead><tr><th>Code</th><th>Order</th><th className="r">Food</th><th className="r">Points</th><th>Status</th><th /></tr></thead>
              <tbody>{s.codes.map((c) => {
                const exp = t > c.date + 7 * DAY;
                const who = c.usedBy ? cust(s, c.usedBy) : null;
                return (
                  <tr key={c.code}>
                    <td className="num strong">{c.code}</td>
                    <td><ChannelBadge channel={c.app} /> <span className="small muted">{c.ref} · {fmtMD(c.date)}</span></td>
                    <td className="r num">{peso(c.food)}</td>
                    <td className="r num">{Math.floor(c.food / s.settings.earnPer)}</td>
                    <td>{who ? <Badge tone="green">Claimed by {firstName(who.name)}</Badge> : exp ? <Badge>Expired {fmtMD(c.date + 7 * DAY)}</Badge> : <Badge tone="orange">Not claimed · until {fmtMD(c.date + 7 * DAY)}</Badge>}</td>
                    <td className="r"><Btn size="sm" icon="receipt-text" onClick={() => bus.emit('receipt:open', { code: c.code })}>Receipt</Btn></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

export function ProgramSettingsModal({ onClose }) {
  const s = useStore();
  const [earn, setEarn] = useState(String(s.settings.earnPer));
  const [pts, setPts] = useState(() => Object.fromEntries(s.rewards.map((r) => [r.id, String(r.pts)])));
  return (
    <Modal title="Program settings" sub="Changes apply right away: the order page, the bot and new orders use them." onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { saveRewards(earn, s.rewards.map((r) => ({ id: r.id, pts: pts[r.id] }))); toast('Program settings saved'); onClose(); }}>Save</Btn></>}>
      <Field label="Earn 1 point for every" htmlFor="ps-earn" hint="Of food, for Messenger, walk-in and claimed Bak Bak card codes."><div className="row"><span className="strong">₱</span><input id="ps-earn" className="inp" type="number" min="1" style={{ width: 100 }} value={earn} onChange={(e) => setEarn(e.target.value)} /></div></Field>
      <div className="fld-l">Rewards</div>
      {s.rewards.map((r) => (
        <div key={r.id} className="row between" style={{ padding: '4px 0' }}>
          <span className="small grow">{r.name} <span className="faint">· worth {peso(r.value)}</span></span>
          <input className="inp inp-sm" type="number" min="1" style={{ width: 90 }} value={pts[r.id]} onChange={(e) => setPts((p) => ({ ...p, [r.id]: e.target.value }))} aria-label={`${r.name} points`} />
          <span className="small muted">points</span>
        </div>
      ))}
      <div className="small faint">Codes stay one use and valid for 7 days. Customers must say yes to keeping their number to earn points.</div>
    </Modal>
  );
}

// ---------------- segments ----------------
export function Segments() {
  const s = useStore();
  const { open } = useAdmin();
  return (
    <>
      <PageHead title="Segments" sub="Groups of customers for campaigns and the decision support rules. Counts update as customers order.">
        <Btn kind="primary" icon="plus" onClick={() => open('newSegment')}>New segment</Btn>
      </PageHead>
      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Segment</th><th>Rule</th><th className="r">Customers</th><th>Used by</th><th /></tr></thead>
            <tbody>
              {s.segments.map((g) => (
                <tr key={g.id}>
                  <td className="strong">{g.name}{g.created && <> <Badge tone="green">New</Badge></>}</td>
                  <td className="muted small">{g.rule}</td>
                  <td className="r num strong">{segmentCount(s, g)}</td>
                  <td className="small">{g.usedBy || <span className="faint">Not used yet</span>}</td>
                  <td className="r"><span className="row end"><Btn size="sm" onClick={() => open('segList', { name: g.name })}>View</Btn><Btn size="sm" kind="soft" icon="megaphone" onClick={() => open('newCampaign', { audience: g.name })}>Campaign</Btn></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="small faint">Only customers who said yes to promos get campaigns: by Messenger if they opted in there, otherwise by SMS.</div>
    </>
  );
}

export function SegmentMembersModal({ name, onClose }) {
  const s = useStore();
  const { go, open } = useAdmin();
  const g = s.segments.find((x) => x.name === name);
  const list = segmentMembers(s, name);
  const total = g ? segmentCount(s, g) : list.length;
  return (
    <Modal title={name} sub={g ? g.rule : ''} onClose={onClose} footer={<><Btn onClick={onClose}>Close</Btn><Btn kind="primary" icon="megaphone" onClick={() => { onClose(); open('newCampaign', { audience: name }); }}>Send a campaign</Btn></>}>
      <div className="small muted">{total} customers. {list.length < total ? `Showing the ${list.length} sample customers in this demo.` : ''}</div>
      {list.length ? list.map((c) => (
        <button key={c.id} type="button" className="ib-item" onClick={() => { onClose(); go('record', { id: c.id }); }}>
          <Avatar name={c.name} size="sm" />
          <span className="grow"><span className="strong small">{c.name}</span><div className="tiny faint">{c.channel} · {c.orders} orders · {c.member ? c.points + ' pts' : 'not a member'}</div></span>
          <Badge tone={c.consent === 'Yes' ? 'green' : null}>Promos {c.consent}</Badge>
        </button>
      )) : <Empty icon="users" title="No sample customers match" text="The full count comes from all customers." />}
    </Modal>
  );
}

export function NewSegmentModal({ onClose }) {
  const s = useStore();
  const { open } = useAdmin();
  const [name, setName] = useState('');
  const [def, setDef] = useState({ type: 'flavor', flavor: s.flavors[0], channel: 'Messenger', min: 3, days: 14, pts: 30, area: 'Tikay', spend: 1000 });
  const [err, setErr] = useState('');
  const T = SEG_TYPES.find((x) => x.id === def.type);
  const d = def.type === 'spend' ? { ...def, min: def.spend } : def;
  const matches = s.customers.filter((c) => matchRule(s, d, c));
  const set = (k) => (e) => setDef((x) => ({ ...x, [k]: e.target.value }));
  const create = () => {
    if (name.trim().length < 3) return setErr('Give the segment a name.');
    if (s.segments.some((g) => g.name.toLowerCase() === name.trim().toLowerCase())) return setErr('A segment with this name already exists.');
    const clean = { type: def.type };
    if (def.type === 'channel') Object.assign(clean, { channel: def.channel, min: Number(def.min) || 1 });
    if (def.type === 'flavor') clean.flavor = def.flavor;
    if (def.type === 'inactive') clean.days = Number(def.days) || 30;
    if (def.type === 'near') clean.pts = Number(def.pts) || 50;
    if (def.type === 'area') clean.area = def.area;
    if (def.type === 'spend') clean.min = Number(def.spend) || 0;
    createSegment({ name, def: clean });
    toast(`Segment “${name.trim()}” created · ${matches.length} customers`);
    onClose();
  };
  return (
    <Modal title="New segment" sub="Pick a rule. The count updates as you change it." onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={create}>Create segment</Btn></>}>
      <Field label="Name" htmlFor="sg-name" error={err}><input id="sg-name" className={cx('inp', err && 'err')} value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Garlic Parmesan fans" /></Field>
      <Field label="Customers who…" htmlFor="sg-type"><select id="sg-type" className="inp" value={def.type} onChange={set('type')}>{SEG_TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
      {def.type === 'channel' && <div className="grid g2"><Field label="Channel"><select className="inp" value={def.channel} onChange={set('channel')} aria-label="Channel">{['Messenger', 'Walk-in', 'Foodpanda', 'Grab'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="At least this many orders"><input className="inp" type="number" min="1" value={def.min} onChange={set('min')} aria-label="Minimum orders" /></Field></div>}
      {def.type === 'flavor' && <Field label="Flavor"><select className="inp" value={def.flavor} onChange={set('flavor')} aria-label="Flavor">{s.flavors.map((x) => <option key={x}>{x}</option>)}</select></Field>}
      {def.type === 'inactive' && <Field label="Days without an order"><input className="inp" type="number" min="1" value={def.days} onChange={set('days')} aria-label="Days" /></Field>}
      {def.type === 'near' && <Field label="Within this many points of a reward"><input className="inp" type="number" min="1" value={def.pts} onChange={set('pts')} aria-label="Points" /></Field>}
      {def.type === 'area' && <Field label="Barangay"><select className="inp" value={def.area} onChange={set('area')} aria-label="Barangay">{AREAS.slice(0, -1).map((x) => <option key={x}>{x}</option>)}</select></Field>}
      {def.type === 'spend' && <Field label="Spent at least (₱)"><input className="inp" type="number" min="0" value={def.spend} onChange={set('spend')} aria-label="Minimum spend" /></Field>}
      <div className="card flat tight col">
        <div className="row between"><span className="small">{T ? T.make(d) : ''}</span><span className="strong">{matches.length} customers</span></div>
        <div className="tiny faint">{matches.slice(0, 6).map((c) => c.name).join(', ') || 'No sample customers match yet'}</div>
      </div>
    </Modal>
  );
}
