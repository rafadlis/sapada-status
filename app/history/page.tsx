import type { Metadata } from "next";
import { Fragment } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { and, desc, gte, inArray, lt } from "drizzle-orm";
import { IncidentRow } from "@/components/incident-row";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getDb } from "@/lib/db";
import { incidents, incidentUpdates } from "@/lib/db/schema";
import { formatJakarta } from "@/lib/status";

export const metadata: Metadata = { title: "Riwayat pembaruan | Status SAPADA Garut" };
const pageSize = 30;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string; period?: string }> }) {
  await connection();
  const params = await searchParams;
  const requestedPage = Number(params.page ?? "1");
  const requestedPeriod = Number(params.period ?? "0");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100 ? requestedPage : 1;
  const period = Number.isSafeInteger(requestedPeriod) && requestedPeriod >= 0 && requestedPeriod <= 30 ? requestedPeriod : 0;
  const jakartaNow = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const year = jakartaNow.getUTCFullYear();
  const month = jakartaNow.getUTCMonth();
  const from = new Date(Date.UTC(year, month - 3 - period * 4, 1, -7));
  const to = new Date(Date.UTC(year, month + 1 - period * 4, 1, -7));
  const periodLabel = `${formatJakarta(from, { month: "short", year: "numeric" })} – ${formatJakarta(new Date(to.getTime() - 1), { month: "short", year: "numeric" })}`;
  let rows: (typeof incidents.$inferSelect)[] = [];
  let updates: (typeof incidentUpdates.$inferSelect)[] = [];
  let unavailable = false;
  try {
    const db = getDb();
    rows = await db.select().from(incidents).where(and(gte(incidents.createdAt, from), lt(incidents.createdAt, to)))
      .orderBy(desc(incidents.createdAt), desc(incidents.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
    if (rows.length) updates = await db.select().from(incidentUpdates).where(inArray(incidentUpdates.incidentId, rows.map((row) => row.id))).orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id));
  } catch (error) { console.error("Failed to load incident history", error); unavailable = true; }
  const hasNext = rows.length > pageSize;
  const visible = rows.slice(0, pageSize);
  const pageHref = (target: number) => `/history?period=${period}&page=${target}`;
  const entries = visible.map((incident, index) => {
    const monthLabel = formatJakarta(incident.createdAt, { month: "long", year: "numeric" });
    const previous = visible[index - 1];
    return { incident, monthLabel, showMonth: !previous || formatJakarta(previous.createdAt, { month: "long", year: "numeric" }) !== monthLabel };
  });

  return <div className="status-site reference-site"><SiteHeader /><main className="site-width reference-history-page">
    <div className="reference-breadcrumb"><Link href="/">SAPADA</Link><span>/</span><span>Riwayat</span></div>
    <div className="reference-history-toolbar"><h1>Riwayat</h1><nav aria-label="Periode riwayat">{period < 30 ? <Link href={`/history?period=${period + 1}`} aria-label="Empat bulan sebelumnya">‹</Link> : <span className="period-disabled" aria-hidden="true">‹</span>}<span>{periodLabel}</span>{period > 0 ? <Link href={period === 1 ? "/history" : `/history?period=${period - 1}`} aria-label="Empat bulan berikutnya">›</Link> : <span className="period-disabled" aria-hidden="true">›</span>}</nav></div>
    {unavailable ? <p className="reference-history-empty">Riwayat belum dapat dimuat. Coba lagi nanti.</p> : visible.length ? <div className="reference-history-list">{entries.map(({ incident, monthLabel, showMonth }) => <Fragment key={incident.id}>{showMonth && <h2 className="reference-month">{monthLabel}</h2>}<IncidentRow incident={{ ...incident, updates: updates.filter((update) => update.incidentId === incident.id) }} /></Fragment>)}</div> : <p className="reference-history-empty">Tidak ada pembaruan pada periode ini.</p>}
    {(page > 1 || hasNext) && <nav className="reference-history-pager" aria-label="Halaman riwayat">{page > 1 && <Link href={page === 2 ? `/history?period=${period}` : pageHref(page - 1)}>Lebih baru</Link>}<span>Halaman {page}</span>{hasNext && <Link href={pageHref(page + 1)}>Lebih lama</Link>}</nav>}
  </main><SiteFooter /></div>;
}
