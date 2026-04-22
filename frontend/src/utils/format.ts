/**
 * Display-formatting helpers. All numbers rendered on screen must pass through
 * one of these so tabular-nums look consistent across breakpoints.
 */

/** `3.2` → `"3.2"`, `32` → `"32"`, `0.08` → `"0.08"`. */
export const fmtNum = (n: number, digits = 1) => {
  if (!isFinite(n)) return '–'
  const abs = Math.abs(n)
  if (abs >= 100) return n.toFixed(0)
  return n.toFixed(digits)
}

/** e.g. `fmtPct(-3.2)` → `"▼ 3.2%"` */
export const fmtPct = (n: number, digits = 1) => {
  if (!isFinite(n)) return '–'
  const sign = n > 0 ? '▲' : n < 0 ? '▼' : '•'
  return `${sign} ${Math.abs(n).toFixed(digits)}%`
}

/** Rupee — ₹ N.N Cr / L */
export const fmtInr = (value: number, unit: 'Cr' | 'L' = 'Cr', digits = 1) => {
  return `₹ ${value.toFixed(digits)} ${unit}`
}

/** `12400` → `"12.4K"`, `182000` → `"1.8L"`, `2340000` → `"23.4L"`. */
export const fmtShort = (n: number) => {
  if (!isFinite(n)) return '–'
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(Math.round(n))
}
