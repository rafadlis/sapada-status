import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { parseComponentResults, runComponentChecks } from "./component-checks";
import { healthAuthorization, integrationHealthPath } from "./integration-signature";

const results: { key: string; ok: boolean | null; latencyMs: number | null; skipped?: true }[] = [
  { key: "sapada-tte", ok: true, latencyMs: 10 },
  { key: "sapada-storage", ok: true, latencyMs: 20 },
  { key: "sapada-qris-generate", ok: false, latencyMs: 30 },
  { key: "sapada-qris-check", ok: null, latencyMs: null, skipped: true },
  { key: "sapada-va-bjb", ok: true, latencyMs: 35 },
  { key: "sapada-kode-bayar", ok: true, latencyMs: 36 },
  { key: "sapada-atr-bpn", ok: true, latencyMs: 40 },
];

describe("integration result contract", () => {
  test("signs the protected read only probe request", () => {
    const timestamp = 1_700_000_000_000;
    const header = healthAuthorization("07".repeat(32), timestamp);
    const match = /^HealthSignature ([0-9]{13})\.([A-Za-z0-9_-]{86})$/.exec(header);
    assert.ok(match);
    const publicKey = createPublicKey({
      key: Buffer.from("MCowBQYDK2VwAyEA6kpsY+KcUgq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iw=", "base64"),
      format: "der",
      type: "spki",
    });
    assert.equal(verify(null, Buffer.from(`GET\n${integrationHealthPath}\n${timestamp}`), publicKey, Buffer.from(match[2], "base64url")), true);
    assert.throws(() => healthAuthorization("short", timestamp));
  });

  test("accepts a complete set regardless of order", () => {
    assert.deepEqual(parseComponentResults({ results: [...results].reverse() }), results.map((row) => ({ key: row.key, ok: row.ok, latencyMs: row.latencyMs })));
    assert.equal(parseComponentResults({ results: results.map((row, index) => index === 4 ? { ...row, ok: null } : row) })?.[4]?.ok, null);
  });

  test("old probes preserve other integrations without inventing payment results", () => {
    const legacy = [results[0], results[1], { key: "sapada-payment", ok: false, latencyMs: 30 }, results[6]];
    const parsed = parseComponentResults({ results: legacy })!;
    assert.deepEqual(parsed.slice(2, 6).map((row) => row.ok), [null, null, null, null]);
    assert.deepEqual(parsed[6], results[6]);
    assert.equal(parseComponentResults({ results: [legacy[0], legacy[0], ...legacy.slice(2)] }), null);
  });

  test("rejects missing, duplicate, and malformed results", () => {
    assert.equal(parseComponentResults({ results: results.slice(1) }), null);
    assert.equal(parseComponentResults({ results: [results[0], results[0], ...results.slice(2)] }), null);
    assert.equal(parseComponentResults({ results: [{ ...results[0], ok: "true" }, ...results.slice(1)] }), null);
    assert.equal(parseComponentResults({ results: [{ ...results[0], latencyMs: -1 }, ...results.slice(1)] }), null);
  });

  test("the reader requests version 3 and never records or fails the skipped check", async (context) => {
    const previous = process.env.INTEGRATION_HEALTH_TOKEN;
    process.env.INTEGRATION_HEALTH_TOKEN = "07".repeat(32);
    context.after(() => { if (previous === undefined) delete process.env.INTEGRATION_HEALTH_TOKEN;
      else process.env.INTEGRATION_HEALTH_TOKEN = previous; });
    let response: unknown = { results };
    context.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
      assert.equal(input.searchParams.get("version"), "3");
      assert.equal(input.pathname, integrationHealthPath);
      assert.equal(init.cache, "no-store");
      assert.match((init.headers as Record<string, string>).authorization, /^HealthSignature /);
      return Response.json(response);
    });
    assert.deepEqual((await runComponentChecks()).map((row) => [row.serviceKey, row.ok]), results.filter((row) => !row.skipped).map((row) => [row.key, row.ok]));
    response = { results: [results[0], results[1], { key: "sapada-payment", ok: false, latencyMs: 30 }, results[6]] };
    assert.deepEqual((await runComponentChecks()).map((row) => row.serviceKey), ["sapada-tte", "sapada-storage", "sapada-atr-bpn"]);
    response = { results: [] };
    assert.equal((await runComponentChecks()).filter((row) => !row.ok).length, 6);
    assert.ok((await runComponentChecks()).every((row) => row.serviceKey !== "sapada-qris-check"));
    delete process.env.INTEGRATION_HEALTH_TOKEN;
    assert.deepEqual(await runComponentChecks(), []);
  });
});

test("version 2 keeps VA and Kode Bayar but cannot attribute combined QRIS health", () => {
  const parsed = parseComponentResults({ results: [results[0], results[1],
    { key: "sapada-qris", ok: false, latencyMs: 30 }, ...results.slice(4)] })!;
  assert.deepEqual(parsed.slice(2, 4).map((row) => row.ok), [null, null]);
  assert.deepEqual(parsed.slice(4), results.slice(4));
});

test("a skipped check cannot be reported as a successful observation", () => {
  for (const check of [
    { key: "sapada-qris-check", ok: true, latencyMs: 1, skipped: true },
    { key: "sapada-qris-check", ok: null, latencyMs: null },
    { ...results[3], latencyMs: 1 },
  ]) assert.equal(parseComponentResults({ results: [...results.slice(0, 3), check, ...results.slice(4)] }), null);
});
