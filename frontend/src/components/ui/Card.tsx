import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  meta?: ReactNode
  noPadding?: boolean
}

/**
 * Card shell — pure white, hairline border, zero radius.
 * Optional header slot (left-side label + right-side meta).
 */
export function Card({
  label,
  meta,
  noPadding,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <section className={cn('cy-card flex flex-col', className)} {...rest}>
      {(label || meta) && (
        <header className="flex items-center justify-between px-3 pt-2.5 pb-2">
          {label && <span className="cy-section-label">{label}</span>}
          {meta && (
            <span className="text-2xs font-mono text-ink-3 cy-num">{meta}</span>
          )}
        </header>
      )}
      <div className={cn('flex-1 min-h-0', noPadding ? '' : 'px-3 pb-3')}>
        {children}
      </div>
    </section>
  )
}
