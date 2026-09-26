import { connection } from "next/server";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { HistoryChart } from "@/components/history-chart";
import { IncidentCard } from "@/components/incident-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { formatCheckResult } from "@/lib/check-result";
import { getHistoryRange } from "@/lib/history-range";
import { formatJakarta, getStatusData } from "@/lib/status";

export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  await connection();
  const range = getHistoryRange((await searchParams).range);
  const now = new Date();
  const data = await getStatusData(range.durationMs, now);
  const active = data.incidents.filter((incident) => incident.state !== "resolved");
  const hasIncident = active.some((incident) => incident.kind !== "maintenance");
  const state = hasIncident || data.state === "degraded" ? "degraded" : data.state;
  const copy = state === "degraded" ? { title: "Gangguan layanan terdeteksi", detail: "SAPADA sedang mengalami gangguan. Lihat pembaruan pengelola dan hasil pemeriksaan di bawah." }
    : state === "operational" ? { title: "Layanan beroperasi", detail: "SAPADA dapat diakses berdasarkan pemeriksaan terakhir." }
      : { title: "Status belum dapat dipastikan", detail: "Belum ada pemeriksaan terbaru. Informasi akan diperbarui setelah pemeriksaan berikutnya." };

  return <div className="status-site"><AutoRefresh /><SiteHeader /><main className="site-width public-main">
    <div className="page-intro"><div><span className="eyebrow">STATUS LAYANAN PUBLIK</span><h1>Status SAPADA Garut</h1><p>Informasi ketersediaan layanan dan pembaruan resmi dari pengelola.</p></div></div>
    <section className={`overall-banner overall-${state}`} aria-label="Kondisi layanan saat ini"><span className="overall-icon" aria-hidden="true">{state === "operational" ? "✓" : state === "degraded" ? "!" : "?"}</span><div><h2>{copy.title}</h2><p>{copy.detail}</p></div></section>

    {active.length > 0 && <section className="section current-section" aria-labelledby="current-title"><div className="section-title"><div><span className="eyebrow">PEMBARUAN RESMI</span><h2 id="current-title">Sedang berlangsung</h2></div></div><div className="incident-stack">{active.map((incident) => <IncidentCard incident={incident} key={incident.id} />)}</div></section>}

    <section className="section" aria-labelledby="service-title"><div className="section-title"><div><span className="eyebrow">PEMANTAUAN OTOMATIS</span><h2 id="service-title">Kondisi layanan</h2></div><span className="section-aside">Diperbarui otomatis setiap menit</span></div>
      <div className="service-card"><div className="service-row"><div><span className={`service-dot dot-${data.state}`} /><strong>SAPADA</strong><span className="service-url">sapada.bapenda.garutkab.go.id</span></div><span className={`service-label label-${data.state}`}>{data.state === "operational" ? "Beroperasi" : data.state === "degraded" ? "Tidak dapat diakses" : "Belum diketahui"}</span></div>
        <HistoryChart history={data.history} selectedRange={range.key} now={now} />
        <div className="service-last"><span>Pemeriksaan terakhir</span><time>{data.latest ? `${formatJakarta(data.latest.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB` : "Belum tersedia"}</time></div>
        {data.latest && !data.latest.ok && <p className="service-error">{formatCheckResult(data.latest)}</p>}
      </div>
    </section>

    <section className="section" aria-labelledby="recent-title"><div className="section-title"><div><span className="eyebrow">CATATAN PENGELOLA</span><h2 id="recent-title">Pembaruan terbaru</h2></div><Link className="text-link" href="/history">Lihat riwayat →</Link></div>
      {data.incidents.length ? <div className="incident-stack">{data.incidents.filter((incident) => incident.state === "resolved").slice(0, 3).map((incident) => <IncidentCard incident={incident} key={incident.id} compact />)}{data.incidents.every((incident) => incident.state !== "resolved") && <p className="muted-box">Semua informasi terbaru sedang berlangsung. Baca kronologi di atas.</p>}</div> : <p className="muted-box">Belum ada pembaruan dari pengelola.</p>}
    </section>
    <p className="site-disclaimer">Pemeriksaan otomatis dijadwalkan setiap lima menit. Status menjadi belum diketahui jika hasil terbaru berusia lebih dari 20 menit. Catatan pengelola memberikan konteks saat layanan terganggu.</p>
  </main><SiteFooter /></div>;
}
