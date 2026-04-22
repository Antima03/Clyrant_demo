import type { TrendPoint } from '@/types'

/** Sec : Pri Ratio — 4M trend (spec § 5.3) */
export const secPriMock: TrendPoint[] = [
  { month: 'Sep', value: 71, priCr: 12.4, secCr: 8.8 },
  { month: 'Oct', value: 74, priCr: 13.1, secCr: 9.7 },
  { month: 'Nov', value: 77, priCr: 14.0, secCr: 10.8 },
  { month: 'Dec', value: 78, priCr: 13.6, secCr: 10.6 },
]
