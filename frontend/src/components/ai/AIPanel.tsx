import { useState } from 'react'
import { MessageSquare, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AIPanelProps {
  open: boolean
  onClose: () => void
}

/**
 * AIPanel — slide-out panel opened by the Ask AI FAB (spec § 8).
 * Mock-only today; the thread wires to `/api/ai/ask` once the agent is available.
 */
const SUGGESTED = [
  'Why is North-2 secondary declining?',
  'Decompose Sales vs Target gap by region',
  'Top 5 distributors driving pipeline stuffing',
  'Show me outlet churn by town class',
]

export function AIPanel({ open, onClose }: AIPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])

  const send = (text: string) => {
    if (!text.trim()) return
    setMessages((m) => [
      ...m,
      { role: 'user', text },
      {
        role: 'ai',
        text:
          'Mock response — the AI agent routes through the drift engine + L2 cubes once wired. This panel is the UI seam (see `src/components/ai/AIPanel.tsx`).',
      },
    ])
    setInput('')
  }

  return (
    <>
      {open && (
        <button
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/10 md:bg-transparent md:pointer-events-none animate-fade-in"
        />
      )}
      <aside
        className={cn(
          'fixed top-11 bottom-0 right-0 z-50 w-full md:w-[360px]',
          'bg-surface border-l border-black/[0.08] flex flex-col',
          'transition-transform duration-200 will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between px-3 h-10 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-ink" />
            <span className="cy-section-label">Ask AI</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI Panel"
            className="h-6 w-6 flex items-center justify-center cy-hover"
          >
            <X className="h-3.5 w-3.5 text-ink-3" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs text-ink-2">
                <MessageSquare className="h-3.5 w-3.5 text-ink-3 mt-0.5" />
                <p>
                  Ask about any KPI, drift, or geography. I'll walk the causality
                  chain and surface the linked findings.
                </p>
              </div>
              <div>
                <div className="cy-section-label mb-1">Try</div>
                <ul className="space-y-1">
                  {SUGGESTED.map((s) => (
                    <li key={s}>
                      <button
                        onClick={() => send(s)}
                        className="w-full text-left text-xs text-ink border border-black/[0.06] px-2 py-1.5 cy-hover"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[90%] text-xs px-2 py-1.5 border',
                  m.role === 'user'
                    ? 'ml-auto bg-black/[0.03] border-black/[0.06] text-ink'
                    : 'mr-auto bg-surface border-black/[0.06] text-ink-2',
                )}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="border-t border-black/[0.06] p-2 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Clarynt…"
            className="flex-1 bg-transparent outline-none text-xs font-sans px-2 h-8 border border-black/[0.08] placeholder:text-ink-4"
          />
          <button
            type="submit"
            aria-label="Send"
            className="h-8 w-8 bg-ink text-white flex items-center justify-center hover:bg-ink-2"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </aside>
    </>
  )
}
