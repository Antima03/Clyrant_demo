import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Category,
  CustomRange,
  Filters,
  GeoScope,
  TimeRange,
} from '@/types'

interface FiltersCtx {
  filters: Filters
  setTime: (t: TimeRange) => void
  setGeo: (g: GeoScope) => void
  toggleCategory: (c: Category) => void
  resetCategories: () => void
  /** Apply a custom date range. Also flips `time` to 'Custom'. */
  setCustomRange: (r: CustomRange) => void
  setFilters: (f: Filters) => void
}

const defaultFilters: Filters = {
  time: 'MTD',
  geo: { level: 'all' },
  categories: [],
  customRange: null,
}

const Ctx = createContext<FiltersCtx | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  const setTime = useCallback(
    (time: TimeRange) => setFilters((f) => ({ ...f, time })),
    [],
  )
  const setGeo = useCallback(
    (geo: GeoScope) => setFilters((f) => ({ ...f, geo })),
    [],
  )
  const toggleCategory = useCallback(
    (c: Category) =>
      setFilters((f) => ({
        ...f,
        categories: f.categories.includes(c)
          ? f.categories.filter((x) => x !== c)
          : [...f.categories, c],
      })),
    [],
  )
  const resetCategories = useCallback(
    () => setFilters((f) => ({ ...f, categories: [] })),
    [],
  )
  const setCustomRange = useCallback(
    (customRange: CustomRange) =>
      setFilters((f) => ({ ...f, time: 'Custom', customRange })),
    [],
  )

  const value = useMemo<FiltersCtx>(
    () => ({
      filters,
      setTime,
      setGeo,
      toggleCategory,
      resetCategories,
      setCustomRange,
      setFilters,
    }),
    [filters, setTime, setGeo, toggleCategory, resetCategories, setCustomRange],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFilters() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useFilters must be inside <FiltersProvider>')
  return v
}
