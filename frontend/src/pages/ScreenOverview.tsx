import { ArrowLeft, ArrowRight, Boxes, Layers, AlertTriangle, AlertCircle, CheckCircle, Lightbulb, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Drift, ScreenId } from '@/types'
import { Card } from '@/components/ui/Card'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { DriftCard } from '@/components/drift/DriftCard'
import { colors } from '@/utils/colors'
import { cn } from '@/utils/cn'
import { useFilters } from '@/context/FiltersContext'
import { useView, SCREEN_META } from '@/context/ViewContext'
import { useAsync } from '@/hooks/useAsync'
import { landingService } from '@/services/landing'
import { screensMock, type ScreenContent } from '@/mocks/screens'

interface Props {
  screen: Exclude<ScreenId, 'S-00' | 'WAR-ROOM'>
}

// Map palette tokens → exact hex values used by Recharts SVGs
const HEX: Record<ScreenContent['primaryColor'], string> = {
  blue: colors.blue,
  red: colors.red,
  green: colors.green,
  amber: colors.amber,
  purple: colors.purple,
}

// Tailwind classname fragments for the KPI delta chips
const TONE_CLASS: Record<'red' | 'green' | 'neutral', string> = {
  red: 'text-severity-red',
  green: 'text-severity-green',
  neutral: 'text-ink-2',
}

// Status indicator styling and icons
const STATUS_CONFIG: Record<'critical' | 'warning' | 'good', { icon: any; className: string }> = {
  critical: { icon: AlertTriangle, className: 'text-severity-red' },
  warning: { icon: AlertCircle, className: 'text-amber-600' },
  good: { icon: CheckCircle, className: 'text-severity-green' },
}

/**
 * ScreenOverview — the template composition used for every analytical
 * screen in the sidebar nav (S-01 … S-09) until each one is hand-built.
 *
 * What it shows (top → bottom):
 *   1. Header: back + screen ID + title + subtitle
 *   2. KPI strip: 4 domain-relevant tiles (value + delta + caption)
 *   3. Primary chart: 6-month trend for the screen's headline metric,
 *      with a reference line when a benchmark/target is supplied
 *   4. Linked drifts card: drifts whose `targetScreen` routes here (click → open)
 *   5. Analytical modules: 2–3 sub-views that will live on this screen
 *   6. Quick actions: 4 CTAs specific to the screen domain
 *
 * All the data is sourced from `screensMock` so the visuals feel grounded;
 * each screen's content can be replaced independently once the real API
 * for that domain lands.
 */
export function ScreenOverview({ screen }: Props) {
  const { filters } = useFilters()
  const { setScreen, openDrift } = useView()
  const driftsQuery = useAsync(() => landingService.drifts(filters), [filters])

  const meta = SCREEN_META[screen]
  const content = screensMock[screen]
  const linkedDrifts = (driftsQuery.data ?? []).filter(
    (d: Drift) => d.category === 'A' && d.targetScreen === screen,
  )
  const primaryHex = HEX[content.primaryColor]
  

  return (
    <div className="h-full p-2.5 overflow-y-auto">
      {/* ─── Header row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setScreen('S-00')}
          className="flex items-center gap-1 text-3xs font-mono text-ink-3 uppercase tracking-wide cy-hover px-1 py-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Landing
        </button>
        <span className="text-ink-4 text-3xs font-mono">·</span>
        <span className="cy-section-label">{screen}</span>
        <span
          className="ml-2 text-3xs font-mono text-ink-3 uppercase tracking-wide"
        >
          Analytical screen
        </span>
      </div>

      {/* Title block */}
      <div className="mb-2.5">
        <h1 className="text-lg text-ink font-light tracking-tight">{meta.title}</h1>
        <p className="text-xs text-ink-3 mt-0.5">{meta.subtitle}</p>
        <p className="text-3xs font-mono text-ink-4 mt-1 leading-relaxed">{content.intro}</p>
      </div>

      {/* ─── KPI strip ──────────────────────────────────────────────── */}
      <div className="cy-card mb-2.5">
        <div className="flex items-stretch">
          {content.kpis.map((k, i) => (
            <div
              key={k.label + i}
              className={cn(
                'flex-1 min-w-0 px-3 py-2',
                i < content.kpis.length - 1 && 'border-r border-black/[0.06]',
              )}
            >
              <div className="flex items-center gap-1 text-3xs font-mono font-medium uppercase tracking-wide text-ink-3 truncate">
                <span className="truncate">{k.label}</span>
                {k.status && (
                  <StatusIcon status={k.status} />
                )}
                {k.tooltip && (
                  <HelpTooltip content={k.tooltip} />
                )}
              </div>
              <div className="mt-1 text-[18px] leading-tight text-ink font-normal cy-num truncate">
                {k.value}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-3xs font-mono cy-num">
                {k.delta && (
                  <span
                    className={cn(
                      'font-medium',
                      TONE_CLASS[k.tone ?? 'neutral'],
                    )}
                  >
                    {k.delta}
                  </span>
                )}
                {k.caption && (
                  <span className="text-ink-3 truncate">{k.caption}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Insights & Recommendations ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-2.5">
        {/* Key Insights */}
        <Card label="Key insights" meta={`${content.insights.length} identified`}>
          <div className="space-y-2">
            {content.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-3xs font-mono leading-relaxed">
                <TrendingUp className="h-3 w-3 text-ink-3 shrink-0 mt-0.5" />
                <span className="text-ink-2">{insight}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recommendations */}
        <Card label="Recommended actions" meta={`${content.recommendations.length} priorities`}>
          <div className="space-y-2">
            {content.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-3xs font-mono leading-relaxed">
                <Lightbulb className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-ink-2">{rec}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── Main grid: Chart · Linked drifts ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-2.5 mb-2.5">
        {/* Primary chart card */}
        <Card label={content.chartLabel} meta={<span>{content.chartUnit}</span>}>
          <div className="h-[260px] -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <PrimaryChart content={content} color={primaryHex} />
            </ResponsiveContainer>
          </div>
          {/* Legend hint */}
          <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-ink-3 cy-num">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-0.5"
                style={{ backgroundColor: primaryHex }}
              />
              Client
            </span>
            {content.trend[0]?.benchmark !== undefined && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-0.5 border-b border-dashed"
                  style={{ borderColor: colors.ink4 }}
                />
                Benchmark / target · {content.trend[0].benchmark}
              </span>
            )}
          </div>
        </Card>

        {/* Linked drifts */}
        <Card
          label={`Linked drifts · ${screen}`}
          meta={`${linkedDrifts.length} routed`}
          noPadding
        >
          <div className="max-h-[320px] overflow-y-auto">
            {linkedDrifts.length === 0 ? (
              <div className="p-4 text-center text-2xs font-mono text-ink-3">
                No Category A drifts route to this screen right now.
              </div>
            ) : (
              linkedDrifts.map((d) => (
                <DriftCard key={d.id} drift={d} onClick={() => openDrift(d)} />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ─── Analytical modules & Quick actions ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Modules */}
        <Card
          label="Analytical modules"
          meta={`${content.modules.length} on this screen`}
        >
          <div className="divide-y divide-black/[0.04] -mx-3 -mb-3">
            {content.modules.map((m) => (
              <div
                key={m.id}
                className="px-3 py-2 cy-hover flex items-start gap-2.5 cursor-default"
              >
                <Boxes className="h-3.5 w-3.5 text-ink-3 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-ink font-medium leading-snug">
                    {m.title}
                  </div>
                  <div className="mt-0.5 text-3xs font-mono text-ink-3 leading-snug">
                    {m.desc}
                  </div>
                </div>
                <span className="text-3xs font-mono text-ink-4 uppercase tracking-wide shrink-0 mt-0.5">
                  soon
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <Card
          label="Quick actions"
          meta={`${content.quickActions.length} available`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {content.quickActions.map((a, i) => (
              <button
                key={a.label + i}
                type="button"
                className={cn(
                  'flex items-center gap-2 h-8 px-2.5 border border-black/[0.08]',
                  'cy-hover text-left min-w-0',
                )}
                title={a.hint}
              >
                <Layers className="h-3 w-3 text-ink-3 shrink-0" />
                <span className="text-[11px] text-ink truncate flex-1">
                  {a.label}
                </span>
                <ArrowRight className="h-3 w-3 text-ink-3 shrink-0" />
              </button>
            ))}
          </div>
          <div className="mt-2 pt-1.5 border-t border-black/[0.04] text-3xs font-mono text-ink-4 italic">
            Placeholders · wires up when backend actions are available.
          </div>
        </Card>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// PrimaryChart — thin wrapper that picks area / line / bar based on the
// screen's `chartKind`. Rendered inside a ResponsiveContainer by the
// caller, so we return the chart-type component directly (no container).
// ──────────────────────────────────────────────────────────────────────
function PrimaryChart({
  content,
  color,
}: {
  content: ScreenContent
  color: string
}) {
  const data = content.trend
  const benchmark = data[0]?.benchmark

  if (content.chartKind === 'area') {
    return (
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis dataKey="month" fontSize={10} />
        <YAxis fontSize={10} />
        <RTooltip />
        {benchmark && (
          <ReferenceLine y={benchmark} stroke="rgba(0,0,0,0.4)" strokeDasharray="2 2" />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#areaFill)"
          dot={{ fill: color, r: 3 }}
        />
      </AreaChart>
    )
  }

  if (content.chartKind === 'bar') {
    return (
      <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
        <XAxis dataKey="month" fontSize={10} />
        <YAxis fontSize={10} />
        <RTooltip />
        {benchmark && (
          <ReferenceLine y={benchmark} stroke="rgba(0,0,0,0.4)" strokeDasharray="2 2" />
        )}
        <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    )
  }

  // default: line
  return (
    <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
      <XAxis dataKey="month" fontSize={10} />
      <YAxis fontSize={10} />
      <RTooltip />
      {benchmark && (
        <ReferenceLine y={benchmark} stroke="rgba(0,0,0,0.4)" strokeDasharray="2 2" />
      )}
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        dot={{ fill: color, r: 3 }}
      />
    </LineChart>
  )
}

// Status indicator component
function StatusIcon({ status }: { status: 'critical' | 'warning' | 'good' }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return <Icon className={cn('h-2.5 w-2.5', config.className)} />
}
