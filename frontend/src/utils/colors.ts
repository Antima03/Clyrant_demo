/**
 * Severity color tokens mirrored from tailwind.config so that raw SVGs
 * (Recharts <Cell>, <Line>) can reference them without parsing Tailwind.
 * KEEP IN SYNC with `tailwind.config.ts` → theme.extend.colors.ink.
 */
export const colors = {
  ink: '#141414',
  ink2: '#2e2e2e',
  ink3: '#4f4f4a',
  ink4: '#737370',
  canvas: '#f8f8f6',
  red: '#c4392a',
  amber: '#b8802a',
  green: '#2d7a3e',
  blue: '#2d6aa3',
  blue2: '#b8c5e0',
  purple: '#5b4b9e',
  accent: '#b8944d',
} as const

/** Bar fill driven by YoY delta sign — master § 6 rule. */
export const directionFill = (delta: number) =>
  delta < 0 ? colors.red : colors.green

/** Text color for a chip label by direction. */
export const directionText = (delta: number) =>
  delta < 0 ? colors.red : delta > 0 ? colors.green : colors.ink2
