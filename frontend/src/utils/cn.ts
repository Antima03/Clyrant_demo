import clsx, { type ClassValue } from 'clsx'

/** Tiny `cn` — same semantics as shadcn's, but without tailwind-merge. */
export const cn = (...inputs: ClassValue[]) => clsx(inputs)
