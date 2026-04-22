import { useEffect, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ChipLabel } from './ChipLabel'
import { ChartLegend } from './ChartLegend'
import {
  axisTick,
  axisTickValue,
  chartMargins,
  cursorFill,
  gridStroke,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chartTheme'
import { colors, directionFill } from '@/utils/colors'
import type { Category, Filters, PrimarySalesPoint } from '@/types'
import { useAsync } from '@/hooks/useAsync'
import { useFilters } from '@/context/FiltersContext'
import { landingService } from '@/services/landing'

interface Props {
  filters: Filters
}

interface SubChartProps {
  title: string
  data: PrimarySalesPoint[]
  loading: boolean
  breadcrumb: string[]
  canDrillDown: boolean
  onBarClick: (name: string) => void
  onBack: () => void
}

function SubChart({ title, data, loading, breadcrumb, canDrillDown, onBarClick, onBack }: SubChartProps) {
  const isDrilled = breadcrumb.length > 0
  const total = data.reduce((a, b) => a + b.crores, 0)
  const avgYoy = data.reduce((a, b) => a + b.yoyPct, 0) / Math.max(data.length, 1)
  const maxYoyAbs = Math.max(...data.map((d) => Math.abs(d.yoyPct)), 1)
  const yoyDomainAbs = Math.ceil(maxYoyAbs * 1.2)

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* Sub-chart header */}
      <div className="flex items-center justify-between px-3 pt-1.5 pb-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {isDrilled && (
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 text-ink-3 hover:text-ink transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
          )}
          <span className="text-3xs font-mono uppercase tracking-wide text-ink-4 truncate">
            {isDrilled ? breadcrumb.join(' › ') : title}
          </span>
        </div>
        <ChartLegend
          items={[
            { color: colors.green, marker: 'bar', label: 'YoY +ve' },
            { color: colors.red, marker: 'bar', label: 'YoY −ve' },
            { color: colors.blue, marker: 'line', label: 'YoY %' },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70">
            <span className="text-3xs font-mono text-ink-3 uppercase tracking-wide">loading…</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={chartMargins.dualAxis} barCategoryGap="28%">
            <CartesianGrid stroke={gridStroke} vertical={false} />

            <XAxis
              dataKey="name"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={4}
            />
            <YAxis
              yAxisId="cr"
              orientation="left"
              tick={axisTickValue}
              tickLine={false}
              axisLine={false}
              width={30}
              tickFormatter={(v) => `${v}`}
              domain={[0, 'auto']}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={axisTickValue}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(v) => `${v}%`}
              domain={[-yoyDomainAbs, yoyDomainAbs]}
            />

            <Tooltip
              cursor={{ fill: cursorFill }}
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(val, name) => {
                if (name === 'crores') return [`₹ ${Number(val).toFixed(1)} Cr`, 'Sales']
                return [`${Number(val) > 0 ? '+' : ''}${Number(val).toFixed(1)}%`, 'YoY']
              }}
            />

            <ReferenceLine yAxisId="pct" y={0} stroke="rgba(0,0,0,0.12)" strokeDasharray="2 2" />

            <Bar
              yAxisId="cr"
              dataKey="crores"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
              cursor={canDrillDown ? 'pointer' : 'default'}
              onClick={(barData: PrimarySalesPoint) => canDrillDown && onBarClick(barData.name)}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={directionFill(d.yoyPct)} fillOpacity={0.9} />
              ))}
              <LabelList
                dataKey="crores"
                position="top"
                offset={6}
                style={{
                  fontSize: 9,
                  fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                  fill: colors.ink2,
                }}
                formatter={(v: number) => `₹${v.toFixed(1)}`}
              />
            </Bar>

            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="yoyPct"
              stroke={colors.blue}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: colors.blue, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 3.5 }}
            >
              <LabelList
                dataKey="yoyPct"
                content={({ x, y, value }) => {
                  const cx = typeof x === 'number' ? x : 0
                  const cy = typeof y === 'number' ? y : 0
                  return <ChipLabel x={cx} y={cy} value={Number(value)} pct dy={-10} />
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-black/[0.04] text-3xs font-mono cy-num">
        <span className="text-ink-4">
          Total <span className="text-ink-2">₹ {total.toFixed(1)} Cr</span>
        </span>
        <span className="text-ink-4">
          Avg YoY{' '}
          <span className={avgYoy < 0 ? 'text-severity-red' : 'text-severity-green'}>
            {avgYoy > 0 ? '+' : ''}{avgYoy.toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  )
}

export function PrimarySalesCard({ filters }: Props) {
  const { setGeo, toggleCategory, resetCategories } = useFilters()
  const [geoDrill, setGeoDrill] = useState<{ region?: string; state?: string; district?: string }>({})
  const [productDrill, setProductDrill] = useState<{ division?: string }>({})

  const regionData = useAsync(
    () => landingService.primarySalesRegion(filters, geoDrill.region, geoDrill.state, geoDrill.district),
    [filters, geoDrill.region, geoDrill.state, geoDrill.district],
  )

  const productData = useAsync(
    () => landingService.primarySalesProduct(filters, productDrill.division),
    [filters, productDrill.division],
  )

  // Sync local drill state when TopBar changes global geo filter
  useEffect(() => {
    if (filters.geo.level === 'all') {
      setGeoDrill({})
    } else if (filters.geo.level === 'region') {
      setGeoDrill({ region: filters.geo.value })
    } else if (filters.geo.level === 'state') {
      setGeoDrill({ region: (filters.geo as { region: string }).region, state: filters.geo.value })
    }
  }, [filters.geo])

  const geoBreadcrumb = [geoDrill.region, geoDrill.state, geoDrill.district].filter(Boolean) as string[]
  const productBreadcrumb = [productDrill.division].filter(Boolean) as string[]

  const CATEGORY_NAMES: Category[] = ['Sanitary Napkins', 'Diapers', 'Utensil Cleaners']

  const handleRegionClick = (name: string) => {
    if (!geoDrill.region) {
      setGeoDrill({ region: name })
      setGeo({ level: 'region', value: name })
    } else if (!geoDrill.state) {
      setGeoDrill({ ...geoDrill, state: name })
      setGeo({ level: 'state', value: name, region: geoDrill.region })
    } else if (!geoDrill.district) {
      setGeoDrill({ ...geoDrill, district: name })
    }
  }

  const handleRegionBack = () => {
    if (geoDrill.district) {
      setGeoDrill({ region: geoDrill.region, state: geoDrill.state })
      setGeo({ level: 'state', value: geoDrill.state!, region: geoDrill.region! })
    } else if (geoDrill.state) {
      setGeoDrill({ region: geoDrill.region })
      setGeo({ level: 'region', value: geoDrill.region! })
    } else {
      setGeoDrill({})
      setGeo({ level: 'all' })
    }
  }

  const handleProductClick = (name: string) => {
    if (!productDrill.division) {
      setProductDrill({ division: name })
    } else {
      // Clicking a category name at the deepest level → toggle global category filter
      const cat = CATEGORY_NAMES.find((c) => c.toLowerCase() === name.toLowerCase())
      if (cat) {
        resetCategories()
        toggleCategory(cat)
      }
    }
  }

  const handleProductBack = () => {
    if (productDrill.division) {
      setProductDrill({})
      resetCategories()
    }
  }

  const totalAll = (regionData.data ?? []).reduce((a, b) => a + b.crores, 0)

  return (
    <Card
      label="Primary Sales"
      meta={`₹ ${totalAll.toFixed(1)} Cr · MTD vs LYSM`}
      className="h-full"
      noPadding
    >
      <div className="h-full grid grid-cols-2 divide-x divide-black/[0.06]">
        <SubChart
          title="By Region"
          data={regionData.data ?? []}
          loading={regionData.loading}
          breadcrumb={geoBreadcrumb}
          canDrillDown={geoBreadcrumb.length < 3}
          onBarClick={handleRegionClick}
          onBack={handleRegionBack}
        />
        <SubChart
          title="By Product Division"
          data={productData.data ?? []}
          loading={productData.loading}
          breadcrumb={productBreadcrumb}
          canDrillDown={productBreadcrumb.length < 1}
          onBarClick={handleProductClick}
          onBack={handleProductBack}
        />
      </div>
    </Card>
  )
}
