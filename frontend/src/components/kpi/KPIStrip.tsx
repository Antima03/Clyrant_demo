import { useMemo, useState } from 'react'
import type { KPI, KPIGroup } from '@/types'
import { KPITile } from './KPITile'
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu'
import { ArrowDownToLine, MessageSquare, Share2, Wrench } from 'lucide-react'

interface Props {
  kpis: KPI[]
  /** Invoked when the user picks "Drill" from the KPI context menu. */
  onTileClick?: (kpi: KPI) => void
}

const GROUPS: KPIGroup[] = ['PRIMARY', 'SECONDARY', 'TERTIARY']

/**
 * KPI Strip — spec § 4. Three ordered groups separated by hairline divider.
 * Group label sits above its tile cluster in 8px mono uppercase.
 */
export function KPIStrip({ kpis, onTileClick }: Props) {
  const grouped = useMemo(() => {
    const byGroup: Record<KPIGroup, KPI[]> = { PRIMARY: [], SECONDARY: [], TERTIARY: [] }
    for (const k of kpis) byGroup[k.group].push(k)
    return byGroup
  }, [kpis])

  const [menu, setMenu] = useState<{
    x: number
    y: number
    kpi: KPI | null
  }>({ x: 0, y: 0, kpi: null })

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, kpi: KPI) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMenu({ x: r.left, y: r.bottom + 4, kpi })
  }
  const closeMenu = () => setMenu((m) => ({ ...m, kpi: null }))

  const menuItems: ContextMenuItem[] = [
    {
      id: 'drill',
      label: 'Drill down',
      icon: <ArrowDownToLine className="h-3 w-3" />,
      onSelect: () => menu.kpi && onTileClick?.(menu.kpi),
    },
    { id: 'ai', label: 'Ask AI', icon: <MessageSquare className="h-3 w-3" /> },
    { id: 'action', label: 'Take action', icon: <Wrench className="h-3 w-3" /> },
    { id: 'share', label: 'Share', icon: <Share2 className="h-3 w-3" /> },
  ]

  return (
    <div className="bg-surface border-b border-black/[0.08] flex-shrink-0 w-full">
      {/* Mobile: horizontal scroll preserves fixed-width tile readability.
          Desktop (md+): strip stretches to full viewport; groups + tiles
          inside flex proportionally to tile count so every tile stays
          the same width regardless of how many sit in each group. */}
      <div className="flex overflow-x-auto md:overflow-visible w-full">
        {GROUPS.map((g, gi) => {
          const count = grouped[g].length
          if (count === 0) return null
          return (
            <div
              key={g}
              className="flex items-stretch min-w-max md:min-w-0"
              style={{ flex: `${count} 1 0%` }}
            >
              {/* Group label + tiles */}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="px-3 pt-1.5 text-2xs font-mono font-semibold uppercase tracking-wider text-ink-3">
                  {g}
                </div>
                <div className="flex items-stretch flex-1">
                  {grouped[g].map((k) => (
                    <KPITile key={k.id} kpi={k} onClick={(e) => openMenu(e, k)} />
                  ))}
                </div>
              </div>

              {/* Vertical divider between groups (not after last) */}
              {gi < GROUPS.length - 1 && (
                <div className="self-center cy-divider-v" aria-hidden />
              )}
            </div>
          )
        })}
      </div>

      <ContextMenu
        anchor={menu.kpi ? { x: menu.x, y: menu.y } : null}
        items={menuItems}
        onClose={closeMenu}
        title={menu.kpi?.label}
      />
    </div>
  )
}
