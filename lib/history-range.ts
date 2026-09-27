export const historyRanges = [
  { key: "30m", label: "30 menit", bucketLabel: "1 menit", durationMs: 30 * 60 * 1000, buckets: 30 },
  { key: "60m", label: "60 menit", bucketLabel: "5 menit", durationMs: 60 * 60 * 1000, buckets: 12 },
  { key: "6h", label: "6 jam", bucketLabel: "15 menit", durationMs: 6 * 60 * 60 * 1000, buckets: 24 },
  { key: "24h", label: "24 jam", bucketLabel: "1 jam", durationMs: 24 * 60 * 60 * 1000, buckets: 24 },
  { key: "7d", label: "7 hari", bucketLabel: "6 jam", durationMs: 7 * 24 * 60 * 60 * 1000, buckets: 28 },
  { key: "30d", label: "30 hari", bucketLabel: "1 hari", durationMs: 30 * 24 * 60 * 60 * 1000, buckets: 30 },
] as const;

export const defaultHistoryRange = historyRanges[0];

export function getHistoryRange(value: string | string[] | undefined) {
  return historyRanges.find((range) => range.key === value) ?? defaultHistoryRange;
}
