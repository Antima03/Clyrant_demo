import type { Category, TimeRange } from '@/types'

export const TIME_RANGES: TimeRange[] = ['MTD', 'QTD', 'YTD', 'Custom']

export const REGIONS = [
  'All India',
  'East',
  'North-1',
  'North-2',
  'South',
  'West',
] as const

export const CATEGORIES: Category[] = [
  'Sanitary Napkins',
  'Diapers',
  'Utensil Cleaners',
]
