import Link from "next/link";
import type { ReactNode } from "react";
import { ComponentDisclosure, ComponentDisclosurePanel, ComponentDisclosureToggle } from "@/components/component-disclosure";
import { HistoryRangeMenu } from "@/components/history-range-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCheckResult } from "@/lib/check-result";
import { getHistoryRange, getHistoryWindow } from "@/lib/history-range";
import { formatJakarta, type ServiceStatus } from "@/lib/status";
import { getService } from "@/lib/services";

export function HistoryChart({ services, components, selectedRange, now }: {
  services: ServiceStatus[];
  components: ServiceStatus[];
  selectedRange: string | string[] | undefined;
  now: Date;
}) {
  const range = getHistoryRange(selectedRange);
  return <section className="reference-system-card" aria-labelledby="system-status-title">
    <div className="reference-system-head"><h2 id="system-status-title">Status sistem</h2><HistoryRangeMenu key={range.key} selectedRange={range.key} /></div>
    <div className="reference-service-legend"><div className="reference-legend" aria-label="Legenda pemeriksaan"><span><i className="reference-bar-good" aria-hidden="true" />Berhasil</span><span><i className="reference-bar-mixed" aria-hidden="true" />Sebagian gagal</span><span><i className="reference-bar-failed" aria-hidden="true" />Gagal</span><span><i className="reference-bar-empty" aria-hidden="true" />Belum diperiksa</span></div></div>
    {services.map((service) => service.service.key === "sapada"
      ? <ComponentDisclosure key={service.service.key}>
        <ServiceHistoryRow service={service} range={range} now={now} afterName={<ComponentDisclosureToggle count={components.length} />} />
        <ComponentDisclosurePanel>
          {components.map((component) => <ServiceHistoryRow key={component.service.key} service={component} range={range} now={now} />)}
        </ComponentDisclosurePanel>
      </ComponentDisclosure>
      : <div className="reference-service-group" key={service.service.key}>
        <ServiceHistoryRow service={service} range={range} now={now} />
      </div>)}
  </section>;
}

function ServiceHistoryRow({ service, range, now, afterName }: {
  service: ServiceStatus;
  range: ReturnType<typeof getHistoryRange>;
  now: Date;
  afterName?: ReactNode;
}) {
  const { start, bucketMs } = getHistoryWindow(range, now);
  const buckets = service.history;
  const publicService = getService(service.service.key);
  const name = service.displayName ?? service.service.name;
  const overall = service.isOverall === true;
  const stateLabel = service.state === "operational" ? "Beroperasi" : service.state === "degraded" ? "Terganggu" : "Belum diketahui";
  const uptimeHint = overall ? "Persentase putaran pemeriksaan lengkap saat seluruh komponen berhasil" : "Persentase pemeriksaan yang berhasil selama rentang terpilih";

  return <div className="reference-service" aria-label={`${name}: ${stateLabel}`}>
    <div className="reference-service-head"><div><span className={`reference-service-icon status-${service.state}`} aria-hidden="true">{service.state === "operational" ? "✓" : service.state === "degraded" ? "!" : "?"}</span><strong>{name}</strong>{afterName}
      {publicService && !overall && <Tooltip><TooltipTrigger render={<Link className="reference-service-domain" href={publicService.url} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${name} di tab baru`} />}>{publicService.host}</TooltipTrigger><TooltipContent>Buka {name} di tab baru</TooltipContent></Tooltip>}
    </div><Tooltip><TooltipTrigger render={<span className="reference-uptime" tabIndex={0} aria-label={`${service.uptime === null ? "Waktu aktif belum tersedia" : `${service.uptime.toFixed(2)}% waktu aktif`}. ${uptimeHint}`} />}>{service.uptime === null ? "Waktu aktif belum tersedia" : `${service.uptime.toFixed(2)}% waktu aktif`}</TooltipTrigger><TooltipContent>{uptimeHint}</TooltipContent></Tooltip></div>
    <div className={`reference-bars${range.buckets > 60 ? " reference-bars-dense" : ""}`} style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => {
      const bucketStart = new Date(start.getTime() + index * bucketMs);
      const bucketEnd = new Date(start.getTime() + (index + 1) * bucketMs);
      const period = range.bucketLabel === "1 hari"
        ? formatJakarta(bucketStart, { dateStyle: "medium" })
        : `${formatJakarta(bucketStart, { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(bucketEnd, { timeStyle: "short" })} WIB`;
      const bucketState = bucket.count === 0 ? "empty" : bucket.failedCount === 0 ? "good" : bucket.failedCount === bucket.count ? "failed" : "mixed";
      const subject = overall ? "putaran pemeriksaan lengkap" : "pemeriksaan";
      const summary = bucketState === "empty" ? "Belum ada pemeriksaan" : bucketState === "good" ? `${bucket.count} ${subject} berhasil` : bucketState === "mixed" ? `Sebagian gagal: ${bucket.failedCount} dari ${bucket.count} ${subject} gagal` : `${bucket.count} ${subject} gagal`;
      const failure = bucket.latestFailure;
      const label = `${name}, ${period}: ${summary}${failure ? `. ${formatCheckResult(failure)}` : ""}`;
      const barClass = `reference-bar reference-bar-${bucketState}`;
      const trigger = bucket.count > 0
        ? <Link href={`/checks?service=${service.service.key}&from=${bucketStart.getTime()}&to=${Math.min(bucketEnd.getTime(), now.getTime())}&range=${range.key}${overall ? "&view=overall" : ""}`} className={barClass} aria-label={`${label}. Lihat semua pemeriksaan.`} />
        : <button type="button" className={barClass} aria-label={label} />;
      return <Tooltip key={index}>
        <TooltipTrigger render={trigger} />
        <TooltipContent side="top" className="reference-check-tooltip">
          <strong>{name} · {period}</strong>
          <span>{summary}</span>
          {failure && <span>Terakhir gagal: {formatJakarta(failure.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB. {formatCheckResult(failure)}</span>}
          {bucket.count > 0 && <span className="reference-tooltip-action">Klik batang untuk melihat pemeriksaan</span>}
        </TooltipContent>
      </Tooltip>;
    })}</div>
    <div className="reference-bar-axis"><span>{range.label} lalu</span><span>1 batang = {range.bucketLabel}</span><span>Sekarang</span></div>
  </div>;
}
