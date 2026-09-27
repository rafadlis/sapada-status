import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { HistoryChart } from "@/components/history-chart";
import { IncidentRow } from "@/components/incident-row";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { PageLoading } from "@/components/page-loading";
import { getHistoryRange } from "@/lib/history-range";
import { getStatusData } from "@/lib/status";

type HomeProps = { searchParams: Promise<{ range?: string | string[] }> };

export default function Home({ searchParams }: HomeProps) {
  return <div className="status-site reference-site"><AutoRefresh /><SiteHeader />
    <Suspense fallback={<PageLoading page="home" />}><SelectedRangeStatus searchParams={searchParams} /></Suspense>
    <SiteFooter /></div>;
}

async function SelectedRangeStatus({ searchParams }: HomeProps) {
  const range = getHistoryRange((await searchParams).range);
  return <Suspense key={range.key} fallback={<PageLoading page="home" range={range} />}>
    <LiveStatus range={range} />
  </Suspense>;
}

async function LiveStatus({ range }: { range: ReturnType<typeof getHistoryRange> }) {
  await connection();
  const now = new Date();
  const data = await getStatusData(range.durationMs, now);
  const active = data.incidents.filter((incident) => incident.state !== "resolved");
  const serviceStatuses = data.services.map((service) => ({
    ...service,
    state: active.some((incident) => incident.serviceKey === service.service.key && incident.kind !== "maintenance") ? "degraded" as const : service.state,
  }));
  const hasDisruption = active.some((incident) => incident.kind !== "maintenance");
  const state = hasDisruption || data.state === "degraded" ? "degraded" : data.state;
  const copy = state === "degraded" ? { title: "Layanan sedang terganggu", detail: "Satu atau lebih layanan tidak dapat diakses. Lihat status tiap layanan dan pembaruan pengelola di bawah." }
    : state === "operational" ? { title: "Semua layanan beroperasi", detail: "Tidak ada gangguan yang diketahui pada layanan yang dipantau." }
      : { title: "Status belum dapat dipastikan", detail: "Setidaknya satu layanan belum memiliki pemeriksaan terbaru. Status akan diperbarui setelah pemeriksaan berikutnya." };

  return <main className="site-width reference-main">
    <section className={`reference-overall overall-${state}`} aria-label="Kondisi layanan saat ini"><div className="reference-overall-head"><span className="reference-overall-icon" aria-hidden="true">{state === "operational" ? "✓" : state === "degraded" ? "!" : "?"}</span><h1>{copy.title}</h1></div><div className="reference-overall-body"><p>{copy.detail}</p>{active[0] && <Link href={`/incidents/${active[0].id}`}>{active[0].title}</Link>}</div></section>

    <HistoryChart services={serviceStatuses} selectedRange={range.key} now={now} />
    <div className="reference-history-action"><Link href="/history">Lihat riwayat pembaruan</Link></div>

    {active.length > 0 && <section className="reference-updates" aria-labelledby="updates-title"><div className="reference-updates-heading"><h2 id="updates-title">Pembaruan terkini</h2><Link href="/history">Semua riwayat</Link></div><div>{active.map((incident) => <IncidentRow incident={incident} key={incident.id} />)}</div></section>}
    <p className="reference-disclaimer">Pemeriksaan dijadwalkan setiap lima menit. Status menjadi belum diketahui jika tidak ada hasil baru selama 20 menit.</p>
  </main>;
}
