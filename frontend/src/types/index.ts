/**
 * Type contracts shared by mocks, services and components.
 * Keep this file backend-agnostic — it is the seam between UI and API.
 */

// ─── Global filters ──────────────────────────────────────────────────────
export type TimeRange = 'MTD' | 'QTD' | 'YTD' | 'Custom'

/** ISO-8601 date range (YYYY-MM-DD). */
export interface CustomRange {
  from: string
  to: string
}

export type GeoScope =
  | { level: 'all' }
  | { level: 'region'; value: string }
  | { level: 'state'; value: string; region: string }

export type Category =
  | 'Sanitary Napkins'
  | 'Diapers'
  | 'Utensil Cleaners'

export interface Filters {
  time: TimeRange
  geo: GeoScope
  categories: Category[] // empty → "All"
  /** Populated when time === 'Custom'. Persists across dropdown re-opens so
   *  re-opening the picker pre-fills the last applied range. */
  customRange: CustomRange | null
}

// ─── KPIs ────────────────────────────────────────────────────────────────
export type KPIGroup = 'PRIMARY' | 'SECONDARY' | 'TERTIARY'

export type DeltaDirection = 'up' | 'down' | 'flat'

export interface KPIDelta {
  label: string // e.g. "vs LYSM"
  value: number // percent delta (e.g. -3.2 for -3.2%)
  direction: DeltaDirection
}

export interface KPI {
  id: string
  group: KPIGroup
  label: string
  value: string // preformatted display value (₹ 3.2L, 87%, 11.9K etc.)
  breach: boolean
  deltas: KPIDelta[]
  spark: number[] // 8–16 numeric points
  unit?: string
  subline?: string // compact contextual second line (e.g. "Ord 143K → Bld 247K")
}

// ─── Primary Sales (dual-chart) ──────────────────────────────────────────
export interface PrimarySalesPoint {
  name: string // region or division
  crores: number // ₹ Cr absolute
  yoyPct: number // YoY % delta
}

export interface PrimarySalesDataset {
  byRegion: PrimarySalesPoint[]
  byDivision: PrimarySalesPoint[]
}

// ─── Outlet Funnel ───────────────────────────────────────────────────────
export interface FunnelStage {
  id: string
  label: string
  sublabel?: string // small grey caption under the label (e.g. "Invoice raised")
  count: number // absolute outlet count
  /** Retained for backend compatibility — the card now computes Conv% and Drop%
   *  on the fly from counts so all stages stay in sync. */
  convPct?: number
  golmPct?: number // GOLM (Goal-over-Last-Month) strategic coverage metric, 0–100
  breach?: boolean
}

// ─── Sec : Pri Ratio trend ───────────────────────────────────────────────
export interface TrendPoint {
  month: string
  value: number // ratio percent
  priCr: number // primary sales in Cr
  secCr: number // secondary sales in Cr
}

// ─── Outlet Billed vs Order Taken (dual-series) ─────────────────────────
export interface OutletBilledPoint {
  month: string
  billed: number
  ordered: number
  gap: number
}

// ─── Drifts (Findings) ───────────────────────────────────────────────────
export type Severity = 'critical' | 'warning' | 'info'

/** Finding lifecycle states from tech-arch v1.4 § 6. */
export type Lifecycle =
  | 'new'
  | 'viewed'
  | 'discussed'
  | 'escalated'
  | 'war-room'
  | 'monitoring'
  | 'resolved'
  | 'sustained'
  | 'resolving'

/** Category A = tactical drill-down (DA-*). Category B = war-room / strategic (DB-*). */
export type DriftCategory = 'A' | 'B'

export type ScreenId =
  | 'S-00'
  | 'S-01'
  | 'S-02'
  | 'S-03'
  | 'S-04'
  | 'S-05'
  | 'S-06'
  | 'S-07'
  | 'S-08'
  | 'S-09'
  | 'WAR-ROOM'

/** Causal dimensions that decompose a drift (spec § 3). */
export interface CausalDims {
  channel?: string
  category?: string
  outletClass?: string
  territoryOwner?: string
  distributor?: string
}

/** Target action for Category B findings (war room / agent handoff). */
export interface TargetAction {
  module?: string // e.g. "M02 Gap Scoring"
  agent?: string // e.g. "Rural Growth Agent 01"
  actionType: string // "war_room" | "scheme_revision" | "expansion" …
}

/**
 * Specialised rule-specific payload attached to high-value drifts when they
 * feature in the **Critical Findings** section. Each variant carries the
 * exact data needed to render its inline visualisation — no extra fetches
 * on the client.
 *
 * Mirrors the `drift_findings` persistence shape in the architecture doc
 * while keeping the list-row UI (DriftPanel) source-compatible.
 */
export type FindingDetail =
  | {
      kind: 'reach-erosion' // DA-01
      currentReach: number
      lastMonthReach: number
      l3mAvgReach: number
      driftPctVsLm: number // negative = loss
      driftPctVsL3m: number
      reachSeries: number[] // 6 monthly points, oldest → newest (last = current)
      topContributors: { name: string; reachLoss: number }[]
      summary: string
    }
  | {
      kind: 'pipeline-stuffing' // DA-03
      distributor: string
      primaryValue: number
      secondaryValue: number
      secPriRatio: number // 0–1
      lastMonthRatio: number
      primaryGrowthPct: number // +12.0
      secondaryGrowthPct: number // -4.0
      trendSeries: { month: string; primary: number; secondary: number }[]
      /** Top distributors flagged for low Sec:Pri in the same geo/category. */
      topDistributors: {
        code: string
        ratio: number // current Sec:Pri, 0–1
        primary: number // raw rupees
        secondary: number // raw rupees
        ratioDeltaPp: number // vs LM, in percentage points, negative = slid down
      }[]
      summary: string
    }
  | {
      kind: 'so-productivity' // DA-05
      empCode: string
      empName: string
      zone: string
      coveredOutlets: number
      productiveOutlets: number
      billedOutlets: number
      totalCalls: number
      productiveCallRate: number // 0–1
      lastMonthProductiveCallRate: number
      /** 6-month productive-call-rate trend, oldest → newest (last = current). */
      rateSeries: number[]
      billedSales: number
      lastMonthBilledSales: number
      salesDropPct: number
      summary: string
    }

export interface Drift {
  id: string // e.g. DA-07
  category: DriftCategory
  severity: Severity
  lifecycle: Lifecycle
  title: string
  impactInr: string // preformatted, e.g. "₹3.2L"
  trend: string // e.g. "▼ 4pp vs LYSM"
  confidence: number // 0–100
  geography: string
  sustainedFor: string // e.g. "Sustained 3M"
  metric: string // e.g. "ND%", "Sec:Pri", "WSP"
  causalDims: CausalDims
  targetScreen?: ScreenId // Cat A — where Drill routes to
  targetAction?: TargetAction // Cat B — handoff
  notesCount?: number // org-context-graph notes attached
  /** Optional rich payload — present only when this drift is featured in
   *  the Critical Findings section. Discriminated by `findingDetail.kind`. */
  findingDetail?: FindingDetail
}

// ─── Exceptions (sidebar entry) ──────────────────────────────────────────
export interface ExceptionRule {
  label: string
  count: number
}
export interface ExceptionSummary {
  totalOpen: number
  topRules: ExceptionRule[]
}

// ─── War Room ─────────────────────────────────────────────────────────────
export type WarRoomStatus = 'open' | 'in-progress' | 'awaiting' | 'closed'
export type DueType = 'today' | 'week' | 'month'

export interface WarRoomAssignee {
  initials: string
  name: string
  role: string
}

export interface WarRoomAction {
  id: string
  driftId?: string
  name: string
  meta: string
  status: WarRoomStatus
  assignee: WarRoomAssignee
  dueLabel: string
  dueType: DueType
  hasAI?: boolean
  hasTrade?: boolean
  progressPct?: number
  progressLabel?: string
  aiNote?: string
}

// ─── Assignment ───────────────────────────────────────────────────────────
export interface AssignmentPayload {
  driftId: string
  assignedTo: string
  coAssign: string
  responseType: string
  slaDays: number
  notes: string
  routeTo: 'war-room' | 'sales-excellence'
}

// ─── Drift history event ──────────────────────────────────────────────────
export interface HistoryEvent {
  id: string
  timestamp: string
  actor: string
  actorRole: string
  action: string
  detail: string
  kind: 'assigned' | 'field' | 'ai' | 'status' | 'note' | 'escalated'
}
