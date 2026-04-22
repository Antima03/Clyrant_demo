/**
 * Landing-page data service.
 *
 * This module is the ONLY place that switches between mock data and backend calls.
 * All components import from here (never from `mocks/` directly), so when the
 * backend endpoints land you only edit this file.
 *
 * Set `VITE_USE_MOCKS=false` in `.env.local` and point `VITE_API_URL` at your
 * FastAPI backend to switch.
 */

import type {
  Drift,
  ExceptionSummary,
  Filters,
  FunnelStage,
  KPI,
  PrimarySalesDataset,
  TrendPoint,
  UoSPoint,
} from '@/types'

import { kpisMock } from '@/mocks/kpis'
import { primarySalesMock } from '@/mocks/primarySales'
import { funnelMock } from '@/mocks/funnel'
import { secPriMock, uosMock } from '@/mocks/trends'
import { driftsMock, exceptionSummaryMock } from '@/mocks/drifts'
import { api } from './api'

const USE_MOCKS =
  (import.meta.env.VITE_USE_MOCKS ?? 'true').toString().toLowerCase() !== 'false'

/** Simulate a round-trip so loading states remain honest in mock mode. */
const delay = <T>(value: T, ms = 150) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

const filterQuery = (f: Filters) => ({
  time: f.time,
  geo_level: f.geo.level,
  geo_value: f.geo.level === 'all' ? undefined : (f.geo as { value: string }).value,
  categories: f.categories.length ? f.categories.join(',') : undefined,
})

// ─── Public service surface ──────────────────────────────────────────────
export const landingService = {
  kpis: (f: Filters): Promise<KPI[]> =>
    USE_MOCKS ? delay(kpisMock) : api.get<KPI[]>('/landing/kpis', filterQuery(f)),

  primarySales: (f: Filters): Promise<PrimarySalesDataset> =>
    USE_MOCKS
      ? delay(primarySalesMock)
      : api.get<PrimarySalesDataset>('/landing/primary-sales', filterQuery(f)),

  funnel: (f: Filters): Promise<FunnelStage[]> =>
    USE_MOCKS
      ? delay(funnelMock)
      : api.get<FunnelStage[]>('/landing/funnel', filterQuery(f)),

  secPri: (f: Filters): Promise<TrendPoint[]> =>
    USE_MOCKS
      ? delay(secPriMock)
      : api.get<TrendPoint[]>('/landing/sec-pri', filterQuery(f)),

  uos: (f: Filters): Promise<UoSPoint[]> =>
    USE_MOCKS ? delay(uosMock) : api.get<UoSPoint[]>('/landing/uos', filterQuery(f)),

  drifts: (f: Filters): Promise<Drift[]> =>
    USE_MOCKS
      ? delay(driftsMock)
      : api.get<Drift[]>('/landing/drifts', filterQuery(f)),

  exceptions: (): Promise<ExceptionSummary> =>
    USE_MOCKS
      ? delay(exceptionSummaryMock)
      : api.get<ExceptionSummary>('/landing/exceptions'),
}
