import { useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  History,
  MessageSquare,
  Share2,
  Wrench,
  X,
} from 'lucide-react'
import type { Drift } from '@/types'
import { Card } from '@/components/ui/Card'
import { FindingDetailViz } from './FindingDetailViz'
import { DriftHistory } from './DriftHistory'
import { useView, SCREEN_META } from '@/context/ViewContext'
import { useFilters } from '@/context/FiltersContext'
import { useAsync } from '@/hooks/useAsync'
import { landingService } from '@/services/landing'
import { cn } from '@/utils/cn'

interface Props {
  drift: Drift
  onBack: () => void
  onOpenTargetScreen?: (drift: Drift) => void
  onShare?: (drift: Drift) => void
  onDiscuss?: (drift: Drift) => void
  onResolve?: (drift: Drift) => void
  onEscalate?: (drift: Drift) => void
}

// ─── Action-rail button ──────────────────────────────────────────────
// A single CTA row anchored at the bottom of the drift detail. Uses the
// neutral Clarynt button treatment — hairline border, zero radius, mono
// text — with a single "escalate" variant that picks up the war-room
// accent (severity-purple) to match the lifecycle pill used elsewhere.
interface ActionButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  hint?: string
  tone?: 'neutral' | 'escalate'
  onClick?: () => void
}
function ActionButton({ icon: Icon, label, hint, tone = 'neutral', onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 h-9 px-3 cy-hover border transition-colors',
        'text-xs font-mono uppercase tracking-wide min-w-0',
        tone === 'escalate'
          ? 'border-severity-purple/40 text-severity-purple hover:bg-severity-purple/[0.05]'
          : 'border-black/[0.08] text-ink hover:bg-black/[0.02]',
      )}
      title={hint}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', tone === 'escalate' && 'text-severity-purple')} />
      <span className="truncate">{label}</span>
    </button>
  )
}

const rowCls = 'flex items-start gap-3 py-2 border-b border-black/[0.04] text-xs'

// ─── Lifecycle timeline ─────────────────────────────────────────────
// Maps the drift's `lifecycle` value onto a canonical 5-step progression
// so every finding shows the same horizontal story: Discovered → Viewed →
// Discussed → Escalated → Resolved.
//
// `done` = step is in the past (green tick), `active` = current step
// (filled accent dot), `pending` = future (hairline ring).
type StepState = 'done' | 'active' | 'pending'

const LIFECYCLE_ORDER: Record<Drift['lifecycle'], number> = {
  new: 0,          // just discovered
  viewed: 1,       // user opened it
  discussed: 2,    // comment / note added
  escalated: 3,    // promoted
  'war-room': 3,   // war-room is a flavour of escalated
  sustained: 1,    // persistent but not yet discussed
  monitoring: 4,   // acknowledged, watching
  resolving: 4,    // in-flight resolution
  resolved: 4,     // closed
}

// ─── Related drifts ─────────────────────────────────────────────────
// Scores every other drift by how many causal dimensions it shares with
// the subject drift, plus a small bonus for overlapping geography.
// Used to surface a "drifts with overlapping signals" strip at the
// bottom of the detail — lets the user traverse the drift graph instead
// of returning to the list.
function scoreRelation(subject: Drift, other: Drift): number {
  if (other.id === subject.id) return 0
  let score = 0
  const a = subject.causalDims
  const b = other.causalDims
  if (a.category && b.category && a.category === b.category) score += 3
  if (a.channel && b.channel && a.channel === b.channel) score += 2
  if (a.distributor && b.distributor && a.distributor === b.distributor) score += 4
  if (a.territoryOwner && b.territoryOwner && a.territoryOwner === b.territoryOwner) score += 3
  if (a.outletClass && b.outletClass && a.outletClass === b.outletClass) score += 2
  // Geography overlap: tokenize on spaces / dots / slashes and intersect
  const tokenise = (s: string) =>
    new Set(
      s
        .toUpperCase()
        .split(/[\s·/,-]+/)
        .filter((t) => t.length > 1),
    )
  const aTokens = tokenise(subject.geography)
  const bTokens = tokenise(other.geography)
  for (const t of aTokens) if (bTokens.has(t)) score += 1
  return score
}

function RelatedDriftRow({
  drift,
  onClick,
}: {
  drift: Drift
  onClick: () => void
}) {
  const severityDot =
    drift.severity === 'critical'
      ? 'bg-severity-red'
      : drift.severity === 'warning'
        ? 'bg-severity-amber'
        : 'bg-ink-3'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 border border-black/[0.08]',
        'cy-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/30',
      )}
    >
      <div className="flex items-center gap-2 text-2xs font-mono uppercase tracking-wide">
        <span className="text-ink-2 font-semibold">{drift.id}</span>
        <span className={cn('h-1.5 w-1.5 rounded-full', severityDot)} />
        <span className="text-ink-3">{drift.severity}</span>
        <span className="text-ink-4 ml-auto">{drift.sustainedFor}</span>
      </div>
      <div className="mt-1 text-[12px] leading-snug text-ink font-medium line-clamp-2">
        {drift.title}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-3xs font-mono text-ink-3 cy-num">
        <span className="truncate">{drift.geography}</span>
        <span className="text-ink-2">{drift.impactInr}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-3xs font-mono text-ink-4">
        <ArrowRight className="h-2.5 w-2.5" />
        <span className="truncate">Open finding</span>
      </div>
    </button>
  )
}

function LifecycleTimeline({ drift }: { drift: Drift }) {
  const currentStep = LIFECYCLE_ORDER[drift.lifecycle]
  const steps: { key: string; label: string }[] = [
    { key: 'discovered', label: 'Discovered' },
    { key: 'viewed', label: 'Viewed' },
    { key: 'discussed', label: 'Discussed' },
    { key: 'escalated', label: 'Escalated' },
    { key: 'resolved', label: 'Resolved' },
  ]

  const stateFor = (idx: number): StepState => {
    if (idx < currentStep) return 'done'
    if (idx === currentStep) return 'active'
    return 'pending'
  }

  return (
    <div className="mt-2 flex items-center gap-1.5">
      {steps.map((s, i) => {
        const state = stateFor(i)
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            {/* Dot */}
            <div
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                state === 'done' && 'bg-severity-green',
                state === 'active' && 'bg-severity-blue ring-2 ring-severity-blue/20',
                state === 'pending' && 'border border-ink-4',
              )}
            />
            {/* Label */}
            <span
              className={cn(
                'ml-1.5 text-[9px] font-mono uppercase tracking-wide truncate',
                state === 'done' && 'text-ink-2',
                state === 'active' && 'text-ink font-medium',
                state === 'pending' && 'text-ink-4',
              )}
            >
              {s.label}
            </span>
            {/* Connector (not after last) */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 mx-1.5 h-px',
                  state === 'done' ? 'bg-severity-green/40' : 'bg-ink-4/40',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * FindingDetail — spec § 4 + § 6.
 * Replaces the main column when a drift card is clicked. Shows:
 *   - one-liner summary + meta
 *   - Where / When / What / Why decomposition
 *   - "So what" — target screen (Cat A) or target action (Cat B)
 *   - Org-context-graph notes (mock)
 *   - Action rail (Share · Discuss · Resolve · Escalate to War Room)
 */
export function FindingDetail({
  drift,
  onBack,
  onOpenTargetScreen,
  onShare,
  onDiscuss,
  onResolve,
}: Props) {
  const { filters } = useFilters()
  const { openDrift, openAssignment } = useView()
  const [historyOpen, setHistoryOpen] = useState(false)
  const driftsQuery = useAsync(() => landingService.drifts(filters), [filters])

  // Derive "other drifts with overlapping signals" — top 4 by relation score.
  // Empty when the catalogue hasn't loaded yet or nothing overlaps enough.
  const relatedDrifts = (driftsQuery.data ?? [])
    .map((d) => ({ d, score: scoreRelation(drift, d) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.d)

  const mockNotes = [
    {
      author: 'ASM-East-03',
      channel: 'whatsapp',
      text: 'Two distributors switched to competitor last month; third has credit dispute.',
      time: '2d ago',
    },
    {
      author: 'RSM-East',
      channel: 'call',
      text: 'Discussed in weekly review. Hold fresh billing at DB-0412 till credit clears.',
      time: '5d ago',
    },
  ]

  const causalEntries = Object.entries(drift.causalDims).filter(([, v]) => !!v)

  return (
    <div className="h-full p-2.5 overflow-y-auto">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-3xs font-mono text-ink-3 uppercase tracking-wide cy-hover px-1 py-1"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onShare?.(drift)}
            className="flex items-center gap-1 text-3xs font-mono text-ink uppercase tracking-wide border border-black/[0.08] px-2 h-6 cy-hover"
          >
            <Share2 className="h-3 w-3" /> Share
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1 text-3xs font-mono text-ink uppercase tracking-wide border border-black/[0.08] px-2 h-6 cy-hover"
          >
            <History className="h-3 w-3" /> History
          </button>
          <button
            onClick={() => openAssignment(drift)}
            className="flex items-center gap-1 text-3xs font-mono text-severity-purple uppercase tracking-wide border border-severity-purple/40 px-2 h-6 cy-hover bg-severity-purple/[0.04]"
          >
            <Flame className="h-3 w-3" /> Assign
          </button>
          <button
            onClick={onBack}
            aria-label="Close"
            className="h-6 w-6 flex items-center justify-center cy-hover border border-black/[0.08]"
          >
            <X className="h-3 w-3 text-ink-3" />
          </button>
        </div>
      </div>

      {/* Title block */}
      <div className="mb-3 pb-2 border-b border-black/[0.06]">
        <div className="flex items-center gap-2 text-2xs font-mono text-ink-3 uppercase tracking-wide">
          <span className="text-ink-2 font-medium">{drift.id}</span>
          <span
            className={cn(
              'px-1 py-px border text-[8px]',
              drift.category === 'A'
                ? 'border-black/20 text-ink-2'
                : 'border-severity-purple/60 text-severity-purple',
            )}
          >
            CAT {drift.category}
          </span>
          <span
            className={cn(
              drift.severity === 'critical' && 'text-severity-red',
              drift.severity === 'warning' && 'text-severity-amber',
              drift.severity === 'info' && 'text-ink-3',
            )}
          >
            {drift.severity}
          </span>
          <span className="text-ink-4">·</span>
          <span>{drift.lifecycle}</span>
          <span className="text-ink-4">·</span>
          <span>{drift.sustainedFor}</span>
        </div>
        <h2 className="mt-1 text-base text-ink font-medium">{drift.title}</h2>
        <div className="mt-1 text-2xs font-mono text-ink-4 cy-num">
          Impact <span className="text-ink-2">{drift.impactInr}</span>
          <span className="mx-1">·</span>
          Trend <span className="text-ink-2">{drift.trend}</span>
          <span className="mx-1">·</span>
          Confidence <span className="text-ink-2">{drift.confidence}%</span>
        </div>

      </div>

      {/* Rule-specific rich visualisation — renders a generic fallback
          view when no specific findingDetail is attached. */}
      <FindingDetailViz drift={drift} />

      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-2.5">
        {/* Decomposition */}
        <Card label="Spatio-Temporal-Causal Decomposition">
          <div className="text-2xs font-mono text-ink-3 uppercase tracking-wide pb-1">
            Five-property breakdown (spec § 3)
          </div>

          <div className={rowCls}>
            <span className="w-16 text-2xs font-mono text-ink-3 uppercase tracking-wide">
              Where
            </span>
            <span className="text-ink flex-1">{drift.geography}</span>
          </div>
          <div className={rowCls}>
            <span className="w-16 text-2xs font-mono text-ink-3 uppercase tracking-wide">
              When
            </span>
            <span className="text-ink flex-1">{drift.sustainedFor}</span>
          </div>
          <div className={rowCls}>
            <span className="w-16 text-2xs font-mono text-ink-3 uppercase tracking-wide">
              What
            </span>
            <span className="text-ink flex-1">
              {drift.metric} — {drift.trend}
            </span>
          </div>
          <div className={rowCls}>
            <span className="w-16 text-2xs font-mono text-ink-3 uppercase tracking-wide">
              Why
            </span>
            <span className="flex-1">
              {causalEntries.length === 0 ? (
                <span className="text-ink-3">No causal breakdown available.</span>
              ) : (
                <ul className="flex flex-wrap gap-1">
                  {causalEntries.map(([k, v]) => (
                    <li
                      key={k}
                      className="text-[10px] font-mono border border-black/[0.08] px-1.5 py-0.5 text-ink"
                    >
                      <span className="text-ink-3">{k}</span>
                      <span className="text-ink-4 mx-1">·</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </span>
          </div>
          <div className="flex items-start gap-3 py-2 text-xs">
            <span className="w-16 text-2xs font-mono text-ink-3 uppercase tracking-wide">
              So what
            </span>
            {drift.category === 'A' ? (
              <button
                onClick={() => onOpenTargetScreen?.(drift)}
                className="flex-1 flex items-center justify-between gap-2 px-2 h-8 border border-black/[0.08] cy-hover text-ink"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-2xs font-mono text-ink-3 uppercase tracking-wide">
                    Drill →
                  </span>
                  <span>
                    {drift.targetScreen
                      ? `${drift.targetScreen} · ${SCREEN_META[drift.targetScreen].title}`
                      : '—'}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-ink-3" />
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-2 px-2 h-8 border border-severity-purple/40">
                <Wrench className="h-3.5 w-3.5 text-severity-purple" />
                <span className="flex-1 text-ink">
                  {drift.targetAction?.module ?? drift.targetAction?.agent ?? '—'}
                </span>
                <span className="text-[9px] font-mono text-severity-purple uppercase tracking-wide">
                  {drift.targetAction?.actionType ?? 'war room'}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Context graph notes */}
        <Card
          label="Context graph"
          meta={`${drift.notesCount ?? 0} notes`}
        >
          <div className="space-y-2">
            {mockNotes.map((n, i) => (
              <div key={i} className="border-l-2 border-black/[0.06] pl-2">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-ink-3 uppercase tracking-wide">
                  <MessageSquare className="h-2.5 w-2.5" />
                  <span className="text-ink-2">{n.author}</span>
                  <span className="text-ink-4">·</span>
                  <span>{n.channel}</span>
                  <span className="text-ink-4">·</span>
                  <span>{n.time}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink leading-snug">{n.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-black/[0.06]">
            <input
              placeholder="Add a note, voice transcript, or tag…"
              className="w-full h-8 px-2 text-xs border border-black/[0.08] bg-transparent outline-none placeholder:text-ink-4"
            />
            <div className="mt-1 text-[9px] font-mono text-ink-4 uppercase tracking-wide">
              Tags back to `finding_context` · spec § 6
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Related drifts ────────────────────────────────────────────
          Other findings that share causal signals (category, distributor,
          channel, territory-owner, outlet-class, or geography tokens) with
          the subject drift. Lets the user traverse the drift graph — often
          a cluster of related drifts tells a clearer story than any one.
          Hidden when the catalogue has no overlapping entries. */}
      {relatedDrifts.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-black/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="cy-section-label">
              Drifts with overlapping signals
            </span>
            <span className="text-3xs font-mono text-ink-3 uppercase tracking-wide">
              {relatedDrifts.length} related · ranked by overlap
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {relatedDrifts.map((r) => (
              <RelatedDriftRow
                key={r.id}
                drift={r}
                onClick={() => openDrift(r)}
              />
            ))}
          </div>
        </div>
      )}

      {/* History slide-in */}
      {historyOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setHistoryOpen(false)} />
          <DriftHistory drift={drift} onClose={() => setHistoryOpen(false)} />
        </>
      )}
    </div>
  )
}
