import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Drift } from '@/types'
import { DriftCard } from './DriftCard'
import { cn } from '@/utils/cn'

type FilterPill = 'All' | 'Cat A' | 'Cat B' | 'Critical' | 'War room'
const PILLS: FilterPill[] = ['All', 'Cat A', 'Cat B', 'Critical', 'War room']

interface Props {
  drifts: Drift[]
  onSelect?: (d: Drift) => void
  onShare?: (d: Drift) => void
}

export function DriftPanel({ drifts, onSelect, onShare }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<FilterPill>('All')

  const filtered = useMemo(() => {
    return drifts.filter((d) => {
      if (active === 'Cat A' && d.category !== 'A') return false
      if (active === 'Cat B' && d.category !== 'B') return false
      if (active === 'Critical' && d.severity !== 'critical') return false
      if (active === 'War room' && d.lifecycle !== 'war-room') return false
      if (query && !`${d.title} ${d.id} ${d.geography}`.toLowerCase().includes(query.toLowerCase()))
        return false
      return true
    })
  }, [drifts, active, query])

  const counts = useMemo(
    () => ({
      All: drifts.length,
      'Cat A': drifts.filter((d) => d.category === 'A').length,
      'Cat B': drifts.filter((d) => d.category === 'B').length,
      Critical: drifts.filter((d) => d.severity === 'critical').length,
      'War room': drifts.filter((d) => d.lifecycle === 'war-room').length,
    }),
    [drifts],
  )

  return (
    <aside className="w-full md:w-[260px] h-full bg-surface border-l border-black/[0.08] flex flex-col flex-shrink-0 min-h-0">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-black/[0.04]">
        <div className="flex items-center justify-between">
          <span className="cy-section-label">Drifts</span>
          <span className="text-2xs font-mono text-ink-3 cy-num">
            {filtered.length} / {drifts.length}
          </span>
        </div>

        {/* Search */}
        <div className="mt-2 flex items-center gap-1.5 border border-black/[0.08] px-2 h-6">
          <Search className="h-3 w-3 text-ink-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drifts"
            className="flex-1 bg-transparent outline-none text-2xs font-mono placeholder:text-ink-4"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {PILLS.map((p) => (
            <button
              key={p}
              onClick={() => setActive(p)}
              className={cn(
                'flex items-center gap-1 h-5 px-1.5 text-[9px] font-mono uppercase tracking-wide',
                'border border-black/[0.08] cy-hover',
                active === p ? 'bg-black/[0.04] text-ink' : 'text-ink-3',
              )}
            >
              {p}
              <span className="text-ink-4 cy-num">[{counts[p]}]</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-2xs font-mono text-ink-3">
            No drifts match the current filter.
          </div>
        ) : (
          filtered.map((d) => (
            <DriftCard
              key={d.id}
              drift={d}
              onClick={() => onSelect?.(d)}
              onShare={onShare}
            />
          ))
        )}
      </div>
    </aside>
  )
}
