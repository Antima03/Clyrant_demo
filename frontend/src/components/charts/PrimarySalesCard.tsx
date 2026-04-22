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
import type { PrimarySalesDataset, PrimarySalesPoint } from '@/types'

interface Props {
  data: PrimarySalesDataset
}

function SubChart({
  title,
  data,
}: {
  title: string
  data: PrimarySalesPoint[]
}) {
  const total = data.reduce((a, b) => a + b.crores, 0)
  const avgYoy =
    data.reduce((a, b) => a + b.yoyPct, 0) / Math.max(data.length, 1)
  const maxYoyAbs = Math.max(...data.map((d) => Math.abs(d.yoyPct)), 1)
  const yoyDomainAbs = Math.ceil(maxYoyAbs * 1.2) // symmetric around zero

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* Sub-chart header */}
      <div className="flex items-center justify-between px-3 pt-1.5 pb-1">
        <span className="text-3xs font-mono uppercase tracking-wide text-ink-4">
          {title}
        </span>
        <ChartLegend
          items={[
            { color: colors.green, marker: 'bar', label: 'YoY +ve' },
            { color: colors.red, marker: 'bar', label: 'YoY −ve' },
            { color: colors.blue, marker: 'line', label: 'YoY %' },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={chartMargins.dualAxis}
            barCategoryGap="28%"
          >
            <CartesianGrid stroke={gridStroke} vertical={false} />

            <XAxis
              dataKey="name"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={4}
            />
            {/* Left: ₹ Cr (bars) */}
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
            {/* Right: YoY % (line) — symmetric around 0 */}
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

            {/* Zero reference on the YoY axis */}
            <ReferenceLine
              yAxisId="pct"
              y={0}
              stroke="rgba(0,0,0,0.12)"
              strokeDasharray="2 2"
            />

            <Bar
              yAxisId="cr"
              dataKey="crores"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={directionFill(d.yoyPct)}
                  fillOpacity={0.9}
                />
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
                  return (
                    <ChipLabel
                      x={cx}
                      y={cy}
                      value={Number(value)}
                      pct
                      dy={-10}
                    />
                  )
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sub-chart footer — rolled up values */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-black/[0.04] text-3xs font-mono cy-num">
        <span className="text-ink-4">
          Total{' '}
          <span className="text-ink-2">₹ {total.toFixed(1)} Cr</span>
        </span>
        <span className="text-ink-4">
          Avg YoY{' '}
          <span className={avgYoy < 0 ? 'text-severity-red' : 'text-severity-green'}>
            {avgYoy > 0 ? '+' : ''}
            {avgYoy.toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  )
}

export function PrimarySalesCard({ data }: Props) {
  const totalAll =
    data.byRegion.reduce((a, b) => a + b.crores, 0)

  return (
    <Card
      label="Primary Sales"
      meta={`₹ ${totalAll.toFixed(1)} Cr · MTD vs LYSM`}
      className="h-full"
      noPadding
    >
      <div className="h-full grid grid-cols-2 divide-x divide-black/[0.06]">
        <SubChart title="By Region" data={data.byRegion} />
        <SubChart title="By Product Division" data={data.byDivision} />
      </div>
    </Card>
  )
}
