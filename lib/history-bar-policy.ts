export const historyBarPolicy = { minimumGreenSuccessPercent: 99 } as const;

export const historyBarLegend = [
  { state: "good", label: `≥${historyBarPolicy.minimumGreenSuccessPercent}% berhasil` },
  { state: "mixed", label: `Sebagian gagal (<${historyBarPolicy.minimumGreenSuccessPercent}% berhasil)` },
  { state: "failed", label: "Semua gagal" },
  { state: "empty", label: "Belum diperiksa" },
] as const;

type BucketCounts = { count: number; failedCount: number };

export function getHistoryBarState({ count, failedCount }: BucketCounts) {
  if (count === 0) return "empty";
  if (failedCount === count) return "failed";
  // Compare raw counts, so rounding the displayed percentage cannot change the color.
  return failedCount * 100 <= count * (100 - historyBarPolicy.minimumGreenSuccessPercent) ? "good" : "mixed";
}

export function getHistoryBarSummary(bucket: BucketCounts, overall = false) {
  const subject = overall ? "putaran pemeriksaan" : "pemeriksaan";
  if (bucket.count === 0) return "Belum ada pemeriksaan";
  if (bucket.failedCount === 0) return `${bucket.count} ${subject} berhasil`;
  if (bucket.failedCount === bucket.count) return `${bucket.count} ${subject} gagal`;
  const successPercent = ((bucket.count - bucket.failedCount) / bucket.count * 100).toFixed(2);
  const prefix = getHistoryBarState(bucket) === "good" ? "Kegagalan kecil" : "Sebagian gagal";
  return `${prefix}: ${bucket.failedCount} dari ${bucket.count} ${subject} gagal. ${successPercent}% berhasil`;
}
