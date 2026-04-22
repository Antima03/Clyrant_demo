import type { KPI } from '@/types'
import { Sparkline } from './Sparkline'
import { colors } from '@/utils/colors'
import { cn } from '@/utils/cn'

interface Props {
  kpi: KPI
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

/**
 * KPI tile — spec § 4.4.
 *   - Value: 18px, light, tabular-nums, turns severity-red ONLY when breach.
 *   - Delta: 9px mono, colored by direction not sentiment (▼ always red).
 *   - Sparkline: 48×16, inherits breach color if alerting, else green.
 */
export function KPITile({ kpi, onClick }: Props) {
  const valueClass = kpi.breach ? 'text-severity-red' : 'text-ink'
  const sparkColor = kpi.breach ? colors.red : colors.green

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start',
        // Mobile: fixed width, horizontally scrollable inside the strip
        'w-[128px] shrink-0',
        // Desktop: grow to fill the strip, with a floor that keeps content
        // readable on 1366px laptops and below
        'md:w-auto md:flex-1 md:min-w-[128px] md:shrink',
        'px-3 py-2 text-left cy-hover border-r border-black/[0.04] last:border-r-0',
      )}
    >
      <span className="text-3xs font-mono font-medium text-ink-2 uppercase tracking-wide truncate w-full">
        {kpi.label}
      </span>

      <span
        className={cn(
          'mt-0.5 text-[18px] leading-tight font-normal cy-num',
          valueClass,
        )}
      >
        {kpi.value}
      </span>

      {kpi.subline && (
        <span className="mt-0.5 text-3xs font-mono text-ink-3 truncate w-full leading-none">
          {kpi.subline}
        </span>
      )}

      <div className="mt-1 flex items-center justify-between w-full gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          {kpi.deltas.map((d, i) => {
            const color =
              d.direction === 'down'
                ? 'text-severity-red'
                : d.direction === 'up'
                  ? 'text-severity-green'
                  : 'text-ink-2'
            const arrow = d.direction === 'down' ? '▼' : d.direction === 'up' ? '▲' : '•'
            const absVal = Math.abs(d.value).toFixed(d.value % 1 === 0 ? 0 : 1)
            return (
              <span
                key={i}
                className={cn('text-3xs font-mono font-medium cy-num truncate', color)}
              >
                {arrow} {absVal}
                {typeof d.value === 'number' && d.label.toLowerCase().includes('pts')
                  ? ''
                  : '%'}{' '}
                <span className="text-ink-3 font-normal normal-case">{d.label}</span>
              </span>
            )
          })}
        </div>
        <Sparkline data={kpi.spark} color={sparkColor} />
      </div>
    </button>
  )
}
