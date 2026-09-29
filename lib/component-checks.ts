import { components } from "./components";
import { checkTimeoutMs } from "./check-result";
import { services } from "./services";

type ComponentResult = {
  key: (typeof components)[number]["key"];
  ok: boolean;
  latencyMs: number | null;
};

export function parseComponentResults(value: unknown): ComponentResult[] | null {
  if (!value || typeof value !== "object" || !("results" in value) || !Array.isArray(value.results)) return null;
  if (value.results.length !== components.length) return null;
  const results = new Map<string, ComponentResult>();
  for (const row of value.results) {
    if (!row || typeof row !== "object" || !("key" in row) || !("ok" in row) || !("latencyMs" in row)) return null;
    const component = components.find((entry) => entry.key === row.key);
    if (!component || results.has(component.key) || typeof row.ok !== "boolean") return null;
    if (row.latencyMs !== null && (typeof row.latencyMs !== "number" || !Number.isInteger(row.latencyMs) || row.latencyMs < 0 || row.latencyMs > 60_000)) return null;
    results.set(component.key, { key: component.key, ok: row.ok, latencyMs: row.latencyMs as number | null });
  }
  return components.map((component) => results.get(component.key)!);
}

export async function runComponentChecks() {
  const token = process.env.INTEGRATION_HEALTH_TOKEN;
  if (!token) return [];

  const url = new URL("/api/internal/integration-health", services[0].url);
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(checkTimeoutMs),
    });
    if (!response.ok) throw new Error("Probe unavailable");
    const results = parseComponentResults(await response.json());
    if (!results) throw new Error("Invalid probe response");
    return results.map((result) => ({
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
