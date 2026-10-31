// BakBak CRM working prototype: the customer's phone (Messenger + the no-download order and rewards page)
// next to the BakBak CRM workspace. Everything runs in this page and is saved in this browser until "Reset demo".
import { useStore, bus, toast, resetDemo, getState, now, startNewCustomer, switchToReturning } from './store.js';
import { Phone } from './phone.jsx';
import { Admin } from './admin-shell.jsx';
import { Icon, Logo, Btn, Badge, Modal, Seg, Toasts, FakeQR, Popover } from './ui.jsx';
import { peso, fmtMD, DAY, cx } from './util.js';

const { useState, useEffect, useRef } = React;
const VIEWS = ['customer', 'admin', 'both'];
const readHash = () => { const h = (location.hash || '').replace('#', ''); return VIEWS.includes(h) ? h : null; };

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return vp;
}

function App() {
  const s = useStore();
  const vp = useViewport();
  const wide = vp.w >= 1100;
  const [view, setView] = useState(() => readHash() || (window.innerWidth >= 1100 ? 'both' : 'customer'));
  const eff = view === 'both' && !wide ? 'customer' : view;
  const [receipt, setReceipt] = useState(null);
  const [guide, setGuide] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const live = useRef({});
  live.current = { eff, wide };
  const pendingPhone = useRef(null);
  const pendingAdmin = useRef(null);
  const choose = (v) => { setView(v); try { history.replaceState(null, '', '#' + v); } catch (e) { /* ignore */ } };
  useEffect(() => { const f = () => { const h = readHash(); if (h) setView(h); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => bus.on('receipt:open', (d) => setReceipt(d || {})), []);
  useEffect(() => bus.on('guide:open', () => setGuide(true)), []);
  // If the phone or the CRM is hidden, switch the view first, then pass the request on once it is showing.
  useEffect(() => bus.on('phone:open', (d) => { if (live.current.eff === 'admin') { pendingPhone.current = d; choose(live.current.wide ? 'both' : 'customer'); } }), []);
  useEffect(() => bus.on('admin:go', (d) => { if (live.current.eff === 'customer') { pendingAdmin.current = d; choose(live.current.wide ? 'both' : 'admin'); } }), []);
  const phoneShown = eff !== 'admin';
  const adminShown = eff !== 'customer';
  useEffect(() => { if (phoneShown && pendingPhone.current) { const d = pendingPhone.current; pendingPhone.current = null; setTimeout(() => bus.emit('phone:open', d), 80); } }, [phoneShown]);
  useEffect(() => { if (adminShown && pendingAdmin.current) { const d = pendingAdmin.current; pendingAdmin.current = null; setTimeout(() => bus.emit('admin:go', d), 80); } }, [adminShown]);

  const bare = eff === 'customer' && (vp.w < 520 || vp.h < 640);
  const scale = Math.min(1, Math.max(0.5, (vp.h - 52 - 36 - 64) / 866));
  const views = [...(wide ? [{ value: 'both', label: 'Both' }] : []), { value: 'customer', label: 'Customer' }, { value: 'admin', label: 'BakBak CRM' }];
  return (
    <>
      <header className="demobar">
        <div className="brand"><Logo size={26} /><span>Bak Bak <small>· working prototype</small></span></div>
        <Seg options={views} value={eff} onChange={choose} label="Show" />
        <span className="spacer" />
        <Btn size="sm" kind="ghost" icon="book-open" onClick={() => setGuide(true)}>Guide</Btn>
        <div style={{ position: 'relative' }}>
          <Btn size="sm" icon="rotate-ccw" onClick={() => setResetAsk((v) => !v)}>Reset</Btn>
          <Popover open={resetAsk} onClose={() => setResetAsk(false)} width={260}>
            <div className="col" style={{ padding: 8 }}>
              <div className="strong">Reset the demo?</div>
              <div className="small muted">Clears every order, chat and change you made, and starts again at 3:45 PM.</div>
              <div className="row end mt-4"><Btn size="sm" onClick={() => setResetAsk(false)}>Cancel</Btn><Btn size="sm" kind="primary" onClick={() => { setResetAsk(false); try { sessionStorage.removeItem('bakbak-crm-page'); } catch (e) { /* ignore */ } resetDemo(); setTimeout(() => toast('Demo reset. Everything is back to the start.', 'app', 'good'), 50); }}>Reset</Btn></div>
            </div>
          </Popover>
        </div>
      </header>
      <div className={cx('stage', eff)}>
        {phoneShown && (
          <div className={cx('stage-phone', bare && 'bare')}>
            <Phone bare={bare} scale={bare ? null : scale} />
            {!bare && (
              <div className="shortcuts">
                <span className="lbl">Try it</span>
                <Btn size="sm" icon="qr-code" onClick={() => setReceipt({ code: 'BB-7K2Q-9XMA' })}>Bak Bak card</Btn>
                {s.me === 'geanne'
                  ? <Btn size="sm" icon="user-plus" onClick={() => { startNewCustomer(); toast('The phone is now Miguel, a first-time customer with no account', 'app'); }}>New customer</Btn>
                  : <Btn size="sm" icon="user" onClick={() => { switchToReturning(); toast('The phone is Geanne again, a returning member', 'app'); }}>Back to Geanne</Btn>}
                <Btn size="sm" icon="book-open" onClick={() => setGuide(true)}>What to try</Btn>
              </div>
            )}
          </div>
        )}
        {adminShown && <div className="stage-admin"><Admin /></div>}
      </div>
      {receipt && <ReceiptModal s={s} code={receipt.code} onClose={() => setReceipt(null)} />}
      {guide && <GuideModal onClose={() => setGuide(false)} openReceipt={() => { setGuide(false); setReceipt({ code: 'BB-7K2Q-9XMA' }); }} />}
      <Toasts scope="app" />
    </>
  );
}

function ReceiptModal({ s, code: code0, onClose }) {
  const t = now(s);
  const usable = s.codes.filter((c) => !c.usedBy && t <= c.date + 7 * DAY);
  const [code, setCode] = useState(code0 && s.codes.some((c) => c.code === code0) ? code0 : (usable[0] || s.codes[0]).code);
  const c = s.codes.find((x) => x.code === code);
  const pts = Math.floor(c.food / s.settings.earnPer);
  const exp = c.date + 7 * DAY;
  const scan = () => { onClose(); bus.emit('phone:open', { page: 'claim', ctx: 'qr', params: { code: c.code } }); };
  return (
    <Modal size="sm" title="Bak Bak Rewards card" sub="Pre-printed. Staff scan one to each Foodpanda and Grab order while packing and put it in the bag. Scan it with the phone to claim points." onClose={onClose} footer={<><Btn onClick={onClose}>Close</Btn><Btn kind="primary" icon="scan-line" onClick={scan}>Scan with the phone</Btn></>}>
      <select className="inp" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Card">
        {s.codes.map((x) => <option key={x.code} value={x.code}>{x.app} {x.ref} · {x.code}{x.usedBy ? ' (claimed)' : t > x.date + 7 * DAY ? ' (expired)' : ''}</option>)}
      </select>
      <div className="receipt">
        <Logo size={40} />
        <div className="strong">Thanks for ordering Bak Bak!</div>
        <div className="small muted">Ordered on Foodpanda or Grab? Join free: get {pts} points for this order and a free Ranch Dip on your first claim.</div>
        <button type="button" className="qr-btn" onClick={scan} aria-label="Scan the QR code with the phone"><FakeQR text={c.code} size={132} /></button>
        <div className="codebox" style={{ fontSize: 18 }}>{c.code}</div>
        <div className="steps">
          <div><b>1</b><span>Scan the QR with your phone camera. No app to download.</span></div>
          <div><b>2</b><span>Sign in with your mobile number (6-digit SMS code).</span></div>
          <div><b>3</b><span>Tap Claim: 1 point for every ₱{s.settings.earnPer} of food.</span></div>
        </div>
        <div className="tiny faint">Linked at packing to {c.app} {c.ref} · {c.label} · food {peso(c.food)} · one use · valid until {fmtMD(exp)}</div>
        {c.usedBy && <Badge tone="green">Already claimed</Badge>}
        {!c.usedBy && t > exp && <Badge>Expired</Badge>}
      </div>
    </Modal>
  );
}

const STEPS = [
  ['Sign in to BakBak CRM', 'The CRM side starts at the staff sign-in. Sign in as the owner (Liza), and the 2-step code fills in by itself. Pick another demo account to see what each role gets. Sign out from the avatar at the top right.', null],
  ['Chat with the bot', 'On the phone, type anything in Messenger, like “hi”, “magkano po?”, “open ba kayo bukas?” or “delivery”. Or tap a quick reply.', null],
  ['Order for pick-up and pay', 'Tap “Order for pick-up”, add a Half Garlic Parmesan with Ranch Dip, and send the order. In the chat, tap “Confirm and pay”, then pay through the GCash pay link.', { label: 'Open the order page', run: () => bus.emit('phone:open', { page: 'menu' }) }],
  ['Run the order in BakBak CRM', 'In Orders or the Kitchen display, tap Start cooking, Mark ready, then Picked up. The phone gets each message, the points are added, and a rating request comes in.', { label: 'Open Orders', run: () => bus.emit('admin:go', { page: 'orders' }) }],
  ['Order as a new customer and create an account', 'Tap “New customer” under the phone. Miguel has never ordered before. Give a mobile number for pick-up, order and pay. Then an invite comes to create a free Bak Bak account: name, number, an SMS code, and an optional birthday. The points, welcome Ranch Dip and My account page appear, and BakBak CRM shows “Account made by the customer”.', { label: 'Switch to Miguel', run: () => startNewCustomer() }],
  ['Ask for help', 'Type “my order is late” on the phone. The bot hands off, a ticket opens in Tickets, and the chat shows in the Inbox. Reply from the Inbox and it lands on the phone.', { label: 'Open the Inbox', run: () => bus.emit('admin:go', { page: 'inbox', params: { id: 'cv-geanne' } }) }],
  ['Claim points with a Bak Bak card', 'Open the Bak Bak card from a Foodpanda bag and scan it with the phone. Sign in with the SMS code, then claim the points (33 points for code BB-7K2Q-9XMA) and the welcome Ranch Dip. Each code works once.', { label: 'Show the card', receipt: true }],
  ['Pack a Grab order', 'In Orders, add a Grab order, open it and tap “Scan a card”. The card’s code is now linked to that order, ready for the buyer to claim.', { label: 'Open Orders', run: () => bus.emit('admin:go', { page: 'orders' }) }],
  ['Use decision support', 'On Today’s plan, approve the rush plan (the kitchen display gets the batches), the Soy Garlic promo (a draft campaign appears) and the FAQ fix (the bot’s delivery answer changes).', { label: 'Open Today’s plan', run: () => bus.emit('admin:go', { page: 'dss-today' }) }],
  ['Send a campaign', 'In Campaigns, make a new Messenger campaign for “Messenger regulars” and send it. Geanne is in that group, so it arrives on the phone.', { label: 'New campaign', run: () => bus.emit('admin:go', { page: 'campaigns', modal: 'newCampaign', props: { audience: 'Messenger regulars' } }) }],
  ['Change the setup', 'Change a price in Settings, turn a workflow off, add a chatbot answer, or switch “Viewing as” to Kitchen. The phone and the bot follow right away.', { label: 'Open Settings', run: () => bus.emit('admin:go', { page: 'settings' }) }],
];

function GuideModal({ onClose, openReceipt }) {
  return (
    <Modal size="lg" title="What to try" sub="The phone is the customer (Geanne, or Miguel if you tap New customer). BakBak CRM is the store’s side. Both work together." onClose={onClose} footer={<><span className="grow small muted">All data is simulated. Your changes stay in this browser until you press Reset.</span><Btn kind="primary" onClick={onClose}>Start</Btn></>}>
      {STEPS.map(([title, text, act], i) => (
        <div key={title} className="guide-step">
          <span className="n">{i + 1}</span>
          <div className="col gap-4">
            <div className="strong">{title}</div>
            <div className="small muted">{text}</div>
            {act && <div><Btn size="sm" kind="soft" iconRight="arrow-right" onClick={() => { if (act.receipt) return openReceipt(); onClose(); act.run(); }}>{act.label}</Btn></div>}
          </div>
        </div>
      ))}
      <div className="small faint">The clock starts on Saturday, Oct 17, 2026 at 3:45 PM and runs in real time. Bak Bak has no riders of its own: delivery happens only through Foodpanda and Grab, and Messenger orders are paid first with no COD.</div>
    </Modal>
  );
}

function Root() {
  const s = useStore();
  return <App key={s.seedId} />;
}

ReactDOM.createRoot(document.getElementById('app')).render(<Root />);
