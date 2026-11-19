const day = 86_400_000
const bangkokOffset = 7 * 3_600_000

function isSnapshot(metric) {
  const key = metric.metricKey || metric.key
  return /\.(members|followers)$/.test(key) || key.endsWith('.invite.uses') || key.endsWith('.members.approximate')
}

export function reportingWindowDays({ report, metric }) {
  if (isSnapshot(metric) || metric.key.startsWith('postiz.') || (metric.scope && !metric.periodStart)) return null
  const start = Date.parse(metric.periodStart || report.periodStart)
  const end = Date.parse(metric.periodEnd || report.periodEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null
  return Math.floor((end + bangkokOffset) / day) - Math.floor((start + bangkokOffset) / day) + 1
}

function comparable(previous, current) {
  const a = previous.metric
  const b = current.metric
  if (a.key !== b.key || a.platform !== b.platform
      || (a.scope || '') !== (b.scope || '')
      || (a.coverage || '') !== (b.coverage || '')
      || (a.url && b.url && a.url !== b.url)
      || /approximate|estimate/i.test(a.label) !== /approximate|estimate/i.test(b.label)) return false
  if (isSnapshot(b)) return true
  const days = reportingWindowDays(current)
  return days !== null && reportingWindowDays(previous) === days
}

export function metricHistory(reports, key) {
  const readings = []
  const times = new Set()
  for (const report of reports) {
    const metric = report.metrics.find(row => row.key === key)
    if (!metric || metric.stale) continue
    const time = Date.parse(metric.checkedAt)
    if (!Number.isFinite(time) || times.has(time)) continue
    times.add(time)
    readings.push({ report, metric, time, connects: false })
  }
  readings.sort((a, b) => a.time - b.time)
  readings.forEach((reading, index) => {
    if (index > 0) reading.connects = comparable(readings[index - 1], reading)
  })
  return readings
}

export function metricChange(history, latest) {
  const current = history.at(-1)
  const previous = history.at(-2)
  return current?.report.id === latest.id && current.connects && previous
    ? current.metric.value - previous.metric.value
    : null
}
