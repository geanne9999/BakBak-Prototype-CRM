# Bak Bak · BakBak CRM web prototype

Working prototype: the customer's phone (Messenger, the no-download order page, Bak Bak card sign-in, GCash pay link) next to the full BakBak CRM (staff sign-in, DSS, orders, kitchen display, inbox, tickets, campaigns, loyalty, reports, settings). All data is sample data. It is saved in your browser until you press Reset.

## What is in this folder

| File / folder | What it is |
|---|---|
| `index.html` | The finished page. This is the only file you need to open the demo. |
| `src/` | The React source (JSX). Edit these to change the prototype. |
| `src/styles.css` | All the styling (the dark-mode colors are in `build.mjs`). |
| `src/seed.js` | The sample customers, orders, menu and prices. |
| `src/bot.js` | The rule-based Messenger bot (no AI). |
| `build.mjs` | Turns `src/` into one HTML file. |
| `package.json` | The tools the build needs (esbuild, React). |
| `tools/test.cjs` | Optional automated checks (needs Playwright). |

## Open it (no setup)

Double-click `index.html`. It opens in your browser. The computer needs internet, because React and the Inter font load from the web.

Views: use the Both / Customer / BakBak CRM switch on the top bar. Staff sign-in: tap any demo account chip and type any password of 6 or more characters; the owner's SMS code fills itself in.

Try "New customer" under the phone to order as a first-time Messenger customer and create a Bak Bak account after paying.

## Open it in Antigravity

1. In Antigravity, choose **File > Open Folder** and pick `C:\Bakbak CRM Prototype Files`.
2. To view the demo, open `index.html` in your browser, or run a small server in the terminal:

       npx serve .
       (or)  python -m http.server 8000

   then go to http://localhost:3000 (serve) or http://localhost:8000 (Python).

## Change it

You need Node.js (https://nodejs.org, the LTS version). In the Antigravity terminal, inside this folder:

    npm install          (only the first time)
    node build.mjs       (writes dist/bakbak-demo.html)

Open `dist/bakbak-demo.html` to see your change. When you are happy, copy it over `index.html`:

    copy dist\bakbak-demo.html index.html

Tip: if the page shows old data after a change, press Reset on the top bar. Saved data lives in the browser under the key `bakbak-crm-demo-v4`.
