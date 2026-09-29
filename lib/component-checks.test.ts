import { describe, expect, test } from "bun:test";
import { parseComponentResults } from "./component-checks";

const results = [
  { key: "sapada-tte", ok: true, latencyMs: 10 },
  { key: "sapada-storage", ok: true, latencyMs: 20 },
  { key: "sapada-payment", ok: false, latencyMs: 30 },
  { key: "sapada-atr-bpn", ok: true, latencyMs: 40 },
];

describe("integration result contract", () => {
  test("accepts a complete set regardless of order", () => {
    expect(parseComponentResults({ results: [...results].reverse() })).toEqual(results);
  });

  test("rejects missing, duplicate, and malformed results", () => {
    expect(parseComponentResults({ results: results.slice(1) })).toBeNull();
    expect(parseComponentResults({ results: [results[0], results[0], ...results.slice(2)] })).toBeNull();
    expect(parseComponentResults({ results: [{ ...results[0], ok: "true" }, ...results.slice(1)] })).toBeNull();
    expect(parseComponentResults({ results: [{ ...results[0], latencyMs: -1 }, ...results.slice(1)] })).toBeNull();
  });
});
