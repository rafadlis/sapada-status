import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { checks, incidents, incidentUpdates } from "./db/schema";
import { defaultHistoryRange, getHistoryRange, getHistoryWindow } from "./history-range";
import { services } from "./services";
import { components, monitoredComponents, sapadaHistoryKeys, skippedComponentKeys } from "./components";
import { rollupSapadaStatus } from "./status-rollup";

export type PublicStatus = "operational" | "degraded" | "unknown";
type Check = typeof checks.$inferSelect;
type PublicIncident = typeof incidents.$inferSelect & { updates: (typeof incidentUpdates.$inferSelect)[] };
type HistoryRange = ReturnType<typeof getHistoryRange>;

export type ServiceHistoryBucket = { count: number; failedCount: number; latestFailure: Check | null; partialCount?: number };
export type ServiceStatus = {
  service: (typeof services)[number] | (typeof components)[number];
  displayName?: string;
  isOverall?: boolean;
  state: PublicStatus | "skipped";
  latest: Check | null;
  history: ServiceHistoryBucket[];
  uptime: number | null;
};

export type StatusData = {
  state: PublicStatus;
  services: ServiceStatus[];
  components: ServiceStatus[];
  incidents: PublicIncident[];
  dataError: boolean;
};

const monitors = [...services, ...components] as const;

export function countMonitoredSapadaChecks() {
  const keys = ["sapada", ...monitoredComponents.map((component) => component.key)];
  return sql<number>`count(distinct ${checks.serviceKey}) filter (where ${inArray(checks.serviceKey, keys)})::integer`;
}

function emptyMonitors(bucketCount: number): ServiceStatus[] {
  return monitors.map((service) => ({
    service,
    state: skippedComponentKeys.includes(service.key) ? "skipped" : "unknown",
    latest: null,
    history: Array.from({ length: bucketCount }, () => ({ count: 0, failedCount: 0, latestFailure: null })),
    uptime: null,
  }));
}

function groupMonitors(monitors: ServiceStatus[], overallHistory: ServiceHistoryBucket[]) {
  const rawServices = monitors.slice(0, services.length);
  const integrations = monitors.slice(services.length);
  const site = rawServices[0];
  return {
    services: [rollupSapadaStatus(site, integrations, overallHistory), ...rawServices.slice(1)],
    components: [{ ...site, displayName: "Situs SAPADA" }, ...integrations],
  };
}

export async function getStatusData(range: HistoryRange | null = defaultHistoryRange, now = new Date()): Promise<StatusData> {
  if (!process.env.DATABASE_URL) {
    const empty = emptyMonitors(range?.buckets ?? 0);
    return { state: "unknown", ...groupMonitors(empty, empty[0].history), incidents: [], dataError: false };
  }

  try {
    const db = getDb();
    const window = range ? getHistoryWindow(range, now) : null;
    const since = window?.start ?? now;
    const bucketMs = window?.bucketMs ?? 0;
    const bucketIndex = sql<number>`floor((extract(epoch from ${checks.checkedAt}) * 1000 - ${since.getTime()}) / ${bucketMs || 1})::integer`;
    const sapadaKeys = sapadaHistoryKeys;
    const runs = db.select({
      checkedAt: checks.checkedAt,
      bucketIndex: bucketIndex.as("bucket_index"),
      observed: countMonitoredSapadaChecks().as("observed"),
      failed: sql<boolean>`bool_or(${checks.ok} = false)`.as("failed"),
      latestFailureId: sql<number | null>`(array_agg(${checks.id} order by ${checks.id} desc) filter (where ${checks.ok} = false))[1]`.as("latest_failure_id"),
    }).from(checks).where(and(inArray(checks.serviceKey, sapadaKeys), gte(checks.checkedAt, since), lt(checks.checkedAt, now)))
      .groupBy(checks.checkedAt).as("sapada_runs");
    const [latestRows, aggregateRows, overallRows, recentIncidents] = await Promise.all([
      Promise.all(monitors.map((service) => skippedComponentKeys.includes(service.key) ? Promise.resolve([] as Check[]) : db.select().from(checks)
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
      range ? db.select({
        bucketIndex: runs.bucketIndex,
        count: sql<number>`count(*)::integer`,
        failedCount: sql<number>`count(*) filter (where ${runs.failed})::integer`,
        partialCount: sql<number>`count(*) filter (where ${runs.observed} < ${monitoredComponents.length + 1})::integer`,
        latestFailureId: sql<number | null>`(array_agg(${runs.latestFailureId} order by ${runs.checkedAt} desc) filter (where ${runs.failed}))[1]`,
      }).from(runs).groupBy(runs.bucketIndex) : Promise.resolve([] as {
        bucketIndex: number; count: number; failedCount: number; partialCount: number; latestFailureId: number | null;
      }[]),
      db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(30),
    ]);
    const failureIds = [...aggregateRows, ...overallRows].flatMap((row) => row.latestFailureId === null ? [] : [row.latestFailureId]);
    const [failures, updates] = await Promise.all([
      failureIds.length ? db.select().from(checks).where(inArray(checks.id, failureIds)) : Promise.resolve([] as Check[]),
      recentIncidents.length ? db.select().from(incidentUpdates)
        .where(inArray(incidentUpdates.incidentId, recentIncidents.map((incident) => incident.id)))
        .orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id)) : Promise.resolve([] as (typeof incidentUpdates.$inferSelect)[]),
    ]);
    const failureById = new Map(failures.map((failure) => [failure.id, failure]));
    const monitorStatuses = monitors.map((service, index): ServiceStatus => {
      const latest = latestRows[index][0] ?? null;
      const history: ServiceHistoryBucket[] = Array.from({ length: range?.buckets ?? 0 }, () => ({ count: 0, failedCount: 0, latestFailure: null }));
      if (skippedComponentKeys.includes(service.key)) return { service, state: "skipped", latest: null, history, uptime: null };
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
    const overallHistory: ServiceHistoryBucket[] = Array.from({ length: range?.buckets ?? 0 }, () => ({ count: 0, failedCount: 0, latestFailure: null }));
    for (const row of overallRows) {
      if (row.bucketIndex < 0 || row.bucketIndex >= overallHistory.length) continue;
      overallHistory[row.bucketIndex] = { count: row.count, failedCount: row.failedCount,
        partialCount: row.partialCount,
        latestFailure: row.latestFailureId === null ? null : failureById.get(row.latestFailureId) ?? null };
    }
    const grouped = groupMonitors(monitorStatuses, overallHistory);
    const state: PublicStatus = grouped.services.some((service) => service.state === "degraded") ? "degraded"
      : grouped.services.some((service) => service.state === "unknown") ? "unknown" : "operational";
    return { state, ...grouped, incidents: recentIncidents.map((incident) => ({
      ...incident,
      updates: updates.filter((update) => update.incidentId === incident.id),
    })), dataError: false };
  } catch (error) {
    console.error("Failed to load status data", error);
    const empty = emptyMonitors(range?.buckets ?? 0);
    return { state: "unknown", ...groupMonitors(empty, empty[0].history), incidents: [], dataError: true };
  }
}

export function formatJakarta(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...options }).format(date);
}
