import { cn } from '@/utils/cn'

export interface LegendItem {
  /** Color swatch (hex / token). */
  color: string
  /** Series label. */
  label: string
  /** Optional current value shown after the label, e.g. "₹ 187.4 Cr" or "78%". */
  value?: string
  /** Marker style. Defaults to solid dot. `line` = short stroke, `dashed` = dashed stroke. */
  marker?: 'dot' | 'line' | 'dashed' | 'bar'
}

interface Props {
  items: LegendItem[]
  /** Align left or right within the parent. */
  align?: 'left' | 'right'
  /** Additional classes on the wrapper. */
  className?: string
  /** Small caps meta text shown before the items (e.g. "vs LYSM"). */
  caption?: string
}

/**
 * Compact chart legend — mono, uppercase caption, dot/line markers matched to
 * the series. Sits in the top-right of the chart body by default.
 * Every dataset in the Command Centre uses this legend so dense screens don't
 * need users to guess which color is which.
 */
export function ChartLegend({ items, align = 'right', className, caption }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 flex-wrap text-[9px] font-mono uppercase tracking-wide',
        align === 'right' ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      {caption && <span className="text-ink-4">{caption}</span>}
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-ink-3">
          <Marker color={it.color} variant={it.marker ?? 'dot'} />
          <span className="text-ink-2">{it.label}</span>
          {it.value && (
            <span className="text-ink cy-num normal-case tracking-normal">
              {it.value}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

function Marker({
  color,
  variant,
}: {
  color: string
  variant: NonNullable<LegendItem['marker']>
}) {
  if (variant === 'dot') {
    return (
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    )
  }
  if (variant === 'bar') {
    return (
      <span
        className="h-2 w-2.5 shrink-0"
        style={{ backgroundColor: color, opacity: 0.88 }}
        aria-hidden
      />
    )
  }
  // line / dashed
  return (
    <svg width="14" height="6" viewBox="0 0 14 6" className="shrink-0" aria-hidden>
      <line
        x1="0"
        y1="3"
        x2="14"
        y2="3"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={variant === 'dashed' ? '3 2' : undefined}
      />
    </svg>
  )
}
