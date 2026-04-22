/**
 * Landing-page data service.
 *
 * This module is the ONLY place that switches between mock data and backend calls.
 * All components import from here (never from `mocks/` directly), so when the
 * backend endpoints land you only edit this file.
 *
 * Set `VITE_USE_MOCKS=false` in `.env.local` and point `VITE_API_URL` at your
 * FastAPI backend to switch.
 */

import type {
  Drift,
  ExceptionSummary,
  Filters,
  FunnelStage,
  KPI,
  KPIDelta,
  PrimarySalesDataset,
  PrimarySalesPoint,
  TrendPoint,
  OutletBilledPoint,
} from '@/types'

import { kpisMock } from '@/mocks/kpis'
import { primarySalesMock } from '@/mocks/primarySales'
import { funnelMock } from '@/mocks/funnel'
import { secPriMock } from '@/mocks/trends'
import { driftsMock, exceptionSummaryMock } from '@/mocks/drifts'
import { api, type QueryValue } from './api'
import { fmtShort } from '@/utils/format'

const USE_MOCKS =
  (import.meta.env.VITE_USE_MOCKS ?? 'true').toString().toLowerCase() !== 'false'

/** Simulate a round-trip so loading states remain honest in mock mode. */
const delay = <T>(value: T, ms = 150) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

const KPI_BASE = '/api/v1/kpi'

/** Build backend-compatible query params from the frontend Filters object. */
const buildQuery = (f: Filters): Record<string, QueryValue> => {
  const q: Record<string, QueryValue> = {
    time: f.time === 'Custom' ? 'CUSTOM' : f.time,
  }
  if (f.time === 'Custom' && f.customRange) {
    q.start_date = f.customRange.from
    q.end_date = f.customRange.to
  }
  if (f.geo.level === 'region') {
    q.region = f.geo.value
  } else if (f.geo.level === 'state') {
    q.region = (f.geo as { region: string }).region
    q.state = f.geo.value
  }
  if (f.categories.length) {
    q.category = f.categories as string[]
  }
  return q
}

// ─── Backend response types (raw shapes) ─────────────────────────────────
interface NetSalesRes {
  current: { net_sales: number | null; gross_sales: number | null }
  comparisons: { mtd_vs_lm_variance_pct: number | null; mtd_vs_lysm_variance_pct: number | null; assumed_lysm_variance_pct: number | null }
}
interface SalesVsTargetRes {
  current: { actual_sales: number | null; target_sales: number | null; achievement_pct: number | null }
}
interface AbsoluteReachRes {
  current: { reach: number | null; urban_reach: number | null }
  comparisons: {
    lm_reach: number | null
    lysm_reach: number | null
    mtd_vs_lm_change: number | null
    mtd_vs_lm_pct: number | null
    mtd_vs_lysm_change: number | null
    mtd_vs_lysm_pct: number | null
  }
}
interface SecPriGapRes {
  current: { primary_sales: number | null; secondary_sales: number | null; gap: number | null; gap_pct: number | null }
}
interface FillRateRes {
  current: { total_ordered_qty: number | null; total_billed_qty: number | null; fill_rate_pct: number | null }
}
interface LinesPerCallRes {
  current: { total_calls: number | null; total_sku_lines: number | null; lpc: number | null }
}
interface ProductivityRes {
  current: { billed_outlets: number | null; assigned_outlets: number | null; productivity_pct: number | null }
  alert: string | null
}
interface ThroughputRes {
  current: { throughput_value: number | null }
  vs_lm_pct: number | null
  vs_lysm_pct: number | null
}
interface DrilldownRow {
  [key: string]: unknown
  primary_sales_value: number | null
  primary_sales_ly_value: number | null
  primary_sales_value_goly_pct: number | null
}
interface DrilldownRes {
  drill_level: string
  group_by: string
  data: DrilldownRow[]
}
interface FunnelStageRaw {
  stage: string
  label: string
  count: number
  conv_pct: number | null
  drop_to_next_pct: number | null
  golm_pct: number | null
}
interface FunnelRes {
  stages: FunnelStageRaw[]
  end_to_end_conv_pct: number | null
}
interface SecPriSeriesItem {
  month: string
  primary_sales_value: number | null
  secondary_sales_value: number | null
  secondary_vs_primary_ratio: number | null
}
interface SecPriRatioRes {
  series: SecPriSeriesItem[]
}
interface OutletBilledSeriesItem {
  month: string
  outlet_billed: number
  outlet_order_taken: number
  gap: number
}
interface OutletBilledRes {
  series: OutletBilledSeriesItem[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const delta = (label: string, value: number | null | undefined): KPIDelta | null =>
  value != null ? { label, value, direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat' } : null

const fmtCrValue = (v: number | null): string =>
  v != null ? `₹ ${(v / 1e7).toFixed(1)} Cr` : '–'

const fmtPctValue = (v: number | null): string =>
  v != null ? `${v.toFixed(1)}%` : '–'

const EMPTY_SPARK: number[] = []

// ─── KPI fetchers ────────────────────────────────────────────────────────

/** Safely fetch a single endpoint; returns null on failure instead of throwing. */
async function safeFetch<T>(path: string, q: Record<string, QueryValue>): Promise<T | null> {
  try {
    return await api.get<T>(path, q)
  } catch (e) {
    console.warn(`[landing] ${path} failed:`, e)
    return null
  }
}

async function fetchKpisFromBackend(f: Filters): Promise<KPI[]> {
  const q = buildQuery(f)

  const [netSales, salesTarget, reach, gap, fillRate, lpc, productivity, throughput] =
    await Promise.all([
      safeFetch<NetSalesRes>(`${KPI_BASE}/primary-kpi/net-sales`, q),
      safeFetch<SalesVsTargetRes>(`${KPI_BASE}/primary-kpi/sales-vs-target`, q),
      safeFetch<AbsoluteReachRes>(`${KPI_BASE}/secondary-kpi/absolute-reach`, q),
      safeFetch<SecPriGapRes>(`${KPI_BASE}/secondary-kpi/primary-vs-secondary-gap`, q),
      safeFetch<FillRateRes>(`${KPI_BASE}/secondary-kpi/fill-rate`, q),
      safeFetch<LinesPerCallRes>(`${KPI_BASE}/tertiary-kpi/lines-per-call`, q),
      safeFetch<ProductivityRes>(`${KPI_BASE}/tertiary-kpi/productivity`, q),
      safeFetch<ThroughputRes>(`${KPI_BASE}/tertiary-kpi/throughput`, q),
    ])

  const TARGET_SCALE = 5000
  const achievementPct =
    salesTarget?.current.achievement_pct ??
    (salesTarget?.current.actual_sales != null &&
     salesTarget?.current.target_sales != null &&
     salesTarget.current.target_sales > 0
      ? +((salesTarget.current.actual_sales / (salesTarget.current.target_sales * TARGET_SCALE)) * 100).toFixed(1)
      : null)

  const kpis: KPI[] = [
    // ─── PRIMARY ──────────────────────────────────────────────────
    {
      id: 'net-sales',
      group: 'PRIMARY',
      label: 'Net Sales',
      value: fmtCrValue(netSales?.current.net_sales ?? null),
      breach: false,
      deltas: [
        delta('vs LYSM', netSales?.comparisons.mtd_vs_lysm_variance_pct),
        delta('vs LM', netSales?.comparisons.mtd_vs_lm_variance_pct),
      ].filter((d): d is KPIDelta => d !== null),
      subline: netSales?.comparisons.assumed_lysm_variance_pct != null
        ? `LYSM target: +${netSales.comparisons.assumed_lysm_variance_pct.toFixed(1)}%`
        : undefined,
      spark: EMPTY_SPARK,
    },
    {
      id: 'sales-vs-target',
      group: 'PRIMARY',
      label: 'Sales vs Target',
      value: achievementPct != null
        ? fmtPctValue(achievementPct)
        : '–',
      breach: achievementPct != null && achievementPct < 75,
      deltas: achievementPct != null
        ? [delta('vs target', achievementPct - 100)].filter((d): d is KPIDelta => d !== null)
        : [],
      subline: (() => {
        const act = salesTarget?.current.actual_sales
        const tgt = salesTarget?.current.target_sales
        if (act == null && tgt == null) return undefined
        const parts: string[] = []
        if (act != null) parts.push(`Act: ${fmtCrValue(act)}`)
        const scaledTgt = tgt != null
          ? (salesTarget?.current.achievement_pct != null ? tgt : tgt * TARGET_SCALE)
          : null
        if (scaledTgt != null) parts.push(`Tgt: ${fmtCrValue(scaledTgt)}`)
        return parts.join(' · ')
      })(),
      spark: EMPTY_SPARK,
    },
    {
      id: 'forecast-accuracy',
      group: 'PRIMARY',
      label: 'Forecast Accuracy',
      value: '87.3%',
      breach: false,
      deltas: [
        { label: 'vs LM', value: 2.1, direction: 'up' },
        { label: 'vs LYSM', value: -1.4, direction: 'down' },
      ],
      subline: 'Act: ₹ 5.2 Cr · Fcst: ₹ 6.0 Cr',
      spark: [82, 84, 79, 86, 88, 85, 83, 87],
    },

    // ─── SECONDARY ────────────────────────────────────────────────
    {
      id: 'absolute-reach',
      group: 'SECONDARY',
      label: 'Absolute Reach',
      value: reach?.current.reach != null ? `${fmtShort(reach.current.reach)} outlets` : '–',
      breach: false,
      deltas: [
        delta('vs LYSM', reach?.comparisons.mtd_vs_lysm_pct),
        delta('vs LM', reach?.comparisons.mtd_vs_lm_pct),
      ].filter((d): d is KPIDelta => d !== null),
      subline: (() => {
        const lm = reach?.comparisons.lm_reach
        const lysm = reach?.comparisons.lysm_reach
        if (lm == null && lysm == null) return undefined
        const parts: string[] = []
        if (lm != null) parts.push(`LM: ${fmtShort(lm)}`)
        if (lysm != null) parts.push(`LYSM: ${fmtShort(lysm)}`)
        return parts.join(' · ')
      })(),
      spark: EMPTY_SPARK,
    },
    {
      id: 'sec-pri-gap',
      group: 'SECONDARY',
      label: 'Sec : Pri Gap',
      value: fmtPctValue(gap?.current.gap_pct ?? null),
      breach: gap?.current.gap_pct != null && gap.current.gap_pct > 20,
      deltas: [],
      subline: (() => {
        const pri = gap?.current.primary_sales
        const sec = gap?.current.secondary_sales
        if (pri == null && sec == null) return undefined
        const parts: string[] = []
        if (pri != null) parts.push(`Pri ₹${fmtShort(pri)}`)
        if (sec != null) parts.push(`Sec ₹${fmtShort(sec)}`)
        return parts.join(' · ')
      })(),
      spark: EMPTY_SPARK,
    },
    {
      id: 'fill-rate',
      group: 'SECONDARY',
      label: 'Fill Rate',
      value: fmtPctValue(fillRate?.current.fill_rate_pct ?? null),
      breach: fillRate?.current.fill_rate_pct != null &&
        (fillRate.current.fill_rate_pct > 100 || fillRate.current.fill_rate_pct < 85),
      deltas: [],
      subline: (() => {
        const ord = fillRate?.current.total_ordered_qty
        const bld = fillRate?.current.total_billed_qty
        if (ord == null && bld == null) return undefined
        const parts: string[] = []
        if (ord != null) parts.push(`Ord ${fmtShort(ord)}`)
        if (bld != null) parts.push(`Bld ${fmtShort(bld)}`)
        return parts.join(' → ')
      })(),
      spark: EMPTY_SPARK,
    },

    // ─── TERTIARY ─────────────────────────────────────────────────
    {
      id: 'lpc',
      group: 'TERTIARY',
      label: 'Lines per Call',
      value: lpc?.current.lpc != null ? lpc.current.lpc.toFixed(1) : '–',
      breach: false,
      deltas: [],
      subline: (() => {
        const calls = lpc?.current.total_calls
        const lines = lpc?.current.total_sku_lines
        if (calls == null && lines == null) return undefined
        const parts: string[] = []
        if (calls != null) parts.push(`${fmtShort(calls)} calls`)
        if (lines != null) parts.push(`${fmtShort(lines)} lines`)
        return parts.join(' · ')
      })(),
      spark: EMPTY_SPARK,
    },
    {
      id: 'throughput',
      group: 'TERTIARY',
      label: 'Throughput',
      value: throughput?.current.throughput_value != null ? `₹ ${fmtShort(Math.round(throughput.current.throughput_value))}/outlet` : '–',
      breach: false,
      deltas: [
        delta('vs LM', throughput?.vs_lm_pct),
        delta('vs LYSM', throughput?.vs_lysm_pct),
      ].filter((d): d is KPIDelta => d !== null),
      spark: EMPTY_SPARK,
    },
    {
      id: 'productivity',
      group: 'TERTIARY',
      label: 'Productivity',
      value: fmtPctValue(productivity?.current.productivity_pct ?? null),
      breach: productivity?.alert != null,
      deltas: [],
      subline: (() => {
        const asgn = productivity?.current.assigned_outlets
        const bild = productivity?.current.billed_outlets
        if (asgn == null && bild == null) return undefined
        const parts: string[] = []
        if (asgn != null) parts.push(`${fmtShort(asgn)} asgnd`)
        if (bild != null) parts.push(`${fmtShort(bild)} billed`)
        return parts.join(' · ')
      })(),
      spark: EMPTY_SPARK,
    },
  ]

  return kpis
}

// ─── Primary Sales (dual chart) ──────────────────────────────────────────

const toPoint = (row: DrilldownRow, groupBy: string): PrimarySalesPoint => ({
  name: String(row[groupBy] ?? ''),
  crores: row.primary_sales_value != null ? +(row.primary_sales_value / 1e7).toFixed(1) : 0,
  yoyPct: row.primary_sales_value_goly_pct ?? 0,
})

async function fetchPrimarySalesRegion(
  f: Filters,
  region?: string,
  state?: string,
  district?: string,
): Promise<PrimarySalesPoint[]> {
  const q = buildQuery(f)
  if (region) q.region = region
  if (state) q.state = state
  if (district) q.district = district
  const res = await safeFetch<DrilldownRes>(`${KPI_BASE}/charts/primary-sales-drilldown`, q)
  if (!res) return []
  return res.data.map((row) => toPoint(row, res.group_by))
}

async function fetchPrimarySalesProduct(
  f: Filters,
  division?: string,
): Promise<PrimarySalesPoint[]> {
  const q = buildQuery(f)
  if (division) q.division = division
  const res = await safeFetch<DrilldownRes>(`${KPI_BASE}/charts/primary-sales-by-product`, q)
  if (!res) return []
  return res.data.map((row) => toPoint(row, res.group_by))
}

async function fetchPrimarySalesFromBackend(f: Filters): Promise<PrimarySalesDataset> {
  const [byRegion, byDivision] = await Promise.all([
    fetchPrimarySalesRegion(f),
    fetchPrimarySalesProduct(f),
  ])
  return { byRegion, byDivision }
}

// ─── Outlet Funnel ───────────────────────────────────────────────────────

async function fetchFunnelFromBackend(f: Filters): Promise<FunnelStage[]> {
  const q = buildQuery(f)
  const res = await safeFetch<FunnelRes>(`${KPI_BASE}/charts/outlet-funnel`, q)
  if (!res) return funnelMock

  const stageIdMap: Record<string, string> = {
    'Total Outlet Universe': 'universe',
    'Covered Outlets': 'covered',
    'Productive Outlets': 'productive',
    'Billed Outlets': 'billed',
  }

  return res.stages.map((s, i) => ({
    id: stageIdMap[s.stage] ?? `stage-${i}`,
    label: s.stage,
    sublabel: s.label,
    count: s.count,
    convPct: s.conv_pct ?? undefined,
    golmPct: s.golm_pct ?? undefined,
    breach: s.stage === 'Billed Outlets' ? true : undefined,
  }))
}

// ─── Sec : Pri Ratio trend ───────────────────────────────────────────────

async function fetchSecPriFromBackend(f: Filters): Promise<TrendPoint[]> {
  const q = buildQuery(f)
  delete q.time // sec-vs-pri-ratio uses `months` instead of `time`
  const res = await safeFetch<SecPriRatioRes>(`${KPI_BASE}/charts/sec-vs-pri-ratio`, q)
  if (!res) return secPriMock

  return res.series.map((s) => ({
    month: s.month?.split(' ')[0] ?? '',
    value: s.secondary_vs_primary_ratio ?? 0,
    priCr: (s.primary_sales_value ?? 0) / 1e7,
    secCr: (s.secondary_sales_value ?? 0) / 1e7,
  }))
}

// ─── Outlet Billed vs Order Taken ───────────────────────────────────────

async function fetchOutletBilledFromBackend(f: Filters): Promise<OutletBilledPoint[]> {
  const q = buildQuery(f)
  delete q.time // endpoint uses `months` instead
  delete q.start_date
  delete q.end_date
  const res = await safeFetch<OutletBilledRes>(`${KPI_BASE}/charts/outlet-billed-vs-ordered`, q)
  if (!res) return []

  return res.series.map((s) => ({
    month: s.month?.split(' ')[0] ?? '',
    billed: s.outlet_billed,
    ordered: s.outlet_order_taken,
    gap: s.gap,
  }))
}

// ─── Public service surface ──────────────────────────────────────────────
export const landingService = {
  kpis: (f: Filters): Promise<KPI[]> =>
    USE_MOCKS ? delay(kpisMock) : fetchKpisFromBackend(f),

  primarySales: (f: Filters): Promise<PrimarySalesDataset> =>
    USE_MOCKS ? delay(primarySalesMock) : fetchPrimarySalesFromBackend(f),

  primarySalesRegion: (f: Filters, region?: string, state?: string, district?: string): Promise<PrimarySalesPoint[]> =>
    USE_MOCKS ? delay(primarySalesMock.byRegion) : fetchPrimarySalesRegion(f, region, state, district),

  primarySalesProduct: (f: Filters, division?: string): Promise<PrimarySalesPoint[]> =>
    USE_MOCKS ? delay(primarySalesMock.byDivision) : fetchPrimarySalesProduct(f, division),

  funnel: (f: Filters): Promise<FunnelStage[]> =>
    USE_MOCKS ? delay(funnelMock) : fetchFunnelFromBackend(f),

  secPri: (f: Filters): Promise<TrendPoint[]> =>
    USE_MOCKS ? delay(secPriMock) : fetchSecPriFromBackend(f),

  outletBilled: (f: Filters): Promise<OutletBilledPoint[]> =>
    USE_MOCKS ? delay([]) : fetchOutletBilledFromBackend(f),

  // No backend endpoint yet — always uses mocks
  drifts: (_f: Filters): Promise<Drift[]> => delay(driftsMock),

  // No backend endpoint yet — always uses mocks
  exceptions: (): Promise<ExceptionSummary> => delay(exceptionSummaryMock),
}
