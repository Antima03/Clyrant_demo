import { colors, directionText } from '@/utils/colors'

interface ChipProps {
  x?: number
  y?: number
  value?: number | string
  /** Render value as a % with direction coloring */
  pct?: boolean
  /** Force ink neutral color (used for ₹ Cr absolute labels) */
  neutral?: boolean
  /** Position offset from anchor point */
  dy?: number
  /** Label width */
  width?: number
}

/**
 * Shared "chip" label — 2px radius white rect, hairline border, 9px mono.
 * Used by all 4 landing charts (§ 5.5).
 */
export function ChipLabel({
  x = 0,
  y = 0,
  value,
  pct,
  neutral,
  dy = -12,
  width = 34,
}: ChipProps) {
  if (value === undefined || value === null) return null

  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  const display =
    typeof value === 'string'
      ? value
      : pct
        ? `${num > 0 ? '+' : ''}${num.toFixed(1)}%`
        : `${num}`

  const fill = neutral ? colors.ink2 : pct ? directionText(num) : colors.ink2
  const h = 14

  return (
    <g transform={`translate(${x}, ${y + dy})`}>
      <rect
        x={-width / 2}
        y={-h / 2}
        width={width}
        height={h}
        rx={2}
        fill="white"
        stroke="rgba(0,0,0,0.08)"
      />
      <text
        textAnchor="middle"
        dy={3}
        fontSize={9}
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fill={fill}
      >
        {display}
      </text>
    </g>
  )
}
