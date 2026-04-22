# Clarynt — Landing Page (S-00) UI / UX Specification

Restructured from the *Growth Command Centre* PRD to align with the master Clarynt design system (tokens, primitives and component catalogue — see `clarynt-ui-spec.md` § 2–6). This doc only restates what is *specific* to the Landing screen; everything else inherits.

---

## 1. Purpose

A unified Pan-India FMCG Sales & Distribution control tower that answers three questions on one screen:

1. **How is the business doing today?** → KPI Strip
2. **What is drifting and needs attention?** → Drift Panel
3. **Where is the leak?** → Drill-down graph + Outlet Funnel + Mini Decomposition

The landing page is an **index into drilldowns**, not a report. Every data surface is clickable and routes somewhere.

---

## 2. Layout Architecture

### 2.1 Desktop (≥ md)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TopBar  h-11  · CLARYNT · Time · Geo · Category           · 07:42 · RSM  │
├──────────────────────────────────────────────────────────────────────────┤
│ KPI STRIP   ◀ PRIMARY ┃ SECONDARY ┃ TERTIARY ▶                           │
├────────┬───────────────────────────────────────────┬─────────────────────┤
│Sidebar │ MAIN                                       │ Drift Panel         │
│ 164px  │  ┌─────────────────────────────────────┐  │ 250px               │
│        │  │ PRIMARY SALES                       │  │  (Findings list,    │
│        │  │ ┌── by Region ──┬── by Division ──┐ │  │   master § 4.4)     │
│        │  │ │ bars + % line │ bars + % line   │ │  │                     │
│        │  │ └───────────────┴─────────────────┘ │  │                     │
│        │  └─────────────────────────────────────┘  │                     │
│        │  ┌───────────┬─────────────┬────────────┐ │                     │
│        │  │ Outlet    │ Sec : Pri   │ Unique     │ │                     │
│        │  │ Funnel    │ Ratio       │ Outlets    │ │                     │
│        │  │ 40%       │ 30%         │ Scanned 30%│ │                     │
│        │  └───────────┴─────────────┴────────────┘ │                     │
│        │                                  [Ask AI] │                     │
└────────┴───────────────────────────────────────────┴─────────────────────┘
```

- Main column is a **2-row grid**: `grid-rows-[1.05fr_1fr] gap-2.5`. Top = Primary Sales dual-chart card (full width). Bottom splits `grid-cols-[40fr_30fr_30fr]` → Funnel | Sec : Pri Ratio | Unique Outlets Scanned.
- `Ask AI` is a 32×32 solid-ink circular FAB anchored bottom-right of the main column (not over the Drift Panel). Opens the `AIPanel` if collapsed.

### 2.2 Mobile (< md)

- Single-panel-at-a-time via bottom tab bar: `KPIs · Drifts · Drill · Funnel`.
- KPI Strip scrolls horizontally (`overflow-x-auto`), each tile `min-w-[120px]`.
- TopBar collapses filters into one `text-[9px] font-mono text-ink-3` summary line; tap expands a bottom sheet of the three filter pills.

---

## 3. Global Filters (TopBar)

Applied globally — every panel re-queries on change.

| Filter | Control | Default | Values |
|---|---|---|---|
| **Time** | Pill dropdown | `MTD` | `MTD · QTD · YTD · Custom…` |
| **Geography** | Pill dropdown, cascading | `All India` | Region → State |
| **Category** | Pill multi-select | `All` | `Sanitary Napkins · Diapers · Utensil Cleaners` |

**Component:** master spec § 4.1 filter pills. For Category use a multi-select variant — checkboxes in the dropdown, labels comma-joined when ≥ 2 selected, `"All"` when none excluded.

---

## 4. KPI Strip

Three ordered groups, separated by a `w-px h-6 bg-black/[0.08]` vertical divider. Above each group, a group label: `text-[8px] font-mono text-ink-4 uppercase tracking-wide` — `PRIMARY · SECONDARY · TERTIARY`.

Each KPI is a `<button>` KPI tile (master spec § 5.3) that opens the `ContextMenu` on click.

### 4.1 Primary KPIs

| KPI | Format | Delta(s) |
|---|---|---|
| Net Sales | `₹ N.NL / Cr` (18px) | MTD vs LYSM %, MTD vs LM % |
| Sales vs Target % | `NN%` | MTD progress vs full-month target |
| Forecast Accuracy % | `NN%` | vs last period |

### 4.2 Secondary KPIs

| KPI | Format | Delta(s) |
|---|---|---|
| Absolute Reach | `NN.NK outlets` | MTD vs LYSM, LM % |
| Sec : Pri Gap % | `NN%` | vs norm |
| Fill Rate % | `NN%` | Billed ÷ Ordered |

### 4.3 Tertiary KPIs

| KPI | Format |
|---|---|
| Lines per Call (LPC) | `N.N` |
| Throughput | `₹ / call` |
| Productivity % | `NN%` |

### 4.4 Tile rendering rules (inherited)

- Value `text-[18px] font-light tabular-nums`, color `ink`; **only** turns `severity-red` if the KPI is in breach state (not just "down").
- Delta `text-[9px] font-mono`, colored by direction via `severity-red/green`. Direction is literal (`▲`/`▼`), not good/bad — a drop in OFR still renders red even if down is acceptable.
- Sparkline inline SVG 48 × 16 (master § 5.10); stroke picks breach color if alerting, else `severity-green`.

---

## 5. Main Content Grid

> **Change from prior draft:** the drill-down graph and Mini Decomposition are dropped from the landing surface. The drill-down interaction is retained via KPI-tile and chart-segment clicks (master § 7.1 context menu). Decomposition moves to a dedicated screen reached through the Sales Gap KPI / drift card.

### 5.1 Primary Sales dual-chart (top, full width)

One card, two stacked `ComposedChart`s side by side, split `grid-cols-2` with a `w-px bg-black/[0.06]` divider.

**Card header:** label `PRIMARY SALES`; right-side meta `vs LYSM · MTD`.

**Left — by Region**
- X axis: `EAST · NORTH-1 · NORTH-2 · SOUTH · WEST` (mono 8px, `axisLine={false} tickLine={false}`, fill `#908E85`).
- Bars: absolute ₹ Cr per region, `radius={[4,4,0,0]}`, `barCategoryGap="25%"`. `<Cell>` fill per row driven by the YoY delta sign — `#C4392A` if drop, `#2D7A3E` if growth. Data label above the bar: `₹ NN.N Cr`, `text-[9px] font-mono text-ink-2`.
- Overlaid line: YoY % delta, `stroke="#2D6AA3" strokeWidth={1.5}`, no dots on the polyline itself. Each point carries a labelled chip (see § 5.5 below) anchored to the point.
- Y axis: hidden (master § 6). The `%` scale visible in the mock is dropped — labels on the line carry the values.

**Right — by Product Division**
- X axis: division names (`FLITE · FLITE PU · HAWAI · SHOE` in the mock).
- Same encoding: bar = ₹ Cr with directional fill; line = YoY %; chip-labels on each line point.

**Interaction**
- **Click a bar** → `ContextMenu` → Drill / Ask AI / Take action / Share. Drill routes to `DrillDownView` filtered to that region or division.
- **Hover** → standard Recharts tooltip (mono 10px, master § 6).

### 5.2 Outlet Funnel (bottom-left, 40%)

Card shell; label `OUTLET FUNNEL · MTD`. Stacked rows of `label 140px | bar track | value chip | right-side metric`. Width of each bar track is sized relative to the *universe* row (which sits as a background reference frame at 100%).

**Stages (top → bottom, from the mock):**

| Stage | Source |
|---|---|
| Geo Tagged Outlets | `outlet_master.geo_tagged = true` |
| PJP Outlets | SFA permanent-journey-plan roster |
| Billed Outlets | `dms_secondary_sales` distinct `outlet_id` |
| RPA Activated Outlets TD | RPA-scanned, till-date |
| PJP RPA Activated Outlets TD | Intersection of PJP ∩ RPA TD |
| Active Users | Unique salesmen with activity in period |

**Row rendering:**

```
Geo Tagged Outlets   ███████████████████████████   98K
PJP Outlets          ████████████████████░░░░░░░   56K    (−43% from Geo)
Billed Outlets       ██████░░░░░░░░░░░░░░░░░░░░░   18K    conv 32% · GOLM 18%
…
```

- Bar fill: `severity-blue` `#2D6AA3` at `opacity: 0.65` by default, overriden to severity palette when the row is in breach (`<0.8 × L3M`).
- Value chip: overlaid on the bar, `text-[10px] font-mono font-medium text-white` (or `text-ink` if the chip overflows into the empty track).
- Right-side metric (mono 8px `ink-3`): conversion % vs previous stage, drop %, and GOLM % vs universe.
- Top frame row: a hairline `100%` marker spanning the full track width — `text-[8px] font-mono ink-4`.
- Bottom frame row: headline funnel-end conversion (e.g. `34.1%` in the mock) rendered between caliper marks — `text-[11px] font-medium ink tabular-nums` centred.

**Interaction**
- **Hover** → tooltip with absolute count + % drop from prior stage.
- **Click** → filters the right-side drift panel to findings tagged to that funnel layer, AND opens a context menu with `↓ Coverage analysis · ◈ Ask AI`.

### 5.3 Sec : Pri Ratio (bottom-middle, 30%)

Card shell; label `SEC : PRI RATIO · 4M TREND`. Small single-series area chart.

- Recharts `<AreaChart>` at `h-[140px]`. X ticks from recent months (`Sep · Oct · Nov · Dec` in the mock), mono 8px.
- Line `stroke="#2D6AA3" strokeWidth={1.5}`, area fill gradient same hue, `stopOpacity 0.15 → 0`.
- Visible dots on each data point (`dot={{ r: 2.5, fill: '#2D6AA3' }}`) with labelled chips above each (see § 5.5).
- Y axis hidden; labels on points carry the `%` values.
- Headline value in card header right-side meta: current-month ratio + `▼/▲ Npp vs LM` in 8px mono.
- **Click** → routes to the `Pipeline Health` screen (S-03) filtered to current scope.

### 5.4 Unique Outlets Scanned (bottom-right, 30%)

Card shell; label `UNIQUE OUTLETS SCANNED · 4M TREND`. Two-series overlay.

- Two `<Line>` / `<Area>` series:
  - `UoS` (total, lighter) — `stroke="#B8C5E0"` (light-blue), area fill `opacity 0.35`.
  - `UoS MTD` (highlight, darker) — `stroke="#5B4B9E"` (severity-purple), no fill.
- Inline legend at top-left of the card body: two 6px dots + labels (`text-[8px] font-mono ink-3`) — this is smaller than the normal Recharts `<Legend>` because the chart is narrow.
- Dots and chip labels on each point for both series (positioned above for UoS, below for UoS MTD to avoid overlap).
- **Click** → routes to `Extraction Health` (S-02).

### 5.5 Chip label pattern (shared by all three bottom charts + the top line overlay)

Because Y axes are hidden, each data point carries its own value label. Implement as a Recharts `<LabelList>` with a custom renderer:

```tsx
<LabelList
  dataKey="pct"
  content={({ x, y, value }) => (
    <g transform={`translate(${x}, ${y - 10})`}>
      <rect x={-16} y={-8} width={32} height={14} rx={2}
            fill="white" stroke="rgba(0,0,0,0.08)" />
      <text textAnchor="middle" dy={2}
            fontSize={9} fontFamily="IBM Plex Mono"
            fill={value < 0 ? '#C4392A' : '#2D7A3E'}>
        {value}%
      </text>
    </g>
  )}
/>
```

- Chip: 2px-radius white rect with hairline border; text 9px mono; color by direction (`severity-red` for negative, `severity-green` for positive, `ink-2` for neutral absolute values).
- For absolute-value labels (₹ figures on top-chart bars): same shell, `text-ink-2`, no direction coloring.

---

## 6. Drift Panel (right)

Inherits `FindingsPanel` (master § 4.4) verbatim — search row, filter pills (`All · Critical · Warning · War room`), scrollable list of finding cards.

The seven standard drifts for the landing scope:

| # | Drift | Typical severity |
|---|---|---|
| 1 | Reach erosion (region-specific) | crit |
| 2 | LPC decline | warn |
| 3 | OOS increase (top SKUs) | crit |
| 4 | Execution-driven sales loss | crit |
| 5 | Outlet / beat productivity drop | warn |
| 6 | Pipeline stuffing (Sec : Pri low) | crit |
| 7 | Promo underperforming | warn |

Each drift card layout (extending the master spec card by one line):

```
[DA-NN] [sev] · [lifecycle]
Title
Impact: ₹N.NL   ·   Trend: ▼ NNpp vs LYSM   ·   Conf: NN%
Geography                                   Sustained NM
```

Lines 3 and 4 both use `text-[8px] font-mono text-ink-4`. The `·` separators are literal bullets (not pipe).

**Click** → replaces the main column with `FindingDetail` (master § 4.6).

---

## 7. Exception Entry

**Placement:** Sidebar, pinned below the War Room section with a `h-px bg-black/[0.05] mx-3 my-1` divider above it.

```
+ Exception report                 [ 12 ]
```

- Leading `+` glyph in 9px mono.
- Label `text-[11px] text-ink font-medium` — deliberately one step bolder than a normal sidebar nav item because this is an action entry, not a screen.
- Right-aligned count badge `text-[9px] font-mono`, color by count:
  - `≥ 10` → `severity-red`
  - `1–9` → `severity-amber`
  - `0` → `ink-4`
- The item frame carries a `border border-accent/40` at rest — this is the **only** place on the screen where the accent ochre appears as a border. Use sparingly.

**Hover preview** (200px `ContextMenu`, master § 4.10) shows the top 3 rules currently breached:

- `DBs with 0 billing today` — N
- `SOs with productivity < 50%` — N
- `Regions with reach < 80% of LM` — N

Footer row: `View all exceptions →` (ghost link, `text-[10px] text-ink-3 hover:text-ink`).

**Click** → routes to the full Exceptions screen (out of scope here).

---

## 8. Interaction Model

| Interaction | Trigger | Effect |
|---|---|---|
| Global filter change | TopBar pill | Re-query every panel |
| KPI tile click | Any KPI in strip | `ContextMenu` → Drill / Ask AI / Take action / Share |
| Primary Sales bar click | Region / Division bar (top card) | `ContextMenu` → Drill routes to `DrillDownView` scoped to that region or division |
| Primary Sales line-point click | Labelled chip on the YoY line | Same context menu, scoped the same way |
| Funnel stage click | Row in § 5.2 | Context menu with `Coverage analysis · Ask AI`; filters the Drift Panel to that stage |
| Sec : Pri card click | Anywhere in § 5.3 card body | Route to Pipeline Health screen (S-03) |
| UoS card click | Anywhere in § 5.4 card body | Route to Extraction Health screen (S-02) |
| Drift card click | Card in right panel | Replace main column with `FindingDetail` |
| Exception item click | Sidebar | Route to Exceptions screen |
| Ask AI FAB | Bottom-right FAB | Expand `AIPanel` |

**Keyboard** (inherited): `↑/↓` moves focus in Drift Panel; `Enter` selects; `Esc` closes any open `ContextMenu`.

---

## 9. KPI Data Contract

Single source of truth for formulas and source tables. Developer-facing.

### 9.1 Net Sales
```
Σ erp_billing.net_value
   WHERE billing_date ∈ [period]
     AND region      ∈ [filter.geo]
     AND category    ∈ [filter.category]
```

### 9.2 Sales vs Target %
```
Σ actual_sales / Σ target_sales
   actual  ← erp_billing.net_value
   target  ← sales_targets.target_value   JOIN on (period, region, category)
```

### 9.3 Primary vs Secondary Gap %
```
(Σ primary − Σ secondary) / Σ primary
   primary    ← erp_primary_sales.dispatch_value
   secondary  ← dms_secondary_sales.invoice_value
```

### 9.4 Absolute Reach
```
COUNT(DISTINCT dms_secondary_sales.outlet_id)
   JOIN outlet_master ON outlet_id     -- optional urban_flag filter
```

### 9.5 Lines per Call (LPC)
```
Σ distinct_sku_lines / COUNT(sfa_calls.call_id)
   distinct_sku_lines = distinct sku_id per invoice_id in dms_secondary_sales
```

### 9.6 Fill Rate %
```
Σ dms_dispatch.delivered_qty / Σ dms_orders.order_qty     JOIN on order_id
```

### 9.7 Forecast Accuracy %
```
1 − (|forecast_qty − actual_qty| / actual_qty)
   forecast  ← forecast_table
   actual    ← dms_secondary_sales.actual_qty
```

### 9.8 Outlet Funnel stages
```
Universe    = COUNT(outlet_master.outlet_id)
Covered     = COUNT(DISTINCT sfa_calls.outlet_id)
Productive  = COUNT(DISTINCT sfa_calls.outlet_id WHERE order_placed = true)
Billed      = COUNT(DISTINCT dms_secondary_sales.outlet_id)

Conversion(n) = stage(n)   / stage(n−1)
GOLM(n)       = stage(n)   / Universe
```

### 9.9 Salesman Productivity
```
billed_outlets / assigned_outlets     per salesman_id
   billed    ← dms_secondary_sales   (distinct outlet_id per salesman)
   assigned  ← salesman_master × beat_plan
```

### 9.10 Sec : Pri Ratio
```
Σ secondary / Σ primary
```

### 9.11 Exception rules (rule-based KPIs)
```
DB zero-billing       : SUM(dms.invoice_value) = 0            GROUP BY distributor_id
SO low-productivity   : sales_per_so < 0.5 * AVG(sales_per_so)
Fill-rate breach      : delivered / ordered < 0.5
Reach breach          : current_reach < 0.8 * AVG(last_3_month_reach)
```

---

## 10. Component Reuse Map

| Landing-page element | Reuses from master spec |
|---|---|
| TopBar + global filters | § 4.1 TopBar (extend pill to multi-select for Category) |
| KPI Strip | § 4.2 KPIStrip + § 5.3 KPI tile |
| Sidebar | § 4.3 Sidebar (+ new Exception entry) |
| Drift Panel | § 4.4 FindingsPanel (verbatim, with extended card line 3–4) |
| Primary Sales dual-chart | New — two Recharts `ComposedChart`s in § 5.1 card shell; bars follow master § 6 bar config; chip-labels per § 5.5 |
| Outlet Funnel | Adapts § 4.8 RPAScanView funnel pattern, extended to 6 stages |
| Sec : Pri Ratio | New — Recharts `AreaChart` in § 5.1 card shell; chip-labels per § 5.5 |
| Unique Outlets Scanned | New — two-series overlay chart in § 5.1 card shell; chip-labels per § 5.5 |
| Exception Entry | New — ghost-accent-border sidebar item, hover = § 4.10 ContextMenu |
| Ask AI FAB | New — 32×32 solid-ink circle, opens § 4.9 AIPanel |

---

## 11. Design-system Compliance Checklist

- [ ] Canvas `#f8f8f6`, cards pure white, **zero-radius** corners on every card.
- [ ] All borders `rgba(0,0,0,0.04..0.08)` — never solid grey.
- [ ] Red / amber / green / blue / purple only as **state** on data; no colored buttons.
- [ ] Section labels `text-[9px] text-ink-3 font-mono UPPERCASE`.
- [ ] Every numeric value uses `tabular-nums`.
- [ ] KPI delta sign follows direction, not sentiment (`▼` always red).
- [ ] Funnel bar fills `opacity: 0.65`; decomposition track `h-[3px] bg-black/[0.05]`.
- [ ] Exception entry is the **only** accent-bordered nav item on the screen.
- [ ] Only `ContextMenu` has a drop shadow.
- [ ] Every clickable surface is a `<button>`; hover = `bg-black/[0.015..0.03]`; no scale, translate, or shadow transitions.
- [ ] Ask AI FAB uses solid `bg-ink` + `Send` icon 13px — no gradient, no glow.

---

*Restructured spec for `src/components/LandingView.tsx` — to be composed from existing primitives in `src/components/*`.*
