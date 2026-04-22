import { MessageSquare, Share2 } from 'lucide-react'
import type { Drift } from '@/types'
import { cn } from '@/utils/cn'

interface Props {
  drift: Drift
  onClick?: () => void
  onShare?: (drift: Drift) => void
}

const severityClass: Record<Drift['severity'], string> = {
  critical: 'text-severity-red',
  warning: 'text-severity-amber',
  info: 'text-ink-3',
}

const severityDot: Record<Drift['severity'], string> = {
  critical: 'bg-severity-red',
  warning: 'bg-severity-amber',
  info: 'bg-ink-3',
}

const lifecycleClass: Record<Drift['lifecycle'], string> = {
  new: 'text-severity-blue',
  viewed: 'text-ink-3',
  discussed: 'text-severity-blue',
  escalated: 'text-severity-amber',
  'war-room': 'text-severity-purple',
  monitoring: 'text-severity-green',
  resolved: 'text-severity-green',
  sustained: 'text-ink-3',
  resolving: 'text-severity-green',
}

export function DriftCard({ drift, onClick, onShare }: Props) {
  const targetBadge =
    drift.category === 'A'
      ? drift.targetScreen ?? '—'
      : (drift.targetAction?.module ?? drift.targetAction?.agent ?? 'war room')

  return (
    <div
      className={cn(
        'group relative w-full px-3 py-2 border-b border-black/[0.04] cy-hover',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col w-full text-left"
      >
        {/* Line 1: id + cat + severity + lifecycle */}
        <div className="flex items-center gap-2 text-2xs font-mono text-ink-3 uppercase tracking-wide">
          <span className="text-ink-2 font-medium">{drift.id}</span>
          <span
            className={cn(
              'px-1 py-px border text-[8px]',
              drift.category === 'A'
                ? 'border-black/20 text-ink-2'
                : 'border-severity-purple/60 text-severity-purple',
            )}
            title={drift.category === 'A' ? 'Tactical drill-down' : 'War-room / strategic'}
          >
            CAT {drift.category}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={cn('h-1.5 w-1.5 rounded-full', severityDot[drift.severity])}
            />
            <span className={severityClass[drift.severity]}>{drift.severity}</span>
          </span>
          <span className="text-ink-4">·</span>
          <span className={lifecycleClass[drift.lifecycle]}>{drift.lifecycle}</span>
        </div>

        {/* Line 2: title */}
        <div className="mt-1 text-[12px] leading-snug text-ink font-medium line-clamp-2 pr-6">
          {drift.title}
        </div>

        {/* Line 3: impact · trend · conf */}
        <div className="mt-1 text-2xs font-mono text-ink-4 cy-num">
          Impact: <span className="text-ink-2">{drift.impactInr}</span>
          <span className="mx-1">·</span>
          Trend: <span className="text-ink-2">{drift.trend}</span>
          <span className="mx-1">·</span>
          Conf: <span className="text-ink-2">{drift.confidence}%</span>
        </div>

        {/* Line 4: geo + sustained */}
        <div className="mt-0.5 flex items-center justify-between text-2xs font-mono text-ink-4">
          <span className="truncate">{drift.geography}</span>
          <span>{drift.sustainedFor}</span>
        </div>

        {/* Line 5: target + metric */}
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-mono text-ink-3 uppercase tracking-wide">
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-ink-4">Metric</span>
            <span className="text-ink-2 truncate normal-case tracking-normal">
              {drift.metric}
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="text-ink-4">{drift.category === 'A' ? '→ drill' : '→ action'}</span>
            <span className="text-ink border border-black/[0.08] px-1 truncate max-w-[100px] normal-case tracking-normal">
              {targetBadge}
            </span>
          </span>
        </div>
      </button>

      {/* Share + notes (top-right) */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {typeof drift.notesCount === 'number' && drift.notesCount > 0 && (
          <span className="flex items-center gap-0.5 text-[9px] font-mono text-ink-3 cy-num">
            <MessageSquare className="h-2.5 w-2.5" />
            {drift.notesCount}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShare?.(drift)
          }}
          title="Share on WhatsApp / Export"
          aria-label="Share finding"
          className="h-5 w-5 flex items-center justify-center text-ink-3 hover:text-ink cy-hover"
        >
          <Share2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
