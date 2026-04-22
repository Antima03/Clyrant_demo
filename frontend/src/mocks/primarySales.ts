import type { PrimarySalesDataset } from '@/types'

export const primarySalesMock: PrimarySalesDataset = {
  byRegion: [
    { name: 'EAST', crores: 28.4, yoyPct: -3.8 },
    { name: 'NORTH-1', crores: 41.2, yoyPct: 2.6 },
    { name: 'NORTH-2', crores: 33.6, yoyPct: -1.1 },
    { name: 'SOUTH', crores: 52.9, yoyPct: 5.4 },
    { name: 'WEST', crores: 31.3, yoyPct: -0.9 },
  ],
  byDivision: [
    { name: 'FLITE', crores: 64.1, yoyPct: 3.2 },
    { name: 'FLITE PU', crores: 42.7, yoyPct: -2.4 },
    { name: 'HAWAI', crores: 51.3, yoyPct: 1.1 },
    { name: 'SHOE', crores: 29.3, yoyPct: -4.6 },
  ],
}
