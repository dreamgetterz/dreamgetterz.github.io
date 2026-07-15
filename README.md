# dreamgetterz.github.io

AI JEDI — public GitHub Pages site.

## Pages

- [`index.html`](index.html) — Debt Shop in a Box: elite sales & leadership consulting (Troy J. Davis)
- [`retellai-dashboard.html`](retellai-dashboard.html) — RetellAI Xfers & Appts client dashboard

## RetellAI dashboard API key

This repo is **public** — never commit a real RetellAI API key. The dashboard reads
the key from browser `localStorage` instead. To enable live data, open the dashboard,
open the browser console, and run once:

```js
localStorage.setItem("retell_api_key", "YOUR_KEY")
```

Without a key the dashboard shows sample data.
