// End-to-end check of the prototype in Chromium: customer flow, CRM flow, saves, reset, and every page/dialog.
const { chromium } = require('playwright');
const ROOT = __dirname + '/..';
const URL = 'http://127.0.0.1:8123/bakbak-demo.html';
const DEV = process.env.DEV !== '0';
const shots = ROOT + '/shots';
require('fs').mkdirSync(shots, { recursive: true });

const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); if (!cond) console.log('FAIL', name, extra); };

async function setup(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, colorScheme: opts.dark ? 'dark' : 'light', deviceScaleFactor: opts.dpr || 1 });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('cdnjs.cloudflare.com') && u.includes('react-dom')) return route.fulfill({ path: `${ROOT}/node_modules/react-dom/umd/react-dom.${DEV ? 'development' : 'production.min'}.js`, contentType: 'application/javascript' });
    if (u.includes('cdnjs.cloudflare.com') && u.includes('/react/')) return route.fulfill({ path: `${ROOT}/node_modules/react/umd/react.${DEV ? 'development' : 'production.min'}.js`, contentType: 'application/javascript' });
    if (u.includes('fonts.g')) return route.abort();
    return route.continue();
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') page.errors.push(m.type() + ': ' + m.text().slice(0, 400)); });
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  return { ctx, page };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phone = (page) => page.locator('.screen');
const adm = (page) => page.locator('.stage-admin');
async function nav(page, label) { await adm(page).locator('.side .nav', { hasText: label }).first().click(); await sleep(150); }
async function say(page, text) { await page.fill('#msgr-input', text); await page.press('#msgr-input', 'Enter'); }
async function waitText(loc, text, timeout = 5000) { try { await loc.getByText(text, { exact: false }).first().waitFor({ timeout }); return true; } catch (e) { return false; } }

(async () => {
  const browser = await chromium.launch();
  const { ctx, page } = await setup(browser);
  await page.goto(URL + '#both');
  await page.waitForSelector('.demobar');
  await sleep(400);
  await page.screenshot({ path: shots + '/01-both-start.png' });
  ok('both view shows phone and staff sign-in', (await page.locator('.device').count()) === 1 && (await page.locator('.signin-wrap').count()) === 1);
  await adm(page).locator('button', { hasText: 'Sign in' }).last().click();
  ok('owner gets the 2-step check', await waitText(adm(page), 'Check it’s you', 2000));
  await sleep(1100);
  await adm(page).locator('button', { hasText: 'Verify and sign in' }).click();
  await page.waitForSelector('.adm', { timeout: 3000 });
  ok('signed in to BakBak CRM', (await page.locator('.adm').count()) === 1);

  // ---------- chat ----------
  await say(page, 'hi');
  await sleep(1500);
  ok('bot greets', (await phone(page).getByText('What can I help you with today?').count()) >= 2);
  await say(page, 'magkano po?');
  ok('bot answers prices', await waitText(phone(page), 'Half ₱179'));
  await say(page, 'open ba kayo bukas');
  ok('bot answers hours', await waitText(phone(page), "We're open 10 AM to 9 PM"));
  await sleep(1300);
  await say(page, 'hello');
  await sleep(1500);
  await phone(page).locator('.quick button', { hasText: 'Order for pick-up' }).last().click();
  ok('quick reply answered', await waitText(phone(page), 'Open the order form'));
  await sleep(300);
  await phone(page).locator('.mbtns button', { hasText: 'Open the order form' }).last().click();
  await page.waitForSelector('.web');
  ok('order page opens in Messenger', await waitText(phone(page), 'Opened in Messenger · no download'));
  await phone(page).locator('button[aria-label="Add Half Ala Carte"]').click();
  await phone(page).locator('.sheet label.opt', { hasText: 'Garlic Parmesan' }).click();
  await phone(page).locator('.sheet label.opt', { hasText: 'Ranch Dip' }).click();
  await phone(page).locator('.sheet button', { hasText: 'Add to bag' }).click();
  await sleep(200);
  await phone(page).locator('.bagbar').click();
  ok('bag shows ₱204', await waitText(phone(page), 'Send order · ₱204'));
  ok('promo tick is separate from order updates', await waitText(phone(page), 'Order updates (confirmation, ready for pick-up) come in this chat either way.'));
  await page.screenshot({ path: shots + '/02-bag.png' });
  await phone(page).locator('button', { hasText: 'Send order · ₱204' }).click();
  ok('order card arrives', await waitText(phone(page), 'Confirm and pay ₱204', 4000));
  await phone(page).locator('.mcard button', { hasText: 'Confirm and pay ₱204' }).last().click();
  ok('pay link sheet', await waitText(phone(page), 'Secure pay link', 2000));
  await phone(page).locator('.sheet button', { hasText: 'Pay ₱204 with GCash' }).click();
  ok('payment confirmation', await waitText(phone(page), 'is confirmed and ready for pick-up', 6000));
  await page.screenshot({ path: shots + '/03-paid.png' });

  // ---------- CRM runs the order ----------
  await nav(page, 'Orders');
  const card = adm(page).locator('.kcard', { hasText: '#BB-1051' });
  ok('new order on the board', (await card.count()) === 1);
  await card.locator('button', { hasText: 'Start cooking' }).click();
  await sleep(300);
  await adm(page).locator('.kcard', { hasText: '#BB-1051' }).locator('button', { hasText: 'Mark ready' }).click();
  ok('phone told it is ready', await waitText(phone(page), 'is ready at the counter', 4000));
  await adm(page).locator('.kcard', { hasText: '#BB-1051' }).locator('button', { hasText: 'Picked up' }).click();
  ok('points added message', await waitText(phone(page), '20 points added for order #BB-1051', 4000));
  ok('rating request', await waitText(phone(page), 'Rate your order', 4000));
  await page.screenshot({ path: shots + '/04-completed.png' });
  await phone(page).locator('.mbtns button', { hasText: 'Rate your order' }).last().click();
  await phone(page).locator('button', { hasText: 'Submit rating' }).click();
  ok('rating thanks', await waitText(phone(page), 'Thank you for the rating', 4000));

  // ---------- hand-off ----------
  await say(page, 'my order is late');
  ok('bot hands off', await waitText(phone(page), "I'm passing you to our staff", 4000));
  await sleep(300);
  await nav(page, 'Tickets');
  ok('ticket created', await waitText(adm(page), 'My order is late'));
  await nav(page, 'Inbox');
  await adm(page).locator('.ib-item', { hasText: 'Geanne Ashlee Gonzales' }).click();
  await page.fill('#ib-reply', 'Hi Geanne! Checking now po.');
  await page.press('#ib-reply', 'Enter');
  ok('staff reply reaches the phone', await waitText(phone(page), 'Hi Geanne! Checking now po.', 3000) && await waitText(phone(page), 'Liza from Bak Bak joined the chat', 2000));
  await page.screenshot({ path: shots + '/05-inbox.png' });
  await adm(page).locator('.ib-head button', { hasText: 'Return to bot' }).click();
  ok('return to bot', await waitText(phone(page), 'The Bak Bak assistant is back', 3000));

  // ---------- receipt code ----------
  await page.locator('.shortcuts button', { hasText: 'Bak Bak card' }).click();
  await page.locator('.modal button', { hasText: 'Scan with the phone' }).click();
  ok('claim page opens from the card QR', await waitText(phone(page), 'Opened from the card’s QR', 3000));
  await phone(page).locator('button', { hasText: 'Send code' }).click();
  await sleep(1000);
  await phone(page).locator('button', { hasText: 'Verify and continue' }).click();
  ok('code found', await waitText(phone(page), 'Claim 33 points', 3000));
  await phone(page).locator('button', { hasText: 'Claim 33 points' }).click();
  ok('points claimed', await waitText(phone(page), '+33 points', 3000));
  ok('welcome dip on first claim', await waitText(phone(page), 'your welcome gift', 2000));
  await page.screenshot({ path: shots + '/06-claimed.png' });
  await phone(page).locator('button[aria-label="Close page"]').click();

  // ---------- decision support ----------
  await nav(page, 'Today’s plan');
  const r1 = adm(page).locator('.card', { hasText: 'Pre-cook 3 batches' }).first();
  await r1.locator('button', { hasText: 'Approve' }).click();
  const r4 = adm(page).locator('.card', { hasText: 'A little extra for your Soy Garlic regulars' }).first();
  await r4.locator('button', { hasText: 'Approve' }).click();
  const r6 = adm(page).locator('.card', { hasText: 'Explain pick-up and delivery-app options' }).first();
  await r6.locator('button', { hasText: 'Approve' }).click();
  await nav(page, 'Kitchen display');
  ok('kitchen shows batches', await waitText(adm(page), 'Batch 1 · 24 pcs'));
  await page.screenshot({ path: shots + '/07-kitchen.png' });
  await say(page, 'delivery?');
  ok('bot uses the R6 answer', await waitText(phone(page), 'order Bak Bak on Foodpanda or Grab, then scan the QR', 4000));
  await nav(page, 'Campaigns');
  ok('R4 draft campaign exists', await waitText(adm(page), 'Free Cheese Dip for Soy Garlic fans'));

  // ---------- campaign to Messenger regulars ----------
  await adm(page).locator('.ph button', { hasText: 'New campaign' }).click();
  await sleep(400);
  await page.fill('#nc-name', 'Test promo');
  await page.fill('#nc-msg', 'Hi {first name}! Free Fries today only.');
  await page.locator('.modal .m-foot button', { hasText: 'Send now' }).click();
  ok('campaign reaches the phone', await waitText(phone(page), 'Hi Geanne! Free Fries today only.', 3000));

  // ---------- price change ----------
  await adm(page).locator('.side .nav', { hasText: 'Settings' }).click();
  await adm(page).locator('.tabs button', { hasText: 'Menu and prices' }).click();
  await page.fill('input[aria-label="Half Ala Carte price"]', '189');
  await adm(page).locator('button', { hasText: 'Save menu' }).click();
  await say(page, 'prices');
  ok('bot uses the new price', await waitText(phone(page), 'Half ₱189', 4000));

  // ---------- add customer ----------
  await nav(page, 'Customers');
  await adm(page).locator('.ph button', { hasText: 'Add customer' }).click();
  await page.fill('#cf-name', 'Juan Dela Cruz');
  await page.fill('#cf-phone', '09171234567');
  await page.locator('.modal .m-foot button', { hasText: 'Add customer' }).click();
  ok('customer record opens', await waitText(adm(page), 'Juan Dela Cruz'));

  // ---------- walk-in order from the CRM ----------
  await adm(page).locator('button', { hasText: 'New order' }).first().click();
  await page.locator('.modal [aria-label="Fries quantity"] button[aria-label="More"]').click();
  await page.locator('.modal .m-foot button', { hasText: 'Create order' }).click();
  ok('walk-in order created', await waitText(page.locator('.modal'), 'Order #BB-', 3000));
  await page.keyboard.press('Escape');

  // ---------- Grab order makes a receipt code ----------
  await adm(page).locator('.topbar button', { hasText: 'Create' }).click();
  await page.locator('.pop-item', { hasText: 'New order' }).click();
  await page.locator('.modal .seg button', { hasText: 'Grab' }).click();
  await page.locator('.modal [aria-label="Half Ala Carte quantity"] button[aria-label="More"]').click();
  await page.locator('.modal .m-foot button', { hasText: 'Create order' }).click();
  ok('Grab order waits for a card', await waitText(page.locator('.modal'), 'Not linked yet', 3000));
  await page.locator('.modal button', { hasText: 'Scan a card (demo)' }).click();
  ok('card linked at packing', await waitText(page.locator('.modal'), 'Not claimed yet', 3000));
  await page.keyboard.press('Escape');

  // ---------- persistence ----------
  await sleep(400);
  await page.reload();
  await page.waitForSelector('.demobar');
  await sleep(500);
  await nav(page, 'Orders');
  ok('saved after reload: order', await waitText(adm(page), 'Fries'));
  await nav(page, 'Customers');
  ok('saved after reload: customer', await waitText(adm(page), 'Juan Dela Cruz'));
  ok('saved after reload: chat', await waitText(phone(page), 'Free Fries today only'));

  // ---------- visit every page and dialog ----------
  const pages = ['Dashboard', 'Today’s plan', 'Prep planner', 'What-if', 'Rules', 'Decision log', 'Customers', 'Segments', 'Loyalty', 'Orders', 'Kitchen display', 'Inbox', 'Tickets', 'Campaigns', 'Chatbot', 'Workflows', 'Reports', 'KPI tracker', 'Settings'];
  for (const p of pages) {
    await nav(page, p);
    const bad = await adm(page).locator('text=Page not found').count();
    ok('page renders: ' + p, bad === 0 && (await adm(page).locator('.adm-page').innerText()).length > 40);
  }
  await nav(page, 'Dashboard');
  await page.screenshot({ path: shots + '/08-dashboard.png' });
  // dialogs
  const dialogs = [
    ['Orders', '.kcard >> nth=0', 'Order #'],
    ['Tickets', '.kcard >> nth=0', 'Notes'],
    ['Campaigns', 'tbody tr >> nth=0', 'Preview'],
    ['Segments', 'button:has-text("View") >> nth=0', 'customers'],
    ['Segments', '.ph button:has-text("New segment")', 'New segment'],
    ['Loyalty', '.ph button:has-text("Program settings")', 'Program settings'],
    ['Chatbot', '.ph button:has-text("Add answer")', 'Add answer'],
    ['Workflows', 'button.link:has-text("Edit") >> nth=0', 'Then'],
    ['Rules', '.ph button:has-text("Add rule")', 'Add rule'],
    ['Reports', '.ph button:has-text("New report")', 'New report'],
    ['Tickets', '.ph button:has-text("New ticket")', 'New ticket'],
  ];
  for (const [p, sel, text] of dialogs) {
    await nav(page, p);
    await adm(page).locator(sel).first().click();
    await sleep(200);
    ok(`dialog on ${p}: ${text}`, (await page.locator('.modal').count()) > 0 && await waitText(page.locator('.modal'), text, 1500));
    await page.keyboard.press('Escape');
    await sleep(120);
  }
  await nav(page, 'Settings');
  for (const tab of ['Users and roles', 'Menu and prices', 'Channels', 'Data privacy', 'Business info']) {
    await adm(page).locator('.tabs button', { hasText: tab }).click();
    await sleep(100);
  }
  await nav(page, 'Reports');
  await adm(page).locator('button.card').nth(0).click();
  ok('report detail renders', await waitText(adm(page), 'Download CSV'));
  for (let i = 1; i < 12; i++) { await nav(page, 'Reports'); await adm(page).locator('button.card').nth(i).click(); await sleep(80); }
  // roles
  await page.selectOption('.role-sel', 'kitchen');
  await sleep(300);
  ok('kitchen role sees only kitchen and orders', (await adm(page).locator('.side .nav').count()) <= 4);
  await page.selectOption('.role-sel', 'owner');
  await sleep(200);
  // search
  await page.fill('#crm-search', 'denise');
  ok('search finds a customer', await waitText(page.locator('.tb-search .pop'), 'Denise Arwen Cruz', 1500));
  await page.keyboard.press('Escape');
  // notifications
  await adm(page).locator('button[aria-label^="Notifications"]').click();
  ok('notifications list', (await page.locator('.pop .pop-item').count()) > 2);
  await page.keyboard.press('Escape');

  // sign out and in as kitchen staff (no 2-step)
  await adm(page).locator('button.me-av').click();
  await page.locator('.pop button', { hasText: 'Sign out' }).click();
  ok('sign out returns to sign-in', await waitText(adm(page), 'For Bak Bak staff', 2000));
  await adm(page).locator('.chip-btn', { hasText: 'Kitchen' }).click();
  await adm(page).locator('button', { hasText: 'Sign in' }).last().click();
  await page.waitForSelector('.adm', { timeout: 3000 });
  ok('kitchen staff sign in without 2-step', (await adm(page).locator('.side .nav').count()) <= 4);
  await page.selectOption('.role-sel', 'owner');
  await sleep(200);
  await nav(page, 'Campaigns');
  ok('win-back campaign goes by SMS', await waitText(adm(page), 'SMS'));

  // ---------- new customer: order, pay, then create an account ----------
  await page.locator('.shortcuts button', { hasText: 'New customer' }).click();
  await sleep(300);
  ok('phone switches to a new customer', await waitText(phone(page), 'Hi Miguel!', 2000)); await page.screenshot({ path: shots + '/n-switch.png' });
  await phone(page).locator('.quick button', { hasText: 'Order for pick-up' }).last().click();
  await waitText(phone(page), 'Open the order form');
  await sleep(300);
  await phone(page).locator('.mbtns button', { hasText: 'Open the order form' }).last().click();
  await page.waitForSelector('.web');
  await phone(page).locator('button[aria-label="Add Fries"]').click();
  await sleep(200);
  if (await phone(page).locator('.sheet button', { hasText: 'Add to bag' }).count()) await phone(page).locator('.sheet button', { hasText: 'Add to bag' }).click();
  await sleep(200);
  await phone(page).locator('.bagbar').click();
  ok('bag asks a new customer for a number', (await phone(page).locator('#bag-phone').count()) === 1);
  ok('bag mentions the account invite', (await phone(page).locator('#bag-account-note').count()) === 1);
  ok('send is blocked without a number', await phone(page).locator('button', { hasText: 'Send order' }).isDisabled());
  await phone(page).locator('#bag-phone').fill('0918 222 3344');
  await phone(page).locator('button', { hasText: 'Send order' }).click();
  ok('new customer order card', await waitText(phone(page), 'Confirm and pay', 4000));
  await phone(page).locator('.mcard button', { hasText: 'Confirm and pay' }).last().click();
  await phone(page).locator('.sheet button', { hasText: 'with GCash' }).click();
  ok('account invite after paying', await waitText(phone(page), 'Create your free Bak Bak account', 6000));
  await page.screenshot({ path: shots + '/n-invite.png' });
  await phone(page).locator('.mbtns button', { hasText: 'Create my account' }).last().click();
  await page.waitForSelector('#signup-name');
  ok('sign-up keeps the Messenger name', (await phone(page).locator('#signup-name').inputValue()) === 'Miguel Castillo');
  ok('sign-up keeps the order number', (await phone(page).locator('#signup-phone').inputValue()).replace(/\D/g, '') === '09182223344');
  await phone(page).locator('#signup-bm').selectOption('Mar');
  await phone(page).locator('#signup-bd').selectOption('14');
  ok('needs the privacy notice tick', await phone(page).locator('button', { hasText: 'Send code' }).isDisabled());
  await phone(page).locator('#signup-agree').check();
  await page.screenshot({ path: shots + '/n-signup.png' });
  await phone(page).locator('button', { hasText: 'Send code' }).click();
  await sleep(1000);
  await phone(page).locator('.web button', { hasText: 'Create my account' }).click();
  ok('account created', await waitText(phone(page), 'Your Bak Bak account is ready', 2000)); await page.screenshot({ path: shots + '/n-created.png' });
  await phone(page).locator('button', { hasText: 'Go to my account' }).click();
  ok('my account page', await waitText(phone(page), 'Delete my account', 2000));
  await page.screenshot({ path: shots + '/n-account.png' });
  await phone(page).locator('#acct-copy').click();
  await nav(page, 'Customers');
  ok('CRM lists the self sign-up', await waitText(adm(page), 'Signed up in Messenger', 2000));
  await adm(page).locator('tr', { hasText: 'Miguel Castillo' }).first().click();
  ok('record shows customer-made account', await waitText(adm(page), 'Account made by the customer', 2000));
  await page.screenshot({ path: shots + '/n-record.png' });
  await nav(page, 'Tickets');
  ok('privacy request became a ticket', await waitText(adm(page), 'Send me a copy of my data', 2000));
  await nav(page, 'Orders');
  const pc = adm(page).locator('.kcard', { hasText: 'Miguel' }).first();
  await pc.locator('button', { hasText: 'Start cooking' }).click(); await sleep(250);
  await adm(page).locator('.kcard', { hasText: 'Miguel' }).first().locator('button', { hasText: 'Mark ready' }).click(); await sleep(250);
  await adm(page).locator('.kcard', { hasText: 'Miguel' }).first().locator('button', { hasText: 'Picked up' }).click();
  ok('new account earns points on pick-up', await waitText(phone(page), 'points added for order', 4000));
  await page.locator('.shortcuts button', { hasText: 'Back to Geanne' }).click();
  await sleep(300);
  ok('back to Geanne', await waitText(phone(page), 'Hi Geanne!', 2000));

  // ---------- reset ----------
  await page.locator('.demobar button', { hasText: 'Reset' }).click();
  await page.locator('.pop button', { hasText: 'Reset' }).click();
  await sleep(600);
  ok('reset signs staff out', (await page.locator('.signin-wrap').count()) === 1);
  await adm(page).locator('button', { hasText: 'Sign in' }).last().click();
  await sleep(1100);
  await adm(page).locator('button', { hasText: 'Verify and sign in' }).click();
  await page.waitForSelector('.adm', { timeout: 3000 });
  await nav(page, 'Orders');
  ok('reset clears new orders', (await adm(page).locator('.kcard', { hasText: '#BB-1051' }).count()) === 0);

  const errs = page.errors.filter((e) => !e.includes('Download the React DevTools') && !e.includes('net::ERR_FAILED') && !e.includes('fonts.g'));
  ok('no console errors or React warnings', errs.length === 0, errs.slice(0, 12).join('\n'));
  await ctx.close();
  await browser.close();
  const fails = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  if (fails.length) console.log(fails.map((f) => f.join(' | ')).join('\n'));
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
