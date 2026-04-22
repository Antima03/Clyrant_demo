import { colors } from '@/utils/colors'

/**
 * One source of truth for chart styling. Every Recharts component in
 * `src/components/charts/*` reads tokens from here so the visual language is
 * identical across Primary Sales, Sec:Pri, UoS and any future charts.
 */

export const chartFonts = {
  mono: 'IBM Plex Mono, ui-monospace, monospace',
  sans: 'IBM Plex Sans, ui-sans-serif, system-ui',
}

export const axisTick = {
  fontSize: 9,
  fontFamily: chartFonts.mono,
  fill: colors.ink3,
}

export const axisTickValue = {
  ...axisTick,
  fill: colors.ink4,
}

export const gridStroke = 'rgba(0,0,0,0.04)'
export const dividerStroke = 'rgba(0,0,0,0.06)'

export const tooltipStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: chartFonts.mono,
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 0,
  padding: '6px 8px',
  color: colors.ink,
  boxShadow: 'none',
}

export const tooltipLabelStyle: React.CSSProperties = {
  fontSize: 8,
  fontFamily: chartFonts.mono,
  color: colors.ink3,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 2,
}

export const tooltipItemStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: chartFonts.mono,
  color: colors.ink,
  padding: 0,
}

/** Margin presets used across chart variants. */
export const chartMargins = {
  compact: { top: 24, right: 12, bottom: 4, left: 8 },
  withLegend: { top: 32, right: 12, bottom: 4, left: 8 },
  dualAxis: { top: 24, right: 24, bottom: 4, left: 8 },
}

/** Default active cursor fill when hovering a bar. */
export const cursorFill = 'rgba(0,0,0,0.025)'
