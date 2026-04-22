import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Drift, FindingDetail } from '@/types'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { colors } from '@/utils/colors'
import { fmtInr, fmtPct } from '@/utils/format'
import {
  axisTick,
  gridStroke,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from '@/components/charts/chartTheme'

interface Props {
  drift: Drift
}

/**
 * Finding-detail visualisation — renders a rule-specific decomposition
 * inside the drift-drill-down screen (`FindingDetail`). Returns `null` when
 * the drift carries no `findingDetail` payload (most drifts), so the caller
 * can mount it unconditionally.
 *
 * Layout per variant follows the spec:
 *   reach-erosion      · 6M reach trend + Curr/LM/L3M comparison + contributors table
 *   pipeline-stuffing  · 6M dual-line Primary vs Secondary + ratio KPI strip
 *   so-productivity    · Call funnel (Calls → Covered → Productive → Billed) + rate strip
 */
export function FindingDetailViz({ drift }: Props) {
  const detail = drift.findingDetail
  // Fallback: when no specific payload is attached we still give the
  // detail view a structured overview — headline KPIs lifted from the
  // generic Drift fields + causal-dims summary + a rule-specific hint.
  if (!detail) return <GenericViz drift={drift} />

  switch (detail.kind) {
    case 'reach-erosion':
      return <ReachErosionViz detail={detail} />
    case 'pipeline-stuffing':
      return <PipelineStuffingViz detail={detail} />
    case 'so-productivity':
      return <SoProductivityViz detail={detail} />
  }
}

// ──────────────────────────────────────────────────────────────────────
// Generic fallback — used for every drift that doesn't carry a
// rule-specific findingDetail (DA-02, DA-04, DA-06..DA-10, all DB-*).
// Renders a four-tile KPI strip + causal-dim breakdown + module/agent
// handoff panel for Cat B. Keeps the detail screen visually consistent
// across the whole catalogue without requiring a variant per rule.
// ──────────────────────────────────────────────────────────────────────
function GenericViz({ drift }: { drift: Drift }) {
  // Detect trend direction from the pre-formatted arrow in the trend string.
  // Everything downstream treats ▼ as bad, ▲ as good, absence as neutral.
  const isDown = /▼|↓|declin|drop|fell|eros/i.test(drift.trend)
  const isUp = /▲|↑|ris|grew|climb/i.test(drift.trend)
  const trendTone: 'red' | 'green' | 'neutral' = isDown
    ? 'red'
    : isUp
      ? 'green'
      : 'neutral'

  const severityTone: 'red' | 'green' | 'neutral' =
    drift.severity === 'critical'
      ? 'red'
      : drift.severity === 'warning'
        ? 'neutral'
        : 'neutral'

  // Causal-dim summary entries — only the ones that are actually set
  const causalRows = Object.entries(drift.causalDims).filter(([, v]) => !!v)

  return (
    <Card
      label={`Rule Overview · ${drift.id}`}
      className="mb-2.5"
      noPadding
    >
      {/* KPI strip — the four universal Drift fields */}
      <KpiStrip>
        <MetricTile
          label="Metric"
          value={drift.metric}
          caption={drift.category === 'A' ? 'tactical drill' : 'war-room lane'}
        />
        <MetricTile
          label="Headline"
          value={drift.impactInr === '—' ? '—' : drift.impactInr}
          delta={{ text: drift.trend, tone: trendTone }}
          caption="current period"
        />
        <MetricTile
          label="Confidence"
          value={`${drift.confidence}%`}
          caption={drift.confidence >= 85 ? 'high' : drift.confidence >= 70 ? 'medium' : 'low'}
        />
        <MetricTile
          label="Severity"
          value={drift.severity.toUpperCase()}
          delta={{ text: drift.lifecycle.replace('-', ' '), tone: severityTone }}
          caption={drift.sustainedFor}
        />
      </KpiStrip>

      {/* Causal dims + Cat B action handoff (if applicable) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-0">
        {/* Causal dims */}
        <div className="px-3 py-2 border-t border-r border-black/[0.06] md:border-r md:border-b-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
              Causal dimensions
            </span>
            <span className="text-3xs font-mono text-ink-4 cy-num">
              {causalRows.length}
            </span>
          </div>
          {causalRows.length === 0 ? (
            <div className="text-3xs font-mono text-ink-4 italic">
              No causal dims recorded.
            </div>
          ) : (
            <dl className="space-y-1 text-[11px]">
              {causalRows.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="text-3xs font-mono uppercase tracking-wide text-ink-3">
                    {k}
                  </dt>
                  <dd className="text-ink-2 font-medium truncate text-right">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-2 pt-1.5 border-t border-black/[0.04] text-3xs font-mono text-ink-3 leading-snug">
            <span className="text-ink-4">Geography · </span>
            {drift.geography}
          </div>
        </div>

        {/* Drill target (Cat A) or Handoff (Cat B) */}
        <div className="px-3 py-2 border-t border-black/[0.06] flex flex-col">
          <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3 mb-1.5">
            {drift.category === 'A' ? 'Drill target' : 'Agent handoff'}
          </span>
          {drift.category === 'A' && drift.targetScreen ? (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] text-ink font-medium">
                {drift.targetScreen}
              </div>
              <div className="text-3xs font-mono text-ink-3">
                Opens the matching domain screen for deeper investigation.
              </div>
              <div className="mt-auto pt-2 text-3xs font-mono text-ink-4 uppercase tracking-wide">
                Route · {drift.targetScreen}
              </div>
            </div>
          ) : drift.targetAction ? (
            <div className="flex flex-col gap-1">
              {drift.targetAction.module && (
                <div className="text-[11px] text-ink font-medium leading-snug">
                  {drift.targetAction.module}
                </div>
              )}
              {drift.targetAction.agent && (
                <div className="text-[11px] text-severity-purple font-medium">
                  Agent · {drift.targetAction.agent}
                </div>
              )}
              <div className="text-3xs font-mono text-ink-3 capitalize">
                Type · {drift.targetAction.actionType.replace(/_/g, ' ')}
              </div>
              <div className="mt-auto pt-2 text-3xs font-mono text-ink-4 uppercase tracking-wide">
                Category B · war-room lane
              </div>
            </div>
          ) : (
            <div className="text-3xs font-mono text-ink-4 italic">
              No drill target or handoff recorded.
            </div>
          )}
        </div>
      </div>

      {/* Tail note — why no specific viz */}
      <div className="border-t border-black/[0.06] px-3 py-1.5 text-3xs font-mono text-ink-4 bg-black/[0.015]">
        <span className="text-ink-3">Note · </span>
        Rule-specific visualisation will appear here once a dedicated
        <span className="text-ink-2 mx-1">{drift.id}</span>
        finding-detail payload is wired.
      </div>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Shared mini-KPI tile — used at the top of each viz card
// ──────────────────────────────────────────────────────────────────────
interface MetricTileProps {
  label: string
  value: string
  delta?: { text: string; tone: 'red' | 'green' | 'neutral' }
  caption?: string
}

const toneClass: Record<'red' | 'green' | 'neutral', string> = {
  red: 'text-severity-red',
  green: 'text-severity-green',
  neutral: 'text-ink-2',
}

function MetricTile({ label, value, delta, caption }: MetricTileProps) {
  return (
    <div className="px-3 py-2 border-r border-black/[0.06] last:border-r-0 flex-1 min-w-0">
      <div className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3 truncate">
        {label}
      </div>
      <div className="mt-1 text-[18px] leading-tight text-ink font-normal cy-num truncate">
        {value}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-3xs font-mono cy-num">
        {delta && (
          <span className={cn('font-medium', toneClass[delta.tone])}>
            {delta.text}
          </span>
        )}
        {caption && <span className="text-ink-3 truncate">{caption}</span>}
      </div>
    </div>
  )
}

function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-stretch border border-black/[0.06] bg-black/[0.015]">
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Variant 1 · Reach Erosion (DA-01)
// ══════════════════════════════════════════════════════════════════════
function ReachErosionViz({
  detail,
}: {
  detail: Extract<FindingDetail, { kind: 'reach-erosion' }>
}) {
  // Build chart data with a 6-month x-axis. Use the last 6 month names
  // relative to an arbitrary reference (backend would send real labels).
  const monthLabels = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
  const chartData = detail.reachSeries.map((v, i) => ({
    month: monthLabels[i] ?? `M-${i}`,
    reach: v,
    l3m: detail.l3mAvgReach, // reference line drawn as faint horizontal
  }))

  const totalLoss = detail.topContributors.reduce((a, c) => a + c.reachLoss, 0)
  const maxContribLoss = Math.max(...detail.topContributors.map((c) => c.reachLoss))

  return (
    <Card label="Reach Health · DA-01" className="mb-2.5" noPadding>
      {/* KPI strip */}
      <KpiStrip>
        <MetricTile
          label="Current reach"
          value={`${detail.currentReach.toLocaleString('en-IN')}`}
          caption="outlets billed MTD"
        />
        <MetricTile
          label="Last month"
          value={detail.lastMonthReach.toLocaleString('en-IN')}
          delta={{
            text: fmtPct(detail.driftPctVsLm),
            tone: 'red',
          }}
          caption="vs current"
        />
        <MetricTile
          label="L3M average"
          value={detail.l3mAvgReach.toLocaleString('en-IN')}
          delta={{
            text: fmtPct(detail.driftPctVsL3m),
            tone: 'red',
          }}
          caption="vs current"
        />
        <MetricTile
          label="Outlets lost"
          value={`${totalLoss}`}
          caption={`${detail.topContributors.length} states / districts`}
        />
      </KpiStrip>

      {/* Chart + contributors in 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-0">
        {/* Reach trend — 6 months */}
        <div className="px-3 py-2 border-t border-r border-black/[0.06] md:border-r md:border-b-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
              6-month reach trend
            </span>
            <span className="text-3xs font-mono text-ink-4">Billed outlets</span>
          </div>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="reach-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.red} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={colors.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={axisTick}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v: number) => [`${v.toLocaleString('en-IN')} outlets`, 'Reach']}
                />
                {/* L3M-average reference plane (faint) */}
                <Area
                  type="monotone"
                  dataKey="l3m"
                  stroke="transparent"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  stroke={colors.red}
                  strokeWidth={1.5}
                  fill="url(#reach-area)"
                  dot={{ r: 2, fill: colors.red, strokeWidth: 0 }}
                  activeDot={{ r: 3, fill: colors.red }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 text-3xs font-mono text-ink-3 cy-num">
            L3M avg: <span className="text-ink-2">{detail.l3mAvgReach.toLocaleString('en-IN')}</span>
            <span className="text-ink-4 mx-1">·</span>
            Current at
            <span className="text-severity-red ml-1">
              {Math.round((detail.currentReach / detail.l3mAvgReach) * 100)}% of L3M
            </span>
          </div>
        </div>

        {/* Top contributors — table with proportion bars */}
        <div className="px-3 py-2 border-t border-black/[0.06]">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
              Top impacted territories
            </span>
            <span className="text-3xs font-mono text-ink-4 cy-num">
              {detail.topContributors.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {detail.topContributors.map((c) => {
              const sharePct = Math.round((c.reachLoss / totalLoss) * 100)
              const barPct = (c.reachLoss / maxContribLoss) * 100
              return (
                <div key={c.name} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-ink font-medium">{c.name}</span>
                    <span className="font-mono cy-num text-ink-3">
                      <span className="text-severity-red">−{c.reachLoss}</span>
                      <span className="text-ink-4 ml-1">· {sharePct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-black/[0.04] relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-severity-red/75"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 pt-1.5 border-t border-black/[0.04] text-3xs font-mono text-ink-3">
            <span className="text-ink-4">Diagnosis · </span>
            {detail.summary}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Variant 2 · Pipeline Stuffing (DA-03)
// ══════════════════════════════════════════════════════════════════════
function PipelineStuffingViz({
  detail,
}: {
  detail: Extract<FindingDetail, { kind: 'pipeline-stuffing' }>
}) {
  const ratioPct = Math.round(detail.secPriRatio * 1000) / 10
  const lastRatioPct = Math.round(detail.lastMonthRatio * 1000) / 10
  const ratioDeltaPp = Math.round((ratioPct - lastRatioPct) * 10) / 10

  // Scale to lakhs for a readable axis
  const chartData = detail.trendSeries.map((p) => ({
    month: p.month,
    Primary: Math.round(p.primary / 1e4) / 10, // lakhs, 1 decimal
    Secondary: Math.round(p.secondary / 1e4) / 10,
    Ratio: Math.round((p.secondary / p.primary) * 1000) / 10, // %
  }))

  return (
    <Card label="Pipeline Health · DA-03" className="mb-2.5" noPadding>
      {/* KPI strip */}
      <KpiStrip>
        <MetricTile
          label="Sec:Pri ratio"
          value={`${ratioPct}%`}
          delta={{ text: `▼ ${Math.abs(ratioDeltaPp)}pp`, tone: 'red' }}
          caption={`was ${lastRatioPct}%`}
        />
        <MetricTile
          label="Primary MTD"
          value={fmtInr(detail.primaryValue / 1e5, 'L')}
          delta={{
            text: fmtPct(detail.primaryGrowthPct),
            tone: detail.primaryGrowthPct >= 0 ? 'green' : 'red',
          }}
          caption="vs LM"
        />
        <MetricTile
          label="Secondary MTD"
          value={fmtInr(detail.secondaryValue / 1e5, 'L')}
          delta={{
            text: fmtPct(detail.secondaryGrowthPct),
            tone: detail.secondaryGrowthPct >= 0 ? 'green' : 'red',
          }}
          caption="vs LM"
        />
        <MetricTile
          label="Distributor"
          value={detail.distributor.split('-').slice(0, 2).join('-')}
          caption="flagged · GT"
        />
      </KpiStrip>

      {/* Dual-line trend + diagnosis */}
      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr] gap-0">
        <div className="px-3 py-2 border-t border-r border-black/[0.06] md:border-r md:border-b-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
              Primary vs Secondary · 6 months
            </span>
            <span className="flex items-center gap-3 text-3xs font-mono text-ink-3">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-0.5"
                  style={{ backgroundColor: colors.blue }}
                />
                Primary
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-3 h-0.5"
                  style={{ backgroundColor: colors.red }}
                />
                Secondary
              </span>
              <span className="text-ink-4">· ₹L</span>
            </span>
          </div>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={axisTick}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  tickFormatter={(v) => `${v}`}
                />
                <RTooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v: number, name: string) => [
                    `₹${v.toFixed(1)} L`,
                    name,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="Primary"
                  stroke={colors.blue}
                  strokeWidth={1.75}
                  dot={{ r: 2, fill: colors.blue, strokeWidth: 0 }}
                  activeDot={{ r: 3, fill: colors.blue }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="Secondary"
                  stroke={colors.red}
                  strokeWidth={1.75}
                  dot={{ r: 2, fill: colors.red, strokeWidth: 0 }}
                  activeDot={{ r: 3, fill: colors.red }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnosis column */}
        <div className="px-3 py-2 border-t border-black/[0.06] flex flex-col">
          <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3 mb-1.5">
            Diagnosis
          </span>
          <p className="text-[11px] leading-snug text-ink-2">
            {detail.summary}
          </p>
          <div className="mt-2 pt-1.5 border-t border-black/[0.04] space-y-1 text-3xs font-mono cy-num">
            <div className="flex justify-between">
              <span className="text-ink-3">Primary trajectory</span>
              <span className="text-severity-green font-medium">
                {fmtPct(detail.primaryGrowthPct)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Secondary trajectory</span>
              <span className="text-severity-red font-medium">
                {fmtPct(detail.secondaryGrowthPct)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Ratio slide</span>
              <span className="text-severity-red font-medium">
                ▼ {Math.abs(ratioDeltaPp)}pp
              </span>
            </div>
          </div>
          <div className="mt-auto pt-2 text-[10px] font-mono text-ink-4 uppercase tracking-wide">
            Distributor
            <div className="text-ink-2 text-[11px] normal-case tracking-normal mt-0.5">
              {detail.distributor}
            </div>
          </div>
        </div>
      </div>

      {/* Flagged distributors — full-width scrollable table */}
      <div className="border-t border-black/[0.06] px-3 py-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
            Distributors with lowest Sec:Pri · same geo + category
          </span>
          <span className="text-3xs font-mono text-ink-4 cy-num">
            {detail.topDistributors.length} flagged
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] cy-num">
            <thead>
              <tr className="text-left text-3xs font-mono font-medium uppercase tracking-wide text-ink-3 border-b border-black/[0.06]">
                <th className="py-1 pr-2 font-normal">Distributor</th>
                <th className="py-1 px-2 font-normal text-right">Primary</th>
                <th className="py-1 px-2 font-normal text-right">Secondary</th>
                <th className="py-1 px-2 font-normal text-right">Sec:Pri</th>
                <th className="py-1 px-2 font-normal text-right">Δ vs LM</th>
                <th className="py-1 pl-2 font-normal w-[80px]">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {detail.topDistributors.map((d) => {
                const ratioPct = Math.round(d.ratio * 1000) / 10
                const isSubject = d.code === detail.distributor
                return (
                  <tr
                    key={d.code}
                    className={cn(
                      'border-b border-black/[0.03] last:border-b-0',
                      isSubject && 'bg-severity-red/[0.04]',
                    )}
                  >
                    <td className="py-1.5 pr-2 font-mono text-ink truncate max-w-[220px]">
                      {isSubject && (
                        <span className="inline-block w-1 h-1 rounded-full bg-severity-red mr-1.5 align-middle" />
                      )}
                      {d.code}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink-2">
                      {fmtInr(d.primary / 1e5, 'L')}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-ink-2">
                      {fmtInr(d.secondary / 1e5, 'L')}
                    </td>
                    <td
                      className={cn(
                        'py-1.5 px-2 text-right font-mono font-medium',
                        d.ratio < 0.6 ? 'text-severity-red' : 'text-ink',
                      )}
                    >
                      {ratioPct}%
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-severity-red">
                      ▼ {Math.abs(d.ratioDeltaPp)}pp
                    </td>
                    <td className="py-1.5 pl-2">
                      {/* Inline ratio bar — ratio/1.0 scale, capped at 100% */}
                      <div className="h-1.5 bg-black/[0.04] relative">
                        <div
                          className={cn(
                            'absolute inset-y-0 left-0',
                            d.ratio < 0.6
                              ? 'bg-severity-red/75'
                              : 'bg-severity-blue/60',
                          )}
                          style={{ width: `${Math.min(ratioPct, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════════
// Variant 3 · SO Productivity (DA-05)
// ══════════════════════════════════════════════════════════════════════
function SoProductivityViz({
  detail,
}: {
  detail: Extract<FindingDetail, { kind: 'so-productivity' }>
}) {
  const rate = Math.round(detail.productiveCallRate * 1000) / 10
  const lastRate = Math.round(detail.lastMonthProductiveCallRate * 1000) / 10
  const rateDeltaPp = Math.round((rate - lastRate) * 10) / 10

  // Funnel stages — narrow-below-wide, with Calls as the widest entry point
  const stages = [
    {
      label: 'Total calls',
      sub: 'Visit + order activity',
      count: detail.totalCalls,
      tone: 'neutral' as const,
      color: colors.ink4,
    },
    {
      label: 'Covered outlets',
      sub: 'Unique outlets visited',
      count: detail.coveredOutlets,
      tone: 'neutral' as const,
      color: colors.ink3,
    },
    {
      label: 'Productive outlets',
      sub: 'Order captured',
      count: detail.productiveOutlets,
      tone: 'neutral' as const,
      color: colors.blue,
    },
    {
      label: 'Billed outlets',
      sub: 'Invoice raised',
      count: detail.billedOutlets,
      tone: 'breach' as const,
      color: colors.red,
    },
  ]
  const max = stages[0].count

  return (
    <Card label="Territory · SO Productivity · DA-05" className="mb-2.5" noPadding>
      {/* KPI strip */}
      <KpiStrip>
        <MetricTile
          label="Productive call rate"
          value={`${rate}%`}
          delta={{ text: `▼ ${Math.abs(rateDeltaPp)}pp`, tone: 'red' }}
          caption={`was ${lastRate}%`}
        />
        <MetricTile
          label="Billed sales"
          value={fmtInr(detail.billedSales / 1e5, 'L')}
          delta={{ text: fmtPct(detail.salesDropPct), tone: 'red' }}
          caption={`was ${fmtInr(detail.lastMonthBilledSales / 1e5, 'L')}`}
        />
        <MetricTile
          label="Billing conversion"
          value={`${Math.round((detail.billedOutlets / detail.coveredOutlets) * 100)}%`}
          caption={`${detail.billedOutlets} / ${detail.coveredOutlets} outlets`}
        />
        <MetricTile
          label="Assigned SO"
          value={detail.empName}
          caption={`${detail.empCode} · ${detail.zone}`}
        />
      </KpiStrip>

      {/* Funnel + metric breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-0">
        <div className="px-3 py-2 border-t border-r border-black/[0.06] md:border-r md:border-b-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
              Call funnel
            </span>
            <span className="text-3xs font-mono text-ink-4">
              Outlets · call rate% on hover
            </span>
          </div>
          <div className="space-y-2">
            {stages.map((s, i) => {
              const prev = i > 0 ? stages[i - 1].count : null
              const stepConv = prev ? Math.round((s.count / prev) * 100) : null
              const barPct = (s.count / max) * 100
              return (
                <div key={s.label} className="flex items-center gap-2">
                  {/* Label */}
                  <div className="w-[110px] shrink-0">
                    <div
                      className={cn(
                        'text-[11px] font-medium leading-tight truncate',
                        s.tone === 'breach' ? 'text-severity-red' : 'text-ink',
                      )}
                    >
                      {s.label}
                    </div>
                    <div className="text-3xs font-mono text-ink-3 truncate">
                      {s.sub}
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 h-4 bg-black/[0.04] relative" title={s.label}>
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.max(barPct, 4)}%`,
                        backgroundColor: s.color,
                        opacity: 0.85,
                      }}
                    />
                    {/* Count baked in at the bar's right edge (white on the
                        darker colored segment, ink on the light stub) */}
                    <span
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium cy-num',
                        barPct > 25 ? 'text-white' : 'text-ink',
                      )}
                      style={{
                        left: `calc(${Math.max(barPct, 4)}% - ${barPct > 25 ? 6 : -6}px)`,
                        transform: `translate(${barPct > 25 ? '-100%' : '0'}, -50%)`,
                      }}
                    >
                      {s.count}
                    </span>
                  </div>

                  {/* Step conv % */}
                  <div className="w-[64px] shrink-0 text-right text-[11px] font-mono cy-num">
                    {stepConv !== null ? (
                      <>
                        <span
                          className={cn(
                            'font-medium',
                            stepConv < 70 ? 'text-severity-red' : 'text-ink-2',
                          )}
                        >
                          {stepConv}%
                        </span>
                        <span className="text-ink-4 ml-1">step</span>
                      </>
                    ) : (
                      <span className="text-ink-4">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Metric breakdown + summary */}
        <div className="px-3 py-2 border-t border-black/[0.06] flex flex-col">
          <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3 mb-1.5">
            Productivity breakdown
          </span>
          <dl className="text-3xs font-mono cy-num space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-3">Total calls</dt>
              <dd className="text-ink-2 font-medium">{detail.totalCalls}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Call-to-cover rate</dt>
              <dd className="text-ink-2 font-medium">
                {Math.round((detail.coveredOutlets / detail.totalCalls) * 100)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Cover-to-productive</dt>
              <dd
                className={cn(
                  'font-medium',
                  detail.productiveOutlets / detail.coveredOutlets < 0.7
                    ? 'text-severity-red'
                    : 'text-ink-2',
                )}
              >
                {Math.round((detail.productiveOutlets / detail.coveredOutlets) * 100)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Productive-to-billed</dt>
              <dd className="text-ink-2 font-medium">
                {Math.round((detail.billedOutlets / detail.productiveOutlets) * 100)}%
              </dd>
            </div>
          </dl>
          <div className="mt-2 pt-1.5 border-t border-black/[0.04] text-3xs font-mono text-ink-3 leading-snug">
            <span className="text-ink-4">Diagnosis · </span>
            {detail.summary}
          </div>
        </div>
      </div>

      {/* Productive call-rate trend — full-width */}
      <div className="border-t border-black/[0.06] px-3 py-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-3xs font-mono font-medium uppercase tracking-wide text-ink-3">
            Productive call rate · 6 months
          </span>
          <span className="text-3xs font-mono text-ink-4 cy-num">
            Breach at current &lt; {Math.round(detail.lastMonthProductiveCallRate * 100 * 0.85)}%
          </span>
        </div>
        <div className="h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={detail.rateSeries.map((v, i) => ({
                month: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'][i] ?? `M-${i}`,
                rate: Math.round(v * 1000) / 10,
                threshold:
                  Math.round(detail.lastMonthProductiveCallRate * 100 * 0.85 * 10) / 10,
              }))}
              margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="month"
                tick={axisTick}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={30}
                domain={['dataMin - 5', 'dataMax + 5']}
                tickFormatter={(v) => `${v}%`}
              />
              <RTooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={tooltipItemStyle}
                formatter={(v: number, name: string) => [
                  `${v.toFixed(1)}%`,
                  name === 'rate' ? 'Productive call rate' : 'Breach threshold',
                ]}
              />
              {/* Breach threshold line — 85% of last-month rate. Drawn
                  behind the data line so the data reads first. */}
              <Line
                type="monotone"
                dataKey="threshold"
                stroke={colors.ink4}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={colors.red}
                strokeWidth={1.75}
                dot={{ r: 2, fill: colors.red, strokeWidth: 0 }}
                activeDot={{ r: 3, fill: colors.red }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono text-ink-3 cy-num">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-0.5"
              style={{ backgroundColor: colors.red }}
            />
            Actual rate
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-0.5 border-b border-dashed"
              style={{ borderColor: colors.ink4 }}
            />
            Breach threshold (−15% vs LM)
          </span>
        </div>
      </div>
    </Card>
  )
}
