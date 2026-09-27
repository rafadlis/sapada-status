import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "./db";
import { checks, incidents, incidentUpdates } from "./db/schema";
import { services } from "./services";

export type PublicStatus = "operational" | "degraded" | "unknown";
type Check = typeof checks.$inferSelect;
type PublicIncident = typeof incidents.$inferSelect & { updates: (typeof incidentUpdates.$inferSelect)[] };

export type ServiceStatus = {
  service: (typeof services)[number];
  state: PublicStatus;
  latest: Check | null;
  history: Check[];
  uptime: number | null;
};

export type StatusData = {
  state: PublicStatus;
  services: ServiceStatus[];
  incidents: PublicIncident[];
  dataError: boolean;
};

function emptyServices(): ServiceStatus[] {
  return services.map((service) => ({ service, state: "unknown", latest: null, history: [], uptime: null }));
}

export async function getStatusData(durationMs = 30 * 60 * 1000, now = new Date()): Promise<StatusData> {
  if (!process.env.DATABASE_URL) {
    return { state: "unknown", services: emptyServices(), incidents: [], dataError: false };
  }

  try {
    const db = getDb();
    const since = new Date(now.getTime() - durationMs);
    const [latestRows, history, recentIncidents] = await Promise.all([
      Promise.all(services.map((service) => db.select().from(checks)
        .where(eq(checks.serviceKey, service.key)).orderBy(desc(checks.checkedAt), desc(checks.id)).limit(1))),
      durationMs > 0 ? db.select().from(checks)
        .where(and(gte(checks.checkedAt, since), lt(checks.checkedAt, now)))
        .orderBy(desc(checks.checkedAt), desc(checks.id)) : Promise.resolve([] as Check[]),
      db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(30),
    ]);
    const updates = recentIncidents.length
      ? await db.select().from(incidentUpdates)
        .where(inArray(incidentUpdates.incidentId, recentIncidents.map((incident) => incident.id)))
        .orderBy(desc(incidentUpdates.createdAt), desc(incidentUpdates.id))
      : [];
    const serviceStatuses = services.map((service, index): ServiceStatus => {
      const latest = latestRows[index][0] ?? null;
      const serviceHistory = history.filter((check) => check.serviceKey === service.key);
      const fresh = latest && now.getTime() - latest.checkedAt.getTime() < 20 * 60 * 1000;
      const state: PublicStatus = !fresh ? "unknown" : latest.ok ? "operational" : "degraded";
      const uptime = serviceHistory.length ? Math.round((serviceHistory.filter((check) => check.ok).length / serviceHistory.length) * 10000) / 100 : null;
      return { service, state, latest, history: serviceHistory, uptime };
    });
    const state: PublicStatus = serviceStatuses.some((service) => service.state === "degraded") ? "degraded"
      : serviceStatuses.some((service) => service.state === "unknown") ? "unknown" : "operational";
    return { state, services: serviceStatuses, incidents: recentIncidents.map((incident) => ({
      ...incident,
      updates: updates.filter((update) => update.incidentId === incident.id),
    })), dataError: false };
  } catch (error) {
    console.error("Failed to load status data", error);
    return { state: "unknown", services: emptyServices(), incidents: [], dataError: true };
  }
}

export function formatJakarta(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...options }).format(date);
}
