import type { KPI } from '@/types'

/**
 * Landing-page KPI strip — 3 + 3 + 3 = 9 tiles.
 * Values are fictional but plausible for a Pan-India FMCG roll-up (MTD).
 */
export const kpisMock: KPI[] = [
  // ─── PRIMARY ────────────────────────────────────────────────────────
  {
    id: 'net-sales',
    group: 'PRIMARY',
    label: 'Net Sales',
    value: '₹ 187.4 Cr',
    breach: false,
    deltas: [
      { label: 'vs LYSM', value: 4.2, direction: 'up' },
      { label: 'vs LM', value: -1.8, direction: 'down' },
    ],
    spark: [140, 148, 155, 152, 161, 170, 174, 181, 178, 183, 187, 187.4],
  },
  {
    id: 'sales-vs-target',
    group: 'PRIMARY',
    label: 'Sales vs Target',
    value: '68%',
    breach: true,
    deltas: [{ label: 'MTD pace', value: -6.0, direction: 'down' }],
    spark: [62, 65, 66, 68, 69, 68, 67, 68, 70, 69, 68, 68],
  },
  {
    id: 'forecast-accuracy',
    group: 'PRIMARY',
    label: 'Forecast Accuracy',
    value: '82%',
    breach: false,
    deltas: [{ label: 'vs LP', value: 1.4, direction: 'up' }],
    spark: [78, 79, 80, 80, 81, 79, 80, 82, 81, 82, 82, 82],
  },

  // ─── SECONDARY ──────────────────────────────────────────────────────
  {
    id: 'absolute-reach',
    group: 'SECONDARY',
    label: 'Absolute Reach',
    value: '11.9K outlets',
    breach: false,
    deltas: [
      { label: 'vs LYSM', value: 2.1, direction: 'up' },
      { label: 'vs LM', value: -0.6, direction: 'down' },
    ],
    spark: [10.5, 10.8, 11.1, 11.0, 11.4, 11.6, 11.7, 11.8, 11.6, 11.9, 11.9, 11.9],
  },
  {
    id: 'sec-pri-gap',
    group: 'SECONDARY',
    label: 'Sec : Pri Gap',
    value: '22%',
    breach: true,
    deltas: [{ label: 'vs norm', value: 5.8, direction: 'up' }],
    spark: [14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 22, 22],
  },
  {
    id: 'fill-rate',
    group: 'SECONDARY',
    label: 'Fill Rate',
    value: '91%',
    breach: false,
    deltas: [{ label: 'Billed ÷ Ord', value: 0.4, direction: 'up' }],
    spark: [88, 89, 89, 90, 90, 91, 91, 92, 91, 91, 91, 91],
  },

  // ─── TERTIARY ───────────────────────────────────────────────────────
  {
    id: 'lpc',
    group: 'TERTIARY',
    label: 'Lines per Call',
    value: '3.4',
    breach: false,
    deltas: [{ label: 'vs L3M', value: -0.5, direction: 'down' }],
    spark: [3.7, 3.6, 3.6, 3.5, 3.5, 3.4, 3.4, 3.5, 3.4, 3.4, 3.4, 3.4],
  },
  {
    id: 'throughput',
    group: 'TERTIARY',
    label: 'Throughput',
    value: '₹ 1,248/call',
    breach: false,
    deltas: [{ label: 'vs L3M', value: 2.6, direction: 'up' }],
    spark: [1150, 1170, 1185, 1200, 1205, 1215, 1225, 1230, 1238, 1240, 1245, 1248],
  },
  {
    id: 'productivity',
    group: 'TERTIARY',
    label: 'Productivity',
    value: '74%',
    breach: false,
    deltas: [{ label: 'billed / assigned', value: 0.9, direction: 'up' }],
    spark: [70, 71, 71, 72, 72, 73, 73, 74, 74, 74, 74, 74],
  },
]
