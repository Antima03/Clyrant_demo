import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  onSelect?: () => void
  danger?: boolean
}

interface ContextMenuProps {
  anchor: { x: number; y: number } | null
  items: ContextMenuItem[]
  onClose: () => void
  title?: string
}

/**
 * ContextMenu — the ONLY element in Clarynt permitted to use a drop-shadow.
 * Positioned absolutely at the anchor; closes on outside click / Escape.
 */
export function ContextMenu({ anchor, items, onClose, title }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!anchor) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchor, onClose])

  if (!anchor) return null

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[200px] bg-surface border border-black/[0.08] shadow-menu animate-fade-in"
      style={{ left: anchor.x, top: anchor.y }}
    >
      {title && (
        <div className="px-3 pt-2 pb-1 cy-section-label">{title}</div>
      )}
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <button
              role="menuitem"
              onClick={() => {
                it.onSelect?.()
                onClose()
              }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 text-left',
                'text-xs font-sans cy-hover',
                it.danger ? 'text-severity-red' : 'text-ink',
              )}
            >
              {it.icon && <span className="text-ink-3">{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
