import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { ChartLegend } from './ChartLegend'
import {
  axisTick,
  axisTickValue,
  gridStroke,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chartTheme'
import type { OutletBilledPoint } from '@/types'
import { colors } from '@/utils/colors'
import { cn } from '@/utils/cn'
import { fmtShort } from '@/utils/format'

interface Props {
  data: OutletBilledPoint[]
}

export function OutletBilledCard({ data }: Props) {
  if (!data.length) return null
  const latest = data[data.length - 1]
  const prev = data[data.length - 2] ?? latest

  const billedDelta = prev.billed ? ((latest.billed - prev.billed) / prev.billed) * 100 : 0
  const convPct = latest.billed ? ((latest.ordered / latest.billed) * 100).toFixed(0) : '–'

  return (
    <Card
      label="Outlet Billed vs Order Taken"
      meta={
        <span className="cy-num text-3xs">
          <span className="text-ink font-semibold">{fmtShort(latest.billed)}</span>
          <span className="text-ink-4"> billed</span>
          <span className="text-ink-4 mx-0.5">·</span>
          <span className="text-ink font-semibold">{fmtShort(latest.ordered)}</span>
          <span className="text-ink-4"> ordered</span>
          <span className="text-ink-4 mx-0.5">·</span>
          <span className="text-severity-red font-semibold">{convPct}%</span>
          <span className="text-ink-4"> conv</span>
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
            { color: colors.blue, marker: 'bar', label: 'Billed' },
            { color: colors.purple, marker: 'line', label: 'Order Taken' },
          ]}
        />
      </div>

      <div className="h-[calc(100%-52px)] min-h-0 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 18, right: 32, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />

            <XAxis
              dataKey="month"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={4}
            />

            {/* Left Y: Billed (large numbers) */}
            <YAxis
              yAxisId="billed"
              orientation="left"
              tick={axisTickValue}
              tickLine={false}
              axisLine={false}
              width={32}
              tickFormatter={(v) => fmtShort(v)}
              domain={[0, 'auto']}
            />

            {/* Right Y: Ordered (smaller numbers) */}
            <YAxis
              yAxisId="ordered"
              orientation="right"
              tick={axisTickValue}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(v) => fmtShort(v)}
              domain={[0, 'auto']}
            />

            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v: number, key: string) => {
                if (key === 'billed') return [fmtShort(v), 'Billed']
                if (key === 'ordered') return [fmtShort(v), 'Ordered']
                return [fmtShort(v), key]
              }}
            />

            {/* Bars for Billed */}
            <Bar
              yAxisId="billed"
              dataKey="billed"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
              fill={colors.blue}
              fillOpacity={0.75}
            />

            {/* Line for Order Taken */}
            <Line
              yAxisId="ordered"
              type="monotone"
              dataKey="ordered"
              stroke={colors.purple}
              strokeWidth={2}
              dot={{ r: 3, fill: colors.purple, stroke: 'white', strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer: MoM delta + conversion */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-black/[0.04] text-3xs font-mono cy-num">
        <span className="text-ink-4">
          Δ Billed{' '}
          <span className={cn(billedDelta < 0 ? 'text-severity-red' : 'text-severity-green')}>
            {billedDelta > 0 ? '+' : ''}{billedDelta.toFixed(0)}%
          </span>
        </span>
        <span className="text-ink-4">
          Gap{' '}
          <span className="text-severity-red font-semibold">
            {fmtShort(Math.abs(latest.gap))}
          </span>
          <span className="text-ink-4 ml-0.5">unbilled</span>
        </span>
      </div>
    </Card>
  )
}
