import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, usePlotArea, useXAxisScale, useYAxisScale } from 'recharts'
import { reportingWindowDays } from './home-metrics.mjs'
import type { MetricReading } from './home-metrics.mjs'
import { formatCount, formatDate, formatDateRange, formatDay, metricName } from './types'

const compactCount = new Intl.NumberFormat('en-US', { notation: 'compact' })
const day = 86_400_000

export function readingPeriod(reading: MetricReading) {
  const { report, metric } = reading
  return reportingWindowDays(reading) !== null
    ? formatDateRange(metric.periodStart || report.periodStart, metric.periodEnd || report.periodEnd)
    : 'Checked ' + formatDate(metric.checkedAt)
}

function Observations({ history, active, setActive, open }: {
  history: MetricReading[]
  active: string | null
  setActive: (id: string | null) => void
  open: (id: string) => void
}) {
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  const bounds = usePlotArea()
  if (!xScale || !yScale || !bounds) return null

  const points = history.flatMap(reading => {
    const x = xScale(reading.time)
    const y = yScale(reading.metric.value)
    return x == null || y == null ? [] : [{ reading, x, y }]
  })
  const path = points.map(({ reading, x, y }) => `${reading.connects ? 'L' : 'M'}${x},${y}`).join(' ')
  const focused = points.find(point => point.reading.report.id === active)
  const width = Math.min(224, bounds.width)
  const detailHeight = Math.min(132, bounds.height)
  return <>
    <path className="history-line" d={path} fill="none" />
    {points.map(({ reading, x, y }) => <g key={reading.report.id}>
      <circle className="history-point" cx={x} cy={y} r={focused?.reading === reading ? 5 : 3.5} />
      <circle className="history-hit" cx={x} cy={y} r={11} fill="transparent"
        onPointerEnter={() => setActive(reading.report.id)} onPointerLeave={() => setActive(null)}
        onClick={() => open(reading.report.id)} />
    </g>)}
    {focused && <foreignObject className="history-tooltip" aria-hidden="true"
      x={Math.max(bounds.x, Math.min(focused.x - width / 2, bounds.x + bounds.width - width))}
      y={focused.y - bounds.y >= detailHeight + 10 ? focused.y - detailHeight - 10
        : Math.min(focused.y + 12, bounds.y + bounds.height - detailHeight)}
      width={width} height={detailHeight}>
      <div className="history-detail">
        <span>{metricName(focused.reading.metric)}</span>
        <strong>{formatCount(focused.reading.metric.value)}</strong>
        <span>{readingPeriod(focused.reading)}</span>
      </div>
    </foreignObject>}
  </>
}

export function EngagementHistory({ history, open }: { history: MetricReading[]; open: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  if (!history.length) return <p className="history-empty muted">No verified observations for this metric yet.</p>

  const start = history[0].time
  const end = history.at(-1)?.time ?? start
  const padding = start === end ? day : (end - start) * 0.035
  return <>
    <div className="chart-body" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 14, right: 29, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#34323c" vertical={false} />
          <XAxis type="number" dataKey="time" domain={[start - padding, end + padding]} allowDataOverflow
            ticks={history.map(item => item.time)} tickFormatter={time => formatDay(new Date(time).toISOString())}
            tick={{ fill: '#b9b5c2', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} minTickGap={24} />
          <YAxis width={44} domain={[0, (maximum: number) => Math.max(1, maximum)]} allowDecimals={false}
            tickFormatter={value => compactCount.format(value)} tick={{ fill: '#b9b5c2', fontSize: 12 }}
            axisLine={false} tickLine={false} tickMargin={8} />
          <Line dataKey="metric.value" stroke="none" dot={false} isAnimationActive={false} />
          <Observations history={history} active={hovered || focused} setActive={setHovered} open={open} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <details className="history-reports">
      <summary>Saved reports <span>{history.length}</span></summary>
      <ul aria-label="Reports for the selected metric">
        {[...history].reverse().map(reading => <li key={reading.report.id}>
          <button type="button" onFocus={() => setFocused(reading.report.id)} onBlur={() => setFocused(null)}
            aria-label={'Open report, ' + metricName(reading.metric) + ', ' + formatCount(reading.metric.value) + ', ' + readingPeriod(reading)}
            onClick={() => open(reading.report.id)}>
            <span>{readingPeriod(reading)}</span><strong>{formatCount(reading.metric.value)}</strong><ArrowUpRight size={14} />
          </button>
        </li>)}
      </ul>
    </details>
  </>
}
