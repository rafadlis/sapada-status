export const historyRanges = [
  { key: "30m", label: "30 menit", bucketLabel: "1 menit", durationMs: 30 * 60 * 1000, buckets: 30 },
  { key: "60m", label: "60 menit", bucketLabel: "1 menit", durationMs: 60 * 60 * 1000, buckets: 60 },
  { key: "6h", label: "6 jam", bucketLabel: "1 jam", durationMs: 6 * 60 * 60 * 1000, buckets: 6 },
  { key: "24h", label: "24 jam", bucketLabel: "1 jam", durationMs: 24 * 60 * 60 * 1000, buckets: 24 },
  { key: "7d", label: "7 hari", bucketLabel: "1 hari", durationMs: 7 * 24 * 60 * 60 * 1000, buckets: 7 },
  { key: "30d", label: "30 hari", bucketLabel: "1 hari", durationMs: 30 * 24 * 60 * 60 * 1000, buckets: 30 },
  { key: "90d", label: "90 hari", bucketLabel: "1 hari", durationMs: 90 * 24 * 60 * 60 * 1000, buckets: 90 },
] as const;

export const defaultHistoryRange = historyRanges[5];

export function getHistoryRange(value: string | string[] | undefined) {
  return historyRanges.find((range) => range.key === value) ?? defaultHistoryRange;
}

export function getHistoryWindow(range: ReturnType<typeof getHistoryRange>, now: Date) {
  const bucketMs = range.durationMs / range.buckets;
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const endMs = Math.floor((now.getTime() + jakartaOffsetMs) / bucketMs + 1) * bucketMs - jakartaOffsetMs;
  return { start: new Date(endMs - range.durationMs), end: new Date(endMs), bucketMs };
}
