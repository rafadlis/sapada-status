import { getHistoryRange } from "@/lib/history-range";
import { services } from "@/lib/services";

export function HistoryChartSkeleton({ range, overlay = false }: {
  range: ReturnType<typeof getHistoryRange>;
  overlay?: boolean;
}) {
  return <div className={overlay ? "chart-loading-overlay" : "reference-system-card chart-loading-card"} role="status" aria-live="polite" data-testid="history-chart-skeleton">
    <span className="visually-hidden">Memuat status {range.label} terakhir…</span>
    <div className="reference-system-head"><h2>Status sistem</h2><span className="chart-loading-range">{range.label} terakhir</span></div>
    <div className="reference-service-legend"><div className="reference-legend" aria-hidden="true"><span><i className="reference-bar-good" />Berhasil</span><span><i className="reference-bar-mixed" />Sebagian gagal</span><span><i className="reference-bar-failed" />Gagal</span><span><i className="reference-bar-empty" />Belum diperiksa</span></div></div>
    {services.map((service) => <div className="reference-service" key={service.key}>
      <div className="reference-service-head"><div><span className="loading-line chart-loading-icon" /><strong>{service.name}</strong><span className="reference-service-domain">{service.host}</span></div><span className="loading-line chart-loading-uptime" /></div>
      <div className={`reference-bars${range.buckets > 60 ? " reference-bars-dense" : ""}`} style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }} aria-hidden="true">{Array.from({ length: range.buckets }, (_, index) => <span className="chart-loading-bar" key={index} />)}</div>
      <div className="reference-bar-axis"><span>{range.label} lalu</span><span>Sekarang</span></div>
    </div>)}
  </div>;
}
