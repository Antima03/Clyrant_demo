import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { KPI } from '@/types'

interface Props {
  open: boolean
  target: { kind: 'kpi' | 'metric'; id: string; label: string } | null
  /** Optional full KPI to render deltas + sparkline context in the header. */
  kpi?: KPI | null
  onClose: () => void
}

/**
 * Contextual Detail Panel — spec § 4 "click any metric → slide-out panel".
 * Walks the KPI causality chain (Revenue = Reach × Extraction × …).
 * Wired to mock decompositions today; swaps to
 *   GET /landing/decompose?kind=kpi&id=<id> once the backend exposes it.
 */
const DECOMP_ROWS = [
  { dim: 'Region', a: '-14 pp', b: 'EAST, NORTH-2', severity: 'critical' },
  { dim: 'Channel', a: '-6 pp', b: 'GT (-9 pp), MT (+3 pp)', severity: 'warning' },
  { dim: 'Category', a: '-4 pp', b: 'FLITE PU, Diapers', severity: 'warning' },
  { dim: 'Outlet class', a: '-3 pp', b: 'TLP (+1 pp), FLP (-6 pp)', severity: 'info' },
  { dim: 'Distributor', a: '-2 pp', b: 'Top 4 DBs concentrate loss', severity: 'info' },
] as const

const CHAIN = [
  { label: 'Revenue', weight: 100, color: 'bg-ink' },
  { label: 'Reach', weight: 38, color: 'bg-severity-blue' },
  { label: 'Extraction', weight: 42, color: 'bg-severity-blue' },
  { label: 'SKU depth', weight: 12, color: 'bg-severity-blue' },
  { label: 'Pricing', weight: 8, color: 'bg-severity-blue' },
] as const

export function ContextualDetailPanel({ open, target, kpi, onClose }: Props) {
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
          'fixed top-11 bottom-0 right-0 z-50 w-full md:w-[420px]',
          'bg-surface border-l border-black/[0.08] flex flex-col',
          'transition-transform duration-200 will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between px-3 h-10 border-b border-black/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="cy-section-label">
              {target?.kind === 'kpi' ? 'KPI decomposition' : 'Metric decomposition'}
            </span>
            <span className="text-xs text-ink truncate">{target?.label}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="h-6 w-6 flex items-center justify-center cy-hover"
          >
            <X className="h-3.5 w-3.5 text-ink-3" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {kpi && (
            <div className="flex items-end gap-4 pb-2 border-b border-black/[0.06]">
              <div>
                <div className="cy-section-label">Current</div>
                <div
                  className={cn(
                    'text-2xl font-light cy-num',
                    kpi.breach ? 'text-severity-red' : 'text-ink',
                  )}
                >
                  {kpi.value}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                {kpi.deltas.map((d, i) => (
                  <span
                    key={i}
                    className={cn(
                      'text-3xs font-mono cy-num',
                      d.direction === 'up'
                        ? 'text-severity-green'
                        : d.direction === 'down'
                          ? 'text-severity-red'
                          : 'text-ink-3',
                    )}
                  >
                    {d.direction === 'down' ? '▼' : d.direction === 'up' ? '▲' : '•'}{' '}
                    {Math.abs(d.value).toFixed(1)}% <span className="text-ink-4">{d.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Causality chain */}
          <section>
            <div className="cy-section-label mb-1">Causality chain</div>
            <p className="text-[11px] text-ink-3 mb-2">
              Revenue = Reach × Extraction × SKU depth × Pricing. Bars show relative
              contribution to the period's movement.
            </p>
            <ul className="space-y-1">
              {CHAIN.map((row) => (
                <li key={row.label} className="flex items-center gap-2">
                  <span className="w-20 text-[11px] text-ink">{row.label}</span>
                  <div className="flex-1 h-2 bg-black/[0.04]">
                    <div
                      className={cn(row.color, 'h-full opacity-80')}
                      style={{ width: `${row.weight}%` }}
                    />
                  </div>
                  <span className="w-8 text-2xs font-mono text-ink-3 cy-num text-right">
                    {row.weight}%
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Causal dimension decomposition */}
          <section>
            <div className="cy-section-label mb-1">Causal attribution</div>
            <table className="w-full text-[11px] cy-num">
              <thead>
                <tr className="text-left text-2xs font-mono text-ink-4 uppercase tracking-wide">
                  <th className="font-normal py-1">Dimension</th>
                  <th className="font-normal py-1">Δ</th>
                  <th className="font-normal py-1">Driver</th>
                </tr>
              </thead>
              <tbody>
                {DECOMP_ROWS.map((r) => (
                  <tr key={r.dim} className="border-t border-black/[0.04]">
                    <td className="py-1.5 text-ink">{r.dim}</td>
                    <td
                      className={cn(
                        'py-1.5 font-mono',
                        r.severity === 'critical' && 'text-severity-red',
                        r.severity === 'warning' && 'text-severity-amber',
                        r.severity === 'info' && 'text-ink-3',
                      )}
                    >
                      {r.a}
                    </td>
                    <td className="py-1.5 text-ink-2">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Linked findings stub */}
          <section>
            <div className="cy-section-label mb-1">Linked drifts</div>
            <p className="text-[11px] text-ink-3">
              2 Category A + 1 Category B drift reference this metric. See Drift Panel →
              filter “Cat A / Cat B”.
            </p>
          </section>
        </div>
      </aside>
    </>
  )
}
