import { colors } from '@/utils/colors'

interface Props {
  data: number[]
  width?: number
  height?: number
  color?: string
}

/**
 * Inline sparkline — 48×16, no axes, single polyline.
 * Spec § 4.4: stroke picks breach color if alerting, else severity-green.
 */
export function Sparkline({
  data,
  width = 48,
  height = 16,
  color = colors.green,
}: Props) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = data.length > 1 ? width / (data.length - 1) : width
  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / span) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
