import { useState } from 'react'
import { Clock, MapPin, Package, UserRound } from 'lucide-react'
import { FilterPill } from '@/components/ui/FilterPill'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { useFilters } from '@/context/FiltersContext'
import { CATEGORIES, REGIONS, TIME_RANGES } from '@/mocks/filters'
import type { Category, GeoScope, TimeRange } from '@/types'
import { cn } from '@/utils/cn'
import { formatShort, fromISODate } from '@/utils/date'
import { useView, type Role } from '@/context/ViewContext'

const ROLES: Role[] = ['NSM', 'RSM', 'ASM']
const ROLE_SCOPE: Record<Role, string> = {
  NSM: 'National',
  RSM: 'Region',
  ASM: 'Area',
}

function mtdProgress() {
  const now = new Date()
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const elapsed = now.getDate()
  return { elapsed, total, pct: Math.round((elapsed / total) * 100) }
}

function Dropdown<T extends string>({
  open,
  onClose,
  items,
  selected,
  onSelect,
  align = 'left',
}: {
  open: boolean
  onClose: () => void
  items: readonly T[]
  selected?: T
  onSelect: (t: T) => void
  align?: 'left' | 'right'
}) {
  if (!open) return null
  return (
    <>
      <button
        aria-hidden
        className="fixed inset-0 z-30 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute top-full mt-1 z-40 min-w-[180px] bg-surface border border-black/[0.08] shadow-menu',
          align === 'left' ? 'left-0' : 'right-0',
        )}
      >
        <ul>
          {items.map((it) => (
            <li key={it}>
              <button
                onClick={() => {
                  onSelect(it)
                  onClose()
                }}
                className={cn(
                  'flex items-center w-full px-3 py-1.5 text-left text-xs cy-hover',
                  selected === it && 'bg-black/[0.03]',
                )}
              >
                {it}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function MultiSelect({
  open,
  onClose,
  selected,
  onToggle,
  onReset,
}: {
  open: boolean
  onClose: () => void
  selected: Category[]
  onToggle: (c: Category) => void
  onReset: () => void
}) {
  if (!open) return null
  return (
    <>
      <button
        aria-hidden
        className="fixed inset-0 z-30 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div className="absolute top-full mt-1 left-0 z-40 min-w-[220px] bg-surface border border-black/[0.08] shadow-menu">
        <ul>
          {CATEGORIES.map((c) => {
            const checked = selected.includes(c)
            return (
              <li key={c}>
                <button
                  onClick={() => onToggle(c)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs cy-hover"
                >
                  <span
                    className={cn(
                      'h-3 w-3 border border-black/20 flex items-center justify-center',
                      checked && 'bg-ink border-ink',
                    )}
                  >
                    {checked && <span className="text-white text-[9px]">✓</span>}
                  </span>
                  <span>{c}</span>
                </button>
              </li>
            )
          })}
          <li className="border-t border-black/[0.06]">
            <button
              onClick={() => {
                onReset()
                onClose()
              }}
              className="w-full px-3 py-1.5 text-left text-3xs font-mono text-ink-3 uppercase tracking-wide cy-hover"
            >
              Reset (All)
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}

export function TopBar() {
  const {
    filters,
    setTime,
    setGeo,
    toggleCategory,
    resetCategories,
    setCustomRange,
  } = useFilters()
  const { role, setRole } = useView()
  const [open, setOpen] = useState<null | 'time' | 'geo' | 'cat' | 'role'>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const mtd = mtdProgress()

  const geoLabel =
    filters.geo.level === 'all' ? 'All India' : (filters.geo as { value: string }).value
  const catLabel = filters.categories.length
    ? filters.categories.length === 1
      ? filters.categories[0]
      : `${filters.categories.length} selected`
    : 'All'

  // TIME pill label — show the active custom range instead of the word "Custom"
  // so the user sees exactly what scope is applied.
  const timeLabel =
    filters.time === 'Custom' && filters.customRange
      ? `${formatShort(fromISODate(filters.customRange.from))} → ${formatShort(
          fromISODate(filters.customRange.to),
        )}`
      : filters.time

  const handleTimeSelect = (t: TimeRange) => {
    setOpen(null)
    if (t === 'Custom') {
      // Open the calendar instead of applying directly. The picker is seeded
      // with filters.customRange so the last applied dates come back selected.
      setPickerOpen(true)
      return
    }
    setTime(t)
  }

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="h-11 bg-surface border-b border-black/[0.08] flex items-center px-3 md:px-4 gap-3 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-4 w-4 bg-ink" aria-hidden />
        <span className="font-mono font-medium tracking-wide text-xs text-ink">
          CLARYNT
        </span>
      </div>

      <div className="hidden md:block w-px h-5 bg-black/[0.08]" />

      {/* Filters (desktop) */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative">
          <FilterPill
            label="TIME"
            value={timeLabel}
            icon={<Clock className="h-3 w-3 text-ink-3" />}
            active={open === 'time'}
            onClick={() => setOpen(open === 'time' ? null : 'time')}
          />
          <Dropdown
            open={open === 'time'}
            onClose={() => setOpen(null)}
            items={TIME_RANGES}
            selected={filters.time}
            onSelect={handleTimeSelect}
          />
        </div>

        <div className="relative">
          <FilterPill
            label="GEO"
            value={geoLabel}
            icon={<MapPin className="h-3 w-3 text-ink-3" />}
            active={open === 'geo'}
            onClick={() => setOpen(open === 'geo' ? null : 'geo')}
          />
          <Dropdown
            open={open === 'geo'}
            onClose={() => setOpen(null)}
            items={REGIONS}
            selected={geoLabel as (typeof REGIONS)[number]}
            onSelect={(v) => {
              const geo: GeoScope =
                v === 'All India' ? { level: 'all' } : { level: 'region', value: v }
              setGeo(geo)
            }}
          />
        </div>

        <div className="relative">
          <FilterPill
            label="CAT"
            value={catLabel}
            icon={<Package className="h-3 w-3 text-ink-3" />}
            active={open === 'cat'}
            onClick={() => setOpen(open === 'cat' ? null : 'cat')}
          />
          <MultiSelect
            open={open === 'cat'}
            onClose={() => setOpen(null)}
            selected={filters.categories}
            onToggle={toggleCategory}
            onReset={resetCategories}
          />
        </div>
      </div>

      {/* Filters (mobile) — collapsed summary */}
      <button
        type="button"
        onClick={() => setOpen('cat')}
        className="md:hidden flex-1 text-3xs font-mono text-ink-3 uppercase tracking-wide truncate text-left cy-hover px-1 py-1"
      >
        {timeLabel} · {geoLabel} · {catLabel}
      </button>

      <div className="flex-1 hidden md:block" />

      {/* MTD completion bar (spec § 4) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className="text-3xs font-mono text-ink-3 uppercase tracking-wide">
          MTD
        </span>
        <div
          className="relative h-3 w-[90px] bg-black/[0.05]"
          title={`${mtd.elapsed} of ${mtd.total} days`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-ink"
            style={{ width: `${mtd.pct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white mix-blend-difference cy-num">
            {mtd.pct}%
          </span>
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3 shrink-0 text-3xs font-mono text-ink-3 cy-num">
        <span className="hidden sm:inline">{now}</span>
        <div className="w-px h-4 bg-black/[0.08] hidden sm:block" />

        {/* Role switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(open === 'role' ? null : 'role')}
            className={cn(
              'flex items-center gap-1.5 h-6 px-2 border border-black/[0.08] cy-hover',
              open === 'role' && 'bg-black/[0.03]',
            )}
          >
            <UserRound className="h-3 w-3 text-ink-3" />
            <span className="text-xs text-ink">{role}</span>
            <span className="text-3xs text-ink-4 normal-case">
              · {ROLE_SCOPE[role]}
            </span>
          </button>
          <Dropdown
            open={open === 'role'}
            onClose={() => setOpen(null)}
            items={ROLES}
            selected={role}
            onSelect={(r: Role) => setRole(r)}
            align="right"
          />
        </div>
      </div>

      {/* Custom date range picker (modal) */}
      <DateRangePicker
        open={pickerOpen}
        initial={filters.customRange}
        onCancel={() => setPickerOpen(false)}
        onApply={(range) => {
          setCustomRange(range)
          setPickerOpen(false)
        }}
      />
    </header>
  )
}
