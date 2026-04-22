import { useState } from 'react'
import { KPIStrip } from '@/components/kpi/KPIStrip'
import { PrimarySalesCard } from '@/components/charts/PrimarySalesCard'
import { OutletFunnelCard } from '@/components/charts/OutletFunnelCard'
import { SecPriRatioCard } from '@/components/charts/SecPriRatioCard'
import { OutletBilledCard } from '@/components/charts/OutletBilledCard'
import { DriftPanel } from '@/components/drift/DriftPanel'
import { FindingDetail } from '@/components/drift/FindingDetail'
import { AskAIFab } from '@/components/ui/AskAIFab'
import { ContextualDetailPanel } from '@/components/ui/ContextualDetailPanel'
import { AIPanel } from '@/components/ai/AIPanel'
import { MobileTabBar, type MobilePanel } from '@/components/layout/MobileTabBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ScreenOverview } from './ScreenOverview'
import { useFilters } from '@/context/FiltersContext'
import { useView } from '@/context/ViewContext'
import { useAsync } from '@/hooks/useAsync'
import { landingService } from '@/services/landing'
import type { Drift, FunnelStage, KPI, ScreenId } from '@/types'
import { fmtShort } from '@/utils/format'
import { cn } from '@/utils/cn'

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'cy-card h-full flex items-center justify-center text-3xs font-mono text-ink-3 uppercase',
        className,
      )}
    >
      loading…
    </div>
  )
}

export function LandingView() {
  const { filters } = useFilters()
  const {
    screen,
    setScreen,
    selectedDrift,
    openDrift,
    closeDrift,
    decompositionTarget,
    openDecomposition,
    closeDecomposition,
    aiOpen,
    setAiOpen,
  } = useView()
  const [mobileTab, setMobileTab] = useState<MobilePanel>('kpis')
  const [shareToast, setShareToast] = useState<string | null>(null)

  // Data — all wired through the service layer (mocks in dev, API in prod).
  const kpis = useAsync(() => landingService.kpis(filters), [filters])
  const funnel = useAsync(() => landingService.funnel(filters), [filters])
  const secPri = useAsync(() => landingService.secPri(filters), [filters])
  const outletBilled = useAsync(() => landingService.outletBilled(filters), [filters])
  const drifts = useAsync(() => landingService.drifts(filters), [filters])

  // Reusable toast helper — every drift action routes through here until
  // the real backends (WhatsApp share service, discuss thread, finding
  // lifecycle, war-room queue) are available.
  const toast = (msg: string) => {
    setShareToast(msg)
    setTimeout(() => setShareToast(null), 2500)
  }

  const handleShare = (d: Drift) =>
    toast(`“${d.id} · ${d.title}” prepared as WhatsApp card.`)
  const handleDiscuss = (d: Drift) =>
    toast(`Discussion thread opened for ${d.id}.`)
  const handleResolve = (d: Drift) =>
    toast(`${d.id} marked as resolved · lifecycle → monitoring.`)
  const handleEscalate = (d: Drift) =>
    toast(`${d.id} escalated to War Room queue.`)

  const handleKPIDrill = (k: KPI) => {
    openDecomposition({ kind: 'kpi', id: k.id, label: k.label })
  }

  const handleDriftDrill = (d: Drift) => {
    if (d.category === 'A' && d.targetScreen) setScreen(d.targetScreen as ScreenId)
  }

  const handleFunnelStageClick = (s: FunnelStage) => {
    // In prod this would dispatch to the map store; for now a toast confirms intent.
    toast(`Map filtered · ${s.label} (${fmtShort(s.count)} outlets)`)
  }

  const isLanding = screen === 'S-00' && !selectedDrift
  const activeKpi = decompositionTarget?.kind === 'kpi'
    ? kpis.data?.find((k) => k.id === decompositionTarget.id) ?? null
    : null

  return (
    <div className="h-full w-full flex flex-col bg-canvas overflow-hidden">
      <TopBar />

      {/* KPI Strip — only on Landing (S-00) */}
      {screen === 'S-00' && !selectedDrift && (
        kpis.data ? (
          <KPIStrip kpis={kpis.data} onTileClick={handleKPIDrill} />
        ) : (
          <div className="h-20 border-b border-black/[0.08] bg-surface flex items-center justify-center text-3xs font-mono text-ink-3 uppercase">
            loading kpis…
          </div>
        )
      )}

      {/* Body: 3-col desktop, single-panel mobile */}
      <div className="flex-1 min-h-0 flex">
        <Sidebar />

        {/* MAIN */}
        <main
          className={cn(
            'flex-1 min-w-0 min-h-0 relative overflow-hidden',
            // hide main on mobile when user is on Drifts tab
          )}
          hidden={mobileTab === 'drifts'}
        >
          {selectedDrift ? (
            <FindingDetail
              drift={selectedDrift}
              onBack={closeDrift}
              onOpenTargetScreen={handleDriftDrill}
              onShare={handleShare}
              onDiscuss={handleDiscuss}
              onResolve={handleResolve}
              onEscalate={handleEscalate}
            />
          ) : screen !== 'S-00' ? (
            <ScreenOverview screen={screen} />
          ) : (
            <div className="h-full p-2.5">
              <div className="h-full grid grid-rows-[1.05fr_1fr] gap-2.5">
                {/* Top: Primary Sales full width */}
                <div className="min-h-0">
                  <PrimarySalesCard filters={filters} />
                </div>

                {/* Bottom: Funnel | Sec:Pri | UoS */}
                <div
                  className={cn(
                    'min-h-0 grid gap-2.5',
                    'grid-cols-1 md:grid-cols-[40fr_30fr_30fr]',
                  )}
                >
                  <div
                    className={cn(
                      'min-h-0',
                      mobileTab === 'funnel' ? 'block' : 'hidden md:block',
                    )}
                  >
                    {funnel.data ? (
                      <OutletFunnelCard
                        stages={funnel.data}
                        onStageClick={handleFunnelStageClick}
                      />
                    ) : (
                      <Skeleton />
                    )}
                  </div>
                  <div
                    className={cn(
                      'min-h-0',
                      mobileTab === 'drill' ? 'block' : 'hidden md:block',
                    )}
                  >
                    {secPri.data ? (
                      <SecPriRatioCard data={secPri.data} />
                    ) : (
                      <Skeleton />
                    )}
                  </div>
                  <div
                    className={cn(
                      'min-h-0',
                      mobileTab === 'drill' ? 'block' : 'hidden md:block',
                    )}
                  >
                    {outletBilled.data ? <OutletBilledCard data={outletBilled.data} /> : <Skeleton />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ask AI FAB — z-20 to ensure it floats above Recharts SVGs */}
          {isLanding && (
            <AskAIFab
              onClick={() => setAiOpen(true)}
              className="absolute bottom-4 right-4 z-20"
            />
          )}
        </main>

        {/* DRIFT PANEL */}
        <div
          className={cn(
            'min-h-0',
            mobileTab === 'drifts' ? 'block w-full' : 'hidden md:block',
          )}
        >
          {drifts.data ? (
            <DriftPanel
              drifts={drifts.data}
              onSelect={openDrift}
              onShare={handleShare}
            />
          ) : (
            <aside className="w-full md:w-[260px] bg-surface border-l border-black/[0.08] p-3 text-3xs font-mono text-ink-3">
              loading drifts…
            </aside>
          )}
        </div>
      </div>

      <MobileTabBar active={mobileTab} onChange={setMobileTab} />

      {/* Slide-out panels */}
      <ContextualDetailPanel
        open={!!decompositionTarget}
        target={decompositionTarget}
        kpi={activeKpi}
        onClose={closeDecomposition}
      />
      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-xs px-3 py-2 font-sans animate-fade-in">
          {shareToast}
        </div>
      )}
    </div>
  )
}
