import { and, desc, inArray, ne, sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { checks, incidents, incidentUpdates } from "@/lib/db/schema";
import { buildStatusFeed, statusFeedMonitorKeys } from "@/lib/status-feed";

export async function GET() {
  await connection();
  try {
    const db = getDb();
    const [latest, activeIncidents] = await Promise.all([
      db
        .selectDistinctOn([checks.serviceKey], {
          serviceKey: checks.serviceKey,
          ok: checks.ok,
          checkedAt: checks.checkedAt,
        })
        .from(checks)
        .where(inArray(checks.serviceKey, statusFeedMonitorKeys))
        .orderBy(checks.serviceKey, desc(checks.checkedAt), desc(checks.id)),
      db
        .select({
          id: incidents.id,
          title: incidents.title,
          kind: incidents.kind,
          state: incidents.state,
          updatedAt: incidents.updatedAt,
          affectedComponentKeys: incidents.affectedComponentKeys,
          message: sql<string>`coalesce((select ${incidentUpdates.message} from ${incidentUpdates}
          where ${incidentUpdates.incidentId} = ${incidents.id}
          order by ${incidentUpdates.createdAt} desc, ${incidentUpdates.id} desc limit 1), ${incidents.message})`,
        })
        .from(incidents)
        .where(
          and(
            inArray(incidents.serviceKey, ["sapada", "all"]),
            ne(incidents.state, "resolved"),
          ),
        )
        .orderBy(desc(incidents.updatedAt), desc(incidents.id)),
    ]);
    return Response.json(buildStatusFeed(latest, activeIncidents), {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=30, must-revalidate",
      },
    });
  } catch {
    console.error("Failed to load public SAPADA status feed");
    return Response.json(buildStatusFeed([], [], new Date(), false), {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
