import { X, Zap, MapPin, UserCheck, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Drift, HistoryEvent } from '@/types'
import { driftHistoryMock, defaultHistoryEvents } from '@/mocks/warRoom'
import { cn } from '@/utils/cn'

function kindIcon(kind: HistoryEvent['kind']) {
  switch (kind) {
    case 'ai': return <Zap className="h-3.5 w-3.5 text-severity-purple" />
    case 'field': return <MapPin className="h-3.5 w-3.5 text-severity-amber" />
    case 'assigned': return <UserCheck className="h-3.5 w-3.5 text-severity-green" />
    case 'escalated': return <AlertTriangle className="h-3.5 w-3.5 text-severity-red" />
    case 'note': return <MessageSquare className="h-3.5 w-3.5 text-ink-3" />
    case 'status': return <TrendingUp className="h-3.5 w-3.5 text-severity-blue" />
    default: return <TrendingUp className="h-3.5 w-3.5 text-ink-3" />
  }
}

function kindDotCls(kind: HistoryEvent['kind']) {
  switch (kind) {
    case 'ai': return 'bg-severity-purple'
    case 'field': return 'bg-severity-amber'
    case 'assigned': return 'bg-severity-green'
    case 'escalated': return 'bg-severity-red'
    case 'note': return 'bg-ink-3'
    case 'status': return 'bg-severity-blue'
    default: return 'bg-ink-4'
  }
}

function kindBgCls(kind: HistoryEvent['kind']) {
  switch (kind) {
    case 'ai': return 'bg-severity-purple/[0.06] border-severity-purple/20'
    case 'field': return 'bg-severity-amber/[0.06] border-severity-amber/20'
    case 'assigned': return 'bg-severity-green/[0.06] border-severity-green/20'
    case 'escalated': return 'bg-severity-red/[0.06] border-severity-red/20'
    default: return 'bg-ink/[0.02] border-black/[0.06]'
  }
}

function HistoryItem({ event }: { event: HistoryEvent }) {
  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn('h-6 w-6 rounded-sm flex items-center justify-center border shrink-0', kindBgCls(event.kind))}>
          {kindIcon(event.kind)}
        </div>
        <div className="flex-1 w-px bg-black/[0.06] mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[11px] font-semibold text-ink">{event.action}</span>
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', kindDotCls(event.kind))} />
          <span className="text-[10px] font-mono text-ink-3">{event.actor}</span>
          <span className="text-[9px] font-mono text-ink-4">{event.actorRole}</span>
        </div>
        <p className="text-[11px] text-ink-2 leading-relaxed">{event.detail}</p>
        <div className="mt-1 text-[9px] font-mono text-ink-4 uppercase tracking-wide">{event.timestamp}</div>
      </div>
    </div>
  )
}

interface Props {
  drift: Drift
  onClose: () => void
}

export function DriftHistory({ drift, onClose }: Props) {
  const events = driftHistoryMock[drift.id] ?? defaultHistoryEvents

  const severityDot =
    drift.severity === 'critical'
      ? 'bg-severity-red'
      : drift.severity === 'warning'
        ? 'bg-severity-amber'
        : 'bg-ink-3'

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white border-l border-black/[0.08] shadow-xl z-40 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-black/[0.08]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-ink-2 uppercase tracking-wide">{drift.id}</span>
            <span className={cn('h-2 w-2 rounded-full', severityDot)} />
            <span className="text-[10px] font-mono text-ink-3 uppercase">{drift.severity}</span>
          </div>
          <button
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center cy-hover border border-black/[0.08] text-ink-3"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <h2 className="text-[13px] font-medium text-ink leading-snug">{drift.title}</h2>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-ink-4">
          <span>{drift.geography}</span>
          <span>·</span>
          <span>{drift.sustainedFor}</span>
          <span>·</span>
          <span>{events.length} events</span>
        </div>
      </div>

      {/* Legend */}
      <div className="shrink-0 px-4 py-2 border-b border-black/[0.06] flex flex-wrap gap-x-3 gap-y-1">
        {(
          [
            { kind: 'ai', label: 'AI / System' },
            { kind: 'field', label: 'Field' },
            { kind: 'assigned', label: 'Assigned' },
            { kind: 'escalated', label: 'Escalated' },
            { kind: 'note', label: 'Note' },
            { kind: 'status', label: 'Status' },
          ] as { kind: HistoryEvent['kind']; label: string }[]
        ).map(({ kind, label }) => (
          <div key={kind} className="flex items-center gap-1">
            <span className={cn('h-1.5 w-1.5 rounded-full', kindDotCls(kind))} />
            <span className="text-[9px] font-mono text-ink-4 uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[11px] font-mono text-ink-4 uppercase tracking-wide">
            No history yet
          </div>
        ) : (
          <div>
            {events.map((e) => (
              <HistoryItem key={e.id} event={e} />
            ))}
            {/* End marker */}
            <div className="flex items-center gap-2 pb-6">
              <div className="h-2 w-2 rounded-full bg-ink/[0.15] border border-ink/[0.12]" />
              <span className="text-[9px] font-mono text-ink-4 uppercase tracking-wide">Beginning of record</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-black/[0.06]">
        <input
          placeholder="Add a note to history…"
          className="w-full h-8 px-3 text-[11px] border border-black/[0.08] outline-none bg-transparent placeholder:text-ink-4"
        />
        <div className="mt-1 text-[9px] font-mono text-ink-4 uppercase tracking-wide">
          Logged to context graph · visible to RSM+
        </div>
      </div>
    </div>
  )
}
