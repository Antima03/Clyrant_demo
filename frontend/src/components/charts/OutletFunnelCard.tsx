import { Fragment, useState } from 'react'
import type { FunnelStage } from '@/types'
import { Card } from '@/components/ui/Card'
import { ChartLegend } from './ChartLegend'
import { funnelHeadlineConv } from '@/mocks/funnel'
import { fmtShort } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  stages: FunnelStage[]
  /** Fires when a stage is clicked — hook this up to map / geo filters. */
  onStageClick?: (stage: FunnelStage) => void
}

/** Derived per-stage metrics the card surfaces as chips and in the tooltip. */
interface StageMetrics {
  convPct: number // % of universe  (cumulative)
  dropPct: number | null // % lost from previous stage (null for row 0)
  dropCount: number | null // absolute outlet count lost from previous stage
  golmPct: number | null
}

const computeMetrics = (stage: FunnelStage, prev: FunnelStage | null, universe: number): StageMetrics => ({
  convPct: Math.round((stage.count / universe) * 1000) / 10,
  dropPct: prev ? Math.round(((prev.count - stage.count) / prev.count) * 1000) / 10 : null,
  dropCount: prev ? prev.count - stage.count : null,
  golmPct: stage.golmPct ?? null,
})

/**
 * Sequential single-hue palette for the funnel.
 *
 *   fills[0] = cool neutral           — baseline ("everyone")
 *   fills[1] → fills[3] = blue family deepening by step, so saturation
 *   maps to progression through the funnel. Breach stages override to
 *   severity red, intentionally breaking the hue family so the eye lands
 *   on them first.
 *
 * Keeping this inline (rather than in `utils/colors.ts`) because the palette
 * is specific to the funnel chart's semantic meaning; chart-generic tokens
 * stay clean.
 */
const FUNNEL_PALETTE = {
  fills: [
    '#d9dde3', // 0 · Universe            — cool neutral slate
    '#a6bcd4', // 1 · Covered             — pale blue
    '#5e87b3', // 2 · Productive          — medium blue
    '#264f7a', // 3 · Billed (healthy)    — deep blue, feels like a target hit
  ],
  breach: '#b83a2b', // severity red — one notch warmer than severity.red for legibility
}

/** Top band of each trapezoid — 1px highlight using a slightly lighter tone. */
const FUNNEL_HIGHLIGHT = 'rgba(255,255,255,0.12)'

const stageFill = (stage: FunnelStage, index: number) =>
  stage.breach
    ? FUNNEL_PALETTE.breach
    : FUNNEL_PALETTE.fills[Math.min(index, FUNNEL_PALETTE.fills.length - 1)]

/**
 * Outlet Funnel · MTD — a proper centered-trapezoid funnel chart.
 *
 * Layout (3-column grid, one row per stage):
 *   ┌ Label + sublabel ─┬──  centered trapezoid (SVG clip-path)  ──┬ count / % / GOLM ┐
 *
 * Each trapezoid tapers from the previous stage's width (% of universe) down
 * to its own width, which produces a continuous funnel silhouette. Row 0 is a
 * rectangle (universe → universe).
 *
 * Hover: highlights the full row + brightens the segment + reveals dropped-
 *        outlet count in the right column.
 * Click: invokes `onStageClick` — wire up to map layer filter.
 */
export function OutletFunnelCard({ stages, onStageClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (!stages.length) return null
  const universe = stages[0].count
  const headline = funnelHeadlineConv(stages)
  const breachCount = stages.filter((s) => s.breach).length

  // Minimum visual width so the bottom segment never fully pinches shut.
  const MIN_WIDTH_PCT = 8

  return (
    <Card
      label="Outlet Funnel · MTD"
      meta={
        <span className="cy-num">
          <span className="text-ink">{headline}%</span>
          <span className="text-ink-4 ml-1">end-to-end</span>
        </span>
      }
      className="h-full"
      noPadding
    >
      {/* Legend strip — palette communicates progression (pale → deep) + breach */}
      <div className="px-3 pt-1.5 pb-1.5 flex items-center justify-between border-b border-black/[0.05]">
        <ChartLegend
          align="left"
          items={[
            { color: FUNNEL_PALETTE.fills[0], marker: 'bar', label: 'Universe' },
            { color: FUNNEL_PALETTE.fills[2], marker: 'bar', label: 'Progression' },
            { color: FUNNEL_PALETTE.breach, marker: 'bar', label: 'Breach' },
          ]}
        />
        <span className="text-3xs font-mono text-ink-3 cy-num">
          {fmtShort(universe)} universe
          {breachCount > 0 && (
            <span className="text-severity-red ml-1.5">· {breachCount} breach</span>
          )}
        </span>
      </div>

      <div className="px-3 pt-2 pb-2 h-[calc(100%-34px)] flex flex-col">
        <div
          className="flex-1 min-h-0 grid"
          style={{
            gridTemplateColumns: 'minmax(110px, 1.1fr) minmax(140px, 2fr) minmax(110px, 1fr)',
            gridAutoRows: '1fr',
          }}
        >
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1] : null
            const m = computeMetrics(s, prev, universe)
            const topPct = Math.max(
              prev ? (prev.count / universe) * 100 : 100,
              MIN_WIDTH_PCT,
            )
            const botPct = Math.max((s.count / universe) * 100, MIN_WIDTH_PCT)
            // Centered-trapezoid clip-path corners (left → right, top → bottom)
            const tl = (100 - topPct) / 2
            const tr = 100 - tl
            const br = 100 - (100 - botPct) / 2
            const bl = (100 - botPct) / 2
            const clipPath = `polygon(${tl}% 0%, ${tr}% 0%, ${br}% 100%, ${bl}% 100%)`

            const isHovered = hovered === s.id
            const fill = stageFill(s, i)
            // Subtle vertical gradient: 1px light highlight at the top edge,
            // base fill everywhere else — gives each trapezoid a hint of
            // surface dimension without breaking the flat aesthetic.
            const segmentBg = `linear-gradient(180deg, ${FUNNEL_HIGHLIGHT} 0%, transparent 3%), ${fill}`
            const highDrop = m.dropPct !== null && m.dropPct >= 25
            const hoverBg = isHovered ? 'bg-black/[0.025]' : ''

            return (
              <Fragment key={s.id}>
                {/* 1 · LEFT — label + sublabel */}
                <div
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onStageClick?.(s)}
                  className={cn(
                    'flex flex-col justify-center pr-2 pl-1 py-1 cursor-pointer transition-colors',
                    hoverBg,
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {s.breach && (
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: FUNNEL_PALETTE.breach }}
                      />
                    )}
                    <span className="text-[11px] text-ink font-medium truncate">
                      {s.label}
                    </span>
                  </div>
                  {s.sublabel && (
                    <span className="text-3xs text-ink-3 truncate mt-0.5">
                      {s.sublabel}
                    </span>
                  )}
                </div>

                {/* 2 · CENTER — trapezoid segment */}
                <div
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onStageClick?.(s)}
                  role="button"
                  aria-label={`Filter map to ${s.label}`}
                  title={`Click to filter map to ${s.label}`}
                  className={cn(
                    'relative cursor-pointer transition-colors',
                    hoverBg,
                  )}
                >
                  {/* The trapezoid itself — fill from sequential palette,
                      with the top-edge highlight baked into `segmentBg`. */}
                  <div
                    className={cn(
                      'absolute inset-y-0.5 inset-x-0 transition-[filter,opacity] duration-200',
                      isHovered ? 'opacity-100' : 'opacity-95',
                    )}
                    style={{
                      clipPath,
                      background: segmentBg,
                      filter: isHovered ? 'brightness(1.05) saturate(1.1)' : undefined,
                    }}
                  />
                  {/* Drop-off annotation — sits at the top of the segment
                       inside the tapering region (visible for stages 2+) */}
                  {m.dropPct !== null && (
                    <div
                      className={cn(
                        'absolute top-0 right-1 text-3xs font-mono font-medium cy-num pointer-events-none',
                        'translate-y-[-50%] px-1 bg-surface',
                        highDrop ? 'text-severity-red' : 'text-ink-2',
                      )}
                    >
                      ▼ {m.dropPct}%
                    </div>
                  )}
                </div>

                {/* 3 · RIGHT — count + conv % + GOLM */}
                <div
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onStageClick?.(s)}
                  className={cn(
                    'flex flex-col justify-center items-end pl-2 pr-1 py-1 cursor-pointer transition-colors',
                    hoverBg,
                  )}
                >
                  <span className="text-[13px] font-mono font-medium text-ink cy-num whitespace-nowrap">
                    {fmtShort(s.count)}
                  </span>
                  <div className="flex items-baseline gap-2 text-3xs font-mono cy-num mt-0.5">
                    <span>
                      <span className="text-ink-3">Conv </span>
                      <span className="text-ink">{m.convPct}%</span>
                    </span>
                    <span>
                      <span className="text-ink-3">GOLM </span>
                      <span className="text-ink">
                        {m.golmPct !== null ? `${m.golmPct}%` : '—'}
                      </span>
                    </span>
                  </div>
                  {/* Outlets-lost subtext — visible on hover for stages 2+ */}
                  {m.dropCount !== null && (
                    <span
                      className={cn(
                        'text-3xs font-mono text-ink-3 cy-num mt-0.5 transition-opacity duration-150',
                        isHovered ? 'opacity-100' : 'opacity-0',
                      )}
                    >
                      −{fmtShort(m.dropCount)} outlets
                    </span>
                  )}
                </div>
              </Fragment>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-1 pt-1.5 border-t border-black/[0.05] text-3xs font-mono text-ink-3 text-center">
          Click a stage to filter the map layer
        </div>
      </div>
    </Card>
  )
}
