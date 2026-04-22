import type { FunnelStage } from '@/types'

/**
 * Outlet Funnel — 4 stages top→bottom.
 *   • Universe (Outlets in DMS) → Covered → Productive → Billed
 *
 * Each stage carries three derived/stored KPIs surfaced in the card:
 *   • Conv %   = count / universe.count   (cumulative, computed in view)
 *   • Drop %   = (prev.count - count) / prev.count   (computed in view)
 *   • GOLM %   = strategic coverage metric vs goal-of-last-month    (stored here)
 */
export const funnelMock: FunnelStage[] = [
  {
    id: 'universe',
    label: 'Total Outlet Universe',
    sublabel: 'Outlets in DMS',
    count: 98_200,
    golmPct: 100,
  },
  {
    id: 'covered',
    label: 'Covered Outlets',
    sublabel: 'Visited / Called this period',
    count: 84_500,
    golmPct: 88,
  },
  {
    id: 'productive',
    label: 'Productive Outlets',
    sublabel: 'Order captured in DMS',
    count: 61_200,
    golmPct: 72,
  },
  {
    id: 'billed',
    label: 'Billed Outlets',
    sublabel: 'Invoice raised',
    count: 42_800,
    golmPct: 54,
    breach: true,
  },
]

/** Headline end-to-end conversion (last / universe), one decimal. */
export const funnelHeadlineConv = (stages: FunnelStage[]) => {
  if (!stages.length) return 0
  const u = stages[0].count
  const last = stages[stages.length - 1].count
  return Math.round((last / u) * 1000) / 10
}
