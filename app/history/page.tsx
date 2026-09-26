import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { IncidentCard } from "@/components/incident-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getDb } from "@/lib/db";
import { incidents, incidentUpdates } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Riwayat pembaruan | Status SAPADA Garut" };
const pageSize = 20;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await connection();
  const requested = Number((await searchParams).page ?? "1");
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 100 ? requested : 1;
  let rows: (typeof incidents.$inferSelect)[] = [];
  let updates: (typeof incidentUpdates.$inferSelect)[] = [];
  let unavailable = false;
  try {
    const db = getDb();
    rows = await db.select().from(incidents).orderBy(desc(incidents.createdAt), desc(incidents.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
    if (rows.length) updates = await db.select().from(incidentUpdates).where(inArray(incidentUpdates.incidentId, rows.map((row) => row.id))).orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id));
  } catch (error) { console.error("Failed to load incident history", error); unavailable = true; }
  const hasNext = rows.length > pageSize;
  const visible = rows.slice(0, pageSize);
  return <div className="status-site"><SiteHeader /><main className="site-width subpage-main"><Link className="back-link" href="/">← Kembali ke status</Link><span className="eyebrow">PEMBARUAN RESMI</span><h1>Riwayat layanan</h1><p className="page-description">Catatan gangguan dan pemeliharaan yang diterbitkan oleh pengelola SAPADA.</p>
    {unavailable ? <p className="muted-box">Riwayat belum dapat dimuat. Coba lagi nanti.</p> : visible.length ? <div className="incident-stack">{visible.map((incident) => <IncidentCard key={incident.id} incident={{ ...incident, updates: updates.filter((update) => update.incidentId === incident.id) }} />)}</div> : <p className="muted-box">Belum ada pembaruan yang diterbitkan.</p>}
    {(page > 1 || hasNext) && <nav className="pager" aria-label="Halaman riwayat">{page > 1 && <Link href={page === 2 ? "/history" : `/history?page=${page - 1}`}>← Lebih baru</Link>}<span>Halaman {page}</span>{hasNext && <Link href={`/history?page=${page + 1}`}>Lebih lama →</Link>}</nav>}
  </main><SiteFooter /></div>;
}
