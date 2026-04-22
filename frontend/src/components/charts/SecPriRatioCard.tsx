import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
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
  gridStroke,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chartTheme'
import type { TrendPoint } from '@/types'
import { colors } from '@/utils/colors'
import { cn } from '@/utils/cn'

interface Props {
  data: TrendPoint[]
}

/** Healthy Sec:Pri norm for the Clarynt sample book. */
const NORM_PCT = 80

export function SecPriRatioCard({ data }: Props) {
  if (!data.length) return null
  const latest = data[data.length - 1].value
  const prev = data[data.length - 2]?.value ?? latest
  const deltaPp = latest - prev
  const deltaCls = deltaPp < 0 ? 'text-severity-red' : 'text-severity-green'
  const breach = latest < NORM_PCT

  return (
    <Card
      label="Sec : Pri Ratio · 4M"
      meta={
        <span>
          <span className={cn('cy-num', breach ? 'text-severity-red' : 'text-ink')}>
            {latest}%
          </span>{' '}
          <span className={cn('cy-num', deltaCls)}>
            {deltaPp >= 0 ? '▲' : '▼'} {Math.abs(deltaPp)}pp
          </span>
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
            { color: colors.blue, marker: 'line', label: 'Sec : Pri', value: `${latest}%` },
            { color: colors.ink4, marker: 'dashed', label: `Norm ${NORM_PCT}%` },
          ]}
        />
      </div>

      <div className="h-[calc(100%-26px)] min-h-0 px-2 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={chartMargins.withLegend}>
            <defs>
              <linearGradient id="secPriFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.blue} stopOpacity={0.18} />
                <stop offset="100%" stopColor={colors.blue} stopOpacity={0} />
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
              tickFormatter={(v) => `${v}%`}
              domain={[
                (min: number) => Math.floor(Math.min(min, NORM_PCT) - 4),
                (max: number) => Math.ceil(Math.max(max, NORM_PCT) + 6),
              ]}
            />

            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v: number) => [`${v}%`, 'Sec : Pri']}
            />

            {/* Norm reference line */}
            <ReferenceLine
              y={NORM_PCT}
              stroke={colors.ink4}
              strokeDasharray="3 2"
              strokeWidth={1}
              label={{
                value: `Norm ${NORM_PCT}%`,
                position: 'right',
                fontSize: 8,
                fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                fill: colors.ink4,
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.blue}
              strokeWidth={1.5}
              fill="url(#secPriFill)"
              dot={{ r: 2.5, fill: colors.blue, stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 3.5 }}
              isAnimationActive
            >
              <LabelList
                dataKey="value"
                content={({ x, y, value, index }) => {
                  const cx = typeof x === 'number' ? x : 0
                  const cy = typeof y === 'number' ? y : 0
                  // Only chip-label the latest point to reduce clutter
                  if (index !== data.length - 1) return null
                  return (
                    <ChipLabel
                      x={cx}
                      y={cy}
                      value={`${value}%`}
                      neutral
                      dy={-10}
                      width={32}
                    />
                  )
                }}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
