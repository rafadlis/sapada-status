import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseComponentResults } from "./component-checks";

const results = [
  { key: "sapada-tte", ok: true, latencyMs: 10 },
  { key: "sapada-storage", ok: true, latencyMs: 20 },
  { key: "sapada-payment", ok: false, latencyMs: 30 },
  { key: "sapada-atr-bpn", ok: true, latencyMs: 40 },
];

describe("integration result contract", () => {
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
