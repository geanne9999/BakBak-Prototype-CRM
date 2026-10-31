// Customer side: the Bak Bak page in Messenger, and the order and rewards page that opens inside it (no app to download).
import {
  useStore, useNow, now, bus, toast, cust, convoFor, orderById, customerSays, sendOrderForm, payOrder, fixOrder, reorder,
  bagTotals, addToBag, setBagQty, waitMinutes, isOpen, findCode, claimCode, redeemReward, rateOrder, addCustomer,
  clearPhoneUnread, getState, itemsLabel, STATUS_LABEL, ACTIVE, createAccount, privacyRequest, updateCustomer,
} from './store.js';
import { WELCOME_QUICK, QUICK_MAP, nextReward } from './bot.js';
import { Icon, Logo, Btn, Badge, Toasts, Stepper, Seg, Field, Empty } from './ui.jsx';
import { peso, fmtTime, fmtClock, fmtMD, fmtDate, fmtWhen, firstName, maskPhone, fmtPhone, cx, hm12, sameDay, MIN, sum, minutesOfDay } from './util.js';

const { useState, useEffect, useRef, useMemo } = React;
const TITLES = { home: 'Order and rewards', menu: 'Menu', bag: 'Your bag', orders: 'Your orders', track: 'Order status', rewards: 'Rewards', claim: 'Claim points', rate: 'Rate your order', signup: 'Create your account', account: 'My account' };

export function Phone({ bare, scale }) {
  const s = useStore();
  const t = useNow(15000);
  const [web, setWeb] = useState(null);
  const [sheet, setSheet] = useState(null);
  const me = cust(s, s.me);
  useEffect(() => bus.on('phone:open', (d) => {
    setSheet(null);
    const qr = d.ctx === 'qr';
    setWeb({ page: d.page, ctx: qr ? 'qr' : 'messenger', params: d.params || {}, cid: qr ? null : getState().me });
  }), []);
  useEffect(() => { if (!web && s.phone.unread) clearPhoneUnread(); }, [web, s.phone.unread]);
  useEffect(() => { setWeb(null); setSheet(null); }, [s.me]);
  const openWeb = (page, params = {}) => setWeb({ page, ctx: 'messenger', params, cid: s.me });
  const act = (a) => {
    if (!a) return;
    const [kind, page, arg] = a.split(':');
    if (kind === 'open') openWeb(page, arg ? { id: arg } : {});
    else if (kind === 'pay') {
      const me = cust(getState(), getState().me);
      if (me && !me.member) {
        setSheet({
          type: 'pre-pay-signup',
          orderId: page,
          openPay: () => setSheet({ type: 'pay', orderId: page }),
          openSignup: () => { setSheet(null); setWeb(w => ({ ...w, page: 'signup', params: { afterPayOrderId: page } })); }
        });
      } else {
        setSheet({ type: 'pay', orderId: page });
      }
    }
    else if (kind === 'fix') { fixOrder(page); openWeb('bag'); }
    else if (kind === 'rate') openWeb('rate', { id: page });
  };
  const box = scale ? { width: 412 * scale, height: 866 * scale } : undefined;
  return (
    <div className="device-wrap" style={box}>
      <div className="device" style={scale ? { transform: `scale(${scale})` } : undefined}>
        <div className="screen">
          <div className="sbar" aria-hidden="true">
            <span className="num">{fmtClock(t)}</span>
            <span className="sig"><Icon name="signal" size={16} stroke={2.4} /><Icon name="wifi" size={16} stroke={2.4} /><span className="batt"><i /></span></span>
          </div>
          {me && <Messenger s={s} me={me} onAction={act} />}
          {web && me && <WebView s={s} t={t} web={web} setWeb={setWeb} me={me} onAction={act} setSheet={setSheet} />}
          {sheet && (
            <div className="sheet-ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) setSheet(null); }}>
              <div className="sheet" role="dialog" aria-modal="true">
                <SheetBody s={s} sheet={sheet} close={() => setSheet(null)} web={web} />
              </div>
            </div>
          )}
          <div className="home-ind" />
          <Toasts scope="phone" />
        </div>
      </div>
    </div>
  );
}

// ---------------- Messenger ----------------
function Messenger({ s, me, onAction }) {
  const c = convoFor(s, me.id);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const visible = c ? c.messages.filter((m) => !m.adminOnly && !m.internal) : [];
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [visible.length, c && c.typing]);
  if (!c) return null;
  const send = () => { const t = text.trim(); if (!t) return; setText(''); customerSays(t); };
  const staffHere = c.status === 'open' && c.joined;
  const quick = (label) => customerSays(label, { faq: QUICK_MAP[label] });
  return (
    <div className="msgr">
      <div className="msgr-head">
        <button className="ibtn blue" aria-label="Back to chats" onClick={() => toast('This demo opens straight into the Bak Bak chat', 'phone')}><Icon name="chevron-left" size={26} /></button>
        <Logo size={36} />
        <div className="msgr-who">
          <div className="msgr-name">Bak Bak Boneless Chicken</div>
          <div className="msgr-status">{staffHere ? `${firstName(c.joined)} from Bak Bak is here` : c.status === 'open' ? 'A staff member will reply soon' : 'Typically replies instantly'}</div>
        </div>
        <button className="ibtn blue" aria-label="Call" onClick={() => toast('Calls are off in this demo', 'phone')}><Icon name="phone" size={20} /></button>
      </div>
      <div className="msgr-list" ref={listRef} aria-live="polite">
        {visible.map((m, i) => <Msg key={m.id} s={s} me={me} m={m} prev={visible[i - 1]} next={visible[i + 1]} last={i === visible.length - 1 && !c.typing} onAction={onAction} onQuick={quick} />)}
        {c.typing && <div className="mrow"><div className="av-slot"><Logo size={28} /></div><div className="bubble typing" aria-label="Bak Bak is typing"><i /><i /><i /></div></div>}
      </div>
      <form className="msgr-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <button type="button" className="ibtn blue" aria-label="More options" onClick={() => onAction('open:home')}><Icon name="circle-plus" size={22} /></button>
        <button type="button" className="ibtn blue" aria-label="Send a photo" onClick={() => toast('Photos are off in this demo', 'phone')}><Icon name="image" size={22} /></button>
        <input id="msgr-input" className="msgr-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Aa" autoComplete="off" aria-label="Message Bak Bak" />
        <button type="submit" className="ibtn blue" aria-label="Send" disabled={!text.trim()}><Icon name="send" size={20} /></button>
      </form>
    </div>
  );
}

function Msg({ s, me, m, prev, next, last, onAction, onQuick }) {
  const t = now(s);
  const sep = !prev || m.ts - prev.ts > 10 * MIN ? <div className="msgr-sep">{sameDay(m.ts, t) ? 'Today' : fmtDate(m.ts)} {fmtTime(m.ts)}</div> : null;
  if (m.from === 'system') return <>{sep}<div className="msys">{m.text}</div></>;
  const mine = m.from === 'customer';
  const groupEnd = !next || next.from !== m.from;
  const showAuthor = m.from === 'staff' && (!prev || prev.from !== 'staff' || prev.author !== m.author);
  const o = m.data && m.data.orderId ? orderById(s, m.data.orderId) : null;
  const quick = m.quick === 'WELCOME' ? WELCOME_QUICK : m.quick;
  let body;
  if (mine) {
    body = (
      <div className="bubble">
        {m.kind === 'form' && <Icon name="receipt-text" size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />}
        {m.kind === 'paid' && <Icon name="circle-check" size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />}
        {m.text}
      </div>
    );
  } else if (m.kind === 'order' && o) {
    body = <>{m.text && <div className="bubble">{m.text}</div>}<OrderCard s={s} o={o} onAction={onAction} /></>;
  } else if (m.kind === 'signup' && o) {
    body = <>{m.text && <div className="bubble">{m.text}</div>}<SignupCard s={s} o={o} me={me} />{m.buttons && <MsgButtons buttons={me.member ? m.buttons.filter((b) => b.action !== 'open:signup') : m.buttons} onAction={onAction} />}</>;
  } else if (m.kind === 'points' && o) {
    body = <>{m.text && <div className="bubble">{m.text}</div>}<PointsCard s={s} o={o} me={me} />{m.buttons && <MsgButtons buttons={m.buttons} onAction={onAction} />}</>;
  } else {
    body = <><div className="bubble">{m.text}</div>{m.buttons && <MsgButtons buttons={m.buttons} onAction={onAction} />}</>;
  }
  return (
    <>
      {sep}
      {showAuthor && <div className="mauthor">{firstName(m.author)} · Bak Bak</div>}
      <div className={cx('mrow', mine && 'me')}>
        {!mine && <div className="av-slot">{groupEnd && <Logo size={28} />}</div>}
        <div className="mcol">{body}</div>
      </div>
      {last && !mine && quick && quick.length > 0 && (
        <div className="quick">{quick.map((q) => <button key={q} type="button" onClick={() => onQuick(q)}>{q}</button>)}</div>
      )}
    </>
  );
}

function MsgButtons({ buttons, onAction }) {
  return <div className="mbtns">{buttons.map((b) => <button key={b.label} type="button" onClick={() => onAction(b.action)}>{b.label}</button>)}</div>;
}

function OrderCard({ s, o, onAction }) {
  const b = s.settings.business;
  return (
    <div className="mcard">
      <div className="mcard-h"><span>Order #{o.id}</span><Badge tone="blue">{o.type}</Badge></div>
      <div className="mcard-b">
        {o.items.map((i, k) => (
          <div className="ln" key={k}><span>{i.qty}× {i.name}{i.flavors.length ? ' · ' + i.flavors.join(' + ') : ''}</span><span className="num">{peso(i.price * i.qty)}</span></div>
        ))}
        {o.discount > 0 && <div className="ln ok"><span>Reward</span><span className="num">−{peso(o.discount)}</span></div>}
        <div className="ln tot"><span>Total</span><span className="num">{peso(o.total)}</span></div>
        <div className="muted small">Pay first with GCash or QR Ph through our secure pay link. We cook once paid.</div>
        <div className="muted small">{o.type === 'Dine-in' ? 'Dine in at' : 'Pick up at'}: Bak Bak, {b.address}{o.pickupAt && o.pickupAt !== 'asap' ? ` · ${fmtTime(o.pickupAt)}` : ''}</div>
      </div>
      <div className="mbtns">
        {o.status === 'awaiting' ? (
          <>
            <button type="button" className="primary" onClick={() => onAction('pay:' + o.id)}>Confirm and pay {peso(o.total)}</button>
            <button type="button" onClick={() => onAction('fix:' + o.id)}>Fix something</button>
          </>
        ) : o.status === 'cancelled' ? <button type="button" disabled>Cancelled</button> : o.status === 'new' ? <button type="button" disabled>Waiting for staff to confirm</button> : <button type="button" disabled>✓ Paid · {STATUS_LABEL[o.status]}</button>}
      </div>
    </div>
  );
}

function PointsCard({ s, o, me }) {
  const { next, ready } = nextReward(s, me.points);
  return (
    <div className="mcard gold">
      <div className="mcard-h"><span className="row gap-4"><Icon name="gift" size={14} />Bak Bak Rewards</span><span className="tiny">Linked to {maskPhone(me.phone)}</span></div>
      <div className="mcard-b">
        <div className="strong">+{o.pts} points from order #{o.id} {o.ptsAdded ? 'added' : 'once you pick it up'}</div>
        <div className="muted small">Earn 1 point for every ₱{s.settings.earnPer} of food</div>
        <div className="muted small">{ready ? `Redeem ${ready.name} at ${ready.pts} points` : next ? `${next.pts - me.points} more points to get ${next.short || next.name}` : ''}</div>
      </div>
    </div>
  );
}

function SignupCard({ s, o, me }) {
  const pts = Math.floor(o.total / s.settings.earnPer);
  return (
    <div className="mcard gold">
      <div className="mcard-h"><span className="row gap-4"><Icon name="user-plus" size={14} />Bak Bak account</span><span className="tiny">{me.member ? 'Created' : 'Free'}</span></div>
      <div className="mcard-b">
        <div className="strong">{me.member ? `Done! ${pts} points from #${o.id} are on your account` : `+${pts} points for #${o.id} and a free Ranch Dip`}</div>
        <div className="muted small">Keep your points, order history and rewards in one place.</div>
      </div>
    </div>
  );
}

// ---------------- the no-download order and rewards page ----------------
function WebView({ s, t, web, setWeb, me, onAction, setSheet }) {
  const go = (page, params = {}) => setWeb((w) => ({ ...w, page, params }));
  const close = () => setWeb(null);
  const viewer = web.cid ? cust(s, web.cid) : null;
  const bodyRef = useRef(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [web.page, web.params && web.params.id]);
  const sub = web.ctx === 'qr' ? 'Opened from the card’s QR · no download' : 'Opened in Messenger · no download';
  const chat = () => close();
  let body;
  if (!viewer) body = <SignIn s={s} onDone={(cid) => setWeb((w) => ({ ...w, cid }))} />;
  else if (web.page === 'home') body = <Home s={s} t={t} me={viewer} go={go} onChat={chat} />;
  else if (web.page === 'menu') body = <Menu s={s} go={go} setSheet={setSheet} />;
  else if (web.page === 'bag') body = <Bag s={s} t={t} me={viewer} go={go} setSheet={setSheet} onSent={close} />;
  else if (web.page === 'orders') body = <Orders s={s} me={viewer} go={go} />;
  else if (web.page === 'track') body = <Track s={s} t={t} me={viewer} id={web.params && web.params.id} go={go} onChat={(id) => { close(); customerSays(`I need help with order #${id}`, { faq: 'staff' }); }} onPay={(id) => { close(); onAction('pay:' + id); }} />;
  else if (web.page === 'rewards') body = <Rewards s={s} me={viewer} go={go} setSheet={setSheet} />;
  else if (web.page === 'claim') body = <Claim s={s} me={viewer} params={web.params || {}} go={go} />;
  else if (web.page === 'rate') body = <Rate s={s} id={web.params && web.params.id} onDone={close} />;
  else if (web.page === 'signup') body = <SignUp s={s} me={viewer} params={web.params || {}} go={go} onChat={chat} onPay={(id) => { close(); onAction('pay:' + id); }} />;
  else if (web.page === 'account') body = viewer.member ? <Account s={s} me={viewer} go={go} /> : <SignUp s={s} me={viewer} params={web.params || {}} go={go} onChat={chat} onPay={(id) => { close(); onAction('pay:' + id); }} />;
  const tabs = [['home', 'house', 'Home'], ['menu', 'utensils', 'Menu'], ['orders', 'receipt-text', 'Orders'], ['rewards', 'gift', 'Rewards']];
  return (
    <div className="web" role="dialog" aria-label="Bak Bak order and rewards page">
      <div className="pbar">
        <button type="button" className="ibtn" aria-label="Close page" onClick={close}><Icon name="x" size={20} /></button>
        <div className="pbar-t"><b>Bak Bak · {TITLES[web.page] || 'Order and rewards'}</b><span><Icon name="lock-keyhole" size={10} />{sub}</span></div>
        <button type="button" className="ibtn" aria-label="Page options" onClick={() => toast('This page runs inside Messenger. Nothing to install.', 'phone')}><Icon name="ellipsis" size={20} /></button>
      </div>
      <div className="web-body" ref={bodyRef}>{body}</div>
      {viewer && (
        <nav className="tabbar" aria-label="Page sections">
          {tabs.map(([p, ic, l]) => (
            <button type="button" key={p} className={web.page === p || (p === 'orders' && web.page === 'track') || (p === 'menu' && web.page === 'bag') || (p === 'rewards' && web.page === 'claim') || (p === 'home' && (web.page === 'account' || web.page === 'signup')) ? 'on' : ''} onClick={() => go(p)}><Icon name={ic} size={22} />{l}</button>
          ))}
          <button type="button" onClick={chat}><Icon name="message-circle" size={22} />Chat{s.phone.unread > 0 && <span className="tb-badge">{s.phone.unread}</span>}</button>
        </nav>
      )}
    </div>
  );
}

function BagBar({ s, go }) {
  const n = sum(s.phone.bag, (l) => l.qty);
  if (!n) return null;
  const tot = bagTotals(s, s.phone.bag);
  return <button type="button" className="bagbar" onClick={() => go('bag')}><span className="row gap-8"><Icon name="shopping-bag" size={18} />View bag · {n} item{n > 1 ? 's' : ''}</span><span className="num">{peso(tot.total)}</span></button>;
}

function customerStatus(o) {
  const map = { awaiting: ['orange', 'Waiting for payment'], new: ['orange', 'Being checked'], paid: ['blue', 'Confirmed'], preparing: ['blue', 'Preparing'], ready: ['green', 'Ready'], rider: ['blue', 'With the rider'], completed: [null, 'Completed'], cancelled: [null, 'Cancelled'] };
  const [tone, label] = map[o.status] || [null, o.status];
  return <Badge tone={tone}>{label}</Badge>;
}

function Home({ s, t, me, go, onChat }) {
  const h = new Date(t).getHours();
  const greet = h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
  const open = isOpen(s, t);
  const b = s.settings.business;
  const { next, ready } = nextReward(s, me.points);
  const active = s.orders.filter((o) => o.cid === me.id && ACTIVE.includes(o.status)).sort((a, c) => c.ts - a.ts)[0];
  const last = s.orders.filter((o) => o.cid === me.id && o.status === 'completed').sort((a, c) => c.ts - a.ts)[0];
  return (
    <>
      <div className="row between">
        <div className="row gap-12"><Logo size={46} /><div><div className="muted">{greet}</div><div className="h1">{firstName(me.name)}</div></div></div>
        <button type="button" id="home-account" className="ibtn" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }} aria-label={me.member ? 'My account' : 'Create an account'} onClick={() => go(me.member ? 'account' : 'signup')}><Icon name="user" size={18} /></button>
      </div>
      <div className={cx('pill-open', !open && 'closed')}>
        <span className="row gap-4"><span className="dot" />{open ? 'Open now' : 'Closed now'} · {hm12(b.open)} – {hm12(b.close)}</span>
        <span className="row gap-4"><Icon name="map-pin" size={14} />{b.short}</span>
      </div>
      {active && (
        <button type="button" className="wcard row gap-12" style={{ textAlign: 'left', width: '100%' }} onClick={() => go('track', { id: active.id })}>
          <div className="tile sm blue"><Icon name="timer" size={20} /></div>
          <div className="grow"><div className="strong">Order #{active.id}</div><div className="muted small">{active.status === 'awaiting' ? 'Waiting for payment' : active.status === 'ready' ? 'Ready at the counter' : `Ready around ${fmtTime(active.readyBy)}`}</div></div>
          {customerStatus(active)}
        </button>
      )}
      {me.member ? (
        <div className="hero-gold">
          <div className="row gap-4 small strong"><Icon name="gift" size={14} />Bak Bak Rewards</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="pts">{me.points}</span><span className="strong">points</span></div>
          <div className="small">{ready ? `Your ${ready.short || ready.name} reward is ready to redeem.` : next ? `${next.pts - me.points} more points to get ${next.short || next.name}.` : 'Every reward is ready to redeem.'}</div>
          <button type="button" onClick={() => go('rewards')}>View rewards <Icon name="arrow-right" size={14} /></button>
        </div>
      ) : (
        <div className="wcard col"><div className="strong">Create your free Bak Bak account</div><div className="muted small">Earn 1 point for every ₱{s.settings.earnPer} of food, keep your order history, and get a free Ranch Dip on us.</div><Btn kind="primary" icon="user-plus" onClick={() => go('signup')}>Create my account</Btn></div>
      )}
      <div className="qa">
        <button type="button" onClick={() => go('menu')}><span className="circ"><Icon name="utensils" size={22} /></span>Order</button>
        <button type="button" onClick={onChat}><span className="circ"><Icon name="message-circle" size={22} /></span>Chat</button>
        <button type="button" onClick={() => go(active ? 'track' : 'orders', active ? { id: active.id } : {})}><span className="circ"><Icon name="receipt-text" size={22} /></span>Track</button>
        <button type="button" onClick={() => go('rewards')}><span className="circ"><Icon name="gift" size={22} /></span>Rewards</button>
      </div>
      {last && (
        <>
          <div className="row between"><div className="h3">Order again</div><button type="button" className="link" onClick={() => go('orders')}>See all</button></div>
          <div className="wcard row gap-12">
            <div className="tile"><Icon name="flame" size={22} /></div>
            <div className="grow"><div className="strong">{itemsLabel(last.items)}</div><div className="muted small">{peso(last.total)} · Last ordered {fmtMD(last.ts)}</div></div>
            <Btn kind="soft" size="sm" icon="refresh-cw" onClick={() => { reorder(last.id); go('bag'); }}>Reorder</Btn>
          </div>
        </>
      )}
      <button type="button" className="wcard row gap-12" style={{ textAlign: 'left', width: '100%', borderColor: 'var(--gold-1)' }} onClick={() => go('claim')}>
        <div className="tile sm"><Icon name="qr-code" size={20} /></div>
        <div className="grow"><div className="strong">Ordered on Foodpanda or Grab?</div><div className="muted small">Enter the code on your Bak Bak card to get points</div></div>
        <Icon name="chevron-right" size={18} />
      </button>
      <BagBar s={s} go={go} />
    </>
  );
}

function Menu({ s, go, setSheet }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const cats = ['Chicken', 'Rice meals', 'Sides', 'Dips', 'Drinks'];
  const items = s.menu.filter((m) => (!cat || m.cat === cat) && (!q || `${m.name} ${m.desc} ${m.cat}`.toLowerCase().includes(q.toLowerCase())));
  const add = (m) => {
    if (m.flavors) setSheet({ type: 'item', mid: m.id });
    else { addToBag({ mid: m.id, qty: 1, flavors: [], dips: [] }); toast(`Added ${m.name} to your bag`, 'phone'); }
  };
  return (
    <>
      <div className="search"><Icon name="search" size={16} /><input id="menu-search" className="inp" placeholder="Search chicken, sides, dips" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the menu" /></div>
      <div className="chips" role="tablist" aria-label="Menu sections">{cats.map((c) => <button type="button" key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(cat === c ? null : c)}>{c}</button>)}</div>
      {!items.length && <Empty icon="search" title="Nothing matches" text="Try another word, like “fries” or “soy garlic”." />}
      {items.map((m) => (
        <div key={m.id} className="wcard row gap-12">
          <div className="tile"><Icon name={m.cat === 'Chicken' || m.cat === 'Rice meals' ? 'flame' : m.cat === 'Drinks' ? 'cup-soda' : 'utensils'} size={24} /></div>
          <div className="grow col gap-4">
            {m.best && <span><Badge tone="orange">Best seller</Badge></span>}
            <div className="strong">{m.name}{m.id === 'half' || m.id === 'whole' ? ` (${m.details.split(' · ')[0]})` : ''}</div>
            <div className="muted small">{m.desc}</div>
            <div className="row gap-8"><span className="strong num">{peso(m.price)}</span>{!m.available && <Badge tone="red">Sold out</Badge>}</div>
          </div>
          <button type="button" className="plus" aria-label={`Add ${m.name}`} disabled={!m.available} onClick={() => add(m)}><Icon name="plus" size={18} /></button>
        </div>
      ))}
      <BagBar s={s} go={go} />
    </>
  );
}

function ItemSheet({ s, mid, close }) {
  const m = s.menu.find((x) => x.id === mid);
  const [fl, setFl] = useState([]);
  const [dips, setDips] = useState([]);
  const [qty, setQty] = useState(1);
  if (!m) return null;
  const max = m.flavors || 1;
  const toggleFl = (f) => setFl((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : max === 1 ? [f] : cur.length < max ? [...cur, f] : cur));
  const dipItems = s.menu.filter((x) => x.dip && x.available);
  const unit = m.price + sum(dips, (d) => (s.menu.find((x) => x.id === d) || { price: 0 }).price);
  const ok = fl.length >= 1;
  return (
    <>
      <div className="grab" />
      <div className="row gap-12 start">
        <div className="tile"><Icon name="flame" size={24} /></div>
        <div className="grow"><div className="h2">{m.name}</div><div className="muted small">{m.details}, cooked to order when you place it.</div></div>
        <div className="strong num">{peso(m.price)}</div>
      </div>
      <div className="row between"><div className="h3">{max === 1 ? 'Choose 1 flavor' : 'Choose up to 2 flavors'}</div><Badge tone={ok ? 'green' : 'orange'}>{ok ? `${fl.length} chosen` : 'Required'}</Badge></div>
      <div>
        {s.flavors.map((f) => (
          <label key={f} className="opt"><span>{f}</span><input type={max === 1 ? 'radio' : 'checkbox'} name="flavor" checked={fl.includes(f)} disabled={max > 1 && !fl.includes(f) && fl.length >= max} onChange={() => toggleFl(f)} /></label>
        ))}
      </div>
      <div className="row between"><div className="h3">Add a dip</div><Badge>Optional</Badge></div>
      <div>
        {dipItems.map((d) => (
          <label key={d.id} className="opt"><span>{d.name} <span className="muted">+{peso(d.price)}</span></span><input type="checkbox" checked={dips.includes(d.id)} onChange={() => setDips((cur) => (cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id]))} /></label>
        ))}
      </div>
      <div className="row between gap-12">
        <Stepper value={qty} onChange={setQty} min={1} max={20} />
        <Btn kind="primary" size="lg" className="grow" disabled={!ok} onClick={() => { addToBag({ mid, qty, flavors: fl, dips }); toast(`Added ${m.name} to your bag`, 'phone'); close(); }}>{ok ? `Add to bag · ${peso(unit * qty)}` : 'Choose a flavor'}</Btn>
      </div>
    </>
  );
}

function Bag({ s, t, me, go, setSheet, onSent }) {
  const [mode, setMode] = useState('Pick-up');
  const [when, setWhen] = useState('asap');
  const [note, setNote] = useState('');
  const [rewardId, setRewardId] = useState(null);
  const [deals, setDeals] = useState(me.consent === 'Yes');
  const [join] = useState(false);
  const [phone, setPhone] = useState(fmtPhone(me.phone || ''));
  const member = me.member;
  const needPhone = !me.phone;
  const phoneOk = !needPhone || /^09\d{9}$/.test(phone.replace(/\D/g, ''));
  const wait = waitMinutes(s);
  const open = isOpen(s, t);
  const slots = useMemo(() => {
    const out = [];
    const d = new Date(t);
    let m = Math.ceil((d.getHours() * 60 + d.getMinutes() + wait + 10) / 15) * 15;
    const close = minutesOfDay(s.settings.business.close);
    for (; m <= close - 15 && out.length < 8; m += 15) { const x = new Date(d); x.setHours(Math.floor(m / 60), m % 60, 0, 0); out.push(x.getTime()); }
    return out;
  }, [Math.floor(t / (5 * MIN)), wait, s.settings.business.close]);
  if (!s.phone.bag.length) return <Empty icon="shopping-bag" title="Your bag is empty" text="Add chicken, sides or drinks from the menu."><Btn kind="primary" onClick={() => go('menu')}>Browse the menu</Btn></Empty>;
  const tot = bagTotals(s, s.phone.bag, rewardId);
  const affordable = s.rewards.filter((r) => r.pts <= me.points).sort((a, b) => b.pts - a.pts);
  const send = () => { const id = sendOrderForm({ mode, when, note: note.trim(), rewardId: me.member ? rewardId : null, deals, join, phone: needPhone ? phone.replace(/\D/g, '') : undefined }); if (id) onSent(id); };
  return (
    <>
      <div className="h2">Your bag</div>
      <div className="wcard flush wlist">
        {s.phone.bag.map((l) => {
          const m = s.menu.find((x) => x.id === l.mid) || { name: '?', price: 0 };
          const dipList = (l.dips || []).map((d) => s.menu.find((x) => x.id === d)).filter(Boolean);
          const unit = m.price + sum(dipList, (d) => d.price);
          return (
            <div key={l.key} className="witem" style={{ alignItems: 'flex-start' }}>
              <div className="grow col gap-4">
                <div className="strong">{m.name}{l.flavors && l.flavors.length ? ` · ${l.flavors.join(' + ')}` : ''}</div>
                {m.details && m.flavors ? <div className="muted small">{m.details}</div> : null}
                {dipList.map((d) => <div key={d.id} className="muted small">+ {d.name} {peso(d.price)}</div>)}
                <div className="strong num small">{peso(unit * l.qty)}</div>
              </div>
              <Stepper value={l.qty} onChange={(v) => setBagQty(l.key, v)} min={0} max={20} />
            </div>
          );
        })}
      </div>
      <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => go('menu')}><Icon name="plus" size={14} />Add more items</button>
      <Seg full options={['Pick-up', 'Dine-in']} value={mode} onChange={setMode} label="Pick-up or dine-in" />
      <div className="wcard col">
        <label className="fld-l" htmlFor="bag-when">{mode === 'Pick-up' ? 'Pick up at' : 'Dine in at'}</label>
        <select id="bag-when" className="inp" value={String(when)} onChange={(e) => setWhen(e.target.value === 'asap' ? 'asap' : Number(e.target.value))}>
          <option value="asap">As soon as possible (about {wait} min)</option>
          {slots.map((x) => <option key={x} value={String(x)}>{fmtTime(x)}</option>)}
        </select>
        <div className="row gap-8 small muted"><Icon name="map-pin" size={14} /><span className="grow">Bak Bak, {s.settings.business.address}</span><button type="button" className="link" onClick={() => toast('Maps open outside this demo', 'phone')}>Map</button></div>
      </div>
      <Field label="Note for the kitchen" htmlFor="bag-note"><textarea id="bag-note" className="inp" rows={2} placeholder="e.g. Extra crispy, sauce on the side" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {me.member && (
        <button type="button" className="wcard row gap-12" style={{ textAlign: 'left', width: '100%' }} onClick={() => setSheet({ type: 'reward', current: rewardId, onPick: setRewardId, points: me.points })}>
          <div className="tile sm"><Icon name="gift" size={18} /></div>
          <div className="grow"><div className="strong">{tot.reward ? `Using ${tot.reward.name}` : 'Use a reward'}</div><div className="muted small">{me.points} points · {affordable.length ? `${affordable[0].name} (${affordable[0].pts} pts) is available` : 'Keep earning to unlock rewards'}</div></div>
          <Icon name="chevron-right" size={18} />
        </button>
      )}
      <div className="wcard col">
        <div className="row between"><span className="muted">Subtotal</span><span className="num">{peso(tot.sub)}</span></div>
        {tot.discount > 0 && <div className="row between ok"><span>{tot.reward.name} (−{tot.reward.pts} pts)</span><span className="num">−{peso(tot.discount)}</span></div>}
        <div className="row between strong" style={{ fontSize: 17 }}><span>Total</span><span className="num">{peso(tot.total)}</span></div>
        {member && <div className="small ok strong">You'll earn {tot.pts} points with this order</div>}
      </div>
      <div className="small muted">Ready for {mode === 'Pick-up' ? 'pick-up' : 'dine-in'} in about {wait} min (cooked to order). Need delivery? Order on Foodpanda or Grab.</div>
      {needPhone && <Field label="Mobile number" htmlFor="bag-phone" hint="So the store can reach you about this order."><input id="bag-phone" className="inp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 123 4567" /></Field>}
      {!me.member && (
        <div id="bag-account-note" className="wcard row gap-12">
          <div className="tile sm"><Icon name="user-plus" size={18} /></div>
          <div className="grow small"><span className="strong">New here?</span> Before you pay, create a free Bak Bak account to get {tot.pts} points for this order and a free Ranch Dip.</div>
          <button type="button" className="link small" onClick={() => go('signup')}>Create</button>
        </div>
      )}
      <label className="check"><input id="bag-consent" type="checkbox" checked={deals} onChange={(e) => setDeals(e.target.checked)} /><span>{s.settings.consentText}</span></label>
      <div className="tiny faint">Order updates (confirmation, ready for pick-up) come in this chat either way.</div>
      {!open && <div className="small bad strong">We’re closed right now. We open at {hm12(s.settings.business.open)}.</div>}
      <Btn kind="primary" size="lg" block disabled={!open || !phoneOk} onClick={send}>Send order · {peso(tot.total)}</Btn>
    </>
  );
}

function Orders({ s, me, go }) {
  const list = s.orders.filter((o) => o.cid === me.id).sort((a, b) => b.ts - a.ts);
  if (!list.length) return <Empty icon="receipt-text" title="No orders yet" text="Orders you send from Messenger show up here."><Btn kind="primary" onClick={() => go('menu')}>Order now</Btn></Empty>;
  return (
    <>
      <div className="h2">Your orders</div>
      <div className="wcard flush wlist">
        {list.map((o) => (
          <button type="button" key={o.id} className="witem" style={{ width: '100%', border: 0, background: 'none', textAlign: 'left' }} onClick={() => go('track', { id: o.id })}>
            <div className="tile sm grey"><Icon name="receipt-text" size={18} /></div>
            <div className="grow"><div className="strong">#{o.id} · {peso(o.total)}</div><div className="muted small ellipsis">{itemsLabel(o.items)}</div><div className="faint tiny">{fmtWhen(o.ts, now(s))}</div></div>
            {customerStatus(o)}
          </button>
        ))}
      </div>
    </>
  );
}

function Track({ s, t, me, id, go, onChat, onPay }) {
  const o = (id && orderById(s, id)) || s.orders.filter((x) => x.cid === me.id && ACTIVE.includes(x.status)).sort((a, b) => b.ts - a.ts)[0];
  if (!o) return <Empty icon="receipt-text" title="No open orders" text="When you send an order from Messenger, you can follow it here."><Btn kind="primary" onClick={() => go('menu')}>Order now</Btn></Empty>;
  const flav = o.items.find((i) => i.flavors && i.flavors.length);
  const order = ['awaiting', 'paid', 'preparing', 'ready', 'completed'];
  const idx = order.indexOf(o.status === 'rider' ? 'ready' : o.status);
  const late = o.readyBy && t > o.readyBy && (o.status === 'paid' || o.status === 'preparing');
  const steps = [
    { label: 'Confirmed', done: idx >= 1, sub: o.paidAt ? `${fmtTime(o.paidAt)} · Paid via ${o.pay}` : 'Waiting for your payment' },
    { label: 'Preparing', done: idx >= 2, sub: o.prepAt ? `${fmtTime(o.prepAt)} · Cooking your ${flav ? flav.flavors.join(' + ') : 'order'}` : 'The kitchen starts once paid' },
    { label: o.type === 'Dine-in' ? 'Ready to serve' : 'Ready for pick-up', done: idx >= 3, sub: o.readyAt ? `${fmtTime(o.readyAt)} · At the counter` : o.readyBy ? `Around ${fmtTime(o.readyBy)} · We'll message you when it's ready` : 'We’ll message you when it’s ready' },
    { label: 'Completed', done: idx >= 4, sub: o.doneAt ? (o.ptsAdded ? `${o.pts} points added` : 'Enjoy your meal!') : 'After you pick it up' },
  ];
  const hero = o.status === 'cancelled' ? ['Cancelled', o.cancelReason || ''] : o.status === 'awaiting' ? ['Waiting for payment', `${peso(o.total)} · pay first, then we cook`] : o.status === 'ready' ? ['Ready at the counter', 'Show this page or your chat when you pick it up'] : o.status === 'completed' ? ['Completed', `Picked up ${fmtTime(o.doneAt)}`] : [late ? 'Running a little late' : o.type === 'Dine-in' ? 'Ready to serve' : 'Ready for pick-up', `Around ${fmtTime(o.readyBy)} · about ${Math.max(1, Math.round((o.readyBy - t) / MIN))} min · cooked to order`];
  return (
    <>
      <div><div className="h2">Order #{o.id}</div><div className="muted small">Placed {fmtTime(o.ts)} · {o.type} at {s.settings.business.short}</div></div>
      <div className="wcard col" style={{ background: o.status === 'ready' ? 'var(--ok-soft)' : late ? 'var(--warn-soft)' : undefined }}>
        <div className="eyebrow">Status</div>
        <div className="h1" style={{ fontSize: 24 }}>{hero[0]}</div>
        <div className="muted small">{hero[1]}</div>
        {o.status === 'awaiting' && <Btn kind="primary" size="lg" block onClick={() => onPay(o.id)}>Pay {peso(o.total)} in Messenger</Btn>}
      </div>
      {o.status !== 'cancelled' && (
        <div className="wcard timeline">
          {steps.map((st, i) => (
            <div key={st.label} className={cx('tl', st.done && 'done', !st.done && i === idx && 'now')}>
              <div className="tl-dot">{st.done ? <Icon name="check" size={14} stroke={3} /> : <span className="tiny strong">{i + 1}</span>}</div>
              <div><div className="strong">{st.label}</div><div className="muted small">{st.sub}</div>{st.label === 'Completed' && o.status === 'completed' && !o.rating && <button type="button" className="link small" onClick={() => go('rate', { id: o.id })}>Rate your order</button>}</div>
            </div>
          ))}
        </div>
      )}
      <div className="wcard col">
        {o.items.map((i, k) => <div key={k} className="row between small"><span>{i.qty}× {i.name}{i.flavors.length ? ' · ' + i.flavors.join(' + ') : ''}</span><span className="num">{peso(i.price * i.qty)}</span></div>)}
        {o.discount > 0 && <div className="row between small ok"><span>Reward</span><span className="num">−{peso(o.discount)}</span></div>}
        <div className="row between strong"><span>{o.paidAt ? 'Total paid' : 'Total'}</span><span className="num">{peso(o.total)}</span></div>
        {o.note && <div className="muted small">Note: {o.note}</div>}
      </div>
      <button type="button" className="wcard row gap-12" style={{ textAlign: 'left', width: '100%' }} onClick={() => onChat(o.id)}>
        <div className="tile sm blue"><Icon name="message-circle" size={18} /></div>
        <div className="grow"><div className="strong">Something wrong?</div><div className="muted small">Chat with us about this order</div></div>
        <Icon name="chevron-right" size={18} />
      </button>
    </>
  );
}

function Rewards({ s, me, go, setSheet }) {
  const { next, ready } = nextReward(s, me.points);
  const pct = next ? Math.min(100, (me.points / next.pts) * 100) : 100;
  const acts = s.ledger.filter((l) => l.cid === me.id).slice(0, 8);
  const vouchers = s.vouchers.filter((v) => v.cid === me.id).slice(0, 3);
  return (
    <>
      <div className="hero-gold">
        <div className="row gap-4 small strong"><Icon name="gift" size={14} />Your points</div>
        <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="pts">{me.points}</span><span className="strong">pts</span></div>
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
        <div className="small strong">{next ? `${next.pts - me.points} more points to get ${next.short || next.name}` : 'You can redeem every reward!'}</div>
        <div className="small">You earn 1 point for every ₱{s.settings.earnPer} of food.</div>
      </div>
      <div className="h3">Redeem</div>
      <div className="wcard flush wlist">
        {s.rewards.map((r) => {
          const can = me.points >= r.pts;
          const isReady = ready && ready.id === r.id;
          return (
            <div key={r.id} className="witem">
              <div className={cx('tile sm', !can && 'grey')}><Icon name={r.icon} size={18} /></div>
              <div className="grow"><div className="strong row gap-4">{r.name}{isReady && <Badge tone="green">Ready</Badge>}</div><div className="muted small">{r.pts} pts</div></div>
              {can ? <Btn size="sm" kind={isReady ? 'primary' : 'soft'} onClick={() => setSheet({ type: 'redeem', rewardId: r.id, cid: me.id })}>Redeem</Btn> : <span className="muted small">{r.pts - me.points} more</span>}
            </div>
          );
        })}
      </div>
      {vouchers.length > 0 && (
        <>
          <div className="h3">Your vouchers</div>
          <div className="wcard flush wlist">{vouchers.map((v) => <div key={v.code} className="witem"><div className="tile sm"><Icon name="tag" size={18} /></div><div className="grow"><div className="strong">{v.name}</div><div className="muted small">Show at the counter · {fmtWhen(v.ts, now(s))}</div></div><span className="strong num">{v.code}</span></div>)}</div>
        </>
      )}
      <div className="h3">Recent activity</div>
      {acts.length ? (
        <div className="wcard flush wlist">
          {acts.map((a) => <div key={a.id} className="witem"><div className="grow"><div className="strong small">{a.label}</div><div className="faint tiny">{fmtWhen(a.ts, now(s))}</div></div><span className={cx('strong num', a.pts > 0 ? 'ok' : 'muted')}>{a.pts > 0 ? '+' : '−'}{Math.abs(a.pts)} pts</span></div>)}
        </div>
      ) : <div className="muted small">No points activity yet.</div>}
      <button type="button" className="link" onClick={() => go('claim')}><Icon name="qr-code" size={14} />Claim points from a Bak Bak card (Foodpanda or Grab)</button>
    </>
  );
}

function Claim({ s, me, params, go }) {
  const [code, setCode] = useState(params.code || '');
  const [found, setFound] = useState(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const lookup = (c = code) => { const r = findCode(getState(), c); if (r.error) { setErr(r.error); setFound(null); } else { setErr(''); setFound(r); } };
  useEffect(() => { if (params.code) { setCode(params.code); setDone(null); lookup(params.code); } }, [params.code]);
  if (!me.member) return <Empty icon="user-plus" title="Create your account first" text="Points from a Bak Bak card go to your Bak Bak account. It takes a minute, no app needed."><Btn kind="primary" onClick={() => go('signup')}>Create my account</Btn></Empty>;
  const claim = () => { const r = claimCode(found.code.code, me.id); if (r.error) { setErr(r.error); setFound(null); } else { setDone(r); setFound(null); } };
  if (done) {
    return (
      <div className="col gap-12" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 24 }}>
        <div className="tile" style={{ background: 'var(--ok-soft)', color: 'var(--ok)', borderRadius: '50%' }}><Icon name="check" size={28} stroke={3} /></div>
        <div className="h1">+{done.pts} points</div>
        <div className="muted">Added from {done.code.app} order {done.code.ref}. You now have {done.balance} points.</div>
        {done.welcome && <Badge tone="orange" icon="gift">+ Free Ranch Dip, your welcome gift. It’s in Your vouchers.</Badge>}
        <Btn kind="primary" size="lg" block onClick={() => go('rewards')}>See my rewards</Btn>
        <Btn kind="ghost" onClick={() => { setDone(null); setCode(''); }}>Claim another code</Btn>
      </div>
    );
  }
  return (
    <>
      <div className="h1">Claim points</div>
      <div className="wcard col gap-12">
        <div><div className="strong">Ordered on Foodpanda or Grab?</div><div className="muted small">Enter the code printed on your Bak Bak card. Points can only be claimed on this page.</div></div>
        <input id="claim-code" className={cx('inp code-inp', err && 'err')} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setErr(''); setFound(null); }} placeholder="BB-XXXX-XXXX" maxLength={14} autoComplete="off" aria-label="Card code" onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }} />
        {err && <div className="fld-e" role="alert">{err}</div>}
        {!found && <Btn kind="primary" size="lg" block disabled={code.replace(/[^A-Z0-9]/g, '').length < 10} onClick={() => lookup()}>Find my code</Btn>}
        <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => bus.emit('receipt:open', {})}><Icon name="scan-line" size={14} />Scan QR code instead</button>
      </div>
      {found && (
        <div className="wcard col">
          <div className="row between"><span className="strong">{found.code.app} order {found.code.ref}</span><Badge tone="green" icon="check">Code found</Badge></div>
          <div className="muted small">{found.code.label} · {fmtMD(found.code.date)}</div>
          <div className="row between"><span className="muted small">Food total {peso(found.code.food)}</span><span className="strong ok">+{found.pts} points</span></div>
          <Btn kind="primary" size="lg" block onClick={claim}>Claim {found.pts} points</Btn>
        </div>
      )}
      <div className="faint small">One use per code. Valid for 7 days after the order. Same rule as Messenger orders: 1 point for every ₱{s.settings.earnPer} of food. Your first claim also gets a free Ranch Dip.</div>
    </>
  );
}

function SignIn({ s, onDone }) {
  const me = cust(s, s.me);
  const [phone, setPhone] = useState(fmtPhone(me.phone));
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [deals, setDeals] = useState(false);
  const digits = phone.replace(/\D/g, '');
  const existing = s.customers.find((c) => c.phone === digits);
  const valid = /^09\d{9}$/.test(digits) && (existing || name.trim().length > 1);
  useEffect(() => { if (step === 2) { const id = setTimeout(() => setOtp('482173'), 800); return () => clearTimeout(id); } }, [step]);
  if (step === 1) {
    return (
      <>
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 8 }}><Logo size={56} /><div className="h2 mt-8">Sign in to claim points</div><div className="muted small">Use your mobile number. We’ll text you a 6-digit code. No app, no password.</div></div>
        <Field label="Mobile number" htmlFor="signin-phone"><input id="signin-phone" className="inp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 123 4567" /></Field>
        {!existing && /^09\d{9}$/.test(digits) && <Field label="You’re new here. What’s your name?" htmlFor="signin-name"><input id="signin-name" className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></Field>}
        {existing && <div className="small ok strong">Welcome back, {firstName(existing.name)}!</div>}
        {!existing && <label className="check"><input id="signin-deals" type="checkbox" checked={deals} onChange={(e) => setDeals(e.target.checked)} /><span>Optional: send me Bak Bak deals by SMS. I can stop anytime.</span></label>}
        <div className="tiny faint">Bak Bak keeps your number only for your points and order history.</div>
        <Btn kind="primary" size="lg" block disabled={!valid} onClick={() => setStep(2)}>Send code</Btn>
      </>
    );
  }
  return (
    <>
      <div className="h2">Enter the code</div>
      <div className="muted small">We sent a 6-digit code by SMS to {maskPhone(digits)}. It works for 5 minutes. In this demo it fills in by itself.</div>
      <input id="signin-otp" className="inp code-inp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" aria-label="6-digit code" inputMode="numeric" />
      <Btn kind="primary" size="lg" block disabled={otp.length !== 6} onClick={() => onDone(existing ? existing.id : addCustomer({ name, phone: digits, channel: 'Foodpanda', consent: deals, member: true, self: 'Bak Bak card' }))}>Verify and continue</Btn>
      <Btn kind="ghost" onClick={() => setStep(1)}>Use another number</Btn>
    </>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function SignUp({ s, me, params = {}, go, onChat, onPay }) {
  const [name, setName] = useState(me.name || '');
  const [phone, setPhone] = useState(fmtPhone(me.phone || ''));
  const [bm, setBm] = useState('');
  const [bd, setBd] = useState('');
  const [deals, setDeals] = useState(me.consent === 'Yes');
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const digits = phone.replace(/\D/g, '');
  const valid = name.trim().length > 1 && /^09\d{9}$/.test(digits) && agree;
  const pendingOrder = s.orders.filter((o) => o.cid === me.id && o.channel === 'Messenger' && ['awaiting', 'paid', 'preparing', 'ready'].includes(o.status)).sort((a, b) => b.ts - a.ts)[0];
  useEffect(() => { if (step === 2) { const id = setTimeout(() => setOtp('591204'), 800); return () => clearTimeout(id); } }, [step]);
  if (me.member && !done) return <Account s={s} me={me} go={go} />;
  if (done) {
    const payOrderId = params.afterPayOrderId;
    const payOrderObj = payOrderId ? orderById(s, payOrderId) : null;
    return (
      <div className="col gap-12" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 24 }}>
        <div className="tile" style={{ background: 'var(--ok-soft)', color: 'var(--ok)', borderRadius: '50%' }}><Icon name="check" size={28} stroke={3} /></div>
        <div className="h1">Welcome, {firstName(name)}!</div>
        <div className="muted">Your Bak Bak account is ready.{done.pending ? ` ${done.pending} points from your order go in when you pick it up.` : ''}</div>
        {done.welcome && <Badge tone="orange" icon="gift">Free Ranch Dip, your welcome gift. It’s in Rewards.</Badge>}
        {payOrderObj && onPay && (
          <Btn kind="primary" size="lg" block icon="wallet" onClick={() => onPay(payOrderId)}>
            Pay {peso(payOrderObj.total)} for Order #{payOrderId}
          </Btn>
        )}
        <Btn kind={payOrderObj ? "soft" : "primary"} size="lg" block onClick={() => go('account')}>Go to my account</Btn>
        <Btn kind="ghost" onClick={onChat}>Back to the chat</Btn>
      </div>
    );
  }
  if (step === 2) {
    return (
      <>
        <div className="h2">Enter the code</div>
        <div className="muted small">We sent a 6-digit code by SMS to {maskPhone(digits)} to check the number is yours. It works for 5 minutes. In this demo it fills in by itself.</div>
        <input id="signup-otp" className="inp code-inp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" aria-label="6-digit code" inputMode="numeric" />
        {err && <div className="fld-e" role="alert">{err}</div>}
        <Btn kind="primary" size="lg" block disabled={otp.length !== 6} onClick={() => { const r = createAccount(me.id, { name, phone: digits, deals, birthday: bm && bd ? `${bm} ${bd}` : null, via: 'Messenger' }); if (r.error) { setErr(r.error); } else setDone(r); }}>Create my account</Btn>
        <Btn kind="ghost" onClick={() => { setStep(1); setOtp(''); setErr(''); }}>Change my number</Btn>
      </>
    );
  }
  return (
    <>
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 8 }}><Logo size={56} /><div className="h2 mt-8">Create your Bak Bak account</div><div className="muted small">Free. Earn points on every order, keep your order history, and get a free Ranch Dip on us. No app, no password.</div></div>
      {pendingOrder && <div className="wcard row gap-12"><div className="tile sm"><Icon name="gift" size={18} /></div><div className="grow small"><span className="strong">+{Math.floor(pendingOrder.total / s.settings.earnPer)} points</span> for order #{pendingOrder.id} once your account is ready.</div></div>}
      <Field label="Full name" htmlFor="signup-name" hint="From your Messenger profile. You can change it."><input id="signup-name" className="inp" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Mobile number" htmlFor="signup-phone" hint="Your points are kept under this number."><input id="signup-phone" className="inp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 123 4567" /></Field>
      <Field label="Birthday (optional)" hint="For a birthday treat. No year needed.">
        <div className="row gap-8">
          <select id="signup-bm" className="inp" value={bm} onChange={(e) => setBm(e.target.value)} aria-label="Birthday month"><option value="">Month</option>{MONTHS.map((m) => <option key={m}>{m}</option>)}</select>
          <select id="signup-bd" className="inp" value={bd} onChange={(e) => setBd(e.target.value)} aria-label="Birthday day"><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select>
        </div>
      </Field>
      <label className="check"><input id="signup-deals" type="checkbox" checked={deals} onChange={(e) => setDeals(e.target.checked)} /><span>{s.settings.consentText}</span></label>
      <label className="check"><input id="signup-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I’ve read the <button type="button" className="link" onClick={() => toast('Privacy notice: Bak Bak keeps your name, number, orders and points to run your account. Only staff who need them can see them. You can ask for a copy or ask us to delete your account anytime.', 'phone')}>privacy notice</button>. Bak Bak keeps my name, number, orders and points for my account.</span></label>
      <Btn kind="primary" size="lg" block disabled={!valid} onClick={() => setStep(2)}>Send code</Btn>
      <div className="tiny faint">You can still order without an account. You just won’t get points.</div>
    </>
  );
}

function Account({ s, me, go }) {
  const orders = s.orders.filter((o) => o.cid === me.id);
  const pending = orders.filter((o) => o.pts > 0 && !o.ptsAdded && ['awaiting', 'paid', 'preparing', 'ready'].includes(o.status));
  const acct = me.account;
  const req = (kind) => { const id = privacyRequest(me.id, kind); if (id) toast(kind === 'delete' ? 'Request sent. Bak Bak will confirm it’s you in Messenger, then delete your account.' : 'Request sent. Bak Bak will send a copy of your data in Messenger.', 'phone', 'good'); };
  return (
    <>
      <div className="wcard row gap-12">
        <div className="tile" style={{ borderRadius: '50%', background: 'var(--gold-1)', color: '#fff', fontWeight: 700 }}>{firstName(me.name).slice(0, 1)}</div>
        <div className="grow"><div className="h3">{me.name}</div><div className="muted small">{maskPhone(me.phone)} · verified</div><div className="tiny faint">{acct ? `Member since ${fmtMD(acct.at)} · created in ${acct.via}` : `Member since ${fmtMD(me.since)}`}</div></div>
      </div>
      <button type="button" className="hero-gold" style={{ textAlign: 'left', width: '100%' }} onClick={() => go('rewards')}>
        <div className="row gap-4 small strong"><Icon name="gift" size={14} />Bak Bak Rewards</div>
        <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="pts">{me.points}</span><span className="strong">points</span></div>
        {pending.length > 0 && <div className="small">+{sum(pending, (o) => o.pts)} more when you pick up #{pending.map((o) => o.id).join(', #')}</div>}
      </button>
      <div className="wcard flush wlist">
        <button type="button" className="witem" onClick={() => go('orders')}><Icon name="receipt-text" size={18} /><span className="grow">My orders</span><span className="muted small">{orders.length}</span><Icon name="chevron-right" size={16} /></button>
        <button type="button" className="witem" onClick={() => go('rewards')}><Icon name="gift" size={18} /><span className="grow">Rewards and vouchers</span><Icon name="chevron-right" size={16} /></button>
        <div className="witem"><Icon name="calendar-days" size={18} /><span className="grow">Birthday</span><span className="muted small">{me.birthday || 'Not set'}</span></div>
        <label className="witem"><Icon name="megaphone" size={18} /><span className="grow">Bak Bak deals in Messenger or SMS</span><input id="acct-deals" type="checkbox" checked={me.consent === 'Yes'} onChange={(e) => updateCustomer(me.id, { consent: e.target.checked ? 'Yes' : 'No' })} /></label>
      </div>
      <div className="h3">Privacy</div>
      <div className="wcard flush wlist">
        <button type="button" id="acct-copy" className="witem" onClick={() => req('copy')}><Icon name="download" size={18} /><span className="grow">Ask for a copy of my data</span><Icon name="chevron-right" size={16} /></button>
        <button type="button" id="acct-delete" className="witem bad" onClick={() => req('delete')}><Icon name="trash-2" size={18} /><span className="grow">Delete my account</span><Icon name="chevron-right" size={16} /></button>
      </div>
      <div className="tiny faint">This page opens inside Messenger, so you’re already signed in. Order updates come in the chat whether or not you get deals.</div>
    </>
  );
}

function Rate({ s, id, onDone }) {
  const o = orderById(s, id);
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  if (!o) return <Empty icon="star" title="Order not found" />;
  if (o.rating) return <Empty icon="star" title="Thanks for rating!" text={`You gave order #${o.id} ${o.rating} out of 5.`}><Btn onClick={onDone}>Back to chat</Btn></Empty>;
  const labels = ['', 'Bad', 'Not great', 'Okay', 'Good', 'Great'];
  return (
    <>
      <div className="col" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="tile" style={{ background: 'var(--ok-soft)', color: 'var(--ok)', borderRadius: '50%' }}><Icon name="check" size={26} stroke={3} /></div>
        <div className="h2">Order completed</div>
        <div className="muted small">#{o.id}{o.ptsAdded ? ` · +${o.pts} points added` : ''}</div>
      </div>
      <div className="wcard col" style={{ alignItems: 'center' }}>
        <div className="strong">How was your order?</div>
        <div className="stars">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= stars ? 'on' : ''} onClick={() => setStars(n)}><Icon name="star" size={34} stroke={1.6} style={{ fill: n <= stars ? 'currentColor' : 'none' }} /></button>)}</div>
        <div className="strong">{labels[stars]}</div>
      </div>
      <div className="h3">{stars >= 4 ? 'What did you like?' : 'What went wrong?'}</div>
      <div className="chips" style={{ flexWrap: 'wrap' }}>{['Speed', 'Taste', 'Crispiness', 'Packaging', 'Service', 'Price'].map((x) => <button type="button" key={x} className={tags.includes(x) ? 'on' : ''} onClick={() => setTags((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))}>{x}</button>)}</div>
      <textarea id="rate-comment" className="inp" rows={3} placeholder="Tell us more (optional)" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comment" />
      <Btn kind="primary" size="lg" block onClick={() => { rateOrder(o.id, stars, tags, comment.trim()); toast('Thanks for rating!', 'phone', 'good'); onDone(); }}>Submit rating</Btn>
      <Btn kind="ghost" block onClick={onDone}>Skip for now</Btn>
    </>
  );
}

// ---------------- bottom sheets ----------------
function SheetBody({ s, sheet, close }) {
  if (sheet.type === 'item') return <ItemSheet s={s} mid={sheet.mid} close={close} />;
  if (sheet.type === 'pay') return <PaySheet s={s} orderId={sheet.orderId} close={close} />;
  if (sheet.type === 'pre-pay-signup') return <PrePaySignupSheet s={s} orderId={sheet.orderId} close={close} openPay={sheet.openPay} openSignup={sheet.openSignup} />;
  if (sheet.type === 'reward') return <RewardPick s={s} sheet={sheet} close={close} />;
  if (sheet.type === 'redeem') return <RedeemSheet s={s} sheet={sheet} close={close} />;
  return null;
}

function PrePaySignupSheet({ s, orderId, close, openPay, openSignup }) {
  const o = orderById(s, orderId);
  if (!o) return null;
  const pts = Math.floor(o.total / s.settings.earnPer);
  return (
    <>
      <div className="grab" />
      <div className="row gap-12 start">
        <div className="tile sm" style={{ background: 'var(--gold-1)', color: '#fff' }}><Icon name="gift" size={20} /></div>
        <div className="grow">
          <div className="h2">Get points for this order</div>
          <div className="muted small">Create your free account in 1 minute to earn points. You can also skip and pay now.</div>
        </div>
      </div>
      <div className="mcard gold">
        <div className="mcard-h"><span className="row gap-4"><Icon name="gift" size={14} />Bak Bak Rewards</span><span className="tiny">Free account</span></div>
        <div className="mcard-b">
          <div className="strong">+{pts} points for this order</div>
          <div className="muted small">Plus a free Ranch Dip welcome gift</div>
          <div className="muted small">Earn 1 point for every ₱{s.settings.earnPer} of food</div>
        </div>
      </div>
      <Btn kind="primary" size="lg" block icon="user-plus" onClick={openSignup}>Create my account</Btn>
      <Btn kind="ghost" block onClick={openPay}>Skip and pay now</Btn>
    </>
  );
}

function PaySheet({ s, orderId, close }) {
  const o = orderById(s, orderId);
  const [method, setMethod] = useState('GCash');
  const [step, setStep] = useState('pick');
  if (!o) return null;
  if (o.status !== 'awaiting') return <><div className="grab" /><div className="h2">Order #{o.id}</div><div className="muted">This order is already {STATUS_LABEL[o.status].toLowerCase()}.</div><Btn block onClick={close}>Close</Btn></>;
  const pay = () => {
    setStep('wallet');
    const ref = String(Math.floor(1e12 + Math.random() * 8.9e12)).replace(/(\d{4})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
    setTimeout(() => { payOrder(o.id, method, ref); close(); }, 1400);
  };
  return (
    <>
      <div className="grab" />
      <div className="tiny faint row gap-4"><Icon name="lock-keyhole" size={12} />Secure pay link · opened in Messenger</div>
      <div className="h2">Pay {peso(o.total)}</div>
      <div className="muted small">Order #{o.id} · Advance payment only, no COD. We start cooking once it shows as paid.</div>
      <Seg full options={['GCash', 'QR Ph']} value={method} onChange={setMethod} label="Payment method" />
      <div className="wcard col small">
        {method === 'GCash'
          ? <><div className="strong">You finish in the GCash app</div><div className="muted">GCash asks for your MPIN there. Bak Bak never sees it.</div></>
          : <><div className="strong">QR Ph: any bank or e-wallet</div><div className="muted">Save the QR, then open it in your bank or e-wallet app.</div></>}
        <div className="row between"><span className="muted">Pay to</span><span className="strong">Bak Bak Boneless Chicken</span></div>
        <div className="row between"><span className="muted">Amount</span><span className="strong num">{peso(o.total)}</span></div>
      </div>
      <div className="tiny faint">The payment shows up in BakBak CRM by itself, so there is no screenshot to send. The link expires in 15 minutes. No real payment is made in this demo.</div>
      <Btn kind="primary" size="lg" block disabled={step !== 'pick'} onClick={pay}>{step === 'wallet' ? (method === 'GCash' ? 'Waiting for GCash…' : 'Waiting for your bank…') : method === 'GCash' ? `Pay ${peso(o.total)} with GCash` : `Pay ${peso(o.total)} with QR Ph`}</Btn>
      <Btn kind="ghost" block disabled={step !== 'pick'} onClick={close}>Not now</Btn>
    </>
  );
}

function RewardPick({ s, sheet, close }) {
  return (
    <>
      <div className="grab" />
      <div className="h2">Use a reward</div>
      <div className="muted small">You have {sheet.points} points. Points are used when you pay.</div>
      <div>
        <label className="opt"><span>Don’t use a reward</span><input type="radio" name="reward" checked={!sheet.current} onChange={() => { sheet.onPick(null); close(); }} /></label>
        {s.rewards.map((r) => (
          <label key={r.id} className="opt" style={{ opacity: r.pts > sheet.points ? 0.5 : 1 }}>
            <span>{r.name} <span className="muted small">· {r.pts} pts · saves {peso(r.value)}</span></span>
            <input type="radio" name="reward" disabled={r.pts > sheet.points} checked={sheet.current === r.id} onChange={() => { sheet.onPick(r.id); close(); }} />
          </label>
        ))}
      </div>
    </>
  );
}

function RedeemSheet({ s, sheet, close }) {
  const r = s.rewards.find((x) => x.id === sheet.rewardId);
  const [v, setV] = useState(null);
  const [err, setErr] = useState('');
  if (!r) return null;
  if (v) {
    return (
      <>
        <div className="grab" />
        <div className="col" style={{ alignItems: 'center', textAlign: 'center' }}><Badge tone="green" lg icon="check">Redeemed</Badge><div className="h2 mt-8">{r.name}</div><div className="muted small">Show this code at the counter. Staff will mark it as used.</div></div>
        <div className="codebox">{v.code}</div>
        <Btn kind="primary" size="lg" block onClick={close}>Done</Btn>
      </>
    );
  }
  return (
    <>
      <div className="grab" />
      <div className="h2">Redeem {r.name}?</div>
      <div className="muted small">This uses {r.pts} of your points. You’ll get a code to show at the counter.</div>
      {err && <div className="fld-e">{err}</div>}
      <Btn kind="primary" size="lg" block onClick={() => { const res = redeemReward(sheet.cid, r.id); if (res.error) setErr(res.error); else setV(res.voucher); }}>Redeem for {r.pts} points</Btn>
      <Btn kind="ghost" block onClick={close}>Not now</Btn>
    </>
  );
}
