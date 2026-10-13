# AntyTILT Terminal

First interactive prototype of a crypto trading terminal built with React, TypeScript and TradingView Lightweight Charts.

## Project documentation

- [Project status, release plan and Jupiter/Solana architecture](./ДОКУМЕНТАЦИЯ_ПРОЕКТА_И_JUPITER.md)
- [Risk Management backend logic](./РАБОТА_RM.md)
- [Release checklist](./ТУДУ_ЛИСТ_РЕЛИЗ.md)
- [Local production deployment](./LOCAL_DEPLOYMENT.md)
- [Production deployment](./DEPLOYMENT.md)

## Run locally

Node.js 24 or newer is required. PostgreSQL 17 is the application database and
Redis 8 backs the RM queue, distributed account locks and worker heartbeat;
SQLite is supported only as a one-time legacy import source.

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run db:migrate
npm run dev
```

Open `http://localhost:5173`.

`npm run dev` starts three independent local processes: Vite, the HTTP API and
the RM worker. Production uses the same separation through `start:api` and
`start:worker`; closing the browser does not stop RM monitoring.

Create an account with an email and password on the first screen. Local data is
stored in the PostgreSQL volume declared by `compose.yaml`.

## PostgreSQL

`DATABASE_URL` is required before the API starts. Schema changes are applied in
filename order from `server/migrations` and recorded in `schema_migrations`.
Run migrations explicitly during deployment:

```bash
npm run db:migrate
```

To import an existing local SQLite database into an empty PostgreSQL database:

```bash
npm run db:migrate:sqlite -- --source=data/antytilt.sqlite
```

The importer runs in one transaction, preserves encrypted credentials and all RM
state, and refuses a non-empty target unless `--allow-existing` is supplied for an
intentional idempotent merge. Keep the same `CREDENTIALS_ENCRYPTION_KEY` that was
used for the SQLite database or its exchange credentials cannot be decrypted.

## Redis and durable trading requests

`REDIS_URL` is required for the RM account queue, renewable per-account locks,
retry/backoff and worker heartbeat. PostgreSQL remains the source of truth for
trading mutation idempotency: a repeated request ID returns the saved exchange
result after an API restart, while an uncertain request is blocked for explicit
account reconciliation instead of being sent to the exchange a second time.

## Included

- responsive exchange-style trading workspace;
- dynamic catalog of 30 top market-cap assets with active USDT perpetual contracts on Binance and Bybit, including HYPE;
- when BingX is connected, the market selector shows only the catalog instruments currently open for BingX API execution;
- explicit per-user Binance, BingX or Bybit chart source with native live candles,
  ticker, funding, order book and trades;
- searchable market selector with one aggregated catalog price stream;
- native exchange WebSocket streams with stale-stream detection, reconnect/backoff
  and REST recovery; synthetic candles are never presented as exchange data;
- Lightweight Charts candlestick and volume chart;
- professional drawing workspace with trend lines, rays, horizontal/vertical levels, Fibonacci, rectangles, price measurement, long/short position and text notes;
- live drawing preview and optional OHLC magnet mode;
- drag the whole object or any individual anchor point;
- undo/redo history, keyboard shortcuts and editable color/width/line style;
- object manager with visibility, locking, duplication, deletion, JSON export/import and browser persistence;
- independent drawing workspaces for every signed-in user and market;
- email/password registration, persistent server sessions and strict user ownership for exchange data;
- BingX VST/live API connection through a server-side signed connector;
- AES-256-GCM encrypted exchange credentials persisted per user;
- contract-specific Cross/Isolated and LONG/SHORT leverage synchronized with BingX;
- continuous 0–100% sizing with Quantity, Value and margin Cost units plus fee reserve;
- Market, Limit and VST-gated Trigger orders with GTC/IOC/FOK/PostOnly and Reduce-only;
- attached TP/SL by Price, ROI or P&L with Last/Mark source and Market/Limit execution; Trigger orders separately support Last/Mark/Index;
- server-side order preview for book slippage, fees, margin, order cost and indicative liquidation;
- live BingX balance, positions and open orders; full/partial position close, cancel and quantity amendment;
- synchronized personal Order History, fill-level Trade History and current Assets views;
- draggable TP/SL lines for existing positions, with a review dialog and exchange-confirmed replacement;
- restart-safe PostgreSQL idempotency for trading requests, per-session rate
  limiting and explicit modal confirmation for live writes;
- local demo orders when no exchange is connected;
- server-side Risk Guard checked before preview and again before execution;
- personal daily trade/loss, leverage, exposure, open-position, loss-streak,
  cooldown, fixed Stop Loss and persistent break-even rules;
- a BullMQ-backed RM worker with per-account distributed locks, retry/backoff and
  heartbeat that detects direct exchange entries, maintains protective stops,
  cancels pending orders or closes positions under the authorized policy;
- durable RM counters, protection state and audit event feed;
- production-style Risk Management command center with reliable swipe controls.

## BingX connection

1. Start with a BingX VST API key and choose **VST demo** in the connection window.
2. Give the key futures trading permission only. Never enable withdrawals; use an IP whitelist when possible.
3. Click **Connect exchange**, enter the key and secret, then review the actual contract margin mode, leverage and maximum leverage shown by BingX.
4. Build a Market or Limit order and review the server-calculated Order Cost before confirming. Trigger orders remain VST-only by default.
5. Positions and open orders appear in the bottom panel. Use **Close**, **Edit** (quantity only) or **Cancel**; the UI changes only after BingX confirms the request.

The secret is sent only to the backend, encrypted with AES-256-GCM before database storage, and never placed in browser storage or returned in an API response. Local development creates `data/.credential-key` with owner-only permissions. Production refuses to start without a base64-encoded 32-byte `CREDENTIALS_ENCRYPTION_KEY`; use a managed KMS or Vault to supply and rotate this key.

Order history is synchronized from BingX and retained in PostgreSQL under the authenticated user ID. Fill history initially backfills five seven-day windows, then refreshes the latest window. Assets always come from the current connected BingX account snapshot.

Live execution is server-blocked by default. To enable it deliberately, copy `.env.example` to `.env`, set `ALLOW_LIVE_TRADING=true`, and restart `npm run dev`. Automatic RM writes on a live account additionally require `ALLOW_LIVE_RM_AUTOMATION=true` and explicit consent in the user's saved RM profile. Every live trading mutation still requires an explicit click in its review dialog, but the user never has to type a confirmation word. Keep `ALLOW_LIVE_TRIGGER_ORDERS=false` until Trigger Market/Limit has passed the BingX VST release checklist.

The Market slippage ceiling is a preview-time check against the visible BingX order book, not an exchange-guaranteed fill cap. Attached TP/SL uses Last or Mark price, currently protects 100% of the new order, and is checked with BingX `order/test` immediately before the real order request. Order previews remain valid for 90 seconds and can be refreshed safely without leaving the confirmation dialog.

This remains an MVP rather than a complete public-production custody boundary. Registration, encrypted credentials, PostgreSQL persistence, user-isolated history, server-enforced RM, Redis coordination and audit events are implemented. Before a public real-money launch it still needs verified email delivery and recovery, MFA/passkeys, HTTPS infrastructure, a managed KMS, managed Redis, distributed rate limiting, monitoring, managed PostgreSQL backups and an external security review. Binance/Bybit currently provide selectable public chart data; private account execution and RM automation remain BingX-only until their provider adapters are implemented and exchange-certified.

## Production deployment

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AleksandrWhite-T/antyTILTsystem)

The repository contains a Render Blueprint for an always-on Frankfurt deployment
with a web/API service, an independent RM worker, managed PostgreSQL and managed
Redis-compatible Key Value. See [DEPLOYMENT.md](./DEPLOYMENT.md). The web service
serves React and `/api` from one HTTPS origin, preserving first-party secure
cookies while the separate worker continues monitoring when the browser or API
process is unavailable.

For a small private beta on an always-on Mac, use the Docker Compose profile and
operations helper documented in [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md).
It keeps API, RM worker, PostgreSQL and Redis separate, persists local data and
can expose only the application through a temporary or named HTTPS tunnel.

## Drawing shortcuts

- `V` — cursor;
- `T` — trend line;
- `H` — horizontal level;
- `F` — Fibonacci;
- `R` — rectangle;
- `M` — price measurement;
- `Ctrl/⌘ + Z` — undo;
- `Ctrl/⌘ + Shift + Z` or `Ctrl + Y` — redo;
- `Delete` or `Backspace` — remove the selected object;
- `Esc` — cancel the current drawing operation.
