import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { incidents, incidentUpdates } from "@/lib/db/schema";
import { stateLabel } from "@/lib/incident";

function escapeXml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character); }

export async function GET(request: Request) {
  const db = getDb();
  const updates = await db.select({ update: incidentUpdates, incident: incidents }).from(incidentUpdates).innerJoin(incidents, eq(incidentUpdates.incidentId, incidents.id))
    .orderBy(desc(incidentUpdates.createdAt)).limit(30);
  const origin = new URL(request.url).origin;
  const items = updates.map(({ update, incident }) => `<item><title>${escapeXml(`${incident.title} — ${stateLabel(update.state)}`)}</title><link>${origin}/incidents/${incident.id}</link><guid isPermaLink="false">sapada-update-${update.id}</guid><pubDate>${update.createdAt.toUTCString()}</pubDate><description>${escapeXml(update.message)}</description></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Status SAPADA Garut</title><link>${origin}</link><description>Pembaruan resmi layanan SAPADA Garut</description><language>id</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}
