// Small helpers shared by the customer phone and the BakBak CRM workspace.
export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
// The demo starts on Saturday, Oct 17, 2026 at 3:45 PM (the time used in the Figma screens) and runs in real time.
export const BASE = new Date(2026, 9, 17, 15, 45, 0).getTime();
export const MAX_ELAPSED = 3 * HOUR;
export const at = (day, h, m, month = 9) => new Date(2026, month, day, h, m).getTime();

export const pad = (n) => String(n).padStart(2, '0');
export function peso(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '−₱' : '₱') + Math.abs(v).toLocaleString('en-US');
}
export const pesoK = (n) => '₱' + (n / 1000).toFixed(1) + 'k';
export const num = (n) => Math.round(n || 0).toLocaleString('en-US');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtTime(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ap}`;
}
export function fmtClock(ts) {
  const d = new Date(ts);
  return `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;
}
export const fmtMD = (ts) => { const d = new Date(ts); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const fmtDate = (ts) => { const d = new Date(ts); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const fmtLongDate = (ts) => { const d = new Date(ts); return `${LONG_DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const fmtFull = (ts) => { const d = new Date(ts); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export function sameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}
export function fmtWhen(ts, now) {
  if (!ts) return '—';
  if (sameDay(ts, now)) return 'Today, ' + fmtTime(ts);
  if (sameDay(ts, now - DAY)) return 'Yesterday, ' + fmtTime(ts);
  return fmtDate(ts);
}
export function fmtAgo(ts, now) {
  const m = Math.round((now - ts) / MIN);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  if (sameDay(ts, now)) return fmtTime(ts);
  return fmtDate(ts);
}
export const minsBetween = (a, b) => Math.max(0, Math.round((b - a) / MIN));
// "21:00" -> "9 PM", "10:30" -> "10:30 AM"
export function hm12(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return m ? `${hh}:${pad(m)} ${ap}` : `${hh} ${ap}`;
}
export function minutesOfDay(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
}
export function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  const a = (p[0] || '?')[0] || '?';
  const b = p.length > 1 ? p[p.length - 1][0] : (p[0] || '')[1] || '';
  return (a + b).toUpperCase();
}
export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
export function maskPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length < 7) return p || '—';
  return d.slice(0, 4) + ' ••• ' + d.slice(-4);
}
export function fmtPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p;
}
export const cx = (...a) => a.filter(Boolean).join(' ');
export function hashIndex(s, n) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randCode(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
export function normalize(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9ñ'\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sum = (arr, f = (x) => x) => arr.reduce((t, x) => t + (f(x) || 0), 0);
export function plural(n, one, many) { return `${num(n)} ${n === 1 ? one : many || one + 's'}`; }
