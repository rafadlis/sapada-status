import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { PageLoading } from "@/components/page-loading";
import { getDb } from "@/lib/db";
import { incidents, incidentUpdates } from "@/lib/db/schema";
import { kindLabel, stateLabel } from "@/lib/incident";
import { formatJakarta } from "@/lib/status";
import { getService } from "@/lib/services";

export const metadata: Metadata = { title: "Kronologi pembaruan | Status Bapenda Garut" };

type IncidentProps = { params: Promise<{ id: string }> };

export default function IncidentPage({ params }: IncidentProps) {
  return <div className="status-site"><SiteHeader />
    <Suspense fallback={<PageLoading page="incident" />}><IncidentContent params={params} /></Suspense>
    <SiteFooter /></div>;
}

async function IncidentContent({ params }: IncidentProps) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const db = getDb();
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!incident) notFound();
  const updates = await db.select().from(incidentUpdates).where(eq(incidentUpdates.incidentId, id)).orderBy(asc(incidentUpdates.createdAt), asc(incidentUpdates.id));
  return <main className="site-width subpage-main"><Link className="back-link" href="/history">← Semua riwayat</Link><span className="eyebrow">{getService(incident.serviceKey)?.name.toUpperCase() ?? "LAYANAN"} · {kindLabel(incident.kind).toUpperCase()} · {stateLabel(incident.state).toUpperCase()}</span><h1>{incident.title}</h1><p className="page-description">Diterbitkan {formatJakarta(incident.createdAt, { dateStyle: "full", timeStyle: "short" })} WIB</p>
    <div className="timeline">{updates.map((update) => <article key={update.id} className="timeline-item"><span className="timeline-dot" /><div><time dateTime={update.createdAt.toISOString()}>{formatJakarta(update.createdAt, { dateStyle: "full", timeStyle: "medium" })} WIB</time><h2>{stateLabel(update.state)}</h2>{update.message && <p>{update.message}</p>}</div></article>)}</div>
  </main>;
}
