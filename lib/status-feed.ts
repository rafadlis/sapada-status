import { components } from "./components";
import { isIncidentKind, isValidIncidentState } from "./incident";

const monitorKeys = ["sapada", ...components.map((item) => item.key)];
type PublicCheck = { serviceKey: string; ok: boolean; checkedAt: Date };
type PublicIncident = {
  id: number;
  title: string;
  message: string;
  kind: string;
  state: string;
  updatedAt: Date;
  affectedComponentKeys: string[] | null;
};

/** Explicit public fields only. Provider details and recipient data stay private. */
export function buildStatusFeed(
  checks: PublicCheck[],
  incidents: PublicIncident[],
  now = new Date(),
  available = true,
) {
  const monitors = monitorKeys.map((key) => {
    const latest = available
      ? checks.find((item) => item.serviceKey === key)
      : undefined;
    const age = latest ? now.getTime() - latest.checkedAt.getTime() : Infinity;
    const fresh = age >= -60_000 && age < 20 * 60_000;
    return {
      key,
      state: !fresh ? "unknown" : latest?.ok ? "operational" : "degraded",
      checkedAt: latest?.checkedAt.toISOString() ?? null,
    };
  });
  const state = monitors.some((item) => item.state === "degraded")
    ? "degraded"
    : monitors.some((item) => item.state === "unknown")
      ? "unknown"
      : "operational";
  const dates = monitors.flatMap((item) =>
    item.checkedAt ? [item.checkedAt] : [],
  );
  return {
    version: 1,
    available,
    generatedAt: now.toISOString(),
    service: {
      state,
      checkedAt: dates.length === monitorKeys.length ? dates.sort()[0] : null,
    },
    components: monitors,
    incidents: available
      ? incidents
          .filter(
            (item) =>
              item.state !== "resolved" &&
              isIncidentKind(item.kind) &&
              isValidIncidentState(item.kind, item.state),
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            kind: item.kind,
            state: item.state,
            updatedAt: item.updatedAt.toISOString(),
            affectedComponentKeys: item.affectedComponentKeys,
          }))
      : [],
  };
}

export const statusFeedMonitorKeys = monitorKeys;
