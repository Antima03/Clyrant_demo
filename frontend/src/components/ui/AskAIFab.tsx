import { Send } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AskAIFabProps {
  onClick?: () => void
  className?: string
}

/**
 * Bottom-right floating action button — solid ink circle, no gradient/glow.
 * Spec § 2.1: anchored in main column, not over the Drift Panel.
 */
export function AskAIFab({ onClick, className }: AskAIFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ask AI"
      aria-label="Ask AI"
      className={cn(
        'h-8 w-8 rounded-full bg-ink text-white flex items-center justify-center',
        'hover:bg-ink-2 transition-colors',
        className,
      )}
    >
      <Send className="h-[13px] w-[13px]" />
    </button>
  )
}
