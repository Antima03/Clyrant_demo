import { cn } from '@/utils/cn'

interface AskAIFabProps {
  onClick?: () => void
  className?: string
}

export function AskAIFab({ onClick, className }: AskAIFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ask AI"
      className={cn(
        'group flex items-center gap-2 pl-3 pr-4 h-9',
        'bg-ink text-white',
        'hover:bg-ink/90 transition-all duration-150',
        'shadow-lg hover:shadow-xl',
        className,
      )}
    >
      {/* Spark icon — custom SVG, cleaner than any lucide option */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        className="shrink-0 transition-transform duration-150 group-hover:scale-110"
      >
        {/* four-point star / spark */}
        <path
          d="M7.5 1 L8.4 6.6 L14 7.5 L8.4 8.4 L7.5 14 L6.6 8.4 L1 7.5 L6.6 6.6 Z"
          fill="white"
        />
        {/* small accent dot top-right */}
        <circle cx="12" cy="3" r="1.1" fill="white" opacity="0.6" />
      </svg>
      <span className="text-[11px] font-mono font-semibold uppercase tracking-widest">
        Ask AI
      </span>
    </button>
  )
}
