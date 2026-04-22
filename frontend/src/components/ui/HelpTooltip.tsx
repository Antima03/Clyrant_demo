import { HelpCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props {
  content: string
  className?: string
}

/**
 * HelpTooltip — shows a help icon that reveals explanatory text on hover.
 * Used throughout screens to explain KPIs, metrics, and concepts.
 */
export function HelpTooltip({ content, className }: Props) {
  return (
    <div className={cn('relative inline-flex items-center group', className)}>
      <HelpCircle className="h-3 w-3 text-ink-4 group-hover:text-ink-3 transition-colors cursor-help" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
        <div className="bg-ink text-surface text-[10px] font-mono leading-relaxed p-2 rounded shadow-lg max-w-[240px] whitespace-normal">
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-ink" />
          </div>
        </div>
      </div>
    </div>
  )
}
