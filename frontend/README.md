# Clarynt — Frontend

React + TypeScript + Tailwind + Recharts implementation of the **Growth Command Centre · Landing Page (S-00)** per [`../clarynt-landing-page-spec.md`](../clarynt-landing-page-spec.md).

The entire surface runs on **mock data** today (so UI/UX can evolve in parallel with the backend) and switches to live HTTP the moment you flip an env var — no component edits needed.

---

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check and produce production build in `dist/` |
| `npm run preview` | Preview the production build |

---

## Folder structure

```
frontend/
├── index.html
├── tailwind.config.ts     · design tokens (ink scale, severity, IBM Plex)
├── vite.config.ts         · dev server + path alias @/ → src/
├── src/
│   ├── main.tsx           · React entry
│   ├── App.tsx            · wraps LandingView in FiltersProvider
│   ├── index.css          · Tailwind layers + Clarynt primitives (.cy-card etc.)
│   │
│   ├── pages/
│   │   └── LandingView.tsx       · S-00 composition
│   │
│   ├── components/
│   │   ├── layout/     · TopBar · Sidebar · MobileTabBar
│   │   ├── kpi/        · KPIStrip · KPITile · Sparkline
│   │   ├── charts/     · PrimarySales · OutletFunnel · SecPri · UoS · ChipLabel
│   │   ├── drift/      · DriftPanel · DriftCard
│   │   └── ui/         · Card · FilterPill · ContextMenu · AskAIFab
│   │
│   ├── context/
│   │   └── FiltersContext.tsx    · global Time · Geo · Category filters
│   ├── hooks/
│   │   └── useAsync.ts           · tiny service-call hook (replace with React Query later)
│   │
│   ├── services/
│   │   ├── api.ts                · thin fetch client (VITE_API_URL)
│   │   └── landing.ts            · mock ↔ backend seam — the ONLY switch
│   │
│   ├── mocks/
│   │   ├── kpis.ts · primarySales.ts · funnel.ts · trends.ts · drifts.ts · filters.ts
│   │
│   ├── types/          · KPI · Drift · PrimarySales · Filters · etc.
│   └── utils/          · cn · format · colors
└── .env.example
```

---

## Wiring the backend

Edit (or create) `.env.local`:

```bash
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:8000/api
```

The contract the backend must satisfy — these routes and payload shapes already exist as TypeScript types in `src/types/index.ts`:

| Method | Path | Returns |
|---|---|---|
| `GET` | `/landing/kpis` | `KPI[]` |
| `GET` | `/landing/primary-sales` | `PrimarySalesDataset` |
| `GET` | `/landing/funnel` | `FunnelStage[]` |
| `GET` | `/landing/sec-pri` | `TrendPoint[]` |
| `GET` | `/landing/uos` | `UoSPoint[]` |
| `GET` | `/landing/drifts` | `Drift[]` |
| `GET` | `/landing/exceptions` | `ExceptionSummary` |

Every endpoint receives the global filters as query params:

```
?time=MTD&geo_level=region&geo_value=South&categories=Diapers,Utensil%20Cleaners
```

See `src/services/landing.ts` for the exact query shape (`filterQuery`).

---

## Design-system guardrails

Inherited from `clarynt-landing-page-spec.md` § 11 — enforced via Tailwind tokens and `@layer components` primitives in `src/index.css`:

- Canvas `#f8f8f6`, cards pure white, zero-radius corners.
- Borders `rgba(0,0,0,0.04..0.08)` — never solid grey.
- Red / amber / green / blue / purple are **state** colors for data only; never buttons.
- Section labels `text-3xs font-mono uppercase` (`.cy-section-label`).
- All numbers use `tabular-nums` (`.cy-num`).
- KPI delta arrows follow **direction**, not sentiment.
- Only `ContextMenu` is allowed a drop shadow.
- Only the Exception entry in the Sidebar uses `border-accent/40` — everywhere else is neutral.

---

## Adding a new card

1. Create `src/components/charts/MyCard.tsx` composed from `<Card>`.
2. Add the data shape to `src/types/index.ts`.
3. Add a mock in `src/mocks/` and wire it through `src/services/landing.ts`.
4. Render it inside `src/pages/LandingView.tsx`.
