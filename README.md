# QNB Expense Dashboard

Personal, AI-powered expense intelligence for QNB credit cards.
Captures every transaction SMS in real time via an iOS Shortcut, parses the
Arabic message body, categorizes the merchant with Claude Haiku (with a
rule-based fallback), and surfaces the result through a fast, Apple-styled
dashboard.

## Stack

- **Next.js 14** (App Router, RSC) + TypeScript + Tailwind
- **Supabase** — Postgres + Auth (magic link) + RLS
- **Anthropic Claude Haiku 4.5** — merchant categorization
- **Recharts** — visualization
- **Vercel** — hosting

## Architecture — Feature-Sliced Design

```
src/
├── app/         Next.js App Router (thin route wrappers)
├── pages/       Page-level compositions (Overview, Monthly, Search, …)
├── widgets/     Composite UI blocks (charts in cards, hero, anomaly banner, …)
├── features/    User actions / capabilities (sms-ingest, categorize, search-transactions, …)
├── entities/    Business entities (transaction, category, merchant, budget)
└── shared/      UI kit, lib, api clients, config
```

Upper layers depend on lower layers only. Each slice exposes a public API via
its `index.ts`.

```
┌──────────────┐   ┌────────────────┐   ┌──────────────┐
│ iPhone       │──▶│ Backend API    │──▶│ Supabase     │
│ iOS Shortcut │   │ Vercel / Next  │   │ Postgres +   │
│              │   │                │   │ RLS + Auth   │
│ - Triggers   │   │ - Parse Arabic │   └──────────────┘
│   on QNB SMS │   │ - Categorize   │           │
│ - Forwards   │   │   via Claude   │           ▼
│   raw text   │   │ - Persist      │   ┌──────────────┐
└──────────────┘   └────────────────┘   │ Web Dashboard│
                                        │ Next.js RSC  │
                                        │ FSD / Apple- │
                                        │ style UI     │
                                        └──────────────┘
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

- Go to [supabase.com](https://supabase.com), create a new project.
- Apply the migration:

```bash
# In Supabase Studio → SQL Editor, paste and run:
#   supabase/migrations/0001_init.sql
```

- Enable email auth: Authentication → Providers → Email (magic link).

### 3. Configure env

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...                  # optional — rule-based fallback works without it
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
INGEST_TOKEN=$(openssl rand -hex 24)   # any 32+ char random string
INGEST_USER_ID=                        # filled after first login (see below)
```

### 4. First run

```bash
npm run dev
```

- Visit `http://localhost:3000` → redirected to `/login`.
- Sign in with magic link.
- Open Supabase Studio → Authentication → Users → copy your `id` → paste
  into `INGEST_USER_ID` in `.env.local`.
- Re-run the `DO $$ … $$` seed block at the bottom of the migration in
  Supabase SQL editor. It now sees your user and seeds 11 categories, 10
  sample transactions (from the PRD), 3 budgets, and 5 merchant rules.
- Restart `npm run dev`. The dashboard now renders with seeded data.

### 5. Smoke test the parser

```bash
npm run test:parser
```

Validates the Arabic SMS regex against the sample messages from PRD §17.

### 6. Smoke test ingestion

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data @- <<'JSON'
{
  "smsText": "تمت عملية شراء ببطاقة الائتمانية.\nرقم البطاقة: فيزا8\nالمبلغ: QAR 45.00\nالموقع: STARBUCKS DOHA\nالرصيد: QAR 1234.56",
  "receivedAt": "2026-05-15T13:00:00Z"
}
JSON
```

Expect 201 with `{ status: "ok", category: "dining", …}`. Reload `/` — the
new transaction appears.

## Deployment

### Vercel

```bash
npx vercel --prod
```

In Project Settings → Environment Variables, add the same keys as
`.env.local`. Region defaults to `fra1` (closest Vercel region to Qatar).

### iOS Shortcut

See [`ios-shortcut/README.md`](./ios-shortcut/README.md) for the
step-by-step automation setup.

## Project layout

```
src/
├── app/                      # Next.js App Router routes
│   ├── api/                  # ingest, recategorize, note, export, budgets
│   ├── auth/callback/        # Supabase magic-link callback
│   ├── login/                # /login
│   ├── monthly/              # /monthly
│   ├── search/               # /search
│   ├── settings/             # /settings
│   ├── transactions/[id]/    # transaction detail
│   ├── trends/               # /trends
│   ├── layout.tsx
│   ├── page.tsx              # Overview
│   └── globals.css
├── pages/                    # Page compositions (FSD layer)
│   ├── overview/             OverviewPage
│   ├── monthly/              MonthlyPage
│   ├── search/               SearchPage
│   ├── settings/             SettingsPage
│   ├── trends/               TrendsPage
│   └── transaction-detail/   TransactionDetailPage
├── widgets/
│   ├── anomaly-banner/
│   ├── budget-list/
│   ├── category-breakdown/
│   ├── daily-trend/
│   ├── month-summary-hero/
│   ├── nav/
│   └── recent-transactions/
├── features/
│   ├── anomaly-detection/    Per-category z-score detection
│   ├── auth-magic-link/      LoginForm
│   ├── categorize/           cache → rule → Claude → fallback
│   ├── edit-transaction-note/
│   ├── manage-budgets/       BudgetsEditor
│   ├── month-navigation/     MonthSelector
│   ├── recategorize-transaction/  CategoryEditor + learning
│   ├── search-transactions/  SearchForm
│   └── sms-ingest/           parseQnbSms()
├── entities/
│   ├── budget/
│   ├── category/
│   ├── merchant/
│   └── transaction/          queries, types, TransactionRow/List
├── shared/
│   ├── api/anthropic/        Claude wrapper
│   ├── api/supabase/         server / client / admin clients
│   ├── config/               CategorySlug + global types
│   ├── lib/                  format, dates, csv, cn
│   └── ui/                   Card, Button, Amount, charts
supabase/migrations/0001_init.sql
ios-shortcut/README.md
scripts/test-parser.ts
middleware.ts                  Route protection
```

## Security

- All data lives in your own Supabase project, encrypted at rest.
- Dashboard requires a Supabase session — magic link, single user.
- `/api/ingest` uses a bearer token compared in constant time.
- Card identifier stored as `visa_8` / `visa_9` only — never the full PAN.
- The only data leaving your stack is the **merchant name** sent to
  Anthropic for categorization. No amounts, balances, or card numbers.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — Next.js lint
- `npm run typecheck` — TypeScript only
- `npm run test:parser` — smoke test the Arabic SMS parser
