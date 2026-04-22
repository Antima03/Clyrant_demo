import { useState } from 'react'
import {
  LayoutGrid,
  MapPin,
  Gauge,
  Zap,
  Network,
  Users,
  Sparkles,
  LineChart,
  Landmark,
  Compass,
  ShieldAlert,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { exceptionSummaryMock } from '@/mocks/drifts'
import { SCREEN_META, useView } from '@/context/ViewContext'
import type { ScreenId } from '@/types'

const SCREEN_ICONS: Record<ScreenId, React.ElementType> = {
  'S-00': LayoutGrid,
  'S-01': MapPin,
  'S-02': Zap,
  'S-03': Gauge,
  'S-04': Network,
  'S-05': Users,
  'S-06': Sparkles,
  'S-07': LineChart,
  'S-08': Landmark,
  'S-09': Compass,
  'WAR-ROOM': ShieldAlert,
}

const SCREEN_ORDER: ScreenId[] = [
  'S-00',
  'S-01',
  'S-02',
  'S-03',
  'S-04',
  'S-05',
  'S-06',
  'S-07',
  'S-08',
  'S-09',
]

function SidebarItem({
  id,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  id?: string
  label: string
  icon: React.ElementType
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 text-left text-[11px] text-ink cy-hover',
        active && 'bg-black/[0.04] font-medium',
      )}
    >
      <Icon className="h-3.5 w-3.5 text-ink-3 shrink-0" />
      <span className="truncate flex-1">{label}</span>
      {id && <span className="text-[9px] font-mono text-ink-4">{id}</span>}
    </button>
  )
}

export function Sidebar() {
  const { screen, setScreen } = useView()
  const [hover, setHover] = useState(false)
  const { totalOpen, topRules } = exceptionSummaryMock

  const countColor =
    totalOpen >= 10
      ? 'text-severity-red'
      : totalOpen >= 1
        ? 'text-severity-amber'
        : 'text-ink-4'

  return (
    <aside className="hidden md:flex w-[164px] flex-col bg-surface border-r border-black/[0.08] flex-shrink-0">
      {/* Primary nav */}
      <div className="pt-3 pb-2">
        <div className="px-3 pb-1 cy-section-label">Screens</div>
        {SCREEN_ORDER.map((sid) => (
          <SidebarItem
            key={sid}
            id={sid}
            label={SCREEN_META[sid].title}
            icon={SCREEN_ICONS[sid]}
            active={screen === sid}
            onClick={() => setScreen(sid)}
          />
        ))}
      </div>

      <div className="cy-divider-h mx-3 my-1" />

      {/* War room */}
      <div className="py-2">
        <div className="px-3 pb-1 cy-section-label">War Room</div>
        <SidebarItem
          label="Action Board"
          icon={ShieldAlert}
          active={screen === 'WAR-ROOM'}
          onClick={() => setScreen('WAR-ROOM')}
        />
      </div>

      <div className="flex-1" />

      {/* Exception entry (accent border — only accent on screen) */}
      <div className="cy-divider-h mx-3 my-1" />
      <div className="p-2 relative">
        <button
          type="button"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="flex items-center justify-between w-full px-2 py-2 border border-accent/40 bg-surface cy-hover"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="h-3 w-3 text-ink" strokeWidth={2.25} />
            <span className="text-[11px] text-ink font-medium">Exception report</span>
          </span>
          <span className={cn('text-3xs font-mono cy-num', countColor)}>
            [{totalOpen}]
          </span>
        </button>

        {hover && (
          <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="absolute left-full top-0 ml-2 z-30 w-[220px] bg-surface border border-black/[0.08] shadow-menu p-2 animate-fade-in"
          >
            <div className="cy-section-label mb-1">Top rules breached</div>
            <ul className="space-y-0.5">
              {topRules.map((r) => (
                <li
                  key={r.label}
                  className="flex items-center justify-between text-[11px] text-ink"
                >
                  <span className="truncate">{r.label}</span>
                  <span className="text-3xs font-mono text-ink-2 cy-num ml-2">
                    {r.count}
                  </span>
                </li>
              ))}
            </ul>
            <div className="cy-divider-h my-1.5" />
            <button className="flex items-center gap-1 text-4xs text-ink-3 hover:text-ink cy-hover w-full px-1 py-1">
              View all exceptions
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
