// Inbox (Messenger, Facebook and delivery-app reviews in one place) and Tickets.
import {
  useStore, useNow, toast, cust, orderById, currentUser, staffReply, returnToBot, closeConvo, assignConvo, markRead,
  createTicket, updateTicket, addTicketNote, itemsLabel, ACTIVE,
} from './store.js';
import { Icon, Btn, Badge, ChannelBadge, Avatar, Modal, Seg, Tabs, Field, Empty, Popover } from './ui.jsx';
import { useAdmin, PageHead, OrderBadge, TicketBadge, TICKET_STATUS, TICKET_TYPES, CustName, phoneText, dueText, openTickets } from './admin-common.jsx';
import { peso, fmtTime, fmtWhen, fmtAgo, firstName, cx, sum, MIN, BASE } from './util.js';

const { useState, useEffect, useRef, useLayoutEffect } = React;

export const staffList = (s) => s.team.filter((u) => ['Owner', 'Order-taking', 'Ticket and inquiry'].includes(u.role) && u.status === 'Active');
const lastTs = (c) => c.updated || (c.messages.length ? c.messages[c.messages.length - 1].ts : 0);
const TEMPLATES = [
  ['Sorry for the wait', 'Sorry po for the wait, {first name}! Your order is next. We’ll update you in 5 minutes.'],
  ['Order is ready', 'Hi {first name}! Your order is ready at the counter. 🍗 Just show this chat when you pick it up.'],
  ['Pick-up and delivery apps', 'We’re pick-up and dine-in. For delivery, order Bak Bak on Foodpanda or Grab, then scan the QR on the Bak Bak card in your bag to claim points. 🎁'],
  ['Paid first, no COD', 'Messenger orders are paid first through our secure pay link (GCash or QR Ph). No COD po, so we can start cooking right away.'],
  ['Payment received', 'Payment received, thank you! We’re cooking your order now.'],
  ['Free dip next time', 'So sorry about that, {first name}! We’ll add a free dip to your next order.'],
];

export function Inbox() {
  const s = useStore();
  const t = useNow(15000);
  const { params } = useAdmin();
  const me = currentUser(s);
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(params.id || null);
  const boxRef = useRef(null);
  useEffect(() => { if (params.id) setSel(params.id); }, [params.id]);
  const filtered = s.convos
    .filter((c) => (tab === 'open' ? c.status !== 'closed' : tab === 'mine' ? c.assignee === me && c.status !== 'closed' : tab === 'unassigned' ? !c.assignee && c.status === 'open' : tab === 'closed' ? c.status === 'closed' : true))
    .filter((c) => !q.trim() || (c.name + ' ' + c.messages.map((m) => m.text).join(' ')).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => lastTs(b) - lastTs(a));
  useLayoutEffect(() => { if (!sel && boxRef.current && boxRef.current.offsetWidth > 700 && filtered[0]) setSel(filtered[0].id); }, []);
  const c = sel ? s.convos.find((x) => x.id === sel) : null;
  const n = (f) => s.convos.filter(f).length;
  return (
    <>
      <PageHead title="Inbox" sub="Messenger chats, Facebook comments and delivery-app reviews in one place. The bot answers first and hands off to staff." />
      <div ref={boxRef} className={cx('inbox', c && 'has-thread')}>
        <div className="ib-list">
          <div style={{ padding: '10px 10px 0' }}>
            <div className="search"><Icon name="search" size={15} /><input className="inp inp-sm" placeholder="Search conversations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search conversations" /></div>
          </div>
          <Tabs tabs={[{ value: 'open', label: `Open ${n((x) => x.status !== 'closed')}` }, { value: 'mine', label: 'Mine' }, { value: 'unassigned', label: `Unassigned ${n((x) => !x.assignee && x.status === 'open')}` }, { value: 'closed', label: 'Closed' }]} value={tab} onChange={setTab} />
          <div className="ib-items">
            {filtered.map((x) => {
              const last = [...x.messages].reverse().find((m) => !m.adminOnly) || x.messages[x.messages.length - 1];
              return (
                <button key={x.id} type="button" className={cx('ib-item', sel === x.id && 'on')} onClick={() => setSel(x.id)}>
                  <Avatar name={x.name} size="sm" />
                  <div className="grow">
                    <div className="row between"><span className="nm ellipsis">{x.name}</span><span className="tiny faint">{lastTs(x) ? fmtAgo(lastTs(x), t) : ''}</span></div>
                    <div className="row gap-4" style={{ margin: '2px 0' }}><ChannelBadge channel={x.channel} />{x.status === 'bot' ? <Badge tone="violet">Bot</Badge> : x.status === 'closed' ? <Badge>Closed</Badge> : x.assignee ? <span className="tiny faint ellipsis">{firstName(x.assignee)}</span> : <Badge tone="orange">Unassigned</Badge>}</div>
                    <div className="pv">{last ? (last.from === 'customer' ? '' : (last.from === 'bot' ? 'Bot: ' : last.from === 'staff' ? 'You: ' : '')) + last.text : ''}</div>
                  </div>
                  {x.unread && <span className="unread" aria-label="Unread" />}
                </button>
              );
            })}
            {!filtered.length && <Empty icon="inbox" title="Nothing here" text="Conversations show up here when customers write in." />}
          </div>
        </div>
        {c ? <Thread key={c.id} s={s} t={t} c={c} onBack={() => setSel(null)} /> : <div className="ib-thread"><Empty icon="message-circle" title="Pick a conversation" text="Replies to Geanne’s chat appear on the phone." /></div>}
        {c && <SidePanel s={s} t={t} c={c} />}
      </div>
    </>
  );
}

function Thread({ s, t, c, onBack }) {
  const { open } = useAdmin();
  const [mode, setMode] = useState('Reply');
  const [text, setText] = useState('');
  const [tpl, setTpl] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (c.unread) markRead(c.id); }, [c.id, c.unread]);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [c.messages.length, c.typing]);
  const cu = c.cid ? cust(s, c.cid) : null;
  const send = () => {
    const v = text.trim();
    if (!v) return;
    staffReply(c.id, v, mode === 'Internal note');
    setText('');
    if (mode !== 'Internal note' && c.cid === s.me) toast(`Sent to ${firstName(c.name)}’s Messenger on the phone`);
  };
  const team = staffList(s);
  return (
    <div className="ib-thread">
      <div className="ib-head">
        <Btn kind="ghost" size="sm" icon="arrow-left" className="back-btn" aria-label="Back to the list" onClick={onBack} />
        <Avatar name={c.name} />
        <div className="grow">
          <div className="strong ellipsis">{c.name}</div>
          <div className="row gap-4"><ChannelBadge channel={c.channel} />{c.status === 'bot' ? <Badge tone="violet" icon="bot">Bot is answering</Badge> : c.status === 'closed' ? <Badge>Closed</Badge> : <Badge tone="green">Open</Badge>}{c.ticketId && <Badge tone="blue" icon="ticket">{c.ticketId}</Badge>}</div>
        </div>
        <select className="inp inp-sm" style={{ width: 150 }} value={c.assignee || ''} onChange={(e) => { assignConvo(c.id, e.target.value || null); toast(e.target.value ? `Assigned to ${e.target.value}` : 'Unassigned'); }} aria-label="Assign to">
          <option value="">Unassigned</option>
          {team.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        {c.status === 'open' && c.channel === 'Messenger' && <Btn size="sm" icon="bot" onClick={() => { returnToBot(c.id); toast('The bot is answering this chat again'); }}>Return to bot</Btn>}
        {c.status !== 'closed' ? <Btn size="sm" icon="check" onClick={() => { closeConvo(c.id); toast('Conversation closed'); }}>Close</Btn> : null}
      </div>
      <div className="ib-msgs" ref={ref}>
        {c.messages.map((m, i) => <AdminMsg key={m.id} s={s} t={t} m={m} prev={c.messages[i - 1]} c={c} onOrder={(id) => open('order', { id })} />)}
        {c.typing && <div className="ib-sys"><Icon name="bot" size={13} />Bot is typing…</div>}
      </div>
      <div className="ib-compose">
        <div className="row between wrap">
          <Seg options={['Reply', 'Internal note']} value={mode} onChange={setMode} label="Message type" />
          <div style={{ position: 'relative' }}>
            <Btn size="sm" kind="ghost" icon="list" onClick={() => setTpl((v) => !v)}>Saved replies</Btn>
            <Popover open={tpl} onClose={() => setTpl(false)} width={300}>
              {TEMPLATES.map(([label, body]) => (
                <button key={label} type="button" className="pop-item" onClick={() => { setText(body.replace(/\{first name\}/g, firstName(c.name))); setMode('Reply'); setTpl(false); }}>
                  <span className="grow"><span className="strong small">{label}</span><div className="tiny faint ellipsis">{body}</div></span>
                </button>
              ))}
            </Popover>
          </div>
        </div>
        <textarea id="ib-reply" className="inp" style={mode === 'Internal note' ? { background: 'var(--note)', borderColor: 'var(--note-line)' } : undefined} value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'Internal note' ? 'Only staff see internal notes' : c.channel === 'Messenger' ? `Reply to ${firstName(c.name)} in Messenger` : `Reply on ${c.channel}`} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Message" />
        <div className="row between">
          <span className="tiny faint">Enter to send · Shift+Enter for a new line{c.status === 'bot' && mode === 'Reply' ? ' · replying takes over from the bot' : ''}</span>
          <Btn kind="primary" size="sm" icon="send" disabled={!text.trim()} onClick={send}>{mode === 'Internal note' ? 'Add note' : 'Send'}</Btn>
        </div>
      </div>
    </div>
  );
}

function AdminMsg({ s, t, m, prev, c, onOrder }) {
  const sep = !prev || m.ts - prev.ts > 30 * MIN ? <div className="ib-sys" style={{ background: 'transparent', border: 0 }}>{fmtWhen(m.ts, t)}</div> : null;
  if (m.from === 'system') return <>{sep}<div className="ib-sys"><Icon name={m.adminOnly ? 'lock-keyhole' : 'info'} size={12} />{m.text}{m.adminOnly ? ' · staff only' : ''}</div></>;
  const o = m.data && m.data.orderId ? orderById(s, m.data.orderId) : null;
  const cls = m.from === 'customer' ? '' : m.internal ? 'out note' : m.from === 'bot' ? 'out bot' : 'out';
  const who = m.from === 'customer' ? c.name : m.internal ? `${m.author} · internal note` : m.from === 'bot' ? (m.kind === 'campaign' ? 'Campaign' : 'Bak Bak assistant') : m.author;
  return (
    <>
      {sep}
      <div className={cx('ib-msg', cls)}>
        <span className="who">{who} · {fmtTime(m.ts)}</span>
        <div className="bb">
          {m.text}
          {m.kind === 'order' && o && <div className="mini mt-8" style={{ background: 'var(--surface)', color: 'var(--text)' }}><span className="strong">Order summary #{o.id} · {peso(o.total)}</span><span className="tiny muted">{itemsLabel(o.items)}</span></div>}
        </div>
        {o && (m.kind === 'form' || m.kind === 'order' || m.kind === 'paid') && <button type="button" className="link tiny" onClick={() => onOrder(o.id)}>Open order #{o.id} <OrderBadge status={o.status} /></button>}
        {m.buttons && m.buttons.length > 0 && <div className="row wrap gap-4">{m.buttons.map((b) => <span key={b.label} className="badge">{b.label}</span>)}</div>}
      </div>
    </>
  );
}

function SidePanel({ s, t, c }) {
  const { open, go } = useAdmin();
  const cu = c.cid ? cust(s, c.cid) : null;
  const ticket = c.ticketId ? s.tickets.find((x) => x.id === c.ticketId) : null;
  const orders = cu ? s.orders.filter((o) => o.cid === cu.id).sort((a, b) => b.ts - a.ts) : [];
  const active = orders.find((o) => o.status === 'new' || ACTIVE.includes(o.status));
  return (
    <aside className="ib-side" aria-label="Customer details">
      {cu ? (
        <div className="col" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Avatar name={cu.name} size="lg" />
          <button type="button" className="link" onClick={() => go('record', { id: cu.id })}>{cu.name}</button>
          <div className="tiny faint">{phoneText(s, cu)} · {cu.area}</div>
          <div className="row wrap" style={{ justifyContent: 'center' }}>{cu.member ? <Badge tone="orange" icon="star">{cu.points} pts</Badge> : <Badge>Not a member</Badge>}<Badge tone={cu.consent === 'Yes' ? 'green' : null}>Consent {cu.consent}</Badge></div>
        </div>
      ) : <div className="mini"><span className="strong">{c.name}</span><span className="muted">Not linked to a customer record yet.</span></div>}
      {active && (
        <div className="mini">
          <div className="row between"><span className="strong">Order #{active.id}</span><OrderBadge status={active.status} /></div>
          <span className="muted">{itemsLabel(active.items)} · {peso(active.total)}</span>
          <button type="button" className="link small" onClick={() => open('order', { id: active.id })}>Open order</button>
        </div>
      )}
      {ticket ? (
        <div className={cx('mini', ticket.status !== 'closed' && ticket.due < t && 'red')}>
          <div className="row between"><span className="strong">{ticket.id}</span><TicketBadge status={ticket.status} /></div>
          <span>{ticket.subject}</span>
          <span className="tiny muted">{ticket.assignee || 'Unassigned'} · {ticket.status === 'closed' ? 'Closed' : dueText(t, ticket.due)}</span>
          <button type="button" className="link small" onClick={() => open('ticket', { id: ticket.id })}>Open ticket</button>
        </div>
      ) : <Btn size="sm" icon="ticket" onClick={() => open('newTicket', { cid: c.cid, convoName: c.name })}>Create ticket</Btn>}
      {orders.length > 0 && (
        <div className="col gap-4">
          <div className="eyebrow">Recent orders</div>
          {orders.slice(0, 4).map((o) => <button key={o.id} type="button" className="row between small" style={{ border: 0, background: 'none', padding: '4px 0' }} onClick={() => open('order', { id: o.id })}><span>#{o.id}</span><span className="muted">{peso(o.total)}</span></button>)}
        </div>
      )}
      {cu && cu.note && <div className="mini note"><span className="strong">Note</span>{cu.note}</div>}
    </aside>
  );
}

// ---------------- tickets ----------------
const LANES = [['new', 'New'], ['waiting_us', 'Waiting on us'], ['waiting_contact', 'Waiting on customer'], ['closed', 'Closed']];
export function Tickets() {
  const s = useStore();
  const t = useNow(15000);
  const { open } = useAdmin();
  const me = currentUser(s);
  const [view, setView] = useState('Board');
  const [who, setWho] = useState('all');
  const list = s.tickets.filter((x) => (who === 'mine' ? x.assignee === me : who === 'unassigned' ? !x.assignee : true));
  const openList = openTickets(s);
  const overdue = openList.filter((x) => x.due && x.due < t).length;
  const replied = s.tickets.filter((x) => x.firstReply);
  const avgReply = replied.length ? (sum(replied, (x) => x.firstReply) / replied.length).toFixed(1) : '—';
  const closedMonth = s.base.closedTickets + s.tickets.filter((x) => x.status === 'closed' && x.closedAt >= BASE).length;
  return (
    <>
      <PageHead title="Tickets" sub="Complaints and requests that need a person. Bot hand-offs and low ratings create tickets on their own.">
        <Seg options={['Board', 'List']} value={view} onChange={setView} label="View" />
        <Btn kind="primary" icon="plus" onClick={() => open('newTicket')}>New ticket</Btn>
      </PageHead>
      <div className="strip">
        <div><div className="lbl">Open</div><div className="val">{openList.length}</div></div>
        <div><div className="lbl">Overdue</div><div className={cx('val', overdue && 'bad')}>{overdue}</div></div>
        <div><div className="lbl">Unassigned</div><div className="val">{openList.filter((x) => !x.assignee).length}</div></div>
        <div><div className="lbl">Average first reply</div><div className="val">{avgReply} min</div></div>
        <div><div className="lbl">Closed this month</div><div className="val">{closedMonth}</div></div>
      </div>
      <Seg options={[{ value: 'all', label: 'All tickets' }, { value: 'mine', label: 'Assigned to me' }, { value: 'unassigned', label: 'Unassigned' }]} value={who} onChange={setWho} label="Filter" />
      {view === 'Board' ? (
        <div className="board">
          {LANES.map(([st, label]) => {
            const lane = list.filter((x) => x.status === st).sort((a, b) => (st === 'closed' ? (b.closedAt || 0) - (a.closedAt || 0) : (a.due || 0) - (b.due || 0)));
            return (
              <section className="lane" key={st} aria-label={label}>
                <div className="lane-h">{label}<span className="n">{lane.length}</span></div>
                {lane.map((x) => {
                  const late = x.status !== 'closed' && x.due && x.due < t;
                  const cu = x.cid ? cust(s, x.cid) : null;
                  return (
                    <div key={x.id} className={cx('kcard', late && 'late', t - x.created < 40000 && 'fresh')} role="button" tabIndex={0} onClick={() => open('ticket', { id: x.id })} onKeyDown={(e) => { if (e.key === 'Enter') open('ticket', { id: x.id }); }}>
                      <div className="t">{x.id}<span className={late ? 'bad' : ''}>{x.status === 'closed' ? 'Closed' : dueText(t, x.due)}</span></div>
                      <div className="strong">{x.subject}</div>
                      <div className="row between"><span className="muted ellipsis">{cu ? cu.name : 'No customer'}</span><Badge>{x.type}</Badge></div>
                      <div className="row gap-4">{x.assignee ? <><Avatar name={x.assignee} size="sm" /><span className="tiny muted">{x.assignee}</span></> : <Badge tone="orange">Unassigned</Badge>}</div>
                    </div>
                  );
                })}
                {!lane.length && <div className="tiny faint center" style={{ padding: '18px 4px' }}>No tickets</div>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Ticket</th><th>Subject</th><th>Customer</th><th>Type</th><th>Assigned to</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {list.sort((a, b) => b.created - a.created).map((x) => (
                  <tr key={x.id} className="click" onClick={() => open('ticket', { id: x.id })}>
                    <td className="strong">{x.id}</td><td>{x.subject}</td><td>{x.cid ? <CustName s={s} cid={x.cid} /> : '—'}</td><td className="muted">{x.type}</td><td>{x.assignee || <Badge tone="orange">Unassigned</Badge>}</td><td><TicketBadge status={x.status} /></td>
                    <td className={cx('small', x.status !== 'closed' && x.due < t && 'bad')}>{x.status === 'closed' ? 'Closed' : dueText(t, x.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export function TicketDrawer({ id, onClose }) {
  const s = useStore();
  const t = useNow(15000);
  const { open, go } = useAdmin();
  const [note, setNote] = useState('');
  const x = s.tickets.find((y) => y.id === id);
  if (!x) return <Modal side title="Ticket not found" onClose={onClose}><Empty icon="ticket" title="This ticket doesn’t exist" /></Modal>;
  const cu = x.cid ? cust(s, x.cid) : null;
  const o = x.orderId ? orderById(s, x.orderId) : null;
  const convo = x.convoId ? s.convos.find((c) => c.id === x.convoId) : cu ? s.convos.find((c) => c.cid === cu.id) : null;
  const closed = x.status === 'closed';
  return (
    <Modal side title={x.subject} sub={`${x.id} · ${x.type} · opened ${fmtWhen(x.created, t)}${x.src ? ' · ' + x.src : ''}`} onClose={onClose} footer={<>
      {convo && <Btn icon="message-circle" onClick={() => { onClose(); go('inbox', { id: convo.id }); }}>Open conversation</Btn>}
      <span className="grow" />
      {closed ? <Btn onClick={() => { updateTicket(x.id, { status: 'waiting_us' }); toast(`${x.id} reopened`); }}>Reopen</Btn> : <Btn kind="primary" icon="check" onClick={() => { updateTicket(x.id, { status: 'closed' }); toast(`${x.id} closed`); }}>Close ticket</Btn>}
    </>}>
      <div className="row wrap"><TicketBadge status={x.status} />{!closed && <Badge tone={x.due < t ? 'red' : null}>{dueText(t, x.due)}</Badge>}{x.firstReply && <span className="tiny faint">First reply in {x.firstReply} min</span>}</div>
      <div className="grid g2">
        <Field label="Status" htmlFor="tk-status"><select id="tk-status" className="inp" value={x.status} onChange={(e) => { updateTicket(x.id, { status: e.target.value }); toast(`${x.id}: ${TICKET_STATUS[e.target.value][0]}`); }}>{Object.entries(TICKET_STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Assigned to" htmlFor="tk-assignee"><select id="tk-assignee" className="inp" value={x.assignee || ''} onChange={(e) => { updateTicket(x.id, { assignee: e.target.value || null }); toast(e.target.value ? `Assigned to ${e.target.value}` : 'Unassigned'); }}><option value="">Unassigned</option>{staffList(s).map((u) => <option key={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Type" htmlFor="tk-type"><select id="tk-type" className="inp" value={x.type} onChange={(e) => updateTicket(x.id, { type: e.target.value })}>{TICKET_TYPES.map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Due">{closed ? <div className="small muted">Closed {fmtWhen(x.closedAt, t)}</div> : <div className="row"><span className="small grow">{fmtTime(x.due)}</span><Btn size="sm" onClick={() => { updateTicket(x.id, { due: Math.max(x.due, t) + 30 * MIN, alerted: false }); toast('Due time moved by 30 min'); }}>+30 min</Btn></div>}</Field>
      </div>
      <div className="card tight col">
        <div className="eyebrow">Customer</div>
        {cu ? <CustName s={s} cid={cu.id} sub={`${phoneText(s, cu)} · ${cu.orders} orders`} /> : <span className="muted small">No customer linked</span>}
        {o && <div className="row between small"><button type="button" className="link" onClick={() => open('order', { id: o.id })}>Order #{o.id} · {peso(o.total)}</button><OrderBadge status={o.status} /></div>}
      </div>
      <div className="col">
        <div className="eyebrow">Notes</div>
        {x.notes.length ? x.notes.map((n, i) => <div key={i} className="mini note"><span className="tiny muted">{n.by} · {fmtWhen(n.ts, t)}</span>{n.text}</div>) : <div className="small faint">No notes yet.</div>}
        <textarea id="tk-note" className="inp" rows={2} placeholder="Add a note for the team" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New note" />
        <Btn size="sm" disabled={!note.trim()} onClick={() => { addTicketNote(x.id, note); setNote(''); toast('Note added'); }} style={{ alignSelf: 'flex-start' }}>Add note</Btn>
      </div>
    </Modal>
  );
}

export function NewTicketModal({ cid: cid0, orderId: oid0, convoName, onClose }) {
  const s = useStore();
  const { open } = useAdmin();
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('Other');
  const [cid, setCid] = useState(cid0 || '');
  const [assignee, setAssignee] = useState(currentUser(s));
  const [due, setDue] = useState('60');
  const [orderId, setOrderId] = useState(oid0 || '');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const orders = cid ? s.orders.filter((o) => o.cid === cid).sort((a, b) => b.ts - a.ts) : [];
  const create = () => {
    if (subject.trim().length < 3) return setErr('Write a short subject.');
    const id = createTicket({ subject, type, cid: cid || null, assignee: assignee || null, dueMins: Number(due), orderId: orderId || null, note: note.trim() });
    toast(`Ticket ${id} created`);
    onClose();
    open('ticket', { id });
  };
  return (
    <Modal title="New ticket" sub={convoName ? `From the chat with ${convoName}` : 'Track a complaint or request until it’s solved.'} onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={create}>Create ticket</Btn></>}>
      <Field label="Subject" htmlFor="nt-subject" error={err}><input id="nt-subject" className={cx('inp', err && 'err')} value={subject} onChange={(e) => { setSubject(e.target.value); setErr(''); }} placeholder="Missing Cheese Dip on #BB-1047" /></Field>
      <div className="grid g2">
        <Field label="Type" htmlFor="nt-type"><select id="nt-type" className="inp" value={type} onChange={(e) => setType(e.target.value)}>{TICKET_TYPES.map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Customer" htmlFor="nt-cust"><select id="nt-cust" className="inp" value={cid} onChange={(e) => { setCid(e.target.value); setOrderId(''); }}><option value="">No customer</option>{s.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Assign to" htmlFor="nt-assignee"><select id="nt-assignee" className="inp" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Unassigned</option>{staffList(s).map((u) => <option key={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Due in" htmlFor="nt-due"><select id="nt-due" className="inp" value={due} onChange={(e) => setDue(e.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option><option value="1440">1 day</option></select></Field>
      </div>
      {orders.length > 0 && <Field label="Order (optional)" htmlFor="nt-order"><select id="nt-order" className="inp" value={orderId} onChange={(e) => setOrderId(e.target.value)}><option value="">No order</option>{orders.map((o) => <option key={o.id} value={o.id}>#{o.id} · {peso(o.total)} · {o.status}</option>)}</select></Field>}
      <Field label="Note (optional)" htmlFor="nt-note"><textarea id="nt-note" className="inp" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}
