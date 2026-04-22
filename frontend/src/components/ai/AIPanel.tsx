import { useRef, useState, useEffect } from 'react'
import {
  X,
  Send,
  Camera,
  Mic,
  MapPin,
  MessageSquare as WhatsAppIcon,
  CalendarClock,
  ArrowUpRight,
  Plus,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useView, SCREEN_META } from '@/context/ViewContext'
import { SCREEN_AI_CTX, type AIScreenCtx } from './screenContext'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'context' | 'actions'

interface Message {
  role: 'user' | 'ai'
  text: string
  time: string
}

interface ActionLogEntry {
  id: string
  label: string
  time: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function getMockReply(q: string, screenId: string): string {
  const lower = q.toLowerCase()

  if (lower.includes('secondary') || lower.includes('sec:pri') || lower.includes('pipeline'))
    return 'Secondary in North-2 is down 4.1pp vs LYSM. Primary signal: 3 distributors with Sec:Pri below 45% — CID-F4EC leads at 26%. Recommend beat audit + scheme adjustment.'

  if (lower.includes('reach') || lower.includes('outlet') || lower.includes('churn'))
    return 'Reach erosion concentrated in Maharashtra (−110 outlets) and Gujarat (−82). Urban GT class is primary drop zone. DA-01 is the linked finding — open it for full decomposition.'

  if (lower.includes('da-03') || lower.includes('zsm') || lower.includes('brief') || lower.includes('summar'))
    return 'DA-03 brief: Pipeline stuffing at CID-F4EC3791 for 2 months. Sec:Pri 26% vs 45–55% norm. ₹2.1L impact. AI confidence 91%. Recommendation: stop-supply + scheme adjustment. Assigned to P. Gupta, SLA 48h.'

  if (lower.includes('distributor') || lower.includes('stuffing'))
    return 'Top 3 stuffing distributors: CID-F4EC3791 (Sec:Pri 26%), CID-A8271B04 (58%), CID-B7432D09 (61%). All in West zone, Diapers category.'

  if (lower.includes('target') || lower.includes('breach'))
    return 'Sales vs Target is breaching at 68% pace MTD. North-2 and Central are the primary drag zones — combined shortfall of ₹12.4Cr. Three SOs show zero productivity this week.'

  if (lower.includes('region') || lower.includes('zone') || lower.includes('geo'))
    return 'West zone leads active drift count (9 drifts, 4 critical). North-2 has the sharpest Sec:Pri deterioration. South is on-pace for target — no critical alerts.'

  if (lower.includes('war room') || lower.includes('action') || lower.includes('escalat'))
    return 'War Room has 6 open actions. Stop-supply memo for CID-F4EC3791 is due today. Beat audit W8 is in-progress with P. Gupta. 3 actions are awaiting distributor response.'

  if (lower.includes('so') || lower.includes('productivity') || lower.includes('beat'))
    return '4 SOs are critically below threshold: productive call rate <50%, zero billing on 3 beats today. SFA adoption in South dropped 12% vs L3M — coaching sprint recommended.'

  if (lower.includes('outstanding') || lower.includes('collection') || lower.includes('credit'))
    return '₹8.2L at risk across 4 distributors with >30d outstanding. CID-F4EC3791 holds 41% of the exposure. Finance has a credit hold under review — legal escalation pending.'

  if (lower.includes('promo') || lower.includes('scheme') || lower.includes('uplift'))
    return 'Diapers Q4 promo at 42% target uplift vs 50% plan. Participation rate 38% vs 60% target. Course-correction window: 14 days remaining. Visibility kit deployment 61% complete.'

  if (lower.includes('whitespace') || lower.includes('town') || lower.includes('untapped'))
    return '27 under-penetrated towns identified with demand index >P75 but ND% <20%. Top 5 towns represent ₹6.8L addressable. SD rebalance would unlock 4 of them without new headcount.'

  if (lower.includes(screenId.toLowerCase()))
    return `Analysing ${SCREEN_META[screenId as keyof typeof SCREEN_META]?.title ?? 'this screen'} data… 2 active findings match your query scope. Want me to pull the decomposition or draft an action?`

  return 'Analysing across drift engine and L2 cubes… The pattern connects to 2 open findings in your current scope. Want me to pull the decomposition?'
}

// ─── Chat Tab ────────────────────────────────────────────────────────────────

function ChatTab({ ctx, driftLabel }: { ctx: AIScreenCtx; driftLabel: string | null }) {
  const { screen } = useView()

  const seedMsg = driftLabel
    ? `Scoped to ${driftLabel}. Ask anything — I have the full finding context, linked drifts, assignee history, and impact forecast.`
    : ctx.seedMessage

  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: seedMsg, time: '07:42 AM' },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Reset chat when screen changes
  useEffect(() => {
    const newSeed = driftLabel
      ? `Scoped to ${driftLabel}. Ask anything — I have the full finding context, linked drifts, assignee history, and impact forecast.`
      : ctx.seedMessage
    setMessages([{ role: 'ai', text: newSeed, time: now() }])
    setInput('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, driftLabel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(text: string) {
    if (!text.trim()) return
    const t = now()
    setMessages((m) => [
      ...m,
      { role: 'user', text, time: t },
      { role: 'ai', text: getMockReply(text, screen), time: now() },
    ])
    setInput('')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex flex-col gap-0.5', m.role === 'user' ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                'max-w-[88%] text-[12.5px] leading-relaxed px-3 py-2',
                m.role === 'user'
                  ? 'bg-ink text-white'
                  : 'bg-black/[0.04] text-ink border border-black/[0.06]',
              )}
            >
              {m.text}
            </div>
            <span className="text-[9px] font-mono text-ink-4">{m.time}</span>
          </div>
        ))}

        {messages.length === 1 && (
          <div className="space-y-1 pt-1">
            {ctx.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-[11.5px] text-ink-2 border border-black/[0.07] px-3 py-2 cy-hover flex items-center justify-between gap-2"
              >
                <span>{s}</span>
                <ChevronRight className="h-3 w-3 text-ink-4 shrink-0" />
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="shrink-0 border-t border-black/[0.07] flex items-center gap-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Clarynt AI…"
          className="flex-1 bg-transparent outline-none text-[12px] px-3 h-10 placeholder:text-ink-4 text-ink"
        />
        <button
          type="submit"
          className="h-10 w-10 shrink-0 bg-ink text-white flex items-center justify-center hover:bg-ink/80 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}

// ─── Context Tab ─────────────────────────────────────────────────────────────

function ContextTab({ ctx, screenId, driftLabel }: {
  ctx: AIScreenCtx
  screenId: string
  driftLabel: string | null
}) {
  const meta = SCREEN_META[screenId as keyof typeof SCREEN_META]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">

      {/* Screen scope banner */}
      <div className="border-l-2 border-ink pl-3 py-0.5">
        <div className="text-[12px] font-semibold text-ink">{meta?.title ?? screenId}</div>
        <div className="text-[10px] text-ink-3 font-mono">{meta?.subtitle}</div>
        {driftLabel && (
          <div className="mt-1 text-[10px] font-mono text-severity-purple">Drift scoped: {driftLabel}</div>
        )}
      </div>

      {/* KPI Highlights */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-4 mb-2">KPI snapshot</div>
        <div className="grid grid-cols-2 gap-1.5">
          {ctx.kpiHighlights.map((k) => (
            <div
              key={k.label}
              className={cn(
                'px-2.5 py-2 border',
                k.breach ? 'border-severity-red/30 bg-severity-red/[0.04]' : 'border-black/[0.07]',
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9.5px] font-mono text-ink-4 uppercase tracking-wider">{k.label}</span>
                {k.breach
                  ? <TrendingDown className="h-2.5 w-2.5 text-severity-red" />
                  : <TrendingUp className="h-2.5 w-2.5 text-severity-green" />
                }
              </div>
              <div className={cn('text-[14px] font-semibold', k.breach ? 'text-severity-red' : 'text-ink')}>
                {k.value}
              </div>
              <div className="text-[10px] text-ink-3 font-mono">{k.delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* People */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-4 mb-2">People on this</div>
        <div className="space-y-0">
          {ctx.people.map((p) => (
            <div key={p.name} className="flex items-center justify-between py-2 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', p.online ? 'bg-severity-green' : 'bg-ink/[0.15]')} />
                <div>
                  <div className="text-[12px] font-medium text-ink">{p.name}</div>
                  <div className="text-[10px] text-ink-4 font-mono">{p.role} · {p.territory}</div>
                </div>
              </div>
              {p.activity && (
                <span className="text-[10px] text-ink-3 text-right max-w-[110px] leading-snug">{p.activity}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Session trail */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-4 mb-1.5">Session</div>
        <div className="text-[11.5px] text-ink-2 leading-relaxed">
          {driftLabel
            ? `Context locked to ${driftLabel}. Navigate away to unlock.`
            : `Viewing ${meta?.title ?? screenId}. Open a drift to get scoped insight.`}
        </div>
      </div>
    </div>
  )
}

// ─── Actions Tab ─────────────────────────────────────────────────────────────

function ActionsTab({ ctx }: { ctx: AIScreenCtx }) {
  const [note, setNote] = useState('')
  const [log, setLog] = useState<ActionLogEntry[]>([])

  function addToLog(label: string) {
    setLog((l) => [{ id: crypto.randomUUID(), label, time: now() }, ...l])
  }

  function toneIcon(tone?: 'red' | 'amber' | 'normal') {
    if (tone === 'red') return <ArrowUpRight className="h-3.5 w-3.5 text-severity-red" />
    if (tone === 'amber') return <ShieldAlert className="h-3.5 w-3.5 text-severity-amber" />
    return <Minus className="h-3.5 w-3.5 text-ink-3" />
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">

      {/* Field actions */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-4 mb-2">Field actions</div>

        <div className="flex items-center gap-0 border border-black/[0.10] mb-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type a field note…"
            className="flex-1 bg-transparent text-[12px] text-ink px-3 h-9 outline-none placeholder:text-ink-4"
          />
          <button
            onClick={() => { if (note.trim()) { addToLog(`Note: "${note.trim()}"`) ; setNote('') } }}
            className="h-9 px-4 bg-ink text-white text-[11px] font-mono uppercase tracking-wide hover:bg-ink/80 transition-colors shrink-0"
          >
            Add
          </button>
        </div>

        {/* Quick capture */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { icon: <Camera className="h-3.5 w-3.5" />, label: 'Photo',    key: 'photo'    },
            { icon: <Mic className="h-3.5 w-3.5" />,    label: 'Voice',    key: 'voice'    },
            { icon: <MapPin className="h-3.5 w-3.5" />, label: 'Location', key: 'location' },
            { icon: <WhatsAppIcon className="h-3.5 w-3.5" />, label: 'WhatsApp', key: 'whatsapp' },
          ].map((a) => (
            <button
              key={a.key}
              onClick={() => addToLog(`${a.label} captured`)}
              className="flex flex-col items-center gap-1 py-2 border border-black/[0.08] text-ink-3 cy-hover hover:text-ink transition-colors"
            >
              {a.icon}
              <span className="text-[9px] font-mono">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Screen-specific quick actions */}
        {ctx.fieldActions.map((action) => (
          <button
            key={action}
            onClick={() => addToLog(action)}
            className="flex items-center justify-between w-full py-2 border-b border-black/[0.05] cy-hover"
          >
            <div className="flex items-center gap-2 text-[12px] text-ink">
              <CalendarClock className="h-3.5 w-3.5 text-ink-3" />
              {action}
            </div>
            <Plus className="h-3.5 w-3.5 text-ink-3" />
          </button>
        ))}
      </div>

      {/* War room / escalation actions */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-4 mb-1">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            Escalations &amp; commands
          </span>
        </div>
        <div className="space-y-0">
          {ctx.warRoomActions.map((a) => (
            <button
              key={a.key}
              onClick={() => addToLog(a.label)}
              className="flex items-center justify-between w-full py-2.5 border-b border-black/[0.06] cy-hover group"
            >
              <span className={cn(
                'text-[12px]',
                a.tone === 'red' ? 'text-severity-red' : a.tone === 'amber' ? 'text-severity-amber' : 'text-ink',
              )}>
                {a.label}
              </span>
              <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                {toneIcon(a.tone)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Action log */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-4 mb-1.5">
          Action log ({log.length})
        </div>
        {log.length === 0 ? (
          <div className="text-[11px] text-ink-4">No actions taken this session</div>
        ) : (
          <div className="space-y-1">
            {log.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-[11px]">
                <span className="text-ink-2">{e.label}</span>
                <span className="text-[9px] font-mono text-ink-4">{e.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel shell ──────────────────────────────────────────────────────────────

interface AIPanelProps {
  open: boolean
  onClose: () => void
}

export function AIPanel({ open, onClose }: AIPanelProps) {
  const [tab, setTab] = useState<Tab>('chat')
  const { screen, selectedDrift } = useView()

  const ctx = SCREEN_AI_CTX[screen]
  const meta = SCREEN_META[screen]
  const driftLabel = selectedDrift ? `${selectedDrift.id} · ${selectedDrift.title}` : null

  const TABS: { id: Tab; label: string }[] = [
    { id: 'chat',    label: 'Chat'    },
    { id: 'context', label: 'Context' },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/10 md:bg-transparent md:pointer-events-none"
        />
      )}

      <aside
        className={cn(
          'fixed top-11 bottom-0 right-0 z-50 w-full md:w-[300px]',
          'bg-white border-l border-black/[0.09] flex flex-col',
          'transition-transform duration-200 will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-3.5 pb-0 border-b border-black/[0.07]">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <span className="text-[13.5px] font-semibold text-ink tracking-tight">Clarynt AI</span>
              <div className="text-[9.5px] font-mono text-ink-4 mt-0.5 truncate max-w-[180px]">
                {meta?.title ?? screen}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-severity-green">
                <span className="h-1.5 w-1.5 rounded-full bg-severity-green animate-pulse" />
                live
              </span>
              <button
                onClick={onClose}
                className="h-5 w-5 flex items-center justify-center cy-hover text-ink-4 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Drift scope pill */}
          {driftLabel && (
            <div className="mb-1.5 px-2 py-1 bg-severity-purple/10 border border-severity-purple/20 text-[10px] font-mono text-severity-purple truncate">
              {driftLabel}
            </div>
          )}

          {/* Tabs */}
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 pb-2.5 text-[12px] font-medium transition-colors border-b-2',
                  tab === t.id
                    ? 'text-ink border-ink'
                    : 'text-ink-4 border-transparent hover:text-ink-2',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'chat'    && <ChatTab    ctx={ctx} driftLabel={driftLabel} />}
          {tab === 'context' && <ContextTab ctx={ctx} screenId={screen} driftLabel={driftLabel} />}
          {tab === 'actions' && <ActionsTab ctx={ctx} />}
        </div>
      </aside>
    </>
  )
}
