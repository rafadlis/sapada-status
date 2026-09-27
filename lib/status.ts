import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { checks, incidents, incidentUpdates } from "./db/schema";
import { defaultHistoryRange, getHistoryRange } from "./history-range";
import { services } from "./services";

export type PublicStatus = "operational" | "degraded" | "unknown";
type Check = typeof checks.$inferSelect;
type PublicIncident = typeof incidents.$inferSelect & { updates: (typeof incidentUpdates.$inferSelect)[] };
type HistoryRange = ReturnType<typeof getHistoryRange>;

export type ServiceHistoryBucket = { count: number; failedCount: number; latestFailure: Check | null };
export type ServiceStatus = {
  service: (typeof services)[number];
  state: PublicStatus;
  latest: Check | null;
  history: ServiceHistoryBucket[];
  uptime: number | null;
};

export type StatusData = {
  state: PublicStatus;
  services: ServiceStatus[];
  incidents: PublicIncident[];
  dataError: boolean;
};

function emptyServices(bucketCount: number): ServiceStatus[] {
  return services.map((service) => ({
    service,
    state: "unknown",
    latest: null,
    history: Array.from({ length: bucketCount }, () => ({ count: 0, failedCount: 0, latestFailure: null })),
    uptime: null,
  }));
}

export async function getStatusData(range: HistoryRange | null = defaultHistoryRange, now = new Date()): Promise<StatusData> {
  if (!process.env.DATABASE_URL) {
    return { state: "unknown", services: emptyServices(range?.buckets ?? 0), incidents: [], dataError: false };
  }

  try {
    const db = getDb();
    const since = range ? new Date(now.getTime() - range.durationMs) : now;
    const bucketMs = range ? range.durationMs / range.buckets : 0;
    const bucketIndex = sql<number>`floor((extract(epoch from ${checks.checkedAt}) * 1000 - ${since.getTime()}) / ${bucketMs || 1})::integer`;
    const [latestRows, aggregateRows, recentIncidents] = await Promise.all([
      Promise.all(services.map((service) => db.select().from(checks)
        .where(eq(checks.serviceKey, service.key)).orderBy(desc(checks.checkedAt), desc(checks.id)).limit(1))),
      range ? db.select({
        serviceKey: checks.serviceKey,
        bucketIndex,
        count: sql<number>`count(*)::integer`,
        failedCount: sql<number>`count(*) filter (where ${checks.ok} = false)::integer`,
        latestFailureId: sql<number | null>`(array_agg(${checks.id} order by ${checks.checkedAt} desc, ${checks.id} desc) filter (where ${checks.ok} = false))[1]`,
      }).from(checks).where(and(gte(checks.checkedAt, since), lt(checks.checkedAt, now)))
        .groupBy(checks.serviceKey, sql`2`) : Promise.resolve([] as {
          serviceKey: string; bucketIndex: number; count: number; failedCount: number; latestFailureId: number | null;
        }[]),
      db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(30),
    ]);
    const failureIds = aggregateRows.flatMap((row) => row.latestFailureId === null ? [] : [row.latestFailureId]);
    const [failures, updates] = await Promise.all([
      failureIds.length ? db.select().from(checks).where(inArray(checks.id, failureIds)) : Promise.resolve([] as Check[]),
      recentIncidents.length ? db.select().from(incidentUpdates)
        .where(inArray(incidentUpdates.incidentId, recentIncidents.map((incident) => incident.id)))
        .orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id)) : Promise.resolve([] as (typeof incidentUpdates.$inferSelect)[]),
    ]);
    const failureById = new Map(failures.map((failure) => [failure.id, failure]));
    const serviceStatuses = services.map((service, index): ServiceStatus => {
      const latest = latestRows[index][0] ?? null;
      const history: ServiceHistoryBucket[] = Array.from({ length: range?.buckets ?? 0 }, () => ({ count: 0, failedCount: 0, latestFailure: null }));
      for (const row of aggregateRows) {
        if (row.serviceKey !== service.key || row.bucketIndex < 0 || row.bucketIndex >= history.length) continue;
        history[row.bucketIndex] = { count: row.count, failedCount: row.failedCount,
          latestFailure: row.latestFailureId === null ? null : failureById.get(row.latestFailureId) ?? null };
      }
      const fresh = latest && now.getTime() - latest.checkedAt.getTime() < 20 * 60 * 1000;
      const state: PublicStatus = !fresh ? "unknown" : latest.ok ? "operational" : "degraded";
      const total = history.reduce((sum, bucket) => sum + bucket.count, 0);
      const failed = history.reduce((sum, bucket) => sum + bucket.failedCount, 0);
      const uptime = total ? Math.round(((total - failed) / total) * 10000) / 100 : null;
      return { service, state, latest, history, uptime };
    });
    const state: PublicStatus = serviceStatuses.some((service) => service.state === "degraded") ? "degraded"
      : serviceStatuses.some((service) => service.state === "unknown") ? "unknown" : "operational";
    return { state, services: serviceStatuses, incidents: recentIncidents.map((incident) => ({
      ...incident,
      updates: updates.filter((update) => update.incidentId === incident.id),
    })), dataError: false };
  } catch (error) {
    console.error("Failed to load status data", error);
    return { state: "unknown", services: emptyServices(range?.buckets ?? 0), incidents: [], dataError: true };
  }
}

export function formatJakarta(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...options }).format(date);
}
