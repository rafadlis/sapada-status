import Link from "next/link";
import { HistoryRangeMenu } from "@/components/history-range-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <div className="reference-service-legend"><div className="reference-legend" aria-label="Legenda pemeriksaan"><span><i className="reference-bar-good" aria-hidden="true" />Berhasil</span><span><i className="reference-bar-mixed" aria-hidden="true" />Sebagian gagal</span><span><i className="reference-bar-failed" aria-hidden="true" />Gagal</span><span><i className="reference-bar-empty" aria-hidden="true" />Belum diperiksa</span></div></div>
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
    <div className="reference-service-head"><div><span className={`reference-service-icon status-${service.state}`} aria-hidden="true">{service.state === "operational" ? "✓" : service.state === "degraded" ? "!" : "?"}</span><strong>{service.service.name}</strong>
      <Tooltip><TooltipTrigger render={<Link className="reference-service-domain" href={service.service.url} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${service.service.name} di tab baru`} />}>{service.service.host}</TooltipTrigger><TooltipContent>Buka {service.service.name} di tab baru</TooltipContent></Tooltip>
    </div><Tooltip><TooltipTrigger render={<span className="reference-uptime" tabIndex={0} aria-label={`${service.uptime === null ? "Waktu aktif belum tersedia" : `${service.uptime.toFixed(2)}% waktu aktif`}. Persentase pemeriksaan yang berhasil selama rentang terpilih`} />}>{service.uptime === null ? "Waktu aktif belum tersedia" : `${service.uptime.toFixed(2)}% waktu aktif`}</TooltipTrigger><TooltipContent>Persentase pemeriksaan yang berhasil selama rentang terpilih</TooltipContent></Tooltip></div>
    <div className={`reference-bars${range.buckets > 60 ? " reference-bars-dense" : ""}`} style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => {
      const bucketStart = new Date(start.getTime() + index * bucketMs);
      const bucketEnd = new Date(start.getTime() + (index + 1) * bucketMs);
      const period = range.bucketLabel === "1 hari"
        ? formatJakarta(bucketStart, { dateStyle: "medium" })
        : `${formatJakarta(bucketStart, { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(bucketEnd, { timeStyle: "short" })} WIB`;
      const bucketState = bucket.count === 0 ? "empty" : bucket.failedCount === 0 ? "good" : bucket.failedCount === bucket.count ? "failed" : "mixed";
      const summary = bucketState === "empty" ? "Belum ada pemeriksaan" : bucketState === "good" ? `${bucket.count} pemeriksaan berhasil` : bucketState === "mixed" ? `Sebagian gagal: ${bucket.failedCount} dari ${bucket.count} pemeriksaan gagal` : `${bucket.count} pemeriksaan gagal`;
      const failure = bucket.latestFailure;
      const label = `${service.service.name}, ${period}: ${summary}${failure ? `. ${formatCheckResult(failure)}` : ""}`;
      const barClass = `reference-bar reference-bar-${bucketState}`;
      const trigger = bucket.count > 0
        ? <Link href={`/checks?service=${service.service.key}&from=${bucketStart.getTime()}&to=${Math.min(bucketEnd.getTime(), now.getTime())}&range=${range.key}`} className={barClass} aria-label={`${label}. Lihat semua pemeriksaan.`} />
        : <button type="button" className={barClass} aria-label={label} />;
      return <Tooltip key={index}>
        <TooltipTrigger render={trigger} />
        <TooltipContent side="top" className="reference-check-tooltip">
          <strong>{service.service.name} · {period}</strong>
          <span>{summary}</span>
          {failure && <span>Terakhir gagal: {formatJakarta(failure.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB. {formatCheckResult(failure)}</span>}
          {bucket.count > 0 && <span className="reference-tooltip-action">Klik batang untuk melihat pemeriksaan</span>}
        </TooltipContent>
      </Tooltip>;
    })}</div>
    <div className="reference-bar-axis"><span>{range.label} lalu</span><span>1 batang = {range.bucketLabel}</span><span>Sekarang</span></div>
  </div>;
}
