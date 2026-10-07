import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { parseComponentResults, runComponentChecks } from "./component-checks";
import { healthAuthorization, integrationHealthPath } from "./integration-signature";

const results = [
  { key: "sapada-tte", ok: true, latencyMs: 10 },
  { key: "sapada-storage", ok: true, latencyMs: 20 },
  { key: "sapada-qris", ok: false, latencyMs: 30 },
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
    assert.deepEqual(parseComponentResults({ results: [...results].reverse() }), results);
    assert.equal(parseComponentResults({ results: results.map((row, index) => index === 3 ? { ...row, ok: null } : row) })?.[3]?.ok, null);
  });

  test("old probes preserve other integrations without inventing payment results", () => {
    const legacy = [results[0], results[1], { key: "sapada-payment", ok: false, latencyMs: 30 }, results[5]];
    const parsed = parseComponentResults({ results: legacy })!;
    assert.deepEqual(parsed.slice(2, 5).map((row) => row.ok), [null, null, null]);
    assert.deepEqual(parsed[5], results[5]);
    assert.equal(parseComponentResults({ results: [legacy[0], legacy[0], ...legacy.slice(2)] }), null);
  });

  test("rejects missing, duplicate, and malformed results", () => {
    assert.equal(parseComponentResults({ results: results.slice(1) }), null);
    assert.equal(parseComponentResults({ results: [results[0], results[0], ...results.slice(2)] }), null);
    assert.equal(parseComponentResults({ results: [{ ...results[0], ok: "true" }, ...results.slice(1)] }), null);
    assert.equal(parseComponentResults({ results: [{ ...results[0], latencyMs: -1 }, ...results.slice(1)] }), null);
  });

  test("the reader requests version 2 and records only available method results", async (context) => {
    const previous = process.env.INTEGRATION_HEALTH_TOKEN;
    process.env.INTEGRATION_HEALTH_TOKEN = "07".repeat(32);
    context.after(() => { if (previous === undefined) delete process.env.INTEGRATION_HEALTH_TOKEN;
      else process.env.INTEGRATION_HEALTH_TOKEN = previous; });
    let response: unknown = { results };
    context.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
      assert.equal(input.searchParams.get("version"), "2");
      assert.equal(input.pathname, integrationHealthPath);
      assert.equal(init.cache, "no-store");
      assert.match((init.headers as Record<string, string>).authorization, /^HealthSignature /);
      return Response.json(response);
    });
    assert.deepEqual((await runComponentChecks()).map((row) => [row.serviceKey, row.ok]), results.map((row) => [row.key, row.ok]));
    response = { results: [results[0], results[1], { key: "sapada-payment", ok: false, latencyMs: 30 }, results[5]] };
    assert.deepEqual((await runComponentChecks()).map((row) => row.serviceKey), ["sapada-tte", "sapada-storage", "sapada-atr-bpn"]);
    response = { results: [] };
    assert.equal((await runComponentChecks()).filter((row) => !row.ok).length, 6);
    delete process.env.INTEGRATION_HEALTH_TOKEN;
    assert.deepEqual(await runComponentChecks(), []);
  });
});
