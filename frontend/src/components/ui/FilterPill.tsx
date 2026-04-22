import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface FilterPillProps {
  label: string
  value: ReactNode
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
}

/**
 * TopBar pill dropdown trigger — flat, mono label, hairline border.
 * Not a real dropdown yet (opens a menu in TopBar); this is the visual.
 */
export function FilterPill({ label, value, active, onClick, icon }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 h-6 text-3xs font-mono',
        'border border-black/[0.08] cy-hover',
        'uppercase tracking-wide text-ink',
        active && 'bg-black/[0.03]',
      )}
    >
      <span className="text-ink-3">{label}</span>
      <span className="text-ink cy-num normal-case tracking-normal">{value}</span>
      {icon ?? <ChevronDown className="h-3 w-3 text-ink-3" />}
    </button>
  )
}
