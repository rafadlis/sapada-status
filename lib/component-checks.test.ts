import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { parseComponentResults } from "./component-checks";
import { healthAuthorization, integrationHealthPath } from "./integration-signature";

const results = [
  { key: "sapada-tte", ok: true, latencyMs: 10 },
  { key: "sapada-storage", ok: true, latencyMs: 20 },
  { key: "sapada-payment", ok: false, latencyMs: 30 },
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
    assert.deepEqual(parseComponentResults({ results: [...results.slice(0, 3), { ...results[3], ok: null }] })?.[3]?.ok, null);
  });

  test("rejects missing, duplicate, and malformed results", () => {
    assert.equal(parseComponentResults({ results: results.slice(1) }), null);
    assert.equal(parseComponentResults({ results: [results[0], results[0], ...results.slice(2)] }), null);
    assert.equal(parseComponentResults({ results: [{ ...results[0], ok: "true" }, ...results.slice(1)] }), null);
    assert.equal(parseComponentResults({ results: [{ ...results[0], latencyMs: -1 }, ...results.slice(1)] }), null);
  });
});
