import assert from "node:assert/strict";
import test from "node:test";
import { affectedComponentNames, parseAffectedComponentKeys } from "./incident-components";

test("SAPADA incidents preserve only the explicitly selected components", () => {
  assert.deepEqual(parseAffectedComponentKeys("sapada", ["sapada-payment", "sapada-tte"]), ["sapada-payment", "sapada-tte"]);
  assert.deepEqual(affectedComponentNames(["sapada-payment", "sapada-tte"]), ["TTE", "Payment API"]);
});

test("SAPADA incidents reject an empty, unknown, or duplicate component selection", () => {
  assert.equal(parseAffectedComponentKeys("sapada", []), undefined);
  assert.equal(parseAffectedComponentKeys("sapada", ["unknown"]), undefined);
  assert.equal(parseAffectedComponentKeys("sapada", ["sapada-tte", "sapada-tte"]), undefined);
});

test("other services cannot submit SAPADA component keys", () => {
  assert.equal(parseAffectedComponentKeys("all", []), null);
  assert.equal(parseAffectedComponentKeys("bapenda", ["sapada-tte"]), undefined);
  assert.deepEqual(affectedComponentNames(null), []);
});
