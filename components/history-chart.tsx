import Link from "next/link";
import { HistoryRangeMenu } from "@/components/history-range-menu";
import { formatCheckResult } from "@/lib/check-result";
import { getHistoryRange, getHistoryWindow } from "@/lib/history-range";
import { formatJakarta, type ServiceStatus } from "@/lib/status";

export function HistoryChart({ services, selectedRange, now }: {
  services: ServiceStatus[];
  selectedRange: string | string[] | undefined;
  now: Date;
}) {
  const range = getHistoryRange(selectedRange);
  return <section className="reference-system-card" aria-labelledby="system-status-title">
    <div className="reference-system-head"><h2 id="system-status-title">Status sistem</h2><HistoryRangeMenu key={range.key} selectedRange={range.key} /></div>
    <div className="reference-service-legend"><div className="reference-legend" aria-label="Legenda pemeriksaan"><span><i className="reference-bar-good" aria-hidden="true" />Berhasil</span><span><i className="reference-bar-failed" aria-hidden="true" />Gagal</span><span><i className="reference-bar-empty" aria-hidden="true" />Belum diperiksa</span></div></div>
    {services.map((service) => <ServiceHistoryRow key={service.service.key} service={service} range={range} now={now} />)}
  </section>;
}

function ServiceHistoryRow({ service, range, now }: {
  service: ServiceStatus;
  range: ReturnType<typeof getHistoryRange>;
  now: Date;
}) {
  const { start, bucketMs } = getHistoryWindow(range, now);
  const buckets = service.history;
  const stateLabel = service.state === "operational" ? "Beroperasi" : service.state === "degraded" ? "Terganggu" : "Belum diketahui";

  return <div className="reference-service" aria-label={`${service.service.name}: ${stateLabel}`}>
    <div className="reference-service-head"><div><span className={`reference-service-icon status-${service.state}`} aria-hidden="true">{service.state === "operational" ? "✓" : service.state === "degraded" ? "!" : "?"}</span><strong>{service.service.name}</strong><Link className="reference-service-domain" href={service.service.url} target="_blank" rel="noopener noreferrer" title={`Buka ${service.service.name} di tab baru`}>{service.service.host}</Link></div><span className="reference-uptime" title="Persentase pemeriksaan yang berhasil selama rentang terpilih">{service.uptime === null ? "Uptime belum tersedia" : `${service.uptime.toFixed(2)}% uptime`}</span></div>
    <div className="reference-bars" style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => {
      const bucketStart = new Date(start.getTime() + index * bucketMs);
      const bucketEnd = new Date(start.getTime() + (index + 1) * bucketMs);
      const period = range.bucketLabel === "1 hari"
        ? formatJakarta(bucketStart, { dateStyle: "medium" })
        : `${formatJakarta(bucketStart, { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(bucketEnd, { timeStyle: "short" })} WIB`;
      const summary = bucket.count === 0 ? "Belum ada pemeriksaan" : bucket.failedCount ? `${bucket.failedCount} dari ${bucket.count} pemeriksaan gagal` : `${bucket.count} pemeriksaan berhasil`;
      const failure = bucket.latestFailure;
      const label = `${service.service.name}, ${period}: ${summary}${failure ? `. ${formatCheckResult(failure)}` : ""}`;
      return <details key={index} name="history-check" className={`reference-bar-detail ${index >= range.buckets / 2 ? "reference-bar-right" : ""}`}><summary title={label} aria-label={label} className={`reference-bar ${bucket.count === 0 ? "reference-bar-empty" : bucket.failedCount ? "reference-bar-failed" : "reference-bar-good"}`} />
        <div className="reference-bar-popover"><strong>{service.service.name} · {period}</strong><span>{summary}</span>{failure && <span>Terakhir gagal: {formatJakarta(failure.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB. {formatCheckResult(failure)}</span>}{bucket.count > 0 && <Link href={`/checks?service=${service.service.key}&from=${bucketStart.getTime()}&to=${bucketEnd.getTime()}&range=${range.key}`}>Lihat semua pemeriksaan</Link>}</div>
      </details>;
    })}</div>
    <div className="reference-bar-axis"><span>{range.label} lalu</span><span>1 batang = {range.bucketLabel}</span><span>Sekarang</span></div>
  </div>;
}
