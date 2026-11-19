import type { Metric, Report } from './types'

export type MetricReading = {
  report: Report
  metric: Metric
  time: number
  connects: boolean
}

export function reportingWindowDays(reading: MetricReading): number | null
export function metricHistory(reports: Report[], key: string): MetricReading[]
export function metricChange(history: MetricReading[], latest: Report): number | null
