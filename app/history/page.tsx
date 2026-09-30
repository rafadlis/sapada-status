import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { IncidentRow } from "@/components/incident-row";
import { PageLoading } from "@/components/page-loading";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getIncidentHistory } from "@/lib/incident-history";
import { formatJakarta } from "@/lib/status";
import { pageMetadata } from "@/lib/seo";

const pageSize = 30;

type HistoryProps = { searchParams: Promise<{ page?: string; period?: string }> };

function historyQuery(params: Awaited<HistoryProps["searchParams"]>) {
  const requestedPage = Number(params.page ?? "1");
  const requestedPeriod = Number(params.period ?? "0");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100 ? requestedPage : 1;
  const period = Number.isSafeInteger(requestedPeriod) && requestedPeriod >= 0 && requestedPeriod <= 30 ? requestedPeriod : 0;
  return { page, period };
}

function historyPeriod(period: number) {
  const jakartaNow = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const year = jakartaNow.getUTCFullYear();
  const month = jakartaNow.getUTCMonth();
  const from = new Date(Date.UTC(year, month - 3 - period * 4, 1, -7));
  const to = new Date(Date.UTC(year, month + 1 - period * 4, 1, -7));
  const periodLabel = `${formatJakarta(from, { month: "short", year: "numeric" })} – ${formatJakarta(new Date(to.getTime() - 1), { month: "short", year: "numeric" })}`;
  return { from, to, periodLabel };
}

export async function generateMetadata({ searchParams }: HistoryProps): Promise<Metadata> {
  const { page, period } = historyQuery(await searchParams);
  const query = new URLSearchParams();
  if (period > 0) query.set("period", String(period));
  if (page > 1) query.set("page", String(page));
  const path = query.size ? `/history?${query}` : "/history";
  const { periodLabel } = historyPeriod(period);
  const title = `Riwayat pembaruan${period > 0 ? ` ${periodLabel}` : ""}${page > 1 ? `, halaman ${page}` : ""}`;
  return pageMetadata(title, `Riwayat gangguan dan pemeliharaan layanan Bapenda Garut pada ${periodLabel}. Baca kronologi SAPADA, Struk Berhadiah, Simpul PAD, dan situs Bapenda.`, path);
}

export default function HistoryPage({ searchParams }: HistoryProps) {
  return <div className="status-site reference-site"><SiteHeader />
    <Suspense fallback={<PageLoading page="history" />}><HistoryContent searchParams={searchParams} /></Suspense>
    <SiteFooter /></div>;
}

async function HistoryContent({ searchParams }: HistoryProps) {
  await connection();
  const { page, period } = historyQuery(await searchParams);
  const { from, to, periodLabel } = historyPeriod(period);
  let rows: Awaited<ReturnType<typeof getIncidentHistory>>["rows"] = [];
  let updates: Awaited<ReturnType<typeof getIncidentHistory>>["updates"] = [];
  let unavailable = false;
  try {
    ({ rows, updates } = await getIncidentHistory(from.toISOString(), to.toISOString(), page, pageSize));
  } catch (error) { console.error("Failed to load incident history", error); unavailable = true; }
  const hasNext = rows.length > pageSize;
  const visible = rows.slice(0, pageSize);
  const pageHref = (target: number) => `/history?period=${period}&page=${target}`;
  const entries = visible.map((incident, index) => {
    const monthLabel = formatJakarta(incident.createdAt, { month: "long", year: "numeric" });
    const previous = visible[index - 1];
    return { incident, monthLabel, showMonth: !previous || formatJakarta(previous.createdAt, { month: "long", year: "numeric" }) !== monthLabel };
  });

  return <main className="site-width reference-history-page">
    <div className="reference-breadcrumb"><Link href="/">Bapenda Garut</Link><span>/</span><span>Riwayat</span></div>
    <div className="reference-history-toolbar"><h1>Riwayat</h1><nav aria-label="Periode riwayat">{period < 30 ? <Link href={`/history?period=${period + 1}`} aria-label="Empat bulan sebelumnya">‹</Link> : <span className="period-disabled" aria-hidden="true">‹</span>}<span>{periodLabel}</span>{period > 0 ? <Link href={period === 1 ? "/history" : `/history?period=${period - 1}`} aria-label="Empat bulan berikutnya">›</Link> : <span className="period-disabled" aria-hidden="true">›</span>}</nav></div>
    {unavailable ? <p className="reference-history-empty">Riwayat belum dapat dimuat. Coba lagi nanti.</p> : visible.length ? <div className="reference-history-list">{entries.map(({ incident, monthLabel, showMonth }) => <Fragment key={incident.id}>{showMonth && <h2 className="reference-month">{monthLabel}</h2>}<IncidentRow incident={{ ...incident, updates: updates.filter((update) => update.incidentId === incident.id) }} /></Fragment>)}</div> : <p className="reference-history-empty">Tidak ada pembaruan pada periode ini.</p>}
    {(page > 1 || hasNext) && <nav className="reference-history-pager" aria-label="Halaman riwayat">{page > 1 && <Link href={page === 2 ? `/history?period=${period}` : pageHref(page - 1)}>Lebih baru</Link>}<span>Halaman {page}</span>{hasNext && <Link href={pageHref(page + 1)}>Lebih lama</Link>}</nav>}
  </main>;
}
