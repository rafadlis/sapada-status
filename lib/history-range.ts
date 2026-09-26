export const historyRanges = [
  { key: "60m", label: "60 menit", durationMs: 60 * 60 * 1000, buckets: 12 },
  { key: "6h", label: "6 jam", durationMs: 6 * 60 * 60 * 1000, buckets: 24 },
  { key: "24h", label: "24 jam", durationMs: 24 * 60 * 60 * 1000, buckets: 24 },
  { key: "7d", label: "7 hari", durationMs: 7 * 24 * 60 * 60 * 1000, buckets: 28 },
  { key: "30d", label: "30 hari", durationMs: 30 * 24 * 60 * 60 * 1000, buckets: 30 },
] as const;

export function getHistoryRange(value: string | string[] | undefined) {
  return historyRanges.find((range) => range.key === value) ?? historyRanges[0];
}
