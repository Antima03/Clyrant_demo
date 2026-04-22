import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import {
  axisTick,
  axisTickValue,
  gridStroke,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chartTheme'
import type { TrendPoint } from '@/types'
import { colors } from '@/utils/colors'

interface Props {
  data: TrendPoint[]
}

export function SecPriRatioCard({ data }: Props) {
  if (!data.length) return null

  return (
    <Card label="Sec vs Pri Ratio" className="h-full" noPadding>
      <div className="h-full min-h-0 px-2 pb-1 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 16, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="secPriFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.blue} stopOpacity={0.15} />
                <stop offset="100%" stopColor={colors.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} vertical={false} />

            <XAxis
              dataKey="month"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={6}
            />
            <YAxis
              tick={axisTickValue}
              tickLine={false}
              axisLine={false}
              width={32}
              tickFormatter={(v) => `${v}%`}
              domain={[
                (min: number) => Math.floor(min / 10) * 10,
                (max: number) => Math.ceil(max / 10) * 10,
              ]}
            />

            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v: number) => [`${v}%`, 'Sec vs Pri']}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.blue}
              strokeWidth={2}
              fill="url(#secPriFill)"
              dot={{ r: 3.5, fill: colors.blue, stroke: 'white', strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              isAnimationActive
            >
              <LabelList
                dataKey="value"
                position="top"
                offset={8}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                  fill: colors.blue,
                }}
                formatter={(v: number) => `${v}%`}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
