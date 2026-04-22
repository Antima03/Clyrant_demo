import type { TrendPoint, UoSPoint } from '@/types'

/** Sec : Pri Ratio — 4M trend (spec § 5.3) */
export const secPriMock: TrendPoint[] = [
  { month: 'Sep', value: 71 },
  { month: 'Oct', value: 74 },
  { month: 'Nov', value: 77 },
  { month: 'Dec', value: 78 },
]

/** Unique Outlets Scanned — 4M trend, two series (spec § 5.4).
 *  uos is total, uosMtd is the MTD-highlight series. Values in thousands. */
export const uosMock: UoSPoint[] = [
  { month: 'Sep', uos: 10.4, uosMtd: 7.2 },
  { month: 'Oct', uos: 11.0, uosMtd: 8.1 },
  { month: 'Nov', uos: 11.6, uosMtd: 8.9 },
  { month: 'Dec', uos: 11.9, uosMtd: 9.3 },
]
