// Decision support: Today's plan, Prep planner, What-if, Rules and the Decision log.
// Rules plus the last 4 weeks of orders give recommendations. The owner decides; nothing changes until approved.
import { useStore, useNow, toast, decideRec, saveScenario, toggleBatchDone, approveWeekend, updateRule, addRule, waitModel, waitMinutes } from './store.js';
import { Icon, Btn, Badge, Modal, Toggle, Field, Empty, Bars } from './ui.jsx';
import { useAdmin, PageHead, Stat, canApprove } from './admin-common.jsx';
import { fmtTime, fmtWhen, fmtDate, cx } from './util.js';

const { useState } = React;
export const HOURS = ['10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p'];
export const HEAT = [
  ['Mon', [2, 3, 6, 5, 3, 4, 6, 8, 9, 7, 4]],
  ['Tue', [2, 3, 6, 5, 3, 4, 6, 8, 9, 7, 4]],
  ['Wed', [2, 4, 7, 5, 3, 5, 7, 9, 10, 8, 4]],
  ['Thu', [2, 4, 7, 6, 3, 5, 7, 9, 11, 8, 5]],
  ['Fri', [3, 5, 9, 7, 4, 6, 9, 14, 13, 10, 6]],
  ['Sat', [3, 5, 9, 11, 7, 6, 9, 17, 14, 10, 6]],
  ['Sun', [3, 6, 10, 9, 6, 5, 8, 13, 12, 9, 5]],
];
const lvl = (v) => (v <= 3 ? 'hm0' : v <= 6 ? 'hm1' : v <= 10 ? 'hm2' : v <= 14 ? 'hm3' : 'hm4');
const CALL_TONE = { Approved: 'green', Adjusted: 'orange', Dismissed: null, pending: 'violet' };
const APPROVED_NOTE = {
  R1: 'The kitchen display now shows 3 batches to pre-cook (first fry).',
  R2: 'Jomar Cruz is on the counter from 4:30 to 7:00 PM.',
  R3: '45 boxes and pre-portioned sauce are on the kitchen display.',
  R4: 'A draft campaign is waiting in Campaigns.',
  R6: 'The chatbot answer about delivery is updated.',
};

export function DssToday() {
  const s = useStore();
  const t = useNow(30000);
  const { go, open } = useAdmin();
  const owner = canApprove(s.role);
  const pending = s.recs.filter((r) => r.status === 'pending');
  const base = waitModel({ batches: 0, cashiers: 1 });
  const plan = waitModel({ batches: 3, cashiers: 2 });
  const decide = (r, call) => {
    decideRec(r.id, call);
    toast(call === 'Dismissed' ? `${r.title} dismissed` : `${r.title} approved. ${APPROVED_NOTE[r.id] || ''}`);
  };
  const adjust = (r) => {
    if (r.id === 'R1' || r.id === 'R2' || r.id === 'R3') return go('dss-whatif');
    decideRec(r.id, 'Adjusted');
    if (r.id === 'R4') open('campaign', { id: 'cp2' });
    if (r.id === 'R6') open('faq', { id: 'f-delivery' });
  };
  return (
    <>
      <PageHead eyebrow="Decision support" title="Today's plan" sub={`${fmtDate(t)} · From your rules and the last 4 Saturdays. Nothing changes until you approve.`}>
        {owner && pending.length > 1 && <Btn kind="primary" icon="check-check" onClick={() => { pending.forEach((r) => decideRec(r.id, 'Approved')); toast(`${pending.length} recommendations approved`); }}>✅ Approve everything ({pending.length} items)</Btn>}
      </PageHead>
      <div className="dss-banner">
        <span className="spark"><Icon name="sparkles" size={22} /></span>
        <div className="grow">
          <div className="h2">🕔 Saturday rush, 5 to 6 PM: about 17 orders expected</div>
          <div className="small muted">With the rush plan (3 pre-cooked batches by 4:30 PM and 1 more staff member on the cashier), the estimated wait goes from {base.wait} to {plan.wait} minutes. Right now it's {waitMinutes(s)} minutes.</div>
        </div>
        <Btn icon="sliders-horizontal" onClick={() => go('dss-whatif')}>Try other numbers</Btn>
      </div>
      {!owner && <div className="info-line"><Icon name="lock-keyhole" size={15} />Only the owner can approve. Switch "Viewing as" to Owner to try it.</div>}
      <div className="grid g2">
        {s.recs.map((r, idx) => (
          <div key={r.id} className="card col" style={{ gap: 10 }}>
            <div className="row between"><span className="row gap-4"><Badge tone="violet">Step {idx + 1} of {s.recs.length} · {r.id}</Badge><span className="strong small">{r.title}</span></span><Badge>{r.when}</Badge></div>
            <div className="h3">{r.head}</div>
            {r.sub && <div className="small muted">{r.sub}</div>}
            <div className="small"><span className="strong">Why: </span>{r.why}</div>
            {(r.change || r.detail) && <div className="mini" style={{ background: 'var(--surface-2)', borderColor: 'transparent' }}>{r.change || r.detail}</div>}
            {r.status === 'pending' ? (
              <div className="row wrap">
                <Btn kind="primary" size="sm" disabled={!owner} onClick={() => decide(r, 'Approved')}>✅ Yes, do this</Btn>
                <Btn size="sm" disabled={!owner} onClick={() => adjust(r)}>✏️ Change it</Btn>
                <Btn kind="ghost" size="sm" disabled={!owner} onClick={() => decide(r, 'Dismissed')}>❌ Skip this</Btn>
              </div>
            ) : (
              <div className="row wrap">
                <Badge tone={CALL_TONE[r.status]} icon={r.status === 'Dismissed' ? 'x' : 'check'}>{r.status}</Badge>
                <span className="tiny faint">Done · {r.status} by {r.by} at {fmtTime(r.decidedAt)}</span>
                <span className="grow" />
                {r.id === 'R1' && r.status !== 'Dismissed' && <button type="button" className="link small" onClick={() => go('kitchen')}>Kitchen display</button>}
                {r.id === 'R4' && r.status !== 'Dismissed' && <button type="button" className="link small" onClick={() => open('campaign', { id: 'cp2' })}>Open the draft campaign</button>}
                {r.id === 'R6' && r.status !== 'Dismissed' && <button type="button" className="link small" onClick={() => go('chatbot')}>See the chatbot answer</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="small faint">Recommendations come from rules you can change on the Rules page. Every call goes to the Decision log with its result.</div>
    </>
  );
}

export function DssPrep() {
  const s = useStore();
  const { go } = useAdmin();
  const owner = canApprove(s.role);
  const prep = s.prep;
  return (
    <>
      <PageHead eyebrow="Decision support" title="Prep planner" sub="Average orders by hour over the last 4 weeks, and the prep plans for this weekend." />
      <div className="grid g3">
        {s.weekend.map((w, i) => (
          <div key={w.day} className="card col">
            <div className="row between"><span className="card-t">{w.day}</span><Badge tone={w.status === 'Approved' ? 'green' : w.status === 'Draft' ? null : 'orange'} title={w.status === 'Draft' ? 'Not approved yet' : w.status === 'Approved' ? '✅ Ready' : w.status}>{w.status === 'Draft' ? 'Not approved yet' : w.status === 'Approved' ? '✅ Ready' : w.status}</Badge></div>
            <ul style={{ margin: 0, paddingLeft: 18 }} className="small">{w.items.map((x) => <li key={x}>{x}</li>)}</ul>
            {w.status !== 'Approved' && <div className="row wrap"><Btn size="sm" kind="primary" disabled={!owner} onClick={() => { approveWeekend(i); toast(`${w.day} plan approved`); }}>Approve</Btn>{i === 1 && <Btn size="sm" onClick={() => go('dss-whatif')}>Change in What-if</Btn>}</div>}
          </div>
        ))}
      </div>
      <div className="small muted" style={{ marginBottom: 4 }}>Your busiest times are Saturday and Friday evenings. The chart below shows every hour across the week.</div>
      <div className="card">
        <div className="card-h"><div><div className="card-t">Orders by hour</div><div className="card-s">Average of the last 4 weeks. Darker means busier.</div></div><div className="row tiny faint wrap">{[['hm0', 'Quiet (0–3)'], ['hm1', 'Moderate (4–6)'], ['hm2', 'Busy (7–10)'], ['hm3', 'Very busy (11–14)'], ['hm4', 'Rush (15+)']].map(([h, label]) => <span key={h} className="row gap-4" aria-label={label}><span className={h} style={{ width: 14, height: 14, borderRadius: 4, display: 'inline-block' }} />{label}</span>)}</div></div>
        <div className="tbl-wrap">
          <table className="heat">
            <thead><tr><th />{HOURS.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{HEAT.map(([d, v]) => <tr key={d}><th>{d}</th>{v.map((x, i) => <td key={i} className={lvl(x)} title={`${d} ${HOURS[i]}: ${x} orders`}>{x}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="card col">
        <div className="card-t">Today's batches</div>
        {prep && prep.batches ? (
          <div className="row wrap gap-16">
            {Array.from({ length: prep.batches }).map((_, i) => (
              <label key={i} className="check" style={{ alignItems: 'center' }}><input type="checkbox" checked={!!(prep.done && prep.done[i])} onChange={() => toggleBatchDone(i)} /><span>Batch {i + 1} · 24 pcs</span></label>
            ))}
            <span className="small muted">Tick each one off when the kitchen finishes it. It also updates the kitchen display.</span>
          </div>
        ) : <div className="small muted">No batches yet. Approve R1 on Today's plan, or save a plan in What-if.</div>}
      </div>
    </>
  );
}

function Slider({ id, label, value, min, max, onChange, unit, onDec, onInc }) {
  return (
    <div className="fld">
      <div className="row between"><label className="fld-l" htmlFor={id}>{label}</label><span className="strong num">{value}{unit ? ' ' + unit : ''}</span></div>
      <div className="row gap-4" style={{ alignItems: 'center' }}>
        <button type="button" className="pm-btn" onClick={onDec}>−</button>
        <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
        <button type="button" className="pm-btn" onClick={onInc}>+</button>
      </div>
    </div>
  );
}

export function DssWhatIf() {
  const s = useStore();
  const owner = canApprove(s.role);
  const [orders, setOrders] = useState(17);
  const [batches, setBatches] = useState(s.prep && s.prep.batches ? s.prep.batches : 3);
  const [cashiers, setCashiers] = useState(s.prep && s.prep.cashiers ? s.prep.cashiers : 2);
  const m = waitModel({ orders, batches, cashiers });
  const b = waitModel({ orders, batches: 0, cashiers: 1 });
  const rows = [
    ['Estimated wait', `${b.wait} min`, `${m.wait} min`, m.wait < b.wait],
    ['Pieces pre-cooked', '0', `${m.pre} pcs`, false],
    ['Cooked to order', `${b.cto} pcs`, `${m.cto} pcs`, m.cto < b.cto],
    ['Load per cashier', b.perCashier.toFixed(1), m.perCashier.toFixed(1), m.perCashier < b.perCashier],
    ['Food wasted (held too long)', '0', `${m.held} pcs`, false],
  ];
  return (
    <>
      <PageHead eyebrow="Decision support" title="Plan the rush" sub="Slide the numbers below to see how the wait time changes. Save your favourite as today's plan." />
      <div className="grid g2">
        <div className="card col gap-16">
          <Slider id="wi-orders" label="Orders expected, 5 to 6 PM" value={orders} min={6} max={30} onChange={setOrders} onDec={() => setOrders(Math.max(6, orders - 1))} onInc={() => setOrders(Math.min(30, orders + 1))} />
          <Slider id="wi-batches" label="Batches pre-cooked by 4:30 PM (24 pcs each)" value={batches} min={0} max={5} onChange={setBatches} onDec={() => setBatches(Math.max(0, batches - 1))} onInc={() => setBatches(Math.min(5, batches + 1))} />
          <Slider id="wi-cashiers" label="Cashiers on the counter" value={cashiers} min={1} max={3} onChange={setCashiers} onDec={() => setCashiers(Math.max(1, cashiers - 1))} onInc={() => setCashiers(Math.min(3, cashiers + 1))} />
          <div className="small faint">About 9 pieces per order. One cashier comfortably handles about 12 orders an hour. Pre-cooked pieces held over 30 minutes are thrown out.</div>
          <div className="row wrap">
            <Btn kind="primary" icon="check" disabled={!owner} onClick={() => { saveScenario({ batches, cashiers, orders }); toast(`Saved as today's plan: ${batches} batches, ${cashiers} cashier${cashiers > 1 ? 's' : ''}. The kitchen display has it.`); }}>Save as today's plan</Btn>
            <Btn onClick={() => { setOrders(17); setBatches(3); setCashiers(2); }}>Use the recommendation</Btn>
          </div>
          {!owner && <div className="tiny faint">Only the owner can save a plan.</div>}
        </div>
        <div className="card col">
          <div className="row between"><span className="card-t">Estimated wait</span><Badge tone={m.wait <= 15 ? 'green' : m.wait <= 20 ? 'orange' : 'red'} lg>{m.wait} min</Badge></div>
          <Bars values={[b.wait, m.wait]} labels={['No plan', 'This plan']} hi={[1]} fmt={(v) => `${v} min`} height={160} />
          <div className="wi-summary">With this plan, customers wait <strong>{m.wait} min</strong> instead of <strong>{b.wait} min</strong>.</div>
          <table className="tbl">
            <thead><tr><th /><th className="r">No plan</th><th className="r">This plan</th></tr></thead>
            <tbody>{rows.map(([l, x, y, good]) => <tr key={l}><td className="small">{l}</td><td className="r num muted">{x}</td><td className={cx('r num strong', good && 'ok', l.startsWith('Food wasted') && m.held > 0 && 'bad')}>{y}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function DssRules() {
  const s = useStore();
  const { open } = useAdmin();
  const owner = canApprove(s.role);
  const [edit, setEdit] = useState({});
  return (
    <>
      <PageHead eyebrow="Decision support" title="Rules" sub="Each rule watches one number. When it reaches the threshold, a recommendation shows on Today's plan.">
        <Btn kind="primary" icon="plus" disabled={!owner} onClick={() => open('addRule')}>Add a new condition</Btn>
      </PageHead>
      <div className="small muted" style={{ marginBottom: 8 }}>These are the conditions that trigger suggestions on Today's plan. Adjust the numbers or turn rules on and off.</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Rule</th><th>Suggest when</th><th>Limit</th><th>What it suggests</th><th>Last seen</th><th>Active</th></tr></thead>
            <tbody>
              {s.rules.map((r) => {
                const v = edit[r.id] != null ? edit[r.id] : String(r.threshold);
                const commit = () => { const n = Number(v); if (n > 0 && n !== r.threshold) { updateRule(r.id, { threshold: n }); toast(`${r.id} threshold set to ${n} ${r.unit}`); } setEdit((e) => ({ ...e, [r.id]: null })); };
                return (
                  <tr key={r.id} style={{ opacity: r.on ? 1 : 0.55 }}>
                    <td><div className="row gap-4"><Badge tone="violet">{r.id}</Badge><span className="strong small">{r.name}</span>{r.created && <Badge tone="green">New</Badge>}</div></td>
                    <td className="small muted" style={{ maxWidth: 240 }}>{r.when}</td>
                    <td><div className="row gap-4"><input className="inp inp-sm" style={{ width: 64 }} type="number" min="1" value={v} disabled={!owner} onChange={(e) => setEdit((x) => ({ ...x, [r.id]: e.target.value }))} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} aria-label={`${r.name} threshold`} /><span className="tiny faint">{r.unit}</span></div></td>
                    <td className="small" style={{ maxWidth: 260 }}>{r.then}</td>
                    <td className="small muted">{r.last}</td>
                    <td><Toggle on={r.on} disabled={!owner} label={`${r.name} on`} onChange={(on) => { updateRule(r.id, { on }); toast(`${r.id} turned ${on ? 'on' : 'off'}`); }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const WHEN_OPTIONS = [
  ['Average orders in an hour reach the threshold', 'orders per hour'],
  ['Orders per cashier in an hour pass the threshold', 'orders per cashier'],
  ['Repeat buyers of one flavor reach the threshold', 'customers'],
  ['Customers inactive for 30+ days reach the threshold', 'customers'],
  ['The same question causes chatbot hand-offs', 'hand-offs'],
  ['Long-wait tickets in a day reach the threshold', 'tickets'],
  ['Low ratings (2 stars or less) in a day reach the threshold', 'ratings'],
];
export function AddRuleModal({ onClose }) {
  const [name, setName] = useState('');
  const [when, setWhen] = useState(WHEN_OPTIONS[5][0]);
  const [threshold, setThreshold] = useState('3');
  const [then, setThen] = useState('Recommend one more staff member at the counter for the rush');
  const [err, setErr] = useState('');
  const unit = (WHEN_OPTIONS.find((w) => w[0] === when) || [])[1];
  return (
    <Modal title="Add a new condition" sub="Set a condition. When it's met, a suggestion appears on Today's plan. Nothing changes until you approve it." onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={() => { if (name.trim().length < 3) return setErr('Name the rule.'); addRule({ name: name.trim(), when, then: then.trim(), threshold, unit }); toast(`Rule "${name.trim()}" added`); onClose(); }}>Add rule</Btn></>}>
      <Field label="Name" htmlFor="ar-name" error={err}><input id="ar-name" className={cx('inp', err && 'err')} value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Long-wait alert" /></Field>
      <Field label="When" htmlFor="ar-when"><select id="ar-when" className="inp" value={when} onChange={(e) => setWhen(e.target.value)}>{WHEN_OPTIONS.map(([w]) => <option key={w}>{w}</option>)}</select></Field>
      <Field label="Threshold" htmlFor="ar-th"><div className="row"><input id="ar-th" className="inp" type="number" min="1" style={{ width: 100 }} value={threshold} onChange={(e) => setThreshold(e.target.value)} /><span className="small muted">{unit}</span></div></Field>
      <Field label="Then recommend" htmlFor="ar-then"><input id="ar-then" className="inp" value={then} onChange={(e) => setThen(e.target.value)} /></Field>
    </Modal>
  );
}

export function DssLog() {
  const s = useStore();
  const t = useNow(30000);
  const ap = s.decisions.filter((d) => d.call === 'Approved').length;
  return (
    <>
      <PageHead eyebrow="Decision support" title="History" sub="Every suggestion you approved, changed or skipped, with what happened after." />
      <div className="grid g3">
        <Stat label="Decisions made this month" value={s.decisions.length} icon="history" tone="violet" />
        <Stat label="Approved ✅" value={`${Math.round((ap / Math.max(1, s.decisions.length)) * 100)}%`} sub={`${ap} of ${s.decisions.length}`} icon="check" tone="green" />
        <Stat label="Avg wait with a rush plan" value="12 min" sub="Without a plan: 22 min" icon="timer" />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Decision</th><th>Your choice</th><th>Result</th><th>Triggered by</th><th>Who decided</th></tr></thead>
            <tbody>
              {s.decisions.map((d) => (
                <tr key={d.id}>
                  <td className="small muted" style={{ whiteSpace: 'nowrap' }}>{fmtWhen(d.ts, t)}</td>
                  <td className="small strong">{d.what}</td>
                  <td><Badge tone={CALL_TONE[d.call]}>{d.call}</Badge></td>
                  <td className="small">{d.result}</td>
                  <td><Badge tone="violet">{d.rule}</Badge></td>
                  <td className="small muted">{d.by || 'Liza Manalo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!s.decisions.length && <Empty icon="history" title="No decisions yet" />}
        </div>
      </div>
    </>
  );
}
