import { ICONS } from './icons.js';
import { cx, initials, hashIndex } from './util.js';
import { bus } from './store.js';

const { useState, useEffect, useRef } = React;

export function Icon({ name, size = 16, stroke = 2, className, style }) {
  const nodes = ICONS[name];
  if (!nodes) return null;
  return (
    <svg className={cx('ic', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      {nodes.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

export function Logo({ size = 32 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 100 100" aria-label="Bak Bak" role="img">
      <circle cx="50" cy="50" r="50" fill="#FFD92E" />
      <path d="M25 84C22 58 34 40 50 40C66 40 78 58 75 84C67.65 89.07 58.93 91.79 50 91.79C41.07 91.79 32.35 89.07 25 84Z" fill="#fff" stroke="#111" strokeWidth="2.5" />
      <path d="M39 41C34 36 35 28 41 29C41 23 49 21 51 27C55 21 64 24 60 31C66 31 66 38 61 41H39Z" fill="#E3001B" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#111" strokeWidth="2.5" />
      <circle cx="41" cy="58" r="2.6" fill="#111" />
      <circle cx="59" cy="58" r="2.6" fill="#111" />
      <ellipse cx="50" cy="66" rx="5.5" ry="3.8" fill="#F5A800" stroke="#111" strokeWidth="1.6" />
      <path d="M47.5 70.5C44.5 77 47 82 50 82C53 82 55.5 77 52.5 70.5H47.5Z" fill="#E3001B" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Btn({ kind = 'secondary', size, icon, iconRight, children, className, block, ...p }) {
  return (
    <button type="button" className={cx('btn', 'btn-' + kind, size && 'btn-' + size, !children && 'btn-icon', block && 'btn-block', className)} {...p}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children != null && children !== false && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

export function Badge({ tone, children, lg, icon }) {
  return <span className={cx('badge', tone && 'b-' + tone, lg && 'lg')}>{icon && <Icon name={icon} size={12} />}{children}</span>;
}
const CH = { Messenger: 'msgr', 'Walk-in': 'walk', Foodpanda: 'fp', Grab: 'grab', Facebook: 'fb', 'Facebook comment': 'fb', 'Facebook page': 'fb', 'Foodpanda review': 'fp', 'Foodpanda review · by staff': 'fp', SMS: 'walk' };
export function ChannelBadge({ channel }) { return <Badge tone={CH[channel] || null}>{channel}</Badge>; }

export function Avatar({ name, size }) {
  return <span className={cx('av', size)} style={{ background: `var(--av-${hashIndex(name || '?', 7)})` }}>{initials(name || '?')}</span>;
}

export function Toggle({ on, onChange, label, disabled }) {
  return <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} className={cx('tgl', on && 'on')} onClick={() => onChange(!on)}><span /></button>;
}

export function Seg({ options, value, onChange, full, label }) {
  return (
    <div className={cx('seg', full && 'full')} role="tablist" aria-label={label}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return <button type="button" key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>;
      })}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => {
        const v = typeof t === 'string' ? t : t.value;
        return <button type="button" key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{typeof t === 'string' ? t : t.label}</button>;
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, label = 'Quantity' }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" aria-label="Less" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Icon name="minus" size={15} /></button>
      <span>{value}</span>
      <button type="button" aria-label="More" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Icon name="plus" size={15} /></button>
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div className="fld">
      {label && <label className="fld-l" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="fld-e">{error}</span> : hint ? <span className="fld-h">{hint}</span> : null}
    </div>
  );
}

export function Modal({ title, sub, onClose, children, footer, size = 'md', side }) {
  const ref = useRef(null);
  useEffect(() => {
    // Only the top-most dialog closes on Escape (dialogs can stack, e.g. an order drawer and its slip).
    const h = (e) => { if (e.key !== 'Escape') return; const all = document.querySelectorAll('.modal'); if (all[all.length - 1] === ref.current) onClose(); };
    window.addEventListener('keydown', h);
    const el = ref.current && ref.current.querySelector('input, textarea, select');
    if (el && !side) setTimeout(() => el.focus(), 30);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return ReactDOM.createPortal(
    <div className={cx('ovl', side && 'side')} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={cx('modal', 'm-' + size)} role="dialog" aria-modal="true" aria-label={title}>
        <div className="m-head">
          <div className="grow"><div className="m-title">{title}</div>{sub && <div className="m-sub">{sub}</div>}</div>
          <Btn kind="ghost" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <div className="m-body">{children}</div>
        {footer && <div className="m-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// Small popover anchored under a button; closes on outside click.
export function Popover({ open, onClose, children, align = 'right', width }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  if (!open) return null;
  return <div ref={ref} className="pop" style={{ top: 'calc(100% + 6px)', [align]: 0, width }}>{children}</div>;
}

export function Empty({ icon = 'inbox', title, text, children }) {
  return <div className="empty"><Icon name={icon} size={24} /><div className="empty-t">{title}</div>{text && <div className="empty-x">{text}</div>}{children}</div>;
}

export function Toasts({ scope }) {
  const [list, setList] = useState([]);
  useEffect(() => bus.on('toast', (t) => {
    if (t.scope !== scope) return;
    setList((l) => [...l.slice(-2), t]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 3200);
  }), [scope]);
  return <div className={cx('toasts', 'toasts-' + scope)} aria-live="polite">{list.map((t) => <div key={t.id} className={cx('toast', t.tone && 't-' + t.tone)}>{t.text}</div>)}</div>;
}

export function Sim() { return <div className="sim"><Icon name="info" size={13} />All data shown are simulated. Dates are sample dates, as if BakBak CRM were already in use. Changes are saved in this browser until you reset the demo.</div>; }

// ---------- charts ----------
export function Bars({ values, labels, hi = [], fmt = (v) => v, green, height = 150 }) {
  const max = Math.max(1, ...values);
  return (
    <div className="bars" style={{ height }} role="img" aria-label={labels.map((l, i) => `${l}: ${fmt(values[i])}`).join(', ')}>
      {values.map((v, i) => (
        <div key={i} className={cx('b', hi.includes(i) && 'hi', green && 'green')}>
          <span className="v">{fmt(v)}</span>
          <i style={{ height: `${Math.max(2, (v / max) * 100 - 14)}%` }} />
          <span className="l">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
export function HBars({ rows, fmt = (v) => v, color }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.label} className="hbar">
          <span className="ellipsis">{r.label}</span>
          <span className="track"><i style={{ width: `${(r.value / max) * 100}%`, background: color }} /></span>
          <span className="right num muted">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
export function Donut({ parts, size = 120, label }) {
  const total = parts.reduce((t, p) => t + p.value, 0) || 1;
  const r = 15.9155;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 42 42" role="img" aria-label={label}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
        {parts.map((p) => {
          const pct = (p.value / total) * 100;
          const el = <circle key={p.label} cx="21" cy="21" r={r} fill="none" stroke={p.color} strokeWidth="6" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={25 - acc} />;
          acc += pct;
          return el;
        })}
      </svg>
      <div className="legend">
        {parts.map((p) => <div key={p.label}><span className="dot" style={{ color: p.color }} />{p.label}<span className="v">{p.fmt || p.value}</span></div>)}
      </div>
    </div>
  );
}
export function Spark({ values, width = 120, height = 34, color = 'var(--accent)' }) {
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 6) + 3, height - 4 - ((v - min) / (max - min || 1)) * (height - 10)]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

// A QR-style pattern drawn from the code. It is decoration for the demo, not a scannable QR.
export function FakeQR({ text, size = 120 }) {
  const n = 21;
  let h = 2166136261;
  const bits = [];
  for (let i = 0; i < n * n; i++) {
    h ^= text.charCodeAt(i % text.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bits.push((h >> 7) & 1);
  }
  const finder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && bits[y * n + x]) cells.push(<rect key={x + '-' + y} x={x} y={y} width="1" height="1" />);
  const F = ({ x, y }) => (<g><rect x={x} y={y} width="7" height="7" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--surface)" /><rect x={x + 2} y={y + 2} width="3" height="3" /></g>);
  return (
    <svg className="qr" width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} fill="currentColor" aria-label={`QR code for ${text}`} role="img" shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="var(--surface)" />
      {cells}
      <F x={0} y={0} /><F x={n - 7} y={0} /><F x={0} y={n - 7} />
    </svg>
  );
}
