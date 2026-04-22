import { useState } from 'react'
import { X, Flame, Zap, CheckCircle2, ArrowRight } from 'lucide-react'
import type { Drift } from '@/types'
import { cn } from '@/utils/cn'

interface Props {
  drift: Drift
  onClose: () => void
  onConfirm?: (payload: {
    assignedTo: string
    coAssign: string
    responseType: string
    slaDays: number
    notes: string
    routeTo: 'war-room' | 'sales-excellence'
  }) => void
}

const ASSIGNEES = [
  { value: 'priyanka-gupta', label: 'Priyanka Gupta — RSM West', aiPick: true },
  { value: 'rahul-mehta', label: 'Rahul Mehta — ZSM West', aiPick: false },
  { value: 'amit-verma', label: 'Amit Verma — ASM W-3', aiPick: false },
  { value: 'suresh-nair', label: 'Suresh Nair — National Sales Head', aiPick: false },
  { value: 'v-rao', label: 'V. Rao — RSM South', aiPick: false },
]

const CO_ASSIGNEES = [
  { value: 'none', label: 'None' },
  { value: 'rahul-mehta', label: 'Rahul Mehta — ZSM West' },
  { value: 'suresh-nair', label: 'Suresh Nair — National Sales Head' },
  { value: 'finance', label: 'Finance Controller' },
]

const RESPONSE_TYPES = [
  { value: 'field-intervention', label: 'Field Intervention + Scheme Adjustment', aiPick: true },
  { value: 'distributor-meeting', label: 'Distributor Meeting Only', aiPick: false },
  { value: 'stop-supply', label: 'Stop Supply — Primary halt', aiPick: false },
  { value: 'escalate-national', label: 'Escalate to National', aiPick: false },
  { value: 'beat-audit', label: 'Beat Audit & SFA Check', aiPick: false },
  { value: 'coaching', label: 'SO Coaching Session', aiPick: false },
]

const SLA_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
  { value: 168, label: '1 week' },
]

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold uppercase tracking-wide border border-severity-purple/30 text-severity-purple bg-severity-purple/[0.06] px-1.5 py-0.5">
      <span className="h-1.5 w-1.5 rounded-full bg-severity-purple animate-pulse" />
      AI Pick
    </span>
  )
}

export function AssignmentModal({ drift, onClose, onConfirm }: Props) {
  const [assignedTo, setAssignedTo] = useState(ASSIGNEES[0].value)
  const [coAssign, setCoAssign] = useState('none')
  const [responseType, setResponseType] = useState(RESPONSE_TYPES[0].value)
  const [slaDays, setSlaDays] = useState(48)
  const [routeTo, setRouteTo] = useState<'war-room' | 'sales-excellence'>('war-room')
  const [notes, setNotes] = useState(
    `Verify ${drift.metric} data on-ground. Validate causal signals with distributor/field team. Report within 48h.`,
  )
  const [confirmed, setConfirmed] = useState(false)

  const currentAssignee = ASSIGNEES.find((a) => a.value === assignedTo)
  const isAiAssignee = currentAssignee?.aiPick
  const isAiResponse = RESPONSE_TYPES.find((r) => r.value === responseType)?.aiPick

  function handleConfirm() {
    onConfirm?.({ assignedTo, coAssign, responseType, slaDays, notes, routeTo })
    setConfirmed(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white border border-black/[0.10] shadow-xl w-full max-w-[560px] max-h-[90vh] flex flex-col animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.08]">
          <div className="flex items-center gap-2.5">
            <Flame className="h-4 w-4 text-severity-red" />
            <div>
              <div className="text-[13px] font-semibold text-ink">Assignment Workflow</div>
              <div className="text-[10px] font-mono text-ink-3 mt-0.5">
                {drift.id} · {drift.title.slice(0, 46)}{drift.title.length > 46 ? '…' : ''}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="h-6 w-6 flex items-center justify-center cy-hover border border-black/[0.08] text-ink-3">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {confirmed ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-severity-green" />
            <div className="text-[14px] font-medium text-ink">Assignment confirmed</div>
            <div className="text-[11px] text-ink-3 font-mono">
              {drift.id} → {routeTo === 'war-room' ? 'War Room' : 'Sales Excellence'}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* AI suggestion banner */}
            <div className="flex items-start gap-3 bg-severity-purple/[0.05] border border-severity-purple/20 p-3">
              <Zap className="h-4 w-4 text-severity-purple shrink-0 mt-0.5" />
              <div className="text-[11px] text-ink leading-relaxed">
                <span className="font-semibold text-severity-purple">Clarynt AI</span> has pre-filled this assignment based on workload balance, proximity, and resolution history.{' '}
                <span className="font-medium">Override any field if needed.</span>
              </div>
            </div>

            {/* Assign To */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wide text-ink-3">Assign To</label>
                {isAiAssignee && <AiBadge />}
              </div>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={cn(
                  'w-full h-9 px-3 text-[12px] text-ink border outline-none appearance-none bg-white',
                  isAiAssignee
                    ? 'border-severity-purple/40 bg-severity-purple/[0.03]'
                    : 'border-black/[0.12]',
                )}
              >
                {ASSIGNEES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}{a.aiPick ? ' [AI Pick]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Co-assign */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wide text-ink-3 block mb-1.5">
                Co-assign / Notify
              </label>
              <select
                value={coAssign}
                onChange={(e) => setCoAssign(e.target.value)}
                className="w-full h-9 px-3 text-[12px] text-ink border border-black/[0.12] outline-none appearance-none bg-white"
              >
                {CO_ASSIGNEES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Response Type + SLA row */}
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wide text-ink-3">Response Type</label>
                  {isAiResponse && <AiBadge />}
                </div>
                <select
                  value={responseType}
                  onChange={(e) => setResponseType(e.target.value)}
                  className={cn(
                    'w-full h-9 px-3 text-[12px] text-ink border outline-none appearance-none bg-white',
                    isAiResponse
                      ? 'border-severity-purple/40 bg-severity-purple/[0.03]'
                      : 'border-black/[0.12]',
                  )}
                >
                  {RESPONSE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}{r.aiPick ? ' [AI Pick]' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wide text-ink-3 block mb-1.5">SLA</label>
                <select
                  value={slaDays}
                  onChange={(e) => setSlaDays(Number(e.target.value))}
                  className="w-full h-9 px-3 text-[12px] text-ink border border-black/[0.12] outline-none appearance-none bg-white"
                >
                  {SLA_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wide text-ink-3 block mb-1.5">
                Response Brief / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-[12px] text-ink border border-black/[0.12] outline-none resize-none bg-white leading-relaxed"
              />
              <div className="mt-0.5 text-[9px] font-mono text-ink-4 uppercase tracking-wide">
                AI-generated brief · editable
              </div>
            </div>

            {/* Route To */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wide text-ink-3 block mb-1.5">
                Route Action To
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRouteTo('war-room')}
                  className={cn(
                    'border p-3 text-left transition-colors',
                    routeTo === 'war-room'
                      ? 'border-severity-red/50 bg-severity-red/[0.05]'
                      : 'border-black/[0.08] cy-hover',
                  )}
                >
                  <div className={cn('text-[11px] font-mono font-semibold uppercase tracking-wide mb-0.5',
                    routeTo === 'war-room' ? 'text-severity-red' : 'text-ink-2'
                  )}>
                    War Room
                  </div>
                  <div className="text-[10px] text-ink-3">This month · High urgency · Tactical</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRouteTo('sales-excellence')}
                  className={cn(
                    'border p-3 text-left transition-colors',
                    routeTo === 'sales-excellence'
                      ? 'border-severity-amber/50 bg-severity-amber/[0.05]'
                      : 'border-black/[0.08] cy-hover',
                  )}
                >
                  <div className={cn('text-[11px] font-mono font-semibold uppercase tracking-wide mb-0.5',
                    routeTo === 'sales-excellence' ? 'text-severity-amber' : 'text-ink-2'
                  )}>
                    Sales Excellence
                  </div>
                  <div className="text-[10px] text-ink-3">30–180d horizon · Structural</div>
                </button>
              </div>
            </div>

            {/* Assignment chain preview */}
            <div className="border border-black/[0.08] p-3">
              <div className="text-[9px] font-mono uppercase tracking-wide text-ink-3 mb-2">Assignment Chain</div>
              <div className="space-y-1.5">
                {[
                  { role: 'AI', label: 'Clarynt detects drift · generates brief · suggests assignee', done: true },
                  { role: currentAssignee?.label.split(' — ')[0] ?? 'Assignee', label: 'Reviews · confirms or overrides · assigns action type', done: false, active: true },
                  { role: 'Field', label: 'Executes visit · uploads field response', done: false },
                  { role: 'AI', label: 'Context graph updates · NBA re-scores', done: false },
                ].map((step, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 border text-[11px]',
                    step.done ? 'border-severity-green/20 bg-severity-green/[0.03]' : step.active ? 'border-severity-purple/30 bg-severity-purple/[0.04]' : 'border-black/[0.05] opacity-50',
                  )}>
                    <span className={cn(
                      'text-[9px] font-mono font-bold shrink-0 w-14',
                      step.done ? 'text-severity-green' : step.active ? 'text-severity-purple' : 'text-ink-4',
                    )}>
                      {step.role}
                    </span>
                    <span className="flex-1 text-ink-2 leading-snug">{step.label}</span>
                    <span className={cn(
                      'text-[9px] font-mono uppercase tracking-wide shrink-0',
                      step.done ? 'text-severity-green' : step.active ? 'text-severity-purple' : 'text-ink-4',
                    )}>
                      {step.done ? 'Done' : step.active ? 'Pending' : 'Queued'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmed && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-black/[0.08]">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[11px] font-mono uppercase tracking-wide text-ink-3 border border-black/[0.08] cy-hover"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button className="h-9 px-4 text-[11px] font-mono uppercase tracking-wide text-ink border border-black/[0.08] cy-hover">
                Preview Brief
              </button>
              <button
                onClick={handleConfirm}
                className="h-9 px-5 text-[11px] font-mono uppercase tracking-wide bg-ink text-white flex items-center gap-2 cy-hover"
              >
                Confirm Assignment
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
