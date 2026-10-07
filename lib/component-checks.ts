import { components, legacyPaymentComponent } from "./components";
import { checkTimeoutMs } from "./check-result";
import { services } from "./services";
import { healthAuthorization, integrationHealthPath } from "./integration-signature";

type ComponentResult = {
  key: (typeof components)[number]["key"];
  ok: boolean | null;
  latencyMs: number | null;
};

export function parseComponentResults(value: unknown): ComponentResult[] | null {
  if (!value || typeof value !== "object" || !("results" in value) || !Array.isArray(value.results)) return null;
  const legacyComponents = [components[0], components[1], legacyPaymentComponent, components[5]];
  const expected = value.results.length === components.length ? components : legacyComponents;
  if (value.results.length !== expected.length) return null;
  const results = new Map<string, { key: string; ok: boolean | null; latencyMs: number | null }>();
  for (const row of value.results) {
    if (!row || typeof row !== "object" || !("key" in row) || !("ok" in row) || !("latencyMs" in row)) return null;
    const component = expected.find((entry) => entry.key === row.key);
    if (!component || results.has(component.key) || (row.ok !== null && typeof row.ok !== "boolean")) return null;
    if (row.latencyMs !== null && (typeof row.latencyMs !== "number" || !Number.isInteger(row.latencyMs) || row.latencyMs < 0 || row.latencyMs > 60_000)) return null;
    results.set(component.key, { key: component.key, ok: row.ok, latencyMs: row.latencyMs as number | null });
  }
  // A combined legacy result cannot establish the state of any one payment method.
  return components.map((component) => ({ key: component.key,
    ok: results.get(component.key)?.ok ?? null, latencyMs: results.get(component.key)?.latencyMs ?? null }));
}

export async function runComponentChecks() {
  const token = process.env.INTEGRATION_HEALTH_TOKEN;
  if (!token) return [];

  const url = new URL(integrationHealthPath, services[0].url);
  url.searchParams.set("version", "2");
  try {
    const response = await fetch(url, {
      headers: { authorization: healthAuthorization(token) },
      cache: "no-store",
      signal: AbortSignal.timeout(checkTimeoutMs),
    });
    if (!response.ok) throw new Error("Probe unavailable");
    const results = parseComponentResults(await response.json());
    if (!results) throw new Error("Invalid probe response");
    const available = results.filter((result): result is ComponentResult & { ok: boolean } => result.ok !== null);
    return available.map((result) => ({
      serviceKey: result.key,
      ok: result.ok,
      statusCode: null,
      latencyMs: result.latencyMs,
      error: result.ok ? null : "Integration unavailable",
    }));
  } catch {
    return components.map((component) => ({
      serviceKey: component.key,
      ok: false,
      statusCode: null,
      latencyMs: null,
      error: "Integration probe unavailable",
    }));
  }
}
