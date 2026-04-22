import { useState } from 'react'
import { ShieldAlert, CheckCircle2, Clock, Loader2, Plus, ExternalLink } from 'lucide-react'
import type { WarRoomAction, WarRoomStatus, DueType } from '@/types'
import { warRoomActionsMock } from '@/mocks/warRoom'
import { cn } from '@/utils/cn'

// ─── Helpers ────────────────────────────────────────────────────────────────

function dueChip(dueType: DueType, label: string) {
  const cls =
    dueType === 'today'
      ? 'bg-severity-red/10 text-severity-red border-severity-red/20'
      : dueType === 'week'
        ? 'bg-severity-amber/10 text-severity-amber border-severity-amber/20'
        : 'bg-severity-green/10 text-severity-green border-severity-green/20'
  return (
    <span className={cn('text-[9px] font-mono font-semibold uppercase tracking-wide border px-1.5 py-0.5', cls)}>
      {label}
    </span>
  )
}

function Avatar({ initials, size = 'sm' }: { initials: string; size?: 'sm' | 'xs' }) {
  const dim = size === 'xs' ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'
  const colors: Record<string, string> = {
    PG: 'bg-severity-purple/10 text-severity-purple',
    AV: 'bg-severity-blue/10 text-severity-blue',
    RK: 'bg-severity-amber/10 text-severity-amber',
    SM: 'bg-severity-green/10 text-severity-green',
    VR: 'bg-severity-red/10 text-severity-red',
    NK: 'bg-ink/10 text-ink',
    RM: 'bg-severity-purple/10 text-severity-purple',
    PS: 'bg-severity-blue/10 text-severity-blue',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono font-bold border border-black/[0.08]',
        dim,
        colors[initials] ?? 'bg-ink/5 text-ink',
      )}
    >
      {initials}
    </span>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function WarRoomCard({
  action,
  onOpen,
}: {
  action: WarRoomAction
  onOpen: (a: WarRoomAction) => void
}) {
  const borderAccent =
    action.hasAI
      ? 'border-l-2 border-l-severity-purple'
      : action.hasTrade
        ? 'border-l-2 border-l-severity-amber'
        : ''

  return (
    <button
      type="button"
      onClick={() => onOpen(action)}
      className={cn(
        'w-full text-left bg-white border border-black/[0.08] p-3 transition-shadow hover:shadow-md',
        borderAccent,
      )}
    >
      {/* Closed badge */}
      {action.status === 'closed' && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <CheckCircle2 className="h-3 w-3 text-severity-green" />
          <span className="text-[9px] font-mono uppercase tracking-wide text-severity-green font-semibold">
            Resolved
          </span>
          <span className="text-[9px] font-mono text-ink-4 ml-auto">{action.dueLabel}</span>
        </div>
      )}

      {/* Name */}
      <div className={cn('text-[12px] font-medium text-ink leading-snug mb-1.5', action.status === 'closed' && 'opacity-60')}>
        {action.name}
      </div>

      {/* Meta */}
      <div className={cn('text-[10px] text-ink-3 leading-snug mb-2', action.status === 'closed' && 'opacity-60')}>
        {action.meta}
      </div>

      {/* Progress bar (in-progress only) */}
      {action.progressPct !== undefined && action.status !== 'closed' && (
        <div className="mb-2">
          <div className="h-1 bg-ink/[0.06] overflow-hidden">
            <div
              className="h-full bg-severity-amber/70 transition-all"
              style={{ width: `${action.progressPct}%` }}
            />
          </div>
          {action.progressLabel && (
            <div className="mt-0.5 text-[9px] font-mono text-ink-4">{action.progressLabel}</div>
          )}
        </div>
      )}

      {/* AI note */}
      {action.aiNote && action.status !== 'closed' && (
        <div className="mb-2 bg-severity-purple/[0.06] border border-severity-purple/20 px-2 py-1">
          <p className="text-[10px] text-severity-purple leading-snug">{action.aiNote}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar initials={action.assignee.initials} size="xs" />
          <span className="text-[10px] text-ink-3">{action.assignee.name}</span>
        </div>
        {action.status !== 'closed' && dueChip(action.dueType, action.dueLabel)}
      </div>
    </button>
  )
}

// ─── Column ──────────────────────────────────────────────────────────────────

const COL_CONFIG: { status: WarRoomStatus; label: string; icon: React.ElementType; accent?: string }[] = [
  { status: 'open', label: 'Open', icon: ShieldAlert, accent: 'text-severity-red' },
  { status: 'in-progress', label: 'In Progress', icon: Loader2, accent: 'text-severity-amber' },
  { status: 'awaiting', label: 'Awaiting Response', icon: Clock },
  { status: 'closed', label: 'Closed This Month', icon: CheckCircle2, accent: 'text-severity-green' },
]

function Column({
  status,
  label,
  icon: Icon,
  accent,
  actions,
  onOpen,
}: {
  status: WarRoomStatus
  label: string
  icon: React.ElementType
  accent?: string
  actions: WarRoomAction[]
  onOpen: (a: WarRoomAction) => void
}) {
  const countCls =
    status === 'open'
      ? 'bg-severity-red/10 text-severity-red border-severity-red/20'
      : status === 'closed'
        ? 'bg-severity-green/10 text-severity-green border-severity-green/20'
        : 'bg-ink/[0.06] text-ink-3 border-black/[0.08]'

  return (
    <div className="flex flex-col min-h-0 bg-surface border border-black/[0.08]">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-black/[0.08] bg-white shrink-0">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-3.5 w-3.5', accent ?? 'text-ink-3')} />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-ink">
            {label}
          </span>
        </div>
        <span
          className={cn(
            'text-[9px] font-mono font-bold border px-1.5 py-0.5',
            countCls,
          )}
        >
          {actions.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {actions.map((a) => (
          <WarRoomCard key={a.id} action={a} onOpen={onOpen} />
        ))}
        {actions.length === 0 && (
          <div className="flex items-center justify-center h-16 text-[10px] font-mono text-ink-4 uppercase tracking-wide">
            No actions
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Action Detail Slide-in ───────────────────────────────────────────────────

function ActionDetail({ action, onClose }: { action: WarRoomAction; onClose: () => void }) {
  const statusLabel = {
    open: 'Open',
    'in-progress': 'In Progress',
    awaiting: 'Awaiting Response',
    closed: 'Closed',
  }[action.status]

  const statusCls = {
    open: 'text-severity-red border-severity-red/30 bg-severity-red/[0.06]',
    'in-progress': 'text-severity-amber border-severity-amber/30 bg-severity-amber/[0.06]',
    awaiting: 'text-ink-2 border-black/20 bg-ink/[0.04]',
    closed: 'text-severity-green border-severity-green/30 bg-severity-green/[0.06]',
  }[action.status]

  return (
    <div className="fixed inset-y-0 right-0 w-[360px] bg-white border-l border-black/[0.08] shadow-xl z-40 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-ink-3" />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wide text-ink-2">
            {action.id}
          </span>
          {action.driftId && (
            <span className="text-[9px] font-mono text-ink-4 border border-black/[0.08] px-1.5 py-0.5">
              {action.driftId}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center cy-hover border border-black/[0.08] text-ink-3 text-xs"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status + name */}
        <div>
          <span className={cn('text-[9px] font-mono font-semibold uppercase tracking-wide border px-1.5 py-0.5 mb-2 inline-block', statusCls)}>
            {statusLabel}
          </span>
          <h2 className="text-[15px] font-medium text-ink leading-snug mt-1">{action.name}</h2>
          <p className="mt-1.5 text-[11px] text-ink-3 leading-relaxed">{action.meta}</p>
        </div>

        {/* Progress */}
        {action.progressPct !== undefined && action.status !== 'closed' && (
          <div className="cy-card p-3">
            <div className="text-[9px] font-mono uppercase tracking-wide text-ink-3 mb-2">Progress</div>
            <div className="h-1.5 bg-ink/[0.06] overflow-hidden">
              <div className="h-full bg-severity-amber transition-all" style={{ width: `${action.progressPct}%` }} />
            </div>
            <div className="mt-1 text-[10px] font-mono text-ink-3">{action.progressLabel}</div>
          </div>
        )}

        {/* AI note */}
        {action.aiNote && (
          <div className="bg-severity-purple/[0.06] border border-severity-purple/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-severity-purple animate-pulse" />
              <span className="text-[9px] font-mono font-semibold uppercase tracking-wide text-severity-purple">AI Note</span>
            </div>
            <p className="text-[11px] text-severity-purple leading-snug">{action.aiNote}</p>
          </div>
        )}

        {/* Assignee */}
        <div className="cy-card p-3">
          <div className="text-[9px] font-mono uppercase tracking-wide text-ink-3 mb-2">Assigned To</div>
          <div className="flex items-center gap-2">
            <Avatar initials={action.assignee.initials} />
            <div>
              <div className="text-[12px] font-medium text-ink">{action.assignee.name}</div>
              <div className="text-[10px] text-ink-3">{action.assignee.role}</div>
            </div>
          </div>
        </div>

        {/* Due */}
        <div className="cy-card p-3">
          <div className="text-[9px] font-mono uppercase tracking-wide text-ink-3 mb-1">Due Date</div>
          <div className="flex items-center gap-2">
            {dueChip(action.dueType, action.dueLabel)}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {action.hasAI && (
            <span className="text-[9px] font-mono uppercase tracking-wide border border-severity-purple/30 text-severity-purple px-1.5 py-0.5 bg-severity-purple/[0.04]">
              AI-generated
            </span>
          )}
          {action.hasTrade && (
            <span className="text-[9px] font-mono uppercase tracking-wide border border-severity-amber/30 text-severity-amber px-1.5 py-0.5 bg-severity-amber/[0.04]">
              Trade action
            </span>
          )}
          {action.driftId && (
            <span className="text-[9px] font-mono uppercase tracking-wide border border-black/[0.08] text-ink-3 px-1.5 py-0.5">
              Linked: {action.driftId}
            </span>
          )}
        </div>

        {/* Quick actions */}
        {action.status !== 'closed' && (
          <div className="space-y-1.5 pt-2 border-t border-black/[0.06]">
            <div className="text-[9px] font-mono uppercase tracking-wide text-ink-3 mb-2">Quick Actions</div>
            {action.status === 'open' && (
              <button className="flex items-center gap-2 w-full h-8 px-3 text-[11px] font-mono text-ink-2 border border-black/[0.08] cy-hover">
                <Loader2 className="h-3 w-3" /> Mark In Progress
              </button>
            )}
            {action.status === 'in-progress' && (
              <button className="flex items-center gap-2 w-full h-8 px-3 text-[11px] font-mono text-ink-2 border border-black/[0.08] cy-hover">
                <Clock className="h-3 w-3" /> Mark Awaiting Response
              </button>
            )}
            <button className="flex items-center gap-2 w-full h-8 px-3 text-[11px] font-mono text-severity-green border border-severity-green/20 bg-severity-green/[0.04] cy-hover">
              <CheckCircle2 className="h-3 w-3" /> Mark as Resolved
            </button>
            {action.driftId && (
              <button className="flex items-center gap-2 w-full h-8 px-3 text-[11px] font-mono text-ink-3 border border-black/[0.06] cy-hover">
                <ExternalLink className="h-3 w-3" /> Open linked drift {action.driftId}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Board ───────────────────────────────────────────────────────────────────

export function WarRoomBoard() {
  const [actions] = useState<WarRoomAction[]>(warRoomActionsMock)
  const [selectedAction, setSelectedAction] = useState<WarRoomAction | null>(null)
  const [filterStatus, setFilterStatus] = useState<WarRoomStatus | 'all'>('all')

  const filtered = filterStatus === 'all' ? actions : actions.filter((a) => a.status === filterStatus)

  const byStatus = (s: WarRoomStatus) => filtered.filter((a) => a.status === s)

  const openCount = actions.filter((a) => a.status === 'open').length
  const inProgressCount = actions.filter((a) => a.status === 'in-progress').length
  const closedCount = actions.filter((a) => a.status === 'closed').length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-black/[0.08] bg-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-severity-red" />
              <h1 className="text-[15px] font-semibold text-ink tracking-tight">War Room — November 2025</h1>
            </div>
            <p className="text-[11px] text-ink-3 mt-0.5">
              {actions.length} total actions · high urgency, tactical execution focus
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-semibold uppercase tracking-wide border border-severity-red/20 bg-severity-red/[0.06] text-severity-red px-2 py-1">
              {openCount} Open
            </span>
            <span className="text-[9px] font-mono font-semibold uppercase tracking-wide border border-severity-amber/20 bg-severity-amber/[0.06] text-severity-amber px-2 py-1">
              {inProgressCount} In Progress
            </span>
            <span className="text-[9px] font-mono font-semibold uppercase tracking-wide border border-severity-green/20 bg-severity-green/[0.06] text-severity-green px-2 py-1">
              {closedCount} Closed
            </span>
            <button
              className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-mono text-ink border border-black/[0.08] cy-hover ml-2"
            >
              <Plus className="h-3 w-3" /> Add Action
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1">
          {(['all', 'open', 'in-progress', 'awaiting', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'text-[9px] font-mono uppercase tracking-wide px-2 py-0.5 border transition-colors',
                filterStatus === s
                  ? 'bg-ink text-white border-ink'
                  : 'border-black/[0.08] text-ink-3 cy-hover',
              )}
            >
              {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 min-h-0 grid grid-cols-4 gap-px bg-black/[0.06] p-px overflow-hidden">
        {COL_CONFIG.map((col) => (
          <Column
            key={col.status}
            status={col.status}
            label={col.label}
            icon={col.icon}
            accent={col.accent}
            actions={byStatus(col.status)}
            onOpen={setSelectedAction}
          />
        ))}
      </div>

      {/* Action detail slide-in */}
      {selectedAction && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/10"
            onClick={() => setSelectedAction(null)}
          />
          <ActionDetail action={selectedAction} onClose={() => setSelectedAction(null)} />
        </>
      )}
    </div>
  )
}
