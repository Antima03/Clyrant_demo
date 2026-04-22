import { BarChart3, AlertTriangle, TrendingUp, Filter } from 'lucide-react'
import { cn } from '@/utils/cn'

export type MobilePanel = 'kpis' | 'drifts' | 'drill' | 'funnel'

interface Props {
  active: MobilePanel
  onChange: (t: MobilePanel) => void
}

const TABS: { id: MobilePanel; label: string; icon: React.ElementType }[] = [
  { id: 'kpis', label: 'KPIs', icon: BarChart3 },
  { id: 'drifts', label: 'Drifts', icon: AlertTriangle },
  { id: 'drill', label: 'Drill', icon: TrendingUp },
  { id: 'funnel', label: 'Funnel', icon: Filter },
]

export function MobileTabBar({ active, onChange }: Props) {
  return (
    <nav className="md:hidden h-12 bg-surface border-t border-black/[0.08] grid grid-cols-4 flex-shrink-0">
      {TABS.map((t) => {
        const Icon = t.icon
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 cy-hover',
              isActive ? 'text-ink' : 'text-ink-3',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[9px] font-mono uppercase tracking-wide">
              {t.label}
            </span>
            {isActive && (
              <span className="absolute top-0 h-[2px] w-8 bg-ink" aria-hidden />
            )}
          </button>
        )
      })}
    </nav>
  )
}
