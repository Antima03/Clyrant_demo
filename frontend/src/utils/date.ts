/**
 * Tiny date helpers used by the DateRangePicker. No deps — keeps the bundle
 * lean and avoids bringing in a full date lib for a single screen.
 */

export const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Monday-first weekday headings — India retail week starts Mon. */
export const WEEKDAYS_MON_FIRST = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(1) // avoid month-overflow when source is the 31st
  x.setMonth(x.getMonth() + n)
  return x
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime()
}

export function isWithin(d: Date, from: Date, to: Date): boolean {
  const t = startOfDay(d).getTime()
  return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime()
}

/** YYYY-MM-DD — machine-friendly format used by the Filters store. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** "14 Apr" — display label for pills / chips. */
export function formatShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** "14 Apr 2026" — unambiguous label for the picker header. */
export function formatFull(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Returns 42 dates (6 weeks × 7 cols) for the given month view, starting from
 * the Monday of the week that contains the 1st.
 */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const dow = (first.getDay() + 6) % 7 // Monday=0..Sunday=6
  const start = addDays(first, -dow)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}
