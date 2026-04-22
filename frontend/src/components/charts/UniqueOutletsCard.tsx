import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
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
  gridStroke,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chartTheme'
import type { UoSPoint } from '@/types'
import { colors } from '@/utils/colors'
import { cn } from '@/utils/cn'

interface Props {
  data: UoSPoint[]
}

export function UniqueOutletsCard({ data }: Props) {
  if (!data.length) return null
  const latest = data[data.length - 1]
  const prev = data[data.length - 2] ?? latest
  const uosDelta = ((latest.uos - prev.uos) / prev.uos) * 100
  const mtdDelta = ((latest.uosMtd - prev.uosMtd) / prev.uosMtd) * 100

  return (
    <Card
      label="Unique Outlets Scanned · 4M"
      meta={
        <span className="cy-num">
          <span className="text-ink">{latest.uos}K</span>
          <span className="text-ink-4 ml-1">· MTD {latest.uosMtd}K</span>
        </span>
      }
      className="h-full"
      noPadding
    >
      {/* Legend strip */}
      <div className="px-3 pt-1.5 pb-1">
        <ChartLegend
          align="left"
          items={[
            {
              color: colors.purple,
              marker: 'line',
              label: 'UoS MTD',
              value: `${latest.uosMtd}K`,
            },
            {
              color: colors.blue2,
              marker: 'line',
              label: 'UoS (total)',
              value: `${latest.uos}K`,
            },
          ]}
        />
      </div>

      <div className="h-[calc(100%-52px)] min-h-0 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={chartMargins.withLegend}>
            <defs>
              <linearGradient id="uosFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.blue2} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.blue2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} vertical={false} />

            <XAxis
              dataKey="month"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={4}
            />
            <YAxis
              tick={axisTickValue}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(v) => `${v}K`}
              domain={['dataMin - 2', 'dataMax + 2']}
            />

            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v: number, key) => [
                `${v}K`,
                key === 'uos' ? 'UoS (total)' : 'UoS MTD',
              ]}
            />

            {/* Back series — total UoS (lighter, area) */}
            <Area
              type="monotone"
              dataKey="uos"
              stroke={colors.blue2}
              strokeWidth={1.25}
              fill="url(#uosFill)"
              dot={{ r: 2, fill: colors.blue2, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 3.5 }}
            >
              <LabelList
                dataKey="uos"
                content={({ x, y, value, index }) => {
                  if (index !== data.length - 1) return null
                  const cx = typeof x === 'number' ? x : 0
                  const cy = typeof y === 'number' ? y : 0
                  return (
                    <ChipLabel
                      x={cx}
                      y={cy}
                      value={`${value}K`}
                      neutral
                      dy={-10}
                      width={30}
                    />
                  )
                }}
              />
            </Area>

            {/* Front series — UoS MTD (primary, highlighted) */}
            <Line
              type="monotone"
              dataKey="uosMtd"
              stroke={colors.purple}
              strokeWidth={1.75}
              dot={{ r: 2.5, fill: colors.purple, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 3.5 }}
            >
              <LabelList
                dataKey="uosMtd"
                content={({ x, y, value, index }) => {
                  if (index !== data.length - 1) return null
                  const cx = typeof x === 'number' ? x : 0
                  const cy = typeof y === 'number' ? y : 0
                  return (
                    <ChipLabel
                      x={cx}
                      y={cy}
                      value={`${value}K`}
                      neutral
                      dy={14}
                      width={30}
                    />
                  )
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer rollup */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-black/[0.04] text-3xs font-mono cy-num">
        <span className="text-ink-4">
          Δ UoS{' '}
          <span className={cn(uosDelta < 0 ? 'text-severity-red' : 'text-severity-green')}>
            {uosDelta > 0 ? '+' : ''}
            {uosDelta.toFixed(1)}%
          </span>
        </span>
        <span className="text-ink-4">
          Δ MTD{' '}
          <span className={cn(mtdDelta < 0 ? 'text-severity-red' : 'text-severity-green')}>
            {mtdDelta > 0 ? '+' : ''}
            {mtdDelta.toFixed(1)}%
          </span>
        </span>
      </div>
    </Card>
  )
}
