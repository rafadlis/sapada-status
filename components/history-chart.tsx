import Link from "next/link";
import type { checks } from "@/lib/db/schema";
import { formatCheckResult } from "@/lib/check-result";
import { getHistoryRange, historyRanges } from "@/lib/history-range";
import { formatJakarta, type PublicStatus } from "@/lib/status";

type Check = typeof checks.$inferSelect;

export function HistoryChart({ history, selectedRange, now, latest, monitorState }: {
  history: Check[];
  selectedRange: string | string[] | undefined;
  now: Date;
  latest: Check | null;
  monitorState: PublicStatus;
}) {
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

  return <section className="reference-system-card" aria-labelledby="system-status-title">
    <div className="reference-system-head"><h2 id="system-status-title">Status sistem</h2><details className="reference-range-menu"><summary>{range.label} terakhir <span aria-hidden="true">⌄</span></summary><nav aria-label="Rentang riwayat pemeriksaan">{historyRanges.map((option) => <Link key={option.key} href={option.key === "60m" ? "/" : `/?range=${option.key}`} prefetch={false} aria-current={range.key === option.key ? "page" : undefined}>{option.label}</Link>)}</nav></details></div>
    <div className="reference-service"><div className="reference-service-head"><div><span className={`reference-service-icon status-${monitorState}`} aria-hidden="true">{monitorState === "operational" ? "✓" : monitorState === "degraded" ? "!" : "?"}</span><strong>SAPADA</strong><span className="reference-service-domain">sapada.bapenda.garutkab.go.id</span></div><span className="reference-uptime">{uptime === null ? "Belum ada data" : `${uptime.toFixed(2)}% pemeriksaan berhasil`}</span></div>
      <div className="reference-bars" style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => {
        const bucketStart = new Date(start + index * bucketMs);
        const bucketEnd = new Date(start + (index + 1) * bucketMs);
        const period = `${formatJakarta(bucketStart, { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(bucketEnd, { timeStyle: "short" })} WIB`;
        const summary = bucket.count === 0 ? "Belum ada pemeriksaan" : bucket.failedCount ? `${bucket.failedCount} dari ${bucket.count} pemeriksaan gagal` : `${bucket.count} pemeriksaan berhasil`;
        const failure = bucket.latestFailure;
        const label = `${period}: ${summary}${failure ? `. ${formatCheckResult(failure)}` : ""}`;
        return <details key={index} name="history-check" className={`reference-bar-detail ${index >= range.buckets / 2 ? "reference-bar-right" : ""}`}><summary title={label} aria-label={label} className={`reference-bar ${bucket.count === 0 ? "reference-bar-empty" : bucket.failedCount ? "reference-bar-failed" : "reference-bar-good"}`} />
          <div className="reference-bar-popover"><strong>{period}</strong><span>{summary}</span>{failure && <span>Terakhir gagal: {formatJakarta(failure.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB. {formatCheckResult(failure)}</span>}{bucket.count > 0 && <Link href={`/checks?from=${bucketStart.getTime()}&to=${bucketEnd.getTime()}&range=${range.key}`} prefetch={false}>Lihat semua pemeriksaan</Link>}</div>
        </details>;
      })}</div>
      <div className="reference-bar-axis"><span>{range.label} lalu</span><span>1 batang = {range.bucketLabel}</span><span>Sekarang</span></div>
      <div className="reference-service-foot"><p><span className="reference-legend"><i className="reference-bar-good" />Berhasil<i className="reference-bar-failed" />Gagal<i className="reference-bar-empty" />Belum diperiksa</span> · {history.length.toLocaleString("id-ID")} pemeriksaan tercatat. Persentase menghitung pemeriksaan, bukan durasi gangguan.</p><p>{latest ? <>Terakhir diperiksa <time dateTime={latest.checkedAt.toISOString()}>{formatJakarta(latest.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB</time>{!latest.ok && <> · {formatCheckResult(latest)}</>}</> : "Belum ada pemeriksaan terbaru."}</p></div>
    </div>
  </section>;
}
