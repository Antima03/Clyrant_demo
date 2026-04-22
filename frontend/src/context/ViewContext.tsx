import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Drift, ScreenId } from '@/types'

export type Role = 'NSM' | 'RSM' | 'ASM'

interface ViewCtx {
  screen: ScreenId
  setScreen: (s: ScreenId) => void

  /** Selected drift → FindingDetail replaces main column. `null` = landing grid. */
  selectedDrift: Drift | null
  openDrift: (d: Drift) => void
  closeDrift: () => void

  /** Slide-out Contextual Detail Panel for KPI / metric decomposition. */
  decompositionTarget: { kind: 'kpi' | 'metric'; id: string; label: string } | null
  openDecomposition: (t: { kind: 'kpi' | 'metric'; id: string; label: string }) => void
  closeDecomposition: () => void

  /** Ask AI panel open/close. */
  aiOpen: boolean
  setAiOpen: (b: boolean) => void

  /** Current user role (affects default scope labels). */
  role: Role
  setRole: (r: Role) => void
}

export const SCREEN_META: Record<ScreenId, { title: string; subtitle: string }> = {
  'S-00': { title: 'Landing', subtitle: 'Growth Command Centre overview' },
  'S-01': { title: 'Reach Health', subtitle: 'ND%, GEO ECO, churn & coverage gap' },
  'S-02': { title: 'Extraction Health', subtitle: 'WSP, UoS, lines/call vs benchmark' },
  'S-03': { title: 'Pipeline Health', subtitle: 'Sec:Pri, DMS:Pri, OFR, days-stock' },
  'S-04': { title: 'Channel Mix', subtitle: 'GT · MT · QC · eComm share' },
  'S-05': { title: 'Territory & SFA Health', subtitle: 'MAU, beat productivity, compliance' },
  'S-06': { title: 'Promo Health', subtitle: 'Uplift, ROI, participation rate' },
  'S-07': { title: 'Benchmark', subtitle: 'Client vs cohort median / P75' },
  'S-08': { title: 'Outstanding Health', subtitle: '>30d outstanding, collection rate' },
  'S-09': { title: 'Untapped Potential', subtitle: 'Under-penetrated × under-indexed towns' },
}

const Ctx = createContext<ViewCtx | null>(null)

export function ViewProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenId>('S-00')
  const [selectedDrift, setSelectedDrift] = useState<Drift | null>(null)
  const [decompositionTarget, setDecompositionTarget] = useState<
    ViewCtx['decompositionTarget']
  >(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [role, setRole] = useState<Role>('RSM')

  const openDrift = useCallback((d: Drift) => setSelectedDrift(d), [])
  const closeDrift = useCallback(() => setSelectedDrift(null), [])
  const openDecomposition = useCallback(
    (t: ViewCtx['decompositionTarget']) => setDecompositionTarget(t),
    [],
  )
  const closeDecomposition = useCallback(() => setDecompositionTarget(null), [])

  // Closing the drift detail whenever the user navigates to a new screen.
  const setScreenSafe = useCallback((s: ScreenId) => {
    setSelectedDrift(null)
    setScreen(s)
  }, [])

  const value = useMemo<ViewCtx>(
    () => ({
      screen,
      setScreen: setScreenSafe,
      selectedDrift,
      openDrift,
      closeDrift,
      decompositionTarget,
      openDecomposition,
      closeDecomposition,
      aiOpen,
      setAiOpen,
      role,
      setRole,
    }),
    [
      screen,
      setScreenSafe,
      selectedDrift,
      openDrift,
      closeDrift,
      decompositionTarget,
      openDecomposition,
      closeDecomposition,
      aiOpen,
      role,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useView() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useView must be inside <ViewProvider>')
  return v
}
