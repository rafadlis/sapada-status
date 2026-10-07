import { components, legacyPaymentComponent, paymentComponentKeys } from "./components";
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
  // SAPADA's version 1 reader requires exactly five keys. Aggregate only here;
  // the status page, stored checks and automation use the independent monitors.
  const payments = monitors.filter((item) => (paymentComponentKeys as readonly string[]).includes(item.key));
  const paymentDates = payments.flatMap((item) => item.checkedAt ? [item.checkedAt] : []);
  const failedDates = payments.flatMap((item) => item.state === "degraded" && item.checkedAt ? [item.checkedAt] : []);
  const payment = {
    key: legacyPaymentComponent.key,
    state: payments.some((item) => item.state === "degraded") ? "degraded"
      : payments.some((item) => item.state === "unknown") ? "unknown" : "operational",
    checkedAt: failedDates.length ? failedDates.sort()[0]
      : paymentDates.length === payments.length ? paymentDates.sort()[0] : null,
  };
  const publicMonitors = [monitors[0], monitors[1], monitors[2], payment, monitors[6]];
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
    components: publicMonitors,
    paymentMethods: payments,
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
            affectedComponentKeys: item.affectedComponentKeys === null ? null
              : [...new Set(item.affectedComponentKeys.map((key) =>
                (paymentComponentKeys as readonly string[]).includes(key) ? legacyPaymentComponent.key : key))],
            // A broad payment or whole-service incident must keep its broad scope.
            affectedPaymentMethodKeys: item.affectedComponentKeys === null ||
              item.affectedComponentKeys.includes(legacyPaymentComponent.key) ? null
              : [...new Set(item.affectedComponentKeys.filter((key) =>
                (paymentComponentKeys as readonly string[]).includes(key)))],
          }))
      : [],
  };
}

export const statusFeedMonitorKeys = monitorKeys;
