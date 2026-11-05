// Chatbot (saved answers, hand-off keywords, test panel), Workflows, and Settings.
import {
  useStore, useNow, toast, getState, saveFaq, deleteFaq, toggleFaq, setHandoff, setBotLive, toggleWorkflow, saveWorkflow, wf,
  saveMenu, saveBusiness, savePrivacy, invite, ROLE_CAN, currentUser,
} from './store.js';
import { answer, fillFaq, WELCOME_QUICK, QUICK_MAP, welcomeMsg } from './bot.js';
import { Icon, Logo, Btn, Badge, Modal, Toggle, Tabs, Field, Empty, Avatar } from './ui.jsx';
import { useAdmin, PageHead, Stat, RangeBar, rangeOf, rangeStats } from './admin-common.jsx';
import { staffList } from './p-service.jsx';
import { peso, fmtWhen, fmtAgo, hm12, cx, num } from './util.js';

const { useState, useRef, useEffect } = React;

export function Chatbot() {
  const s = useStore();
  const t = useNow(30000);
  const { open } = useAdmin();
  const [word, setWord] = useState('');
  const on = s.botLive !== false;
  const k = rangeStats(s, rangeOf(s, t));
  const addWord = () => { const w = word.trim().toLowerCase(); if (!w) return; if (!s.handoff.includes(w)) { setHandoff([...s.handoff, w]); toast(`“${w}” now hands chats to staff`); } setWord(''); };
  return (
    <>
      <PageHead title="Chatbot" sub="Rule-based answers in Messenger: saved answers, quick replies, and hand-off keywords. No AI. A person steps in when needed.">
        <span className="row small strong">{on ? 'Bot is on' : 'Bot is off'}<Toggle on={on} label="Bot on" onChange={(v) => { setBotLive(v); toast(v ? 'The bot answers new messages again' : 'The bot is off. New messages go straight to staff.'); }} /></span>
        <Btn kind="primary" icon="plus" onClick={() => open('faq')}>Add answer</Btn>
      </PageHead>
      <RangeBar s={s} t={t} />
      <div className="grid g4 keep2">
        <Stat label="Conversations" value={num(k.conversations)} icon="message-circle" />
        <Stat label="Answered by the bot alone" value={k.botAlone == null ? '—' : `${Math.round(k.botAlone)}%`} icon="bot" tone="violet" />
        <Stat label="Handed to staff" value={num(k.handoffs)} icon="hand-helping" tone="orange" />
        <Stat label="Saved answers" value={s.faqs.filter((f) => !f.off).length} sub={`${s.faqs.length} in all`} icon="book-open" tone="teal" />
      </div>
      <div className="grid g-side">
        <div className="col gap-16">
          <div className="card" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Topic and keywords</th><th>Answer</th><th>On</th><th /></tr></thead>
                <tbody>
                  {s.faqs.map((f) => (
                    <tr key={f.id} style={{ opacity: f.off ? 0.5 : 1 }}>
                      <td style={{ minWidth: 180 }}><div className="strong small">{f.q}{f.tag && <> <Badge tone="violet">{f.tag}</Badge></>}{f.custom && <> <Badge tone="green">New</Badge></>}</div><div className="tiny faint">{(f.kw || []).slice(0, 6).join(', ')}{(f.kw || []).length > 6 ? '…' : ''}</div></td>
                      <td className="small muted" style={{ maxWidth: 320 }}>{f.special ? <i>{f.a}</i> : fillFaq(s, f.a, null)}</td>
                      <td><Toggle on={!f.off} label={`${f.q} on`} onChange={() => { toggleFaq(f.id); toast(`“${f.q}” turned ${f.off ? 'on' : 'off'}`); }} /></td>
                      <td className="r"><Btn size="sm" kind="ghost" icon="pencil" aria-label={`Edit ${f.q}`} onClick={() => open('faq', { id: f.id })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card col">
            <div><div className="card-t">Hand-off keywords</div><div className="card-s">A message with one of these words goes to staff right away, and the routing workflow opens a ticket.</div></div>
            <div className="row wrap">{s.handoff.map((w) => <span key={w} className="chip-x">{w}<button type="button" aria-label={`Remove ${w}`} onClick={() => { setHandoff(s.handoff.filter((x) => x !== w)); toast(`“${w}” removed`); }}><Icon name="x" size={13} /></button></span>)}</div>
            <div className="row"><input id="handoff-word" className="inp inp-sm" style={{ maxWidth: 220 }} value={word} onChange={(e) => setWord(e.target.value)} placeholder="Add a word, like “refund”" onKeyDown={(e) => { if (e.key === 'Enter') addWord(); }} aria-label="New hand-off keyword" /><Btn size="sm" onClick={addWord} disabled={!word.trim()}>Add</Btn></div>
            <div className="tiny faint">The bot also hands off when someone types “staff”, or after 2 messages it can’t answer.</div>
          </div>
        </div>
        <TestBot s={s} />
      </div>
    </>
  );
}

function TestBot({ s }) {
  const [msgs, setMsgs] = useState(() => [{ id: 0, from: 'bot', ...welcomeMsg(null) }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const convo = useRef({ cid: null, misses: 0 });
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [msgs.length, busy]);
  const ask = (t, meta = {}) => {
    if (!t.trim() || busy) return;
    setMsgs((m) => [...m, { id: m.length + 1, from: 'customer', text: t.trim() }]);
    setText('');
    setBusy(true);
    setTimeout(() => {
      const r = answer(getState(), convo.current, t, meta);
      setMsgs((m) => {
        const out = [...m, ...r.msgs.map((x, i) => ({ id: m.length + 1 + i, from: 'bot', ...x }))];
        if (r.handoff) out.push({ id: out.length + 1, from: 'system', text: `In Messenger this goes to staff (${r.reason}) and opens a ticket.` });
        return out;
      });
      setBusy(false);
    }, 450);
  };
  const lastBot = [...msgs].reverse().find((m) => m.from !== 'customer');
  return (
    <div className="col gap-12">
      <div className="testbot">
        <div className="msgr-head" style={{ padding: '8px 12px' }}><Logo size={30} /><div className="msgr-who"><div className="msgr-name" style={{ fontSize: 14 }}>Test the bot</div><div className="msgr-status" style={{ color: 'var(--text-2)' }}>Uses the answers on this page. Nothing is saved.</div></div><Btn size="sm" kind="ghost" icon="rotate-ccw" aria-label="Restart test" onClick={() => { convo.current = { cid: null, misses: 0 }; setMsgs([{ id: 0, from: 'bot', ...welcomeMsg(null) }]); }} /></div>
        <div className="msgr-list" ref={listRef}>
          {msgs.map((m) => m.from === 'system' ? <div key={m.id} className="msys">{m.text}</div> : (
            <div key={m.id} className={cx('mrow', m.from === 'customer' && 'me')}>
              {m.from !== 'customer' && <div className="av-slot"><Logo size={24} /></div>}
              <div className="mcol"><div className="bubble" style={{ fontSize: 13.5 }}>{m.text}</div>{m.buttons && <div className="mbtns">{m.buttons.map((b) => <button key={b.label} type="button" tabIndex={-1}>{b.label}</button>)}</div>}</div>
            </div>
          ))}
          {busy && <div className="mrow"><div className="av-slot"><Logo size={24} /></div><div className="bubble typing"><i /><i /><i /></div></div>}
          {!busy && lastBot && lastBot.quick && <div className="quick" style={{ paddingLeft: 31 }}>{(lastBot.quick === 'WELCOME' ? WELCOME_QUICK : lastBot.quick).map((q) => <button key={q} type="button" onClick={() => ask(q, { faq: QUICK_MAP[q] })}>{q}</button>)}</div>}
        </div>
        <form className="msgr-compose" style={{ paddingBottom: 8 }} onSubmit={(e) => { e.preventDefault(); ask(text); }}>
          <input id="testbot-input" className="msgr-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type like a customer, e.g. “magkano po?”" autoComplete="off" aria-label="Test message" />
          <button type="submit" className="ibtn blue" aria-label="Send test message" disabled={!text.trim()}><Icon name="send" size={18} /></button>
        </form>
      </div>
      <div className="tiny faint">Try “hm whole?”, “open ba kayo bukas”, “delivery”, or “my order is late”.</div>
    </div>
  );
}

export function FaqModal({ id, onClose }) {
  const s = useStore();
  const f = id ? s.faqs.find((x) => x.id === id) : null;
  const [q, setQ] = useState(f ? f.q : '');
  const [a, setA] = useState(f ? f.a : '');
  const [kw, setKw] = useState(f ? (f.kw || []).join(', ') : '');
  const [err, setErr] = useState('');
  const [sure, setSure] = useState(false);
  const save = () => {
    if (q.trim().length < 2) return setErr('Name the topic.');
    if (!f && a.trim().length < 3) return setErr('Write the answer.');
    if (!kw.trim()) return setErr('Add at least one keyword.');
    saveFaq({ id: f && f.id, q: q.trim(), a: f && f.special ? f.a : a.trim(), kw });
    toast(f ? 'Answer saved. The bot uses it right away.' : 'Answer added. Try it in the test panel.');
    onClose();
  };
  return (
    <Modal title={f ? 'Edit answer' : 'Add answer'} sub="Customers get this answer when their message has one of the keywords." onClose={onClose} footer={sure ? <>
      <span className="grow small">Delete “{f.q}”?</span><Btn onClick={() => setSure(false)}>Keep</Btn><Btn kind="danger" onClick={() => { deleteFaq(f.id); toast('Answer deleted'); onClose(); }}>Delete</Btn>
    </> : <>
      {f && f.custom && <Btn kind="danger" icon="trash-2" onClick={() => setSure(true)}>Delete</Btn>}
      <span className="grow" />
      <Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Save</Btn>
    </>}>
      <Field label="Topic" htmlFor="faq-q"><input id="faq-q" className="inp" value={q} onChange={(e) => { setQ(e.target.value); setErr(''); }} placeholder="Parking" /></Field>
      <Field label="Keywords" htmlFor="faq-kw" hint="Separate with commas. English and Tagalog both work, like “parking, paradahan”."><input id="faq-kw" className="inp" value={kw} onChange={(e) => { setKw(e.target.value); setErr(''); }} placeholder="parking, park, paradahan" /></Field>
      {f && f.special ? <div className="mini"><span className="strong">Filled in for each customer</span><span className="muted">{f.a} You can change the topic and keywords.</span></div> : (
        <Field label="Answer" htmlFor="faq-a" hint="You can use {flavors}, {prices}, {hours}, {address} and {name}. They fill in from Settings."><textarea id="faq-a" className="inp" rows={4} value={a} onChange={(e) => { setA(e.target.value); setErr(''); }} placeholder="There’s free parking in front of the store." /></Field>
      )}
      {!(f && f.special) && a.includes('{') && <div className="mini"><span className="tiny faint">Customers see</span>{fillFaq(s, a, null)}</div>}
      {err && <div className="fld-e" role="alert">{err}</div>}
    </Modal>
  );
}

// ---------------- workflows ----------------
export function Workflows() {
  const s = useStore();
  const t = useNow(15000);
  const { open } = useAdmin();
  return (
    <>
      <PageHead title="Workflows" sub="Steps that run by themselves when something happens. Turn one off and the demo stops doing it, so you can see the difference." />
      <div className="grid g2">
        {s.workflows.map((w) => (
          <div key={w.id} className="card col" style={{ gap: 10, opacity: w.on ? 1 : 0.62 }}>
            <div className="row">
              <span className={cx('wf-ic', 'tone-' + w.tone)}><Icon name={w.icon} size={16} /></span>
              <span className="strong grow">{w.name}</span>
              <Toggle on={w.on} label={`${w.name} on`} onChange={() => { toggleWorkflow(w.id); toast(`${w.name} turned ${w.on ? 'off' : 'on'}`); }} />
            </div>
            <dl className="kv"><dt>WHEN</dt><dd>{w.when}</dd><dt>THEN</dt><dd>{w.then}</dd></dl>
            <div className="row between tiny faint"><span>{num(w.runs)} runs this month{w.lastRun ? ` · last run ${fmtAgo(w.lastRun, t).toLowerCase()}` : ''}</span><button type="button" className="link small" onClick={() => open('workflow', { id: w.id })}>Edit</button></div>
          </div>
        ))}
      </div>
    </>
  );
}

const VARS = { wait: '{amount} {method} {order} {mode} {wait} {time}', delay: '{order} {time}', ready: '{order}', loyalty: '{points} {order} {balance}', survey: '{order}' };
export function WorkflowDrawer({ id, onClose }) {
  const s = useStore();
  const w = wf(s, id);
  const [tpl, setTpl] = useState(w ? w.tpl || '' : '');
  const [assignee, setAssignee] = useState(w ? w.assignee || '' : '');
  if (!w) return null;
  const dirty = (w.tpl != null && tpl !== w.tpl) || (w.id === 'routing' && assignee !== (w.assignee || ''));
  const save = () => {
    const patch = {};
    if (w.tpl != null) patch.tpl = tpl;
    if (w.id === 'routing') { patch.assignee = assignee; patch.then = `Create a ticket and assign ${assignee}`; }
    saveWorkflow(w.id, patch);
    toast(`${w.name} saved`);
    onClose();
  };
  return (
    <Modal side title={w.name} sub={`${num(w.runs)} runs this month`} onClose={onClose} footer={<><span className="row grow small">{w.on ? 'On' : 'Off'}<Toggle on={w.on} label="Workflow on" onChange={() => toggleWorkflow(w.id)} /></span><Btn onClick={onClose}>Close</Btn><Btn kind="primary" disabled={!dirty} onClick={save}>Save</Btn></>}>
      <div className="flow">
        <div className="flow-step"><span className="eyebrow">When</span><span className="small strong">{w.when}</span></div>
        <div className="flow-arrow" />
        <div className="flow-step"><span className="eyebrow">Wait</span><span className="small">{w.delay}</span></div>
        <div className="flow-arrow" />
        <div className="flow-step"><span className="eyebrow">Only if</span><span className="small">{w.cond}</span></div>
        <div className="flow-arrow" />
        <div className="flow-step" style={{ borderColor: 'var(--accent)' }}><span className="eyebrow">Then</span><span className="small strong">{w.then}</span></div>
      </div>
      {w.tpl != null && <Field label="Message the customer gets" htmlFor="wf-tpl" hint={`You can use ${VARS[w.id] || '{order}'}.`}><textarea id="wf-tpl" className="inp" rows={3} value={tpl} onChange={(e) => setTpl(e.target.value)} /></Field>}
      {w.id === 'routing' && <Field label="Assign new tickets to" htmlFor="wf-assignee"><select id="wf-assignee" className="inp" value={assignee} onChange={(e) => setAssignee(e.target.value)}>{staffList(s).map((u) => <option key={u.id}>{u.name}</option>)}</select></Field>}
      <div className="small faint">Changes apply to the next run. Turn the workflow off to see the demo skip this step.</div>
    </Modal>
  );
}

// ---------------- settings ----------------
export function Settings() {
  const s = useStore();
  const { open } = useAdmin();
  const [tab, setTab] = useState('users');
  return (
    <>
      <PageHead title="Settings" sub="Team access, menu and prices, channels, data privacy and store details." />
      <Tabs tabs={[{ value: 'users', label: 'Users and roles' }, { value: 'menu', label: 'Menu and prices' }, { value: 'channels', label: 'Channels' }, { value: 'privacy', label: 'Data privacy' }, { value: 'business', label: 'Business info' }]} value={tab} onChange={setTab} />
      {tab === 'users' && <UsersTab s={s} onInvite={() => open('invite')} />}
      {tab === 'menu' && <MenuTab s={s} />}
      {tab === 'channels' && <ChannelsTab s={s} />}
      {tab === 'privacy' && <PrivacyTab s={s} />}
      {tab === 'business' && <BusinessTab s={s} />}
    </>
  );
}

function UsersTab({ s, onInvite }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="row between" style={{ padding: '14px 16px' }}><div><div className="card-t">Team</div><div className="card-s">Each role only sees the pages it needs. Try “Viewing as” at the top.</div></div><Btn kind="primary" icon="user-plus" onClick={onInvite}>Invite</Btn></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>Can use</th><th>Status</th></tr></thead>
          <tbody>{s.team.map((u) => <tr key={u.id}><td><span className="row"><Avatar name={u.name} size="sm" /><span><span className="strong">{u.name}</span><div className="tiny faint">{u.email}</div></span></span></td><td>{u.role}</td><td className="small muted">{u.can}</td><td><Badge tone={u.status === 'Active' ? 'green' : 'orange'}>{u.status}</Badge></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function MenuTab({ s }) {
  const [rows, setRows] = useState(() => s.menu.map((m) => ({ id: m.id, price: String(m.price), available: m.available !== false })));
  const dirty = rows.some((r) => { const m = s.menu.find((x) => x.id === r.id); return String(m.price) !== r.price || (m.available !== false) !== r.available; });
  const set = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="card col">
      <div className="row between wrap"><div><div className="card-t">Menu and prices</div><div className="card-s">Prices show on the order page and in the bot’s Prices answer right after you save. Sample prices.</div></div><Btn kind="primary" disabled={!dirty} onClick={() => { saveMenu(rows); toast('Menu saved. The order page and the bot use the new prices.'); }}>Save menu</Btn></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Item</th><th>Details</th><th>Price</th><th>Available</th></tr></thead>
          <tbody>{s.menu.map((m) => { const r = rows.find((x) => x.id === m.id); return (
            <tr key={m.id}><td className="strong">{m.name}</td><td className="small muted">{m.details}</td><td><div className="row gap-4"><span>₱</span><input className="inp inp-sm" type="number" min="0" style={{ width: 90 }} value={r.price} onChange={(e) => set(m.id, { price: e.target.value })} aria-label={`${m.name} price`} /></div></td><td><Toggle on={r.available} label={`${m.name} available`} onChange={(v) => set(m.id, { available: v })} /></td></tr>
          ); })}</tbody>
        </table>
      </div>
      <div className="col gap-4"><div className="fld-l">Flavors</div><div className="row wrap">{s.flavors.map((f) => <Badge key={f}>{f}</Badge>)}</div></div>
    </div>
  );
}

function ChannelsTab({ s }) {
  const rows = [
    ['Messenger', 'message-circle', 'Connected', 'Bak Bak Boneless Chicken page. The bot answers first; orders are pick-up or dine-in, paid first, no COD.'],
    ['Facebook page', 'thumbs-up', 'Connected', 'Comments on posts land in the Inbox. Campaign posts go out from here.'],
    ['Foodpanda', 'bike', 'Receipt codes on', 'Orders are entered at the counter. Each receipt gets a one-use code (7 days) so the buyer can claim points.'],
    ['Grab', 'bike', 'Receipt codes on', 'Same as Foodpanda. Delivery happens only through Foodpanda and Grab riders.'],
    ['Walk-in counter', 'store', 'On', 'Takeout and dine-in orders are entered in BakBak CRM by the cashier.'],
  ];
  return (
    <div className="grid g2">
      {rows.map(([name, ic, st, text]) => (
        <div key={name} className="card row start gap-12">
          <span className="tile sm blue"><Icon name={ic} size={18} /></span>
          <div className="grow col gap-4"><div className="row between"><span className="strong">{name}</span><Badge tone="green">{st}</Badge></div><div className="small muted">{text}</div></div>
        </div>
      ))}
    </div>
  );
}

function PrivacyTab({ s }) {
  const [consent, setConsent] = useState(s.settings.consentText);
  const [mask, setMask] = useState(s.settings.maskPhones);
  const dirty = consent !== s.settings.consentText || mask !== s.settings.maskPhones;
  return (
    <div className="grid g2">
      <div className="card col">
        <div className="card-t">Promo consent and phone numbers</div>
        <Field label="Promo consent text (optional tick box)" htmlFor="pv-consent" hint="A separate, unticked box. Order updates are sent either way, because they are part of the order."><textarea id="pv-consent" className="inp" rows={3} value={consent} onChange={(e) => setConsent(e.target.value)} /></Field>
        <label className="row between"><span><span className="strong small">Hide phone numbers</span><div className="tiny faint">Shows 0917 ••• 4817. Staff can tap Show on a customer record.</div></span><Toggle on={mask} label="Hide phone numbers" onChange={setMask} /></label>
        <div className="small muted">Customers who said no to promos never get campaigns. Delivery-app buyers who never joined show “Not shared”.</div>
        <Btn kind="primary" disabled={!dirty} style={{ alignSelf: 'flex-start' }} onClick={() => { savePrivacy({ consentText: consent.trim(), maskPhones: mask }); toast('Data privacy settings saved'); }}>Save</Btn>
      </div>
      <div className="card col">
        <div className="row"><span className="tile sm blue"><Icon name="cloud" size={18} /></span><div><div className="card-t">Hosting and maintenance</div><div className="card-s">BakBak CRM runs in the cloud, so nothing is installed at the store.</div></div></div>
        <div className="info-line"><Icon name="shield-check" size={15} />Cloud-hosted · Backed up daily at 2:00 AM · Last update Oct 12, 2026</div>
        <div className="small muted">Under the Data Privacy Act of 2012, customers can ask for a copy of their data or ask Bak Bak to delete it. Staff handle these as tickets.</div>
      </div>
    </div>
  );
}

function BusinessTab({ s }) {
  const b = s.settings.business;
  const [f, setF] = useState({ ...b });
  const dirty = Object.keys(f).some((k) => f[k] !== b[k]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const bad = !f.name.trim() || !f.address.trim() || f.open >= f.close;
  return (
    <div className="card col" style={{ maxWidth: 620 }}>
      <div className="card-t">Business info</div>
      <Field label="Business name" htmlFor="bi-name"><input id="bi-name" className="inp" value={f.name} onChange={set('name')} /></Field>
      <Field label="Address" htmlFor="bi-addr"><input id="bi-addr" className="inp" value={f.address} onChange={set('address')} /></Field>
      <div className="grid g2">
        <Field label="Opens" htmlFor="bi-open"><input id="bi-open" className="inp" type="time" value={f.open} onChange={set('open')} /></Field>
        <Field label="Closes" htmlFor="bi-close" error={f.open >= f.close ? 'Closing time must be after opening time.' : null}><input id="bi-close" className="inp" type="time" value={f.close} onChange={set('close')} /></Field>
      </div>
      <div className="small muted">The bot’s Store hours answer and the order page use these. Now: {hm12(f.open)} to {hm12(f.close)}.</div>
      <Btn kind="primary" disabled={!dirty || bad} style={{ alignSelf: 'flex-start' }} onClick={() => { saveBusiness({ ...f, name: f.name.trim(), address: f.address.trim() }); toast('Business info saved'); }}>Save</Btn>
    </div>
  );
}

const ROLES_LIST = ['Owner', 'Order-taking', 'Ticket and inquiry', 'Kitchen', 'Admin'];
export function InviteModal({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Order-taking');
  const [err, setErr] = useState('');
  const send = () => {
    if (name.trim().length < 2) return setErr('Enter their name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter a valid email.');
    invite({ name, email, role });
    toast(`Invite sent to ${email.trim()}`);
    onClose();
  };
  return (
    <Modal title="Invite a team member" sub="They get an email to set up their account." onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={send}>Send invite</Btn></>}>
      <Field label="Name" htmlFor="inv-name"><input id="inv-name" className="inp" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Juan Dela Cruz" /></Field>
      <Field label="Email" htmlFor="inv-email"><input id="inv-email" className="inp" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="juan@bakbak.ph" /></Field>
      <Field label="Role" htmlFor="inv-role" hint={ROLE_CAN[role]}><select id="inv-role" className="inp" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES_LIST.map((r) => <option key={r}>{r}</option>)}</select></Field>
      {err && <div className="fld-e" role="alert">{err}</div>}
    </Modal>
  );
}
