import { desc, gte } from "drizzle-orm";
import { getDb } from "./db";
import { checks, incidents } from "./db/schema";

export type PublicStatus = "operational" | "degraded" | "unknown";

export async function getStatusData(durationMs = 30 * 24 * 60 * 60 * 1000, now = new Date()) {
  if (!process.env.DATABASE_URL) {
    return { state: "unknown" as PublicStatus, latest: null, history: [], incidents: [], uptime: null, dataError: false };
  }

  try {
    const db = getDb();
    const since = new Date(now.getTime() - durationMs);
    const [latestRows, history, recentIncidents] = await Promise.all([
      db.select().from(checks).orderBy(desc(checks.checkedAt)).limit(1),
      db.select().from(checks).where(gte(checks.checkedAt, since)).orderBy(desc(checks.checkedAt)).limit(9000),
      db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(12),
    ]);
    const latest = latestRows[0] ?? null;
    const fresh = latest && now.getTime() - latest.checkedAt.getTime() < 20 * 60 * 1000;
    const state: PublicStatus = !fresh ? "unknown" : latest.ok ? "operational" : "degraded";
    const uptime = history.length ? Math.round((history.filter((check) => check.ok).length / history.length) * 10000) / 100 : null;
    return { state, latest, history, incidents: recentIncidents, uptime, dataError: false };
  } catch (error) {
    console.error("Failed to load status data", error);
    return { state: "unknown" as PublicStatus, latest: null, history: [], incidents: [], uptime: null, dataError: true };
  }
}

export function formatJakarta(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...options }).format(date);
}
