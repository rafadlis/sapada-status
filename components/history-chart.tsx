import Link from "next/link";
import { formatCheckResult } from "@/lib/check-result";
import { getHistoryRange, historyRanges } from "@/lib/history-range";
import { formatJakarta } from "@/lib/status";
import type { checks } from "@/lib/db/schema";

type Check = typeof checks.$inferSelect;

export function HistoryChart({ history, selectedRange, now }: { history: Check[]; selectedRange: string | string[] | undefined; now: Date }) {
  const range = getHistoryRange(selectedRange);
  const start = now.getTime() - range.durationMs;
  const bucketMs = range.durationMs / range.buckets;
  const buckets = Array.from({ length: range.buckets }, () => ({ count: 0, failedCount: 0, latestFailure: null as Check | null }));
  for (const check of history) {
    const index = Math.floor((check.checkedAt.getTime() - start) / bucketMs);
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].count++;
    if (!check.ok) {
      buckets[index].failedCount++;
      if (!buckets[index].latestFailure || check.checkedAt > buckets[index].latestFailure.checkedAt) buckets[index].latestFailure = check;
    }
  }
  const uptime = history.length ? 100 * history.filter((check) => check.ok).length / history.length : null;

  return <div className="history-block">
    <div className="history-top"><div><span className="eyebrow">Ketersediaan SAPADA</span><strong>{uptime === null ? "—" : `${uptime.toFixed(2)}%`}</strong><span className="history-subtitle">pemeriksaan berhasil dalam {range.label.toLowerCase()} terakhir</span></div>
      <nav className="range-picker" aria-label="Rentang riwayat pemeriksaan">{historyRanges.map((option) => <Link key={option.key} href={option.key === "60m" ? "/" : `/?range=${option.key}`} prefetch={false} aria-current={range.key === option.key ? "page" : undefined}>{option.label}</Link>)}</nav>
    </div>
    <div className={`bars ${range.key === "60m" ? "bars-minute" : ""}`} style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => {
      const bucketStart = new Date(start + index * bucketMs);
      const bucketEnd = new Date(start + (index + 1) * bucketMs);
      const period = `${formatJakarta(bucketStart, { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(bucketEnd, { timeStyle: "short" })} WIB`;
      const summary = bucket.count === 0 ? "Belum ada pemeriksaan" : bucket.failedCount ? `${bucket.failedCount} dari ${bucket.count} pemeriksaan gagal` : `${bucket.count} pemeriksaan berhasil`;
      const failure = bucket.latestFailure;
      const label = `${period}: ${summary}${failure ? `. ${formatCheckResult(failure)}` : ""}`;
      return <details key={index} name="history-check" className={`bar-detail ${index >= range.buckets / 2 ? "bar-right" : ""}`}><summary title={label} aria-label={label} className={`bar ${bucket.count === 0 ? "bar-empty" : bucket.failedCount ? "bar-failed" : "bar-good"}`} />
        <div className="bar-popover"><strong>{period}</strong><span>{summary}</span>{failure && <span>Terakhir gagal: {formatJakarta(failure.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB. {formatCheckResult(failure)}</span>}{bucket.count > 0 && <Link href={`/checks?from=${bucketStart.getTime()}&to=${bucketEnd.getTime()}&range=${range.key}`} prefetch={false}>Lihat pemeriksaan →</Link>}</div>
      </details>;
    })}</div>
    <div className="bar-axis"><span>{range.label} lalu</span><span>1 batang = {range.bucketLabel}</span><span>Sekarang</span></div>
    <div className="bar-legend"><span><i className="bar-good" />Berhasil</span><span><i className="bar-failed" />Gagal</span><span><i className="bar-empty" />Belum diperiksa</span></div>
    <p className="history-note">Ketuk batang untuk melihat waktu dan hasil pemeriksaan. Persentase dihitung dari {history.length.toLocaleString("id-ID")} pemeriksaan, bukan durasi gangguan.</p>
  </div>;
}
