// Sample data, taken from the Figma screens on the "change it here" page (option A).
// Everything here is simulated. The demo saves changes in this browser only, until "Reset demo".
import { at, randCode, BASE, DAY, MIN, sum } from './util.js';

export const MENU = [
  { id: 'half', name: 'Half Ala Carte', short: 'Half', details: '6 pcs · 1 flavor', desc: 'Boneless chicken in 1 flavor', price: 179, cat: 'Chicken', flavors: 1, best: true, available: true },
  { id: 'whole', name: 'Whole Ala Carte', short: 'Whole', details: '12 pcs · up to 2 flavors', desc: 'Up to 2 flavors, good for sharing', price: 339, cat: 'Chicken', flavors: 2, available: true },
  { id: 'rice', name: 'Chicken Rice Meal', short: 'Rice Meal', details: 'Boneless chicken with rice', desc: 'Boneless chicken with rice, 1 flavor', price: 119, cat: 'Rice meals', flavors: 1, available: true },
  { id: 'fries', name: 'Fries', short: 'Fries', details: 'Side or snack', desc: 'Crispy and lightly salted', price: 69, cat: 'Sides', available: true },
  { id: 'ranch', name: 'Ranch Dip', short: 'Ranch Dip', details: 'Add-on', desc: 'Cool and creamy', price: 25, cat: 'Dips', dip: true, available: true },
  { id: 'cheese', name: 'Cheese Dip', short: 'Cheese Dip', details: 'Add-on', desc: 'Warm cheddar', price: 25, cat: 'Dips', dip: true, available: true },
  { id: 'rite', name: 'Rite & Lite', short: 'Rite & Lite', details: 'Refreshing drink', desc: 'Refreshing drink', price: 30, cat: 'Drinks', available: true },
];

export const FLAVORS = ['Soy Garlic', 'Bak Bak Special', 'Yang Nyeom', 'Garlic Parmesan', 'Smoke BBQ', 'White Cheddar', "Jack Daniel's"];

function item(mid, qty = 1, flavors = []) {
  const m = MENU.find((x) => x.id === mid);
  return { mid, name: m.name, short: m.short, qty, price: m.price, flavors };
}
function order(id, cid, name, channel, type, items, status, ts, extra = {}) {
  const sub = items.reduce((t, i) => t + i.price * i.qty, 0);
  return { id, cid, name, channel, type, items, sub, discount: 0, total: sub, status, ts, paidAt: status === 'awaiting' || status === 'new' ? null : ts + 60000, consent: true, ...extra };
}

export const WAIT_DEFAULT = 20;

export function seed() {
  const startedAt = Date.now();
  return {
    v: 4,
    seedId: Math.random().toString(36).slice(2),
    clock: { startedAt },
    role: 'owner',
    session: null,
    me: 'geanne',
    settings: {
      business: { name: 'Bak Bak Boneless Chicken', address: 'Tikay, City of Malolos, Bulacan', short: 'Tikay, Malolos', open: '10:00', close: '21:00' },
      maskPhones: true,
      consentText: 'Optional: send me Bak Bak deals in Messenger or by SMS. I can stop anytime.',
      dataRequest: 'Export my customer data',
      earnPer: 10,
    },
    menu: MENU.map((m) => ({ ...m })),
    flavors: FLAVORS.slice(),
    rewards: [
      { id: 'r-ranch', name: 'Ranch Dip', pts: 50, value: 25, icon: 'tag', redeemed: 21 },
      { id: 'r-fries', name: 'Fries', pts: 80, value: 69, icon: 'utensils', redeemed: 18 },
      { id: 'r-100', name: '₱100 off your order', short: '₱100 off', pts: 150, value: 100, icon: 'receipt-text', redeemed: 11 },
      { id: 'r-half', name: 'Half Ala Carte', pts: 250, value: 179, icon: 'flame', redeemed: 8 },
    ],
    customers: [
      { id: 'denise', name: 'Denise Arwen Cruz', phone: '09175554810', area: 'Tikay', channel: 'Walk-in', type: 'Takeout', last: at(16, 16, 12), orders: 24, spend: 4380, points: 188, consent: 'Yes', member: true, segs: ['After-school regulars', 'Frequent Soy Garlic buyers'], since: at(14, 10, 0, 8) - 365 * 86400000, fav: 'Soy Garlic', note: 'Likes it extra crispy with sauce on the side. Usually comes after school with friends.', owner: 'Ana Reyes' },
      { id: 'geanne', name: 'Geanne Ashlee Gonzales', phone: '09175554817', area: 'Guinhawa', channel: 'Messenger', type: 'Pick-up', last: at(3, 15, 40), orders: 5, spend: 816, points: 81, consent: 'Yes', member: true, segs: ['Messenger regulars'], since: at(2, 12, 0, 5), fav: 'Garlic Parmesan', note: 'Extra crispy, sauce on the side.', owner: 'Ana Reyes' },
      { id: 'mika', name: 'Mika Villanueva', phone: '09175554824', area: 'Bulihan', channel: 'Walk-in', type: 'Dine-in', last: at(17, 14, 58), orders: 12, spend: 2640, points: 214, consent: 'Yes', member: true, segs: ['Near a reward'], since: at(20, 13, 0, 3), fav: 'Bak Bak Special', note: '', owner: 'Ana Reyes' },
      { id: 'kevin', name: 'Kevin Ramos', phone: '09175554831', area: 'Tikay', channel: 'Walk-in', type: 'Takeout', last: at(17, 15, 24), orders: 7, spend: 1190, points: 119, consent: 'Yes', member: true, segs: ['Near a reward', 'After-school regulars'], since: at(9, 16, 0, 6), fav: 'Soy Garlic', note: '', owner: 'Jomar Cruz' },
      { id: 'andrea', name: 'Andrea Mendoza', phone: '09175554838', area: 'Sumapang Matanda', channel: 'Messenger', type: 'Pick-up', last: at(17, 15, 30), orders: 15, spend: 3105, points: 160, consent: 'Yes', member: true, segs: ['Frequent Soy Garlic buyers', 'Messenger regulars'], since: at(1, 11, 0, 4), fav: 'Soy Garlic', note: 'Always asks for extra Cheese Dip.', owner: 'Ana Reyes' },
      { id: 'carla', name: 'Carla Santiago', phone: '09175554880', area: 'Bulihan', channel: 'Messenger', type: 'Pick-up', last: at(17, 15, 11), orders: 3, spend: 648, points: 44, consent: 'Yes', member: true, segs: ['Messenger regulars'], since: at(28, 17, 0, 7), fav: 'Garlic Parmesan', note: '', owner: 'Ana Reyes' },
      { id: 'nico', name: 'Nico Garcia', phone: '09175554845', area: 'Look 1st', channel: 'Messenger', type: 'Pick-up', last: at(17, 15, 44), orders: 3, spend: 612, points: 61, consent: 'Yes', member: true, segs: ['Near a reward', 'Messenger regulars'], since: at(5, 18, 0, 8), fav: "Jack Daniel's", note: '', owner: 'Jomar Cruz' },
      { id: 'trisha', name: 'Trisha Navarro', phone: '09175554852', area: 'Tikay', channel: 'Walk-in', type: 'Dine-in', last: at(14, 13, 0, 8), orders: 8, spend: 1560, points: 106, consent: 'Yes', member: true, segs: ['Inactive 30+ days', 'Near a reward'], since: at(3, 12, 0, 2), fav: 'Yang Nyeom', note: '', owner: 'Ana Reyes' },
      { id: 'paolo', name: 'Paolo Santos', phone: '09175554859', area: 'Longos', channel: 'Foodpanda', type: 'Delivery', last: at(17, 15, 5), orders: 9, spend: 1890, points: 0, consent: 'No', member: false, segs: [], since: at(11, 19, 0, 5), fav: 'Yang Nyeom', note: '', owner: 'Ana Reyes' },
      { id: 'joshua', name: 'Joshua Bautista', phone: '09175554866', area: 'Mojon', channel: 'Grab', type: 'Delivery', last: at(17, 15, 36), orders: 6, spend: 1488, points: 0, consent: 'No', member: false, segs: [], since: at(22, 19, 0, 6), fav: 'Smoke BBQ', note: '', owner: 'Jomar Cruz' },
      { id: 'bea', name: 'Bea Aquino', phone: '09175554873', area: 'Santisima Trinidad', channel: 'Foodpanda', type: 'Delivery', last: at(4, 18, 0), orders: 4, spend: 860, points: 0, consent: 'No', member: false, segs: [], since: at(15, 18, 0, 7), fav: 'Soy Garlic', note: '', owner: 'Ana Reyes' },
    ],
    orders: [
      order('BB-0982', 'geanne', 'Geanne Ashlee Gonzales', 'Messenger', 'Pick-up', [item('half', 1, ['Garlic Parmesan']), item('ranch')], 'completed', at(3, 15, 20), { doneAt: at(3, 15, 48), pts: 20, rating: 5 }),
      order('BB-1019', 'andrea', 'Andrea Mendoza', 'Messenger', 'Pick-up', [item('whole', 1, ['Soy Garlic', 'Bak Bak Special']), item('cheese')], 'completed', at(13, 17, 30), { doneAt: at(13, 17, 58), pts: 36 }),
      order('BB-1031', 'denise', 'Denise Arwen Cruz', 'Walk-in', 'Takeout', [item('whole', 1, ['Soy Garlic']), item('fries')], 'completed', at(16, 16, 12), { doneAt: at(16, 16, 35), pts: 40 }),
      order('BB-1043', 'mika', 'Mika Villanueva', 'Walk-in', 'Dine-in', [item('whole', 1, ['Bak Bak Special']), item('fries', 2)], 'completed', at(17, 14, 58), { doneAt: at(17, 15, 26), pts: 47 }),
      order('BB-1044', 'paolo', 'Paolo Santos', 'Foodpanda', 'Delivery', [item('half', 1, ['Yang Nyeom']), item('rite')], 'rider', at(17, 15, 5), { ext: '#FP-48390', code: 'BB-2PLM-7QWE', readyAt: at(17, 15, 27) }),
      order('BB-1045', 'carla', 'Carla Santiago', 'Messenger', 'Pick-up', [item('half', 1, ['Garlic Parmesan']), item('ranch')], 'preparing', at(17, 15, 11), { pay: 'GCash', prepAt: at(17, 15, 14), readyBy: at(17, 15, 31), note: 'Extra crispy, sauce on the side.' }),
      order('BB-1046', 'kevin', 'Kevin Ramos', 'Walk-in', 'Takeout', [item('rice', 2, ['Soy Garlic'])], 'ready', at(17, 15, 24), { pay: 'Cash', prepAt: at(17, 15, 26), readyAt: at(17, 15, 41) }),
      order('BB-1047', 'andrea', 'Andrea Mendoza', 'Messenger', 'Pick-up', [item('whole', 1, ['Soy Garlic']), item('cheese')], 'paid', at(17, 15, 30), { pay: 'GCash', readyBy: at(17, 15, 52) }),
      order('BB-1048', 'joshua', 'Joshua Bautista', 'Grab', 'Delivery', [item('half', 1, ['Smoke BBQ']), item('fries')], 'paid', at(17, 15, 36), { ext: '#GR-55102', code: 'BB-3HTR-6WNE', pay: 'Paid in Grab', readyBy: at(17, 15, 56) }),
      order('BB-1049', null, 'Guest', 'Walk-in', 'Dine-in', [item('rice', 1, ['White Cheddar'])], 'awaiting', at(17, 15, 42)),
      order('BB-1050', 'nico', 'Nico Garcia', 'Messenger', 'Pick-up', [item('whole', 1, ["Jack Daniel's"]), item('fries')], 'new', at(17, 15, 44), { note: 'Typed in chat: "Pa-order po: 1 Whole Jack Daniel’s + Fries."' }),
    ],
    codes: [
      { code: 'BB-7K2Q-9XMA', app: 'Foodpanda', ref: '#FP-48213', label: 'Whole Ala Carte (12 pcs)', flavors: 'Soy Garlic, Yang Nyeom', date: at(16, 16, 32), food: 339, usedBy: null },
      { code: 'BB-2PLM-7QWE', app: 'Foodpanda', ref: '#FP-48390', label: 'Half Ala Carte (6 pcs) · Rite & Lite', orderId: 'BB-1044', date: at(17, 15, 5), food: 209, usedBy: null },
      { code: 'BB-3HTR-6WNE', app: 'Grab', ref: '#GR-55102', label: 'Half Ala Carte (6 pcs) · Fries', orderId: 'BB-1048', date: at(17, 15, 36), food: 248, usedBy: null },
      { code: 'BB-8LPA-2QZD', app: 'Foodpanda', ref: '#FP-46115', label: 'Half Ala Carte (6 pcs)', date: at(8, 19, 10), food: 179, usedBy: null },
      { code: 'BB-5MNC-4KXT', app: 'Grab', ref: '#GR-54870', label: 'Chicken Rice Meal ×2', date: at(13, 18, 20), food: 238, usedBy: 'denise', usedAt: at(13, 19, 2) },
    ],
    ledger: [
      { id: 'l1', cid: 'geanne', ts: at(3, 15, 48), label: 'Order #BB-0982', pts: 20 },
      { id: 'l2', cid: 'geanne', ts: at(26, 12, 10, 8), label: 'Ranch Dip reward', pts: -50 },
      { id: 'l3', cid: 'denise', ts: at(16, 16, 35), label: 'Order #BB-1031', pts: 40 },
      { id: 'l4', cid: 'denise', ts: at(13, 19, 2), label: 'Grab #GR-54870 (Bak Bak card)', pts: 23 },
      { id: 'l5', cid: 'denise', ts: at(3, 15, 40), label: 'Fries reward (in store)', pts: -80 },
      { id: 'l6', cid: 'mika', ts: at(17, 15, 26), label: 'Order #BB-1043', pts: 47 },
      { id: 'l7', cid: 'andrea', ts: at(13, 17, 58), label: 'Order #BB-1019', pts: 36 },
      { id: 'l8', cid: 'kevin', ts: at(12, 16, 40), label: 'Order #BB-1007', pts: 24 },
      { id: 'l9', cid: 'nico', ts: at(10, 18, 15), label: 'Order #BB-0996', pts: 40 },
      { id: 'l10', cid: 'trisha', ts: at(14, 13, 40, 8), label: 'Order #BB-0731', pts: 17 },
      { id: 'l11', cid: 'carla', ts: at(9, 17, 20), label: 'Order #BB-0990', pts: 20 },
    ],
    vouchers: [],
    ratings: [
      { id: 'rt1', orderId: 'BB-1031', cid: 'denise', stars: 5, tags: ['Crispiness'], comment: 'Crispy as always!', ts: at(14, 18, 2) },
      { id: 'rt2', orderId: 'BB-0982', cid: 'geanne', stars: 5, tags: ['Taste'], comment: 'Sauce on the side was perfect.', ts: at(3, 16, 40) },
    ],
    tickets: [
      { id: 'T-0129', subject: 'Can I change the address on my Grab order?', type: 'Delivery issue', cid: 'joshua', assignee: null, status: 'new', created: at(17, 15, 41), due: at(17, 16, 3), orderId: 'BB-1048', convoId: 'cv-joshua', notes: [] },
      { id: 'T-0130', subject: 'Order #BB-1045 is taking long', type: 'Long wait', cid: 'carla', assignee: 'Kat Villareal', status: 'waiting_us', created: at(17, 15, 37), due: at(17, 15, 51), orderId: 'BB-1045', convoId: 'cv-carla', notes: [], firstReply: 1 },
      { id: 'T-0131', subject: 'Missing Cheese Dip on #BB-1019', type: 'Wrong order', cid: 'andrea', assignee: 'Liza Manalo', status: 'waiting_contact', created: at(17, 14, 50), due: at(17, 17, 50), orderId: 'BB-1019', convoId: 'cv-andrea', notes: [], firstReply: 4 },
      { id: 'T-0132', subject: 'Asking for a copy of the sales invoice', type: 'Other', cid: 'paolo', assignee: 'Ana Reyes', status: 'waiting_us', created: at(17, 14, 10), due: at(17, 16, 10), notes: [] },
      { id: 'T-0127', subject: 'Waited 35 minutes for takeout', type: 'Long wait', cid: 'denise', assignee: 'Kat Villareal', status: 'closed', created: at(10, 17, 48), closedAt: at(10, 18, 30), notes: [], firstReply: 5 },
      { id: 'T-0128', subject: 'Got Smoke BBQ instead of Soy Garlic', type: 'Wrong order', cid: 'bea', assignee: 'Kat Villareal', status: 'closed', created: at(9, 18, 5), closedAt: at(9, 18, 50), notes: [], firstReply: 7 },
    ],
    convos: [
      {
        id: 'cv-geanne', cid: 'geanne', name: 'Geanne Ashlee Gonzales', channel: 'Messenger', status: 'bot', assignee: null, ticketId: null, unread: false, misses: 0,
        messages: [{ id: 'm-g1', from: 'bot', author: 'Bak Bak assistant', ts: at(17, 15, 45), text: "Hi Geanne! I'm the Bak Bak assistant. What can I help you with today?", quick: 'WELCOME' }],
      },
      {
        id: 'cv-carla', cid: 'carla', name: 'Carla Santiago', channel: 'Messenger', status: 'open', assignee: 'Kat Villareal', ticketId: 'T-0130', orderId: 'BB-1045', unread: true,
        messages: [
          { id: 'm-c1', from: 'customer', ts: at(17, 15, 36), text: "Hi, it's been 25 mins, where's my order?" },
          { id: 'm-c2', from: 'bot', author: 'Bak Bak assistant', ts: at(17, 15, 36), text: 'Order #BB-1045 is being prepared. 🍗' },
          { id: 'm-c3', from: 'customer', ts: at(17, 15, 37), text: 'Ang tagal po.' },
          { id: 'm-c4', from: 'system', adminOnly: true, ts: at(17, 15, 37), text: 'Bot handed off to Kat Villareal: order status complaint' },
          { id: 'm-c5', from: 'staff', author: 'Kat Villareal', ts: at(17, 15, 38), text: "Sorry po! Your order is next, we'll update you in 5 minutes." },
          { id: 'm-c6', from: 'customer', ts: at(17, 15, 41), text: 'Okay po, salamat.' },
        ],
      },
      { id: 'cv-joshua', cid: 'joshua', name: 'Joshua Bautista', channel: 'Messenger', status: 'open', assignee: null, ticketId: 'T-0129', unread: true, messages: [{ id: 'm-j1', from: 'customer', ts: at(17, 15, 41), text: 'Pwede pa po ba palitan yung address sa Grab order ko?' }, { id: 'm-j2', from: 'system', adminOnly: true, ts: at(17, 15, 41), text: 'Bot handed off to staff: delivery question' }] },
      { id: 'cv-nico', cid: 'nico', name: 'Nico Garcia', channel: 'Messenger', status: 'open', assignee: 'Liza Manalo', ticketId: null, orderId: 'BB-1050', unread: true, messages: [{ id: 'm-n1', from: 'customer', ts: at(17, 15, 44), text: "Pa-order po: 1 Whole Jack Daniel's + Fries." }] },
      { id: 'cv-andrea', cid: 'andrea', name: 'Andrea Mendoza', channel: 'Messenger', status: 'open', assignee: 'Liza Manalo', ticketId: 'T-0131', unread: false, messages: [{ id: 'm-a1', from: 'customer', ts: at(17, 14, 50), text: 'Walang Cheese Dip sa order ko kanina.' }, { id: 'm-a2', from: 'staff', author: 'Liza Manalo', ts: at(17, 14, 54), text: "So sorry po! We'll add a free Cheese Dip to your next order. Is that okay?" }] },
      { id: 'cv-visitor', cid: null, name: 'Visitor', channel: 'Messenger', status: 'open', assignee: null, ticketId: null, unread: true, messages: [{ id: 'm-v1', from: 'customer', ts: at(17, 15, 15), text: 'Magkano delivery fee sa Guinhawa?' }, { id: 'm-v2', from: 'bot', author: 'Bak Bak assistant', ts: at(17, 15, 15), text: "We don't have our own riders, so we can't deliver. You can order for pick-up here." }, { id: 'm-v3', from: 'customer', ts: at(17, 15, 16), text: 'Pano po pag sa Foodpanda?' }, { id: 'm-v4', from: 'system', adminOnly: true, ts: at(17, 15, 16), text: 'Bot handed off to staff: not sure' }] },
      { id: 'cv-bea', cid: 'bea', name: 'Bea Aquino', channel: 'Facebook', status: 'bot', assignee: null, ticketId: null, unread: false, messages: [{ id: 'm-b1', from: 'customer', ts: at(17, 13, 2), text: 'Open po ba kayo bukas?' }, { id: 'm-b2', from: 'bot', author: 'Bak Bak assistant', ts: at(17, 13, 2), text: "We're open 10 AM to 9 PM every day, at Tikay, City of Malolos, Bulacan." }] },
      { id: 'cv-marco', cid: null, name: 'Marco Santos', channel: 'Facebook comment', status: 'open', assignee: null, ticketId: null, unread: true, messages: [{ id: 'm-mk1', from: 'customer', ts: at(17, 12, 40), text: "Comment on your Payday post: Available pa po ba Jack Daniel's?" }] },
      { id: 'cv-rina', cid: null, name: 'Rina Torres', channel: 'Foodpanda review · by staff', status: 'open', assignee: null, ticketId: null, unread: true, messages: [{ id: 'm-r1', from: 'customer', ts: at(17, 11, 58), text: '★★☆☆☆ “Fries were soggy when they arrived.”' }] },
    ],
    faqs: [
      { id: 'f-order', q: 'Order for pick-up', kw: ['order', 'pa order', 'paorder', 'bili', 'buy', 'pick up', 'pickup', 'reserve', 'oorder', 'gusto ko'], a: 'Tap below to open the order form. It opens right here in Messenger. No app to download.', action: 'open:menu', btn: 'Open the order form' },
      { id: 'f-menu', q: 'Menu and flavors', kw: ['menu', 'flavor', 'flavors', 'lasa', 'sauce', 'available', 'meron'], a: 'Seven flavors: {flavors}.', action: 'open:menu', btn: 'See the menu' },
      { id: 'f-prices', q: 'Prices', kw: ['price', 'prices', 'magkano', 'how much', 'presyo', 'cost', 'hm'], a: '{prices}', action: 'open:menu', btn: 'Order now' },
      { id: 'f-hours', q: 'Store hours', kw: ['hours', 'open', 'close', 'closing', 'oras', 'bukas', 'sarado', 'schedule'], a: "We're open {hours} every day, at {address}." },
      { id: 'f-delivery', q: 'Delivery options and fees', kw: ['delivery', 'deliver', 'padeliver'], a: "We don't have our own riders, so we can't deliver. You can order for pick-up here." },
      { id: 'f-status', q: 'Order status', kw: ['status', 'track', 'nasaan', 'asan', 'where is my order', 'ready na', 'update', 'where s my order'], special: 'status', a: 'Looks up the customer’s latest order and its stage.' },
      { id: 'f-pay', q: 'Payment', kw: ['cod', 'cash', 'gcash', 'bayad', 'pay', 'payment', 'bank', 'maya', 'transfer'], a: 'Messenger orders are paid first through our secure pay link (GCash or QR Ph). No COD, so we can start cooking right away.' },
      { id: 'f-location', q: 'Location', kw: ['location', 'address', 'saan', 'located', 'branch', 'map', 'directions'], a: 'We’re at {address}. Pick-up is at the counter.' },
      { id: 'f-points', q: 'My points', kw: ['points', 'point', 'rewards', 'reward', 'puntos', 'loyalty'], special: 'points', a: 'Shows the customer’s points and next reward.' },
      { id: 'f-code', q: 'Bak Bak card code', kw: ['code', 'card', 'receipt', 'claim', 'qr'], a: 'Ordered on Foodpanda or Grab? Scan the QR on the Bak Bak Rewards card in your bag, or enter its code on the Claim points page. Your first claim also gets a free Ranch Dip.', action: 'open:claim', btn: 'Claim points' },
      { id: 'f-thanks', q: 'ok thanks!', kw: ['thanks', 'thank you', 'salamat', 'ty', 'thank'], a: 'Anytime! Anything else? You can also type "staff" to talk to a person.' },
    ],
    handoff: ['late', 'wrong', 'missing', 'refund', 'cold', 'matagal'],
    workflows: [
      { id: 'confirm', name: 'Order confirmation', icon: 'check-check', tone: 'blue', when: 'A customer sends the order form', then: 'Send the order summary to check before paying', delay: 'None, send right away', cond: 'None', runs: 288, on: true },
      { id: 'wait', name: 'Waiting-time notice', icon: 'clock', tone: 'orange', when: 'An order is confirmed', then: 'Tell the customer the estimated wait', delay: 'None, send right away', cond: 'None', runs: 1248, on: true, tpl: 'Paid {amount} via {method}. Order {order} is confirmed and ready for {mode} in about {wait} min (around {time}).' },
      { id: 'delay', name: 'Delay notice', icon: 'timer', tone: 'orange', when: 'An order runs past its estimated wait', then: 'Send the new ready time with a short apology', delay: 'None', cond: 'Messenger orders only', runs: 96, on: true, tpl: 'Sorry po! Order {order} is taking a little longer. New ready time: {time}.' },
      { id: 'ready', name: 'Ready for pick-up', icon: 'bell', tone: 'green', when: 'An order is marked Ready', then: 'Let the customer know it’s ready at the counter', delay: 'None', cond: 'Messenger orders only', runs: 576, on: true, tpl: 'Your order {order} is ready at the counter! 🍗 Just show this chat when you pick it up.' },
      { id: 'loyalty', name: 'Loyalty points', icon: 'star', tone: 'orange', when: 'An order is completed', then: 'Add 1 point for every ₱10 of food', delay: 'None', cond: 'Bak Bak Rewards members', runs: 862, on: true, tpl: '{points} points added for order {order}. You now have {balance} points.' },
      { id: 'receipt', name: 'Bak Bak card claim', icon: 'qr-code', tone: 'red', when: 'A code from the Bak Bak card in a Foodpanda or Grab bag is claimed on the rewards page', then: 'Link the order to the customer, add points, and give the welcome dip', delay: 'None', cond: 'Code is valid, unused and under 7 days old', runs: 37, on: true },
      { id: 'remind14', name: '14-day reminder', icon: 'mail', tone: 'violet', when: 'A member hasn’t ordered in 14 days', then: 'Send a reminder by Messenger (if opted in) or SMS', delay: 'Checks every morning at 9 AM', cond: 'Customer said yes to promos', runs: 210, on: true },
      { id: 'winback', name: 'Win-back list', icon: 'heart', tone: 'violet', when: 'A customer is inactive for 30+ days', then: 'Add them to the Inactive 30+ days segment', delay: 'Checks every morning at 9 AM', cond: 'None', runs: 120, on: true },
      { id: 'survey', name: 'Satisfaction survey', icon: 'smile', tone: 'teal', when: '1 hour after an order is completed', then: 'Ask for a 1–5 rating', delay: '1 hour (sent right away in this demo)', cond: 'Messenger orders only', runs: 640, on: true, tpl: 'How was order {order}? Tap below to rate it from 1 to 5.' },
      { id: 'routing', name: 'Ticket routing', icon: 'ticket', tone: 'orange', when: 'The bot hands a chat to staff', then: 'Create a ticket and assign Kat Villareal', delay: 'None', cond: 'None', runs: 29, on: true, assignee: 'Kat Villareal' },
      { id: 'overdue', name: 'Overdue ticket alert', icon: 'circle-alert', tone: 'red', when: 'A ticket passes its due time', then: 'Alert the owner and the assigned staff', delay: 'None', cond: 'Ticket is not closed', runs: 3, on: true },
    ],
    segments: [
      { id: 'sg-soy', name: 'Frequent Soy Garlic buyers', count: 82, rule: 'Ordered Soy Garlic 3 or more times in the last 4 weeks', usedBy: 'R4 · Free Cheese Dip draft' },
      { id: 'sg-inactive', name: 'Inactive 30+ days', count: 120, rule: 'No order in the last 30 days', usedBy: 'R5 · We miss you: ₱30 off' },
      { id: 'sg-near', name: 'Near a reward', count: 64, rule: 'Within 50 points of their next reward', usedBy: '' },
      { id: 'sg-msgr', name: 'Messenger regulars', count: 41, rule: 'Ordered through Messenger 3 or more times', usedBy: 'Rainy-day pick-up promo' },
      { id: 'sg-school', name: 'After-school regulars', count: 150, rule: 'Weekday orders between 3 and 5 PM', usedBy: '' },
    ],
    campaigns: [
      { id: 'cp1', name: 'We miss you: ₱30 off', audience: 'Inactive 30+ days', channel: 'SMS', status: 'Sent', sent: 120, seen: null, redeemed: 14, sales: 2856, msg: 'Hi {first name}! We miss you at Bak Bak. Here’s ₱30 off your next order, valid this week. 🍗', offer: '₱30 off any order', src: 'From Decision Support · R5', sentAt: at(14, 10, 0) },
      { id: 'cp3', name: 'Payday Whole + Fries bundle', audience: 'Loyalty members', channel: 'Messenger', status: 'Scheduled', schedule: 'Oct 30, 11:00 AM', sent: 0, seen: 0, redeemed: 0, sales: 0, msg: 'Hi {first name}! Payday treat: Whole Ala Carte + Fries for ₱379 this weekend only.', offer: 'Whole + Fries for ₱379' },
      { id: 'cp4', name: 'New flavor week: Jack Daniel’s', audience: 'Everyone (public post)', channel: 'Facebook page', status: 'Posted', sent: 1240, seen: 1240, redeemed: 0, sales: 0, msg: 'Jack Daniel’s flavor is here all week! 🔥', offer: '—', sentAt: at(12, 12, 0) },
      { id: 'cp5', name: 'Rainy-day pick-up promo', audience: 'Messenger regulars', channel: 'Messenger', status: 'Sent', sent: 41, seen: 38, redeemed: 9, sales: 2187, msg: 'Hi {first name}! Rainy day? Free Fries upgrade on pick-up orders today.', offer: 'Free Fries upgrade', sentAt: at(8, 14, 0) },
    ],
    team: [
      { id: 'u1', name: 'Liza Manalo', role: 'Owner', can: 'Everything, including approvals', status: 'Active', email: 'liza@bakbak.ph' },
      { id: 'u2', name: 'Ana Reyes', role: 'Order-taking', can: 'Orders, customers, inbox', status: 'Active', email: 'ana@bakbak.ph' },
      { id: 'u3', name: 'Jomar Cruz', role: 'Order-taking', can: 'Orders, customers, inbox', status: 'Active', email: 'jomar@bakbak.ph' },
      { id: 'u4', name: 'Kat Villareal', role: 'Ticket and inquiry', can: 'Inbox, tickets, customers', status: 'Active', email: 'kat@bakbak.ph' },
      { id: 'u5', name: 'Ben Dizon', role: 'Kitchen', can: 'Kitchen display', status: 'Active', email: 'ben@bakbak.ph' },
      { id: 'u6', name: 'Rico Lopez', role: 'Kitchen', can: 'Kitchen display', status: 'Active', email: 'rico@bakbak.ph' },
      { id: 'u7', name: 'IS 306 Group 2', role: 'Admin', can: 'Setup and settings', status: 'Active', email: 'group2@bakbak.ph' },
    ],
    recs: [
      { id: 'R1', title: 'Pre-cook for rush hours', when: 'Start by 4:00 PM', head: 'Pre-cook 3 batches (72 pcs) by 4:30 PM', sub: 'Get ready for the 5–6 PM rush', why: 'The last 4 Saturdays averaged 17 orders between 5 and 6 PM.', change: 'Estimated wait: 23 → 13 min. 72 pcs pre-cooked (first fry), then second fry and sauce per order; 81 cooked to order; none held over 30 min.', status: 'pending' },
      { id: 'R2', title: 'Extra cashier', when: 'By 4:30 PM', head: 'Move 1 staff member to the cashier, 4:30–7:00 PM', why: 'Saturdays average 17 orders at 5 PM. One cashier comfortably handles about 12.', detail: 'Orders per cashier: 17 → 8.5 · Suggested: Jomar Cruz', status: 'pending' },
      { id: 'R3', title: 'Boxes and sauce', when: 'By 4:00 PM', head: 'Prepare 45 boxes and pre-portion sauce', why: 'Soy Garlic and Bak Bak Special lead the evening orders.', detail: 'Soy Garlic and Bak Bak Special ready by 4:00 PM', status: 'pending' },
      { id: 'R4', title: 'Add-on promo', when: 'This week', head: 'A little extra for your Soy Garlic regulars', why: '82 customers ordered Soy Garlic 3 or more times this period.', detail: 'Free Cheese Dip on their next order · 82 customers', status: 'pending' },
      { id: 'R6', title: 'FAQ gap', when: 'Today', head: 'Explain pick-up and delivery-app options', why: '6 of the last 20 chatbot hand-offs asked about delivery fees.', detail: 'Update the chatbot answer: pick up at the store, or order delivery on Foodpanda or Grab', status: 'pending' },
    ],
    rules: [
      { id: 'R1', name: 'Pre-cook for rush hours', when: 'Average orders in an hour reach the threshold', then: 'Recommend pre-cooked (first-fried) batches ready 30 minutes before that hour', threshold: 15, unit: 'orders per hour', last: 'Today', on: true },
      { id: 'R2', name: 'Extra cashier', when: 'Orders per cashier in an hour pass the threshold', then: 'Recommend moving one more staff member to the cashier for those hours', threshold: 12, unit: 'orders per cashier', last: 'Today', on: true },
      { id: 'R3', name: 'Boxes and sauce', when: 'Average evening orders reach the threshold', then: 'Recommend boxes and pre-portioned sauce by 4:00 PM', threshold: 30, unit: 'evening orders', last: 'Today', on: true },
      { id: 'R4', name: 'Add-on promo', when: 'Repeat buyers of one flavor reach the threshold', then: 'Recommend a small add-on for those regulars', threshold: 50, unit: 'customers', last: 'Today', on: true },
      { id: 'R5', name: 'Win-back', when: 'Customers inactive for 30+ days reach the threshold', then: 'Recommend a win-back offer by SMS or Messenger (opted in)', threshold: 100, unit: 'customers', last: 'Wed, Oct 14', on: true },
      { id: 'R6', name: 'FAQ gap', when: 'The same question causes chatbot hand-offs', then: 'Recommend a new or clearer chatbot answer', threshold: 5, unit: 'hand-offs', last: 'Today', on: true },
    ],
    decisions: [
      { id: 'd1', ts: at(17, 10, 5), what: '+1 cashier 11:30 AM–1:00 PM', call: 'Approved', result: 'Lunch average wait 14 min, no long-wait tickets', rule: 'R2' },
      { id: 'd2', ts: at(16, 9, 40), what: '+1 cashier at lunch and 4:30–7:00 PM; 40 boxes', call: 'Approved', result: '1 long-wait ticket (previous Friday: 3)', rule: 'R2, R3' },
      { id: 'd3', ts: at(14, 9, 15), what: 'Win-back ₱30 off to 120 inactive customers', call: 'Approved', result: '14 redeemed so far, ₱2,856 in sales', rule: 'R5' },
      { id: 'd4', ts: at(12, 9, 30), what: 'Wait for payday on the 15th', call: 'Dismissed', result: '—', rule: 'R4' },
      { id: 'd5', ts: at(11, 9, 50), what: '+1 cashier 4:30–7:00 PM', call: 'Adjusted', result: 'Adjusted to 5:00–7:00 PM · 1 long-wait ticket', rule: 'R2' },
      { id: 'd6', ts: at(10, 9, 20), what: '3 batches by 4:30 PM for 5–6 PM', call: 'Approved', result: 'Average wait 12 min (without a plan: 22 min)', rule: 'R1' },
    ],
    weekend: [
      { day: 'Fri, Oct 16', status: 'Approved', items: ['+1 cashier at lunch and 4:30–7:00 PM', '40 boxes and sauces'] },
      { day: 'Sat, Oct 17', status: 'Waiting for approval', items: ['3 pre-cooked (first-fried) batches by 4:30 PM', '+1 cashier', '45 boxes and sauces'] },
      { day: 'Sun, Oct 18', status: 'Draft', items: ['2 batches ready by 4:30 PM', '40 boxes and sauces'] },
    ],
    prep: null,
    notifs: [
      { id: 'n0', ts: at(17, 15, 44), text: 'New order typed in chat by Nico Garcia', icon: 'message-circle', page: 'inbox', ref: 'cv-nico', read: false },
      { id: 'n00', ts: at(17, 15, 41), text: 'Ticket T-0129 is new and unassigned', icon: 'ticket', page: 'tickets', ref: 'T-0129', read: false },
    ],
    phone: { bag: [], unread: 0 },
    counters: { order: 1051, ticket: 133, msg: 1, cust: 1, misc: 100 },
    base: {
      customers: 960, newCustomers: 112, active: 474, members: 333, inactive: 120,
      pointsOut: 19200, closedTickets: 23, conversations: 412, handoffs: 87, surveys: 186, satisfaction: 4.24,
    },
  };
}

export function makeReceiptCode() {
  return `BB-${randCode(4)}-${randCode(4)}`;
}

// ---------- simulated history behind the dashboard, Prep planner and chat stats ----------
// Figure 8 of the paper: "Orders from 16 Sep to 13 Oct 2026 (4 weeks)". The daily history below is built so that
// these days, added to the sample orders, tickets and ratings above that fall in them, give exactly these numbers.
// The last group is not in Figure 8: the paper names those KPIs in Table 8 without values, so these are sample values.
export const FIG8 = {
  from: new Date(2026, 8, 16).getTime(),
  weeks: 4,
  weeklySales: [88420, 93460, 99100, 110470],
  channels: { 'Walk-in': [960, 193895], Messenger: [288, 58525], Foodpanda: [480, 100000], Grab: [192, 39030] }, // [orders, sales]
  flavors: { 'Soy Garlic': 461, 'Bak Bak Special': 365, 'Garlic Parmesan': 307, 'Yang Nyeom': 269, 'Smoke BBQ': 211, 'White Cheddar': 173, "Jack Daniel's": 134 },
  // Orders in the 4 weeks by day (Sunday first) and hour (10 AM to 8 PM). Rows and columns add up to Figure 8's two
  // charts. Saturday 5 PM is 68, or 17 per Saturday, the number Today's plan uses.
  byDayHour: [
    [17, 42, 59, 32, 19, 21, 36, 64, 49, 18, 7],
    [9, 18, 30, 15, 8, 14, 24, 34, 31, 12, 6],
    [9, 17, 29, 15, 8, 14, 23, 32, 30, 12, 5],
    [9, 23, 33, 14, 8, 17, 26, 36, 33, 13, 5],
    [9, 23, 33, 17, 7, 17, 26, 36, 37, 13, 6],
    [15, 33, 49, 23, 11, 23, 38, 64, 49, 19, 9],
    [16, 35, 53, 39, 22, 25, 42, 68, 57, 20, 10],
  ],
  active: 474, repeat: 275,
  tickets: 29, closed: 25, resolutionMin: 42,
  ratings: 186, stars: 789, // 789 / 186 = 4.24
  conversations: 412, handoffs: 87, // from the Chatbot page; with 288 Messenger orders, sales conversion is 70%
  replyMinutes: 107, // first-reply minutes across the 25 closed tickets: 4.3 min on average, as on the Tickets page
  notEncoded: 103, // orders and tickets handled but not encoded: CRM usage 1,949 of 2,052, or 95%
};
const HISTORY_START = new Date(2025, 8, 14); // the oldest customer record in the sample data

function randomizer(seedNo) { // small seeded generator, so the history is the same in every browser and after Reset
  let a = seedNo;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Splits a whole number by weights, keeping the total exact.
function splitInt(total, weights) {
  const w = sum(weights);
  const raw = weights.map((x) => (w ? (total * x) / w : total / weights.length));
  const out = raw.map(Math.floor);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  let left = total - sum(out);
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) out[order[i][1]]++;
  return out;
}
// A table of whole numbers with exact row and column totals. Each row takes its share of what the columns still need.
function fitTable(rows, cols) {
  const need = cols.slice();
  return rows.map((row) => {
    const cells = splitInt(row, need);
    cells.forEach((v, j) => { need[j] -= v; });
    return cells;
  });
}

function buildHistory() {
  const sample = seed();
  const rnd = randomizer(20261017);
  const channels = Object.keys(FIG8.channels);
  const flavors = Object.keys(FIG8.flavors);
  const dayTs = (i) => new Date(HISTORY_START.getFullYear(), HISTORY_START.getMonth(), HISTORY_START.getDate() + i).getTime();
  const dayOf = (ts) => { const d = new Date(ts); return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - dayTs(0)) / DAY); };
  const count = dayOf(BASE); // days before today; today is only the sample orders and whatever happens in the demo
  const w0 = dayOf(FIG8.from);
  const span = FIG8.weeks * 7;
  const inFig = (ts) => dayOf(ts) >= w0 && dayOf(ts) < w0 + span;
  const weekOf = (ts) => Math.floor((dayOf(ts) - w0) / 7);

  // What the sample records already put inside Figure 8's weeks, so the history adds only the rest.
  const so = sample.orders.filter((o) => inFig(o.ts));
  const matrix = FIG8.byDayHour.map((r) => r.slice());
  const weekly = FIG8.weeklySales.slice();
  const chOrders = channels.map((c) => FIG8.channels[c][0]);
  const chSales = channels.map((c) => FIG8.channels[c][1]);
  const flavorLeft = flavors.map((f) => FIG8.flavors[f]);
  for (const o of so) {
    const d = new Date(o.ts);
    matrix[d.getDay()][d.getHours() - 10]--;
    const c = channels.indexOf(o.channel);
    chOrders[c]--;
    if (o.paidAt) { weekly[weekOf(o.ts)] -= o.total; chSales[c] -= o.total; }
    for (const i of o.items) for (const f of i.flavors || []) flavorLeft[flavors.indexOf(f)] -= i.qty;
  }
  const st = sample.tickets.filter((x) => inFig(x.created));
  const sc = st.filter((x) => x.status === 'closed' && inFig(x.closedAt));
  const sr = sample.ratings.filter((r) => inFig(r.ts));

  const days = [];
  for (let i = 0; i < count; i++) {
    const ts = dayTs(i);
    days.push({ ts, dow: new Date(ts).getDay(), hours: [], orders: 0, sales: 0, chOrders: [], chSales: [], flavors: [], conversations: 0, handoffs: 0, tickets: 0, closed: 0, resolutionMin: 0, replied: 0, replyMin: 0, ratings: 0, stars: 0, notEncoded: 0 });
  }
  const fig = days.slice(w0, w0 + span);

  // Figure 8's four weeks: exact totals, spread by day of week, then by week in line with weekly sales.
  matrix.forEach((row, dow) => {
    const dates = fig.filter((d) => d.dow === dow);
    const table = fitTable(splitInt(sum(row), FIG8.weeklySales), row);
    dates.forEach((d, k) => { d.hours = table[k]; d.orders = sum(table[k]); });
  });
  const load = fig.map((d) => d.orders);
  fitTable(load, chOrders).forEach((r, k) => { fig[k].chOrders = r; });
  fitTable(splitInt(sum(flavorLeft), load), flavorLeft).forEach((r, k) => { fig[k].flavors = r; });
  fitTable(weekly, chSales).forEach((r, w) => {
    const week = fig.slice(w * 7, w * 7 + 7);
    channels.forEach((_, c) => {
      const parts = splitInt(r[c], week.map((d) => d.chOrders[c]));
      week.forEach((d, k) => { d.chSales[c] = parts[k]; });
    });
  });
  const spread = (key, total, weights) => splitInt(total, weights).forEach((v, k) => { fig[k][key] = v; });
  spread('conversations', FIG8.conversations, load);
  spread('handoffs', FIG8.handoffs, load);
  spread('tickets', FIG8.tickets - st.length, load);
  spread('closed', FIG8.closed - sc.length, load);
  const closedLoad = fig.map((d) => d.closed);
  spread('resolutionMin', FIG8.resolutionMin * FIG8.closed - sum(sc, (x) => Math.round((x.closedAt - x.created) / MIN)), closedLoad);
  spread('replied', FIG8.closed - sc.length, closedLoad);
  spread('replyMin', FIG8.replyMinutes - sum(sc, (x) => x.firstReply), closedLoad);
  spread('ratings', FIG8.ratings - sr.length, load);
  const ratingLoad = fig.map((d) => d.ratings);
  spread('stars', FIG8.stars - sum(sr, (r) => r.stars), ratingLoad);
  spread('notEncoded', FIG8.notEncoded, load);

  // Every other day: the same weekly pattern, growing from about 40% of Figure 8's level to where it starts.
  const avgPrice = chSales.map((v, c) => v / chOrders[c]);
  const whole = (x) => { const f = Math.floor(x); return f + (rnd() < x - f ? 1 : 0); };
  days.forEach((d, i) => {
    if (i >= w0 && i < w0 + span) return;
    const after = i >= w0 + span;
    const p = after ? 1 : i / w0; // 0 at the start of the history, 1 from Figure 8 on
    const level = after ? 1.15 : 0.4 + 0.5 * p;
    const wobble = 0.92 + rnd() * 0.16;
    d.hours = FIG8.byDayHour[d.dow].map((v) => whole((v / FIG8.weeks) * level * wobble));
    d.orders = sum(d.hours);
    d.chOrders = splitInt(d.orders, chOrders);
    d.chSales = d.chOrders.map((n, c) => Math.round(n * avgPrice[c] * (0.97 + rnd() * 0.06)));
    d.flavors = splitInt(d.orders, flavorLeft);
    const mix = (start, end) => start + (end - start) * p;
    d.conversations = whole(d.orders * mix(0.26, 0.215));
    d.handoffs = whole(d.conversations * mix(0.3, 0.21));
    d.tickets = whole(d.orders * 0.015);
    d.closed = d.tickets;
    d.resolutionMin = Math.round(d.closed * mix(70, 44));
    d.replied = d.closed;
    d.replyMin = Math.round(d.replied * mix(9, 4.6));
    d.ratings = whole(d.orders * 0.097);
    d.stars = Math.min(d.ratings * 5, Math.round(d.ratings * mix(4.05, 4.24)));
    d.notEncoded = whole((d.orders + d.tickets) * mix(0.3, 0.05));
  });
  days.forEach((d) => { d.sales = sum(d.chSales); });

  // Which days each customer ordered, so retention (who ordered more than once in a range) is counted, not stored.
  // The named sample customers count from their own orders, so they are left out of this list.
  const sampleCounts = {};
  for (const o of so) if (o.cid) sampleCounts[o.cid] = (sampleCounts[o.cid] || 0) + 1;
  const sampleCids = Object.values(sampleCounts);
  const repeat = FIG8.repeat - sampleCids.filter((n) => n >= 2).length;
  const oneTime = FIG8.active - FIG8.repeat - sampleCids.filter((n) => n === 1).length;
  const pool = sample.base.customers - sample.customers.length;
  const visits = [];
  const anyDay = (start, end) => start + Math.floor(rnd() * (end - start));
  for (let c = 0; c < pool; c++) {
    const v = [];
    const inWindow = c < repeat ? 2 + Math.floor(rnd() * 4) : c < repeat + oneTime ? 1 : 0;
    for (let k = 0; k < inWindow; k++) v.push(anyDay(w0, w0 + span));
    const earlier = inWindow ? Math.floor(rnd() * 5) : 1 + Math.floor(rnd() * 5);
    for (let k = 0; k < earlier; k++) v.push(anyDay(Math.floor(rnd() * w0), w0));
    if (rnd() < 0.12) v.push(anyDay(w0 + span, count));
    visits.push(v.map((i) => dayTs(i)));
  }
  return { channels, flavors, days, visits };
}
export const HISTORY = buildHistory();
