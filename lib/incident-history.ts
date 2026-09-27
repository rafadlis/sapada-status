import { and, desc, gte, inArray, lt } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { incidents, incidentUpdates } from "@/lib/db/schema";

export const incidentHistoryTag = "incident-history";

export async function getIncidentHistory(fromIso: string, toIso: string, page: number, pageSize: number) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 300 });
  cacheTag(incidentHistoryTag);

  const db = getDb();
  const rows = await db.select().from(incidents)
    .where(and(gte(incidents.createdAt, new Date(fromIso)), lt(incidents.createdAt, new Date(toIso))))
    .orderBy(desc(incidents.createdAt), desc(incidents.id))
    .limit(pageSize + 1).offset((page - 1) * pageSize);
  const updates = rows.length
    ? await db.select().from(incidentUpdates)
      .where(inArray(incidentUpdates.incidentId, rows.map((row) => row.id)))
      .orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id))
    : [];
  return { rows, updates };
}
