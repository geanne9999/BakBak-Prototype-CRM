// Orders board and list, the order drawer, New order, the order slip, and the kitchen display.
import {
  useStore, useNow, bus, toast, cust, orderById, convoFor, setOrderStatus, delayNotice, createOrder, isApp, itemsLabel,
  waitMinutes, toggleBatchDone, STATUS_LABEL, openConvoFor, bagTotals, linkCard,
} from './store.js';
import { Icon, Btn, Badge, ChannelBadge, Modal, Seg, Tabs, Stepper, Field, Empty, FakeQR } from './ui.jsx';
import { useAdmin, PageHead, OrderBadge, ORDER_LABEL, CustName, phoneText, todayOrders, paidSales, nextStep, lateBy, isLive } from './admin-common.jsx';
import { peso, fmtTime, fmtWhen, fmtMD, fmtLongDate, cx, sum, MIN, DAY } from './util.js';

const { useState, useMemo } = React;
const LANES = [['new', 'New in chat', 'message-circle'], ['awaiting', 'Awaiting payment', 'wallet'], ['paid', 'Paid', 'circle-check'], ['preparing', 'Preparing', 'flame'], ['ready', 'Ready', 'bell'], ['rider', 'Handed to rider', 'bike']];

export function moveOrder(o, status) {
  setOrderStatus(o.id, status);
  toast(`#${o.id} moved to ${ORDER_LABEL[status]}`);
}

export function Orders() {
  const s = useStore();
  const t = useNow(15000);
  const { open } = useAdmin();
  const [view, setView] = useState('Board');
  const [tab, setTab] = useState('today');
  const [q, setQ] = useState('');
  const today = todayOrders(s, t);
  const count = (st) => s.orders.filter((o) => o.status === st).length;
  const match = (o) => !q.trim() || (o.id + ' ' + o.name + ' ' + o.channel + ' ' + itemsLabel(o.items)).toLowerCase().includes(q.trim().toLowerCase());
  const listed = s.orders
    .filter((o) => (tab === 'today' ? new Date(o.ts).toDateString() === new Date(t).toDateString() : tab === 'active' ? o.status === 'new' || ['awaiting', 'paid', 'preparing', 'ready', 'rider'].includes(o.status) : tab === 'completed' ? o.status === 'completed' : tab === 'cancelled' ? o.status === 'cancelled' : true))
    .filter(match)
    .sort((a, b) => b.ts - a.ts);
  return (
    <>
      <PageHead title="Orders" sub="Messenger pick-up and dine-in, walk-in, and Foodpanda or Grab orders. Messenger orders are paid first, with no COD.">
        <Seg options={['Board', 'List']} value={view} onChange={setView} label="View" />
        <Btn kind="primary" icon="plus" onClick={() => open('newOrder')}>New order</Btn>
      </PageHead>
      <div className="strip">
        <div><div className="lbl">Awaiting payment</div><div className="val">{count('awaiting')}</div></div>
        <div><div className="lbl">To cook</div><div className="val">{count('paid')}</div></div>
        <div><div className="lbl">Preparing</div><div className="val">{count('preparing')}</div></div>
        <div><div className="lbl">Ready</div><div className="val">{count('ready')}</div></div>
        <div><div className="lbl">Sales today</div><div className="val">{peso(paidSales(today))}</div></div>
      </div>
      {view === 'Board' ? (
        <>
          <div className="board" aria-label="Orders board">
            {LANES.map(([st, label, ic]) => {
              const list = s.orders.filter((o) => o.status === st).sort((a, b) => a.ts - b.ts);
              return (
                <section className="lane" key={st} aria-label={label}>
                  <div className="lane-h"><Icon name={ic} size={14} />{label}<span className="n">{list.length}</span></div>
                  {list.map((o) => <OrderCard key={o.id} o={o} t={t} onOpen={() => open('order', { id: o.id })} />)}
                  {!list.length && <div className="tiny faint center" style={{ padding: '18px 4px' }}>No orders</div>}
                </section>
              );
            })}
          </div>
          <div className="small faint">Completed and cancelled orders are in the List view. Delivery happens only through Foodpanda and Grab riders.</div>
        </>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="row between wrap" style={{ padding: '10px 14px 0' }}>
            <Tabs tabs={[{ value: 'today', label: 'Today' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'all', label: 'All' }]} value={tab} onChange={setTab} />
            <div className="search" style={{ width: 240 }}><Icon name="search" size={15} /><input className="inp inp-sm" placeholder="Search orders" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Order</th><th>Customer</th><th>Channel</th><th>Items</th><th className="r">Total</th><th>Status</th><th>Placed</th></tr></thead>
              <tbody>
                {listed.map((o) => (
                  <tr key={o.id} className="click" onClick={() => open('order', { id: o.id })}>
                    <td className="strong">#{o.id}</td>
                    <td><CustName s={s} cid={o.cid} name={o.name} /></td>
                    <td><ChannelBadge channel={o.channel} /> <span className="tiny faint">{o.type}</span></td>
                    <td className="muted" style={{ maxWidth: 260 }}><div className="ellipsis">{itemsLabel(o.items)}</div></td>
                    <td className="r num strong">{peso(o.total)}</td>
                    <td><OrderBadge status={o.status} /></td>
                    <td className="muted small">{fmtWhen(o.ts, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listed.length && <Empty icon="shopping-bag" title="No orders here" text={q ? 'Try another search.' : 'Orders show up here as they come in.'} />}
          </div>
        </div>
      )}
    </>
  );
}

function OrderCard({ o, t, onOpen }) {
  const late = lateBy(o, t);
  const step = nextStep(o);
  const fresh = t - o.ts < 40000;
  return (
    <div className={cx('kcard', late && 'late', fresh && 'fresh')} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }} aria-label={`Order ${o.id}, ${o.name}`}>
      <div className="t">#{o.id}<span>{fmtTime(o.ts)}</span></div>
      <div className="row between"><span className="ellipsis strong">{o.name}</span><ChannelBadge channel={o.channel} /></div>
      <div className="muted">{itemsLabel(o.items)}</div>
      <div className="row between">
        <span className="strong num">{peso(o.total)}</span>
        {late ? <Badge tone="red">Late {late} min</Badge> : o.readyBy && ['paid', 'preparing'].includes(o.status) ? <span className="tiny faint">Ready by {fmtTime(o.readyBy)}</span> : <span className="tiny faint">{o.type}</span>}
      </div>
      {step && <Btn size="sm" kind={step[0] === 'ready' || step[0] === 'completed' ? 'good' : 'soft'} onClick={(e) => { e.stopPropagation(); moveOrder(o, step[0]); }}>{step[1]}</Btn>}
    </div>
  );
}

export function OrderDrawer({ id, onClose }) {
  const s = useStore();
  const t = useNow(15000);
  const { open, go } = useAdmin();
  const [confirm, setConfirm] = useState(false);
  const o = orderById(s, id);
  if (!o) return <Modal side title="Order not found" onClose={onClose}><Empty icon="shopping-bag" title="This order doesn’t exist anymore" /></Modal>;
  const c = o.cid ? cust(s, o.cid) : null;
  const step = nextStep(o);
  const late = lateBy(o, t);
  const app = isApp(o.channel);
  const code = o.code ? s.codes.find((x) => x.code === o.code) : null;
  const convo = c ? s.convos.find((x) => x.cid === c.id) : null;
  const done = o.status === 'completed' || o.status === 'cancelled';
  const steps = [
    ['Placed', o.ts, o.src || (o.channel === 'Messenger' ? 'Order form in Messenger' : o.channel)],
    ['Paid', o.paidAt, o.pay ? `${o.pay}${o.payRef ? ' · Ref ' + o.payRef : ''}` : ''],
    ['Cooking started', o.prepAt, ''],
    ['Ready', o.readyAt, ''],
    ...(app ? [['Handed to rider', o.riderAt, `${o.channel} rider`]] : []),
    ['Completed', o.doneAt, o.ptsAdded ? `+${o.pts} points added` : ''],
  ];
  const footer = confirm ? (
    <>
      <span className="grow small">Cancel #{o.id}?{o.channel === 'Messenger' && c ? ' The customer gets a message in Messenger.' : ''}</span>
      <Btn onClick={() => setConfirm(false)}>Keep order</Btn>
      <Btn kind="danger" onClick={() => { setOrderStatus(o.id, 'cancelled'); toast(`#${o.id} was cancelled`); setConfirm(false); }}>Cancel order</Btn>
    </>
  ) : (
    <>
      {!done && <Btn kind="danger" onClick={() => setConfirm(true)}>Cancel</Btn>}
      <span className="grow" />
      {['paid', 'preparing'].includes(o.status) && <Btn icon="timer" onClick={() => { const sent = delayNotice(o.id, 10); toast(sent ? `New ready time sent to ${o.name.split(' ')[0]} in Messenger` : `Ready time moved by 10 min`); }}>Running late</Btn>}
      <Btn icon="printer" onClick={() => open('slip', { id: o.id })}>Order slip</Btn>
      {step && <Btn kind="primary" onClick={() => moveOrder(o, step[0])}>{step[1]}</Btn>}
    </>
  );
  return (
    <Modal side title={`Order #${o.id}`} sub={`${o.channel} · ${o.type} · ${fmtWhen(o.ts, t)}`} onClose={onClose} footer={footer}>
      <div className="row wrap">
        <OrderBadge status={o.status} lg />
        {late > 0 && <Badge tone="red" lg>Late {late} min</Badge>}
        {o.readyBy && ['paid', 'preparing'].includes(o.status) && <span className="small muted">Ready by {fmtTime(o.readyBy)}</span>}
        {o.delayed > 0 && <Badge tone="orange">Delay notice sent</Badge>}
      </div>
      <div className="card tight col">
        <div className="row between">
          <CustName s={s} cid={o.cid} name={o.name} sub={c ? phoneText(s, c) : isApp(o.channel) ? `${o.channel} buyer · the app doesn’t share contact details` : 'Walk-in guest'} />
          {convo && <Btn size="sm" icon="message-circle" onClick={() => { onClose(); go('inbox', { id: convo.id }); }}>Open chat</Btn>}
        </div>
        {o.ext && <div className="small muted">{o.channel} order {o.ext}</div>}
      </div>
      <div className="col gap-4">
        <div className="eyebrow">Items</div>
        {o.items.map((i, k) => (
          <div key={k} className="row between small"><span>{i.qty}× {i.name}{i.flavors && i.flavors.length ? <span className="muted"> · {i.flavors.join(' + ')}</span> : null}</span><span className="num">{peso(i.price * i.qty)}</span></div>
        ))}
        <hr className="divider" />
        {o.discount > 0 && <div className="row between small ok"><span>Reward used</span><span className="num">−{peso(o.discount)}</span></div>}
        <div className="row between strong"><span>Total</span><span className="num">{peso(o.total)}</span></div>
        <div className="small muted">{o.paidAt ? `Paid · ${o.pay || 'Cash'}${o.payRef ? ' · Ref ' + o.payRef : ''}` : o.status === 'cancelled' ? 'Not paid' : o.channel === 'Messenger' ? 'Waiting for payment. Messenger orders are paid first through the GCash or QR Ph pay link, no COD.' : 'Not paid yet'}</div>
        {o.pts > 0 && !app && <div className="small"><Badge tone="orange" icon="star">+{o.pts} points</Badge> <span className="muted">{o.ptsAdded ? 'added' : 'added when picked up'}</span></div>}
      </div>
      {o.note && <div className="mini note"><span className="strong">Note</span>{o.note}</div>}
      {app && !code && o.status !== 'cancelled' && (
        <div className="card tight col">
          <div className="row between"><span className="strong">Bak Bak Rewards card</span><Badge tone="orange">Not linked yet</Badge></div>
          <div className="tiny faint">While packing, take a card from the stack, scan its QR with the tablet camera and put it in the bag. Foodpanda and Grab don’t share the buyer’s details, so this card is how the buyer can join.</div>
          <div className="row wrap"><Btn size="sm" kind="primary" icon="scan-line" onClick={() => { const c = linkCard(o.id); if (c) toast(`Card ${c} linked to #${o.id}. Put it in the bag.`); }}>Scan a card (demo)</Btn></div>
        </div>
      )}
      {app && code && (
        <div className="card tight col">
          <div className="row between"><span className="strong">Bak Bak Rewards card</span>{code.usedBy ? <Badge tone="green">Claimed by {(cust(s, code.usedBy) || { name: 'a customer' }).name.split(' ')[0]}</Badge> : t > code.date + 7 * DAY ? <Badge>Expired</Badge> : <Badge tone="orange">Not claimed yet</Badge>}</div>
          <div className="row gap-12">
            <FakeQR text={code.code} size={74} />
            <div className="col gap-4 grow">
              <div className="codebox" style={{ fontSize: 16, padding: 8 }}>{code.code}</div>
              <div className="tiny faint">Pre-printed card, scanned to this order at packing. One use, valid 7 days, 1 point per ₱{s.settings.earnPer} of food ({Math.floor(code.food / s.settings.earnPer)} points).</div>
            </div>
          </div>
          <div className="row wrap">
            <Btn size="sm" icon="qr-code" onClick={() => bus.emit('receipt:open', { code: code.code })}>Show the card</Btn>
            {!code.usedBy && <Btn size="sm" icon="smartphone" onClick={() => { bus.emit('phone:open', { page: 'claim', ctx: 'qr', params: { code: code.code } }); toast('Opened the claim page on the phone'); }}>Open claim page on the phone</Btn>}
          </div>
        </div>
      )}
      <div className="col gap-4">
        <div className="eyebrow">Timeline</div>
        <div className="timeline">
          {steps.map(([label, ts, note]) => (
            <div key={label} className={cx('tl', ts && 'done')}>
              <span className="tl-dot"><Icon name={ts ? 'check' : 'clock'} size={13} stroke={2.6} /></span>
              <div className="small"><div className={ts ? 'strong' : 'muted'}>{label}</div><div className="tiny faint">{ts ? fmtWhen(ts, t) : '—'}{note && ts ? ' · ' + note : ''}</div></div>
            </div>
          ))}
          {o.status === 'cancelled' && <div className="tl done"><span className="tl-dot" style={{ background: 'var(--bad)', color: 'var(--on-accent)' }}><Icon name="x" size={13} /></span><div className="small"><div className="strong">Cancelled</div><div className="tiny faint">{o.cancelReason}</div></div></div>}
        </div>
      </div>
    </Modal>
  );
}

export function SlipModal({ id, onClose }) {
  const s = useStore();
  const [checked, setChecked] = useState([]);
  const o = orderById(s, id);
  if (!o) return null;
  const all = o.items.length > 0 && checked.length === o.items.length;
  const step = nextStep(o);
  const handOver = step && (step[0] === 'completed' || step[0] === 'rider');
  return (
    <Modal size="sm" title="Order slip" sub="Check each item against the slip before handing it over." onClose={onClose} footer={<>
      <Btn icon="printer" onClick={() => toast('Sent to the counter printer (simulated)')}>Print</Btn>
      {handOver ? <Btn kind="primary" disabled={!all} onClick={() => { moveOrder(o, step[0]); onClose(); }}>{all ? step[1] : 'Check all items first'}</Btn> : <Btn kind="primary" onClick={onClose}>Done</Btn>}
    </>}>
      <div className="receipt" style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <div className="center"><div className="strong">{s.settings.business.name}</div><div className="tiny faint">{s.settings.business.address}</div></div>
        <div className="row between"><span className="h2">#{o.id}</span><span className="small muted">{fmtTime(o.ts)}</span></div>
        <div className="row between small"><span>{o.name}</span><span>{o.channel} · {o.type}</span></div>
        <hr className="divider" />
        {o.items.map((i, k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={checked.includes(k)} onChange={() => setChecked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))} />
            <span className="grow">{i.qty}× {i.name}{i.flavors && i.flavors.length ? ` · ${i.flavors.join(' + ')}` : ''}</span>
          </label>
        ))}
        {o.note && <div className="mini note small">{o.note}</div>}
        <hr className="divider" />
        <div className="row between strong"><span>Total</span><span>{peso(o.total)}</span></div>
        <div className="tiny faint">{o.paidAt ? `Paid · ${o.pay || 'Cash'}` : 'Not paid yet'}</div>
      </div>
      {all && <div className="small ok strong row"><Icon name="circle-check" size={16} />All {o.items.length} items checked</div>}
    </Modal>
  );
}

const CHANNELS = ['Walk-in', 'Messenger', 'Foodpanda', 'Grab'];
const TYPES = { 'Walk-in': ['Takeout', 'Dine-in'], Messenger: ['Pick-up', 'Dine-in'], Foodpanda: ['Delivery'], Grab: ['Delivery'] };
export function NewOrderModal({ cid: cid0, channel: ch0, onClose }) {
  const s = useStore();
  const { open } = useAdmin();
  const c0 = cid0 ? cust(s, cid0) : null;
  const [cid, setCid] = useState(cid0 || '');
  const [guest, setGuest] = useState('');
  const [channel, setChannel] = useState(ch0 || (c0 && CHANNELS.includes(c0.channel) ? c0.channel : 'Walk-in'));
  const [type, setType] = useState(TYPES[channel][0]);
  const [qty, setQty] = useState({});
  const [fl, setFl] = useState({});
  const [pay, setPay] = useState('Cash');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const c = cid ? cust(s, cid) : null;
  const lines = s.menu.filter((m) => qty[m.id] > 0).map((m) => ({ mid: m.id, qty: qty[m.id], flavors: m.flavors ? (fl[m.id] || [s.flavors[0]]).slice(0, m.flavors).filter(Boolean) : [], dips: [] }));
  const tot = bagTotals(s, lines);
  const app = isApp(channel);
  const pts = c && c.member && !app ? Math.floor(tot.total / s.settings.earnPer) : 0;
  const setChan = (v) => { setChannel(v); setType(TYPES[v][0]); };
  const create = () => {
    if (!lines.length) return setErr('Add at least one item.');
    if (channel === 'Messenger' && !c) return setErr('Messenger orders need a customer so the summary can be sent to their chat.');
    const id = createOrder({ cid: c ? c.id : null, guestName: guest.trim() || 'Guest', channel, type, lines, paid: channel === 'Walk-in' && pay !== 'Not yet', pay: pay === 'Not yet' ? null : pay, note: note.trim() });
    toast(`Order #${id} created`);
    onClose();
    open('order', { id });
  };
  return (
    <Modal size="lg" title="New order" sub="For walk-in customers, orders typed in chat, or Foodpanda and Grab orders." onClose={onClose} footer={<>
      <span className="grow small muted">{tot.items.length ? `${sum(lines, (l) => l.qty)} item${sum(lines, (l) => l.qty) > 1 ? 's' : ''} · ` : ''}<b className="num" style={{ color: 'var(--text)' }}>{peso(tot.total)}</b>{pts ? ` · +${pts} points` : ''}</span>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" onClick={create}>Create order</Btn>
    </>}>
      <div className="grid g2">
        <Field label="Customer" htmlFor="no-cust">
          <select id="no-cust" className="inp" value={cid} onChange={(e) => { setCid(e.target.value); setErr(''); }}>
            <option value="">Guest (no record)</option>
            {s.customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        {!c ? <Field label="Guest name (optional)" htmlFor="no-guest"><input id="no-guest" className="inp" value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Guest" /></Field> : <Field label="Points">{c.member ? <div className="small">{c.points} points{c.consent === 'Yes' ? '' : ' · no consent, earns nothing'}</div> : <div className="small muted">Not a loyalty member</div>}</Field>}
      </div>
      <div className="grid g2">
        <Field label="Channel"><Seg options={CHANNELS} value={channel} onChange={setChan} label="Channel" /></Field>
        <Field label="Type"><Seg options={TYPES[channel]} value={type} onChange={setType} label="Order type" /></Field>
      </div>
      <div className="col gap-4">
        <div className="fld-l">Items</div>
        {s.menu.filter((m) => m.available !== false).map((m) => (
          <div key={m.id} className="row wrap" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="grow"><div className="strong small">{m.name}</div><div className="tiny faint">{m.details} · {peso(m.price)}</div></div>
            {m.flavors && qty[m.id] > 0 && Array.from({ length: m.flavors }).map((_, k) => (
              <select key={k} className="inp inp-sm" style={{ width: 150 }} aria-label={`${m.name} flavor ${k + 1}`} value={(fl[m.id] || [s.flavors[0]])[k] || ''} onChange={(e) => setFl((f) => { const a = (f[m.id] || [s.flavors[0]]).slice(); a[k] = e.target.value; return { ...f, [m.id]: a }; })}>
                {k > 0 && <option value="">No 2nd flavor</option>}
                {s.flavors.map((x) => <option key={x}>{x}</option>)}
              </select>
            ))}
            <Stepper value={qty[m.id] || 0} onChange={(v) => { setQty((q) => ({ ...q, [m.id]: v })); setErr(''); }} label={`${m.name} quantity`} />
          </div>
        ))}
      </div>
      {channel === 'Walk-in' && <Field label="Payment"><Seg options={['Cash', 'GCash', 'Not yet']} value={pay} onChange={setPay} label="Payment" /></Field>}
      {channel === 'Messenger' && <div className="info-line"><Icon name="info" size={15} />The order summary goes to the customer’s Messenger chat to check and pay first. No COD.</div>}
      {app && <div className="info-line"><Icon name="info" size={15} />Paid in the {channel} app. While packing, scan a Bak Bak Rewards card to this order and put it in the bag, so the buyer can claim points.</div>}
      <Field label="Note for the kitchen (optional)" htmlFor="no-note"><input id="no-note" className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Extra crispy, sauce on the side" /></Field>
      {err && <div className="fld-e" role="alert">{err}</div>}
    </Modal>
  );
}

// ---------------- kitchen display ----------------
export function Kitchen() {
  const s = useStore();
  const t = useNow(10000);
  const { go } = useAdmin();
  const cols = [['paid', 'To cook'], ['preparing', 'Cooking'], ['ready', 'Ready']];
  const prep = s.prep;
  const times = ['4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM'];
  return (
    <div className="kds">
      <div className="row between wrap">
        <div><div className="h2">Kitchen display</div><div className="kds-muted">{fmtLongDate(t)} · {fmtTime(t)} · Orders show here once they’re paid</div></div>
        <div className="row wrap"><span className="kds-chip">Estimated wait {waitMinutes(s)} min</span><Btn size="sm" icon="shopping-bag" onClick={() => go('orders')}>Orders board</Btn></div>
      </div>
      <div className="kds-plan">
        <Icon name="sparkles" size={20} />
        {prep && (prep.batches || prep.boxes || prep.cashiers > 1) ? (
          <div className="col grow gap-4">
            <b>Today’s prep plan (approved)</b>
            <div className="row wrap gap-12">
              {Array.from({ length: prep.batches || 0 }).map((_, i) => (
                <label key={i} className="check" style={{ alignItems: 'center' }}>
                  <input type="checkbox" checked={!!(prep.done && prep.done[i])} onChange={() => toggleBatchDone(i)} />
                  <span style={{ textDecoration: prep.done && prep.done[i] ? 'line-through' : 'none' }}>Batch {i + 1} · 24 pcs by {times[i]}</span>
                </label>
              ))}
              {prep.boxes > 0 && <span className="kds-chip">{prep.boxes} boxes and sauce by 4:00 PM</span>}
              {prep.cashiers > 1 && <span className="kds-chip">+1 at the cashier from 4:30 PM</span>}
            </div>
          </div>
        ) : <div className="grow"><b>No prep plan yet.</b> <span className="kds-muted">The owner approves it on Today’s plan. Batches show up here.</span></div>}
      </div>
      <div className="kds-cols">
        {cols.map(([st, label]) => {
          const list = s.orders.filter((o) => o.status === st).sort((a, b) => (a.paidAt || a.ts) - (b.paidAt || b.ts));
          return (
            <section className="kds-col" key={st} aria-label={label}>
              <div className="row between"><b>{label}</b><span className="kds-chip">{list.length}</span></div>
              {list.map((o) => <KdsCard key={o.id} o={o} t={t} />)}
              {!list.length && <div className="kds-muted center" style={{ padding: 24 }}>Nothing here</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KdsCard({ o, t }) {
  const late = lateBy(o, t);
  const step = nextStep(o);
  const since = Math.max(0, Math.round((t - (o.paidAt || o.ts)) / MIN));
  return (
    <div className={cx('kds-card', o.status === 'paid' && 'new', late && 'late', o.status === 'ready' && 'ready')}>
      <div className="row between"><span className="id">#{o.id}</span><span className={cx('kds-chip', late ? 'red' : o.status === 'ready' ? 'green' : 'blue')}>{late ? `Late ${late} min` : o.status === 'ready' ? 'Ready' : `${since} min`}</span></div>
      <div className="row wrap gap-4"><span className="kds-chip">{o.type}</span><span className="kds-chip">{o.channel}</span><span className="kds-muted">{o.name.split(' ')[0]}</span></div>
      <ul>{o.items.map((i, k) => <li key={k}>{i.qty}× {i.short}{i.flavors && i.flavors.length ? ` · ${i.flavors.join(' + ')}` : ''}</li>)}</ul>
      {o.note && <div className="kds-muted">Note: {o.note}</div>}
      {step && <Btn kind={o.status === 'paid' ? 'primary' : 'good'} block onClick={() => moveOrder(o, step[0])}>{o.status === 'paid' ? 'Start' : step[1]}</Btn>}
    </div>
  );
}
