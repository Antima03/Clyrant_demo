import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  MONTHS_FULL,
  WEEKDAYS_MON_FIRST,
  addMonths,
  formatFull,
  formatShort,
  fromISODate,
  isAfter,
  isBefore,
  isSameDay,
  isWithin,
  monthGrid,
  startOfDay,
  toISODate,
} from '@/utils/date'
import type { CustomRange } from '@/types'

interface Props {
  open: boolean
  /** Pre-fills the picker with the last applied range on re-open. */
  initial: CustomRange | null
  onApply: (range: CustomRange) => void
  onCancel: () => void
  /** Earliest pickable day (defaults to 2 years back). */
  minDate?: Date
  /** Latest pickable day (defaults to today). */
  maxDate?: Date
}

interface Shortcut {
  label: string
  /** Returns [from, to] as Dates. */
  compute: () => [Date, Date]
}

function buildShortcuts(today: Date): Shortcut[] {
  const addD = (d: Date, n: number) => {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
  }
  const som = new Date(today.getFullYear(), today.getMonth(), 1)
  const soq = new Date(
    today.getFullYear(),
    Math.floor(today.getMonth() / 3) * 3,
    1,
  )
  const soy = new Date(today.getFullYear(), 0, 1)
  const monday = (() => {
    const dow = (today.getDay() + 6) % 7
    return addD(today, -dow)
  })()

  return [
    { label: 'Last 7 days', compute: () => [addD(today, -6), today] },
    { label: 'Last 14 days', compute: () => [addD(today, -13), today] },
    { label: 'Last 30 days', compute: () => [addD(today, -29), today] },
    { label: 'This week', compute: () => [monday, today] },
    { label: 'MTD', compute: () => [som, today] },
    { label: 'QTD', compute: () => [soq, today] },
    { label: 'YTD', compute: () => [soy, today] },
  ]
}

/**
 * Flat two-month date-range picker. Opens as a modal so it can grow wide
 * without colliding with the TopBar filter row.
 *
 * Behaviour:
 *   - `initial` seeds the picker on every open → last applied range comes
 *     back pre-selected
 *   - First click sets `from`; second click sets `to`
 *   - Clicking a date *before* the current `from` restarts the selection
 *   - Hovering previews the pending `to` edge (range highlight)
 *   - Dates outside [minDate, maxDate] are disabled
 */
export function DateRangePicker({
  open,
  initial,
  onApply,
  onCancel,
  minDate,
  maxDate,
}: Props) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const min = minDate ?? addMonths(today, -24)
  const max = maxDate ?? today

  const initialFrom = initial ? fromISODate(initial.from) : null
  const initialTo = initial ? fromISODate(initial.to) : null

  const [from, setFrom] = useState<Date | null>(initialFrom)
  const [to, setTo] = useState<Date | null>(initialTo)
  const [hover, setHover] = useState<Date | null>(null)
  // Left month anchor — start on the month that contains `from`, or today
  const [anchor, setAnchor] = useState<Date>(initialFrom ?? today)

  // Each time the picker is opened, re-seed from `initial` so the caller's
  // latest applied range is what the user starts from.
  useEffect(() => {
    if (!open) return
    setFrom(initialFrom)
    setTo(initialTo)
    setHover(null)
    if (initialFrom) setAnchor(initialFrom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const handleDayClick = (d: Date) => {
    if (isBefore(d, min) || isAfter(d, max)) return
    // No start yet → set start
    if (!from || (from && to)) {
      setFrom(d)
      setTo(null)
      return
    }
    // Have start, no end
    if (isBefore(d, from)) {
      // Clicking earlier than start → restart selection
      setFrom(d)
      setTo(null)
      return
    }
    setTo(d)
  }

  const pendingTo = to ?? hover // what the range highlight should extend to
  const canApply = !!(from && to)

  const applyShortcut = (sc: Shortcut) => {
    const [a, b] = sc.compute()
    const clampedA = isBefore(a, min) ? min : a
    const clampedB = isAfter(b, max) ? max : b
    setFrom(clampedA)
    setTo(clampedB)
    setAnchor(clampedA)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Custom date range"
    >
      <button
        aria-hidden
        onClick={onCancel}
        className="absolute inset-0 bg-black/15"
      />

      <div className="relative bg-surface border border-black/[0.1] w-full max-w-[560px] shadow-menu">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-9 border-b border-black/[0.06]">
          <div className="cy-section-label">Custom date range</div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="h-6 w-6 flex items-center justify-center cy-hover"
          >
            <X className="h-3.5 w-3.5 text-ink-3" />
          </button>
        </div>

        {/* Shortcut rail */}
        <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5">
          {buildShortcuts(today).map((sc) => (
            <button
              key={sc.label}
              onClick={() => applyShortcut(sc)}
              className="text-[10px] font-mono uppercase tracking-wide text-ink-2 border border-black/[0.08] px-2 h-6 cy-hover"
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Twin months */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.06]">
          <MonthPane
            date={anchor}
            from={from}
            to={pendingTo}
            min={min}
            max={max}
            onDayClick={handleDayClick}
            onDayHover={setHover}
            onPrev={() => setAnchor(addMonths(anchor, -1))}
            onNext={null /* only the right pane controls forward */}
          />
          <MonthPane
            date={addMonths(anchor, 1)}
            from={from}
            to={pendingTo}
            min={min}
            max={max}
            onDayClick={handleDayClick}
            onDayHover={setHover}
            onPrev={null /* only the left pane controls back */}
            onNext={() => setAnchor(addMonths(anchor, 1))}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 h-10 border-t border-black/[0.06] gap-3">
          <div className="flex items-center gap-2 text-[11px] cy-num min-w-0">
            <span className="text-3xs font-mono uppercase tracking-wide text-ink-4">
              From
            </span>
            <span className="text-ink truncate">
              {from ? formatFull(from) : '—'}
            </span>
            <span className="text-ink-4">→</span>
            <span className="text-3xs font-mono uppercase tracking-wide text-ink-4">
              To
            </span>
            <span className="text-ink truncate">
              {to ? formatFull(to) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCancel}
              className="h-7 px-3 text-2xs font-mono uppercase tracking-wide text-ink-2 border border-black/[0.08] cy-hover"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                canApply &&
                onApply({ from: toISODate(from!), to: toISODate(to!) })
              }
              disabled={!canApply}
              className={cn(
                'h-7 px-3 text-2xs font-mono uppercase tracking-wide text-white',
                canApply
                  ? 'bg-ink cy-hover hover:bg-ink-2'
                  : 'bg-ink-4 cursor-not-allowed',
              )}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MonthPaneProps {
  date: Date
  from: Date | null
  to: Date | null
  min: Date
  max: Date
  onDayClick: (d: Date) => void
  onDayHover: (d: Date | null) => void
  onPrev: (() => void) | null
  onNext: (() => void) | null
}

function MonthPane({
  date,
  from,
  to,
  min,
  max,
  onDayClick,
  onDayHover,
  onPrev,
  onNext,
}: MonthPaneProps) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const today = startOfDay(new Date())
  const grid = monthGrid(year, month)

  return (
    <div className="p-3" onMouseLeave={() => onDayHover(null)}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onPrev ?? undefined}
          disabled={!onPrev}
          aria-label="Previous month"
          className={cn(
            'h-6 w-6 flex items-center justify-center',
            onPrev ? 'cy-hover text-ink-2' : 'text-transparent pointer-events-none',
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="text-xs font-medium text-ink">
          {MONTHS_FULL[month]}{' '}
          <span className="text-ink-3 cy-num">{year}</span>
        </div>
        <button
          onClick={onNext ?? undefined}
          disabled={!onNext}
          aria-label="Next month"
          className={cn(
            'h-6 w-6 flex items-center justify-center',
            onNext ? 'cy-hover text-ink-2' : 'text-transparent pointer-events-none',
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_MON_FIRST.map((w) => (
          <div
            key={w}
            className="h-6 flex items-center justify-center text-[9px] font-mono uppercase tracking-wide text-ink-4"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === month
          const disabled = isBefore(d, min) || isAfter(d, max)
          const isFrom = !!from && isSameDay(d, from)
          const isTo = !!to && isSameDay(d, to)
          const isEndpoint = isFrom || isTo
          const inRange =
            !!from && !!to && isWithin(d, from, to) && !isEndpoint
          const isToday = isSameDay(d, today)

          return (
            <button
              key={i}
              disabled={disabled}
              onMouseEnter={() => onDayHover(d)}
              onClick={() => onDayClick(d)}
              className={cn(
                'relative h-7 flex items-center justify-center text-[11px] cy-num transition-colors',
                // base state
                !disabled &&
                  !isEndpoint &&
                  !inRange &&
                  (inMonth
                    ? 'text-ink hover:bg-black/[0.04]'
                    : 'text-ink-4 hover:bg-black/[0.04]'),
                // in-range tint
                inRange && 'bg-black/[0.05] text-ink',
                // endpoints
                isEndpoint && 'bg-ink text-white font-medium',
                // disabled
                disabled && 'text-ink-4 opacity-40 cursor-not-allowed',
              )}
              aria-pressed={isEndpoint}
              aria-label={formatShort(d)}
            >
              {d.getDate()}
              {isToday && !isEndpoint && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-0.5 rounded-full bg-ink-3" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
