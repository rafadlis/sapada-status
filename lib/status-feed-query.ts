import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { incidents, incidentUpdates } from "./db/schema";

export function activeStatusIncidentsQuery<T extends PgQueryResultHKT>(
  db: PgAsyncDatabase<T>,
) {
  // Keep the subquery as a query builder. Inline SQL in a single-table
  // projection loses column qualifiers and can compare two update columns.
  const latestUpdate = db
    .select({ message: incidentUpdates.message })
    .from(incidentUpdates)
    .where(eq(incidentUpdates.incidentId, incidents.id))
    .orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id))
    .limit(1);
  return db
    .select({
      id: incidents.id,
      title: incidents.title,
      kind: incidents.kind,
      state: incidents.state,
      updatedAt: incidents.updatedAt,
      affectedComponentKeys: incidents.affectedComponentKeys,
      message: sql<string>`coalesce(nullif((${latestUpdate}), ''), ${incidents.message})`,
    })
    .from(incidents)
    .where(
      and(
        inArray(incidents.serviceKey, ["sapada", "all"]),
        ne(incidents.state, "resolved"),
      ),
    )
    .orderBy(desc(incidents.updatedAt), desc(incidents.id));
}
