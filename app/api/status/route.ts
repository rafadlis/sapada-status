import { desc, inArray } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { buildStatusFeed, statusFeedMonitorKeys } from "@/lib/status-feed";
import { activeStatusIncidentsQuery } from "@/lib/status-feed-query";

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
      activeStatusIncidentsQuery(db),
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
