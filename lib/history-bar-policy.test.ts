import assert from "node:assert/strict";
import test from "node:test";
import { getHistoryBarState, getHistoryBarSummary } from "./history-bar-policy";

test("one failed check among 113 stays green and is still reported accurately", () => {
  const bucket = { count: 113, failedCount: 1 };
  assert.equal(getHistoryBarState(bucket), "good");
  assert.equal(getHistoryBarSummary(bucket), "Kegagalan kecil: 1 dari 113 pemeriksaan gagal. 99.12% berhasil");
  assert.match(getHistoryBarSummary(bucket, true), /1 dari 113 putaran pemeriksaan gagal/);
});

test("the inclusive 99% boundary uses unrounded counts", () => {
  assert.equal(getHistoryBarState({ count: 100, failedCount: 1 }), "good");
  assert.equal(getHistoryBarState({ count: 99, failedCount: 1 }), "mixed");
  // This rounds to 99.00% but is still below the threshold.
  assert.equal(getHistoryBarState({ count: 9999, failedCount: 100 }), "mixed");
  assert.equal(getHistoryBarState({ count: 10000, failedCount: 100 }), "good");
});

test("empty, completely healthy, mixed and entirely failed buckets remain distinct at every range", () => {
  for (const [count, failedCount, expected] of [
    [0, 0, "empty"], [1, 0, "good"], [1, 1, "failed"], [12, 1, "mixed"],
    [288, 2, "good"], [288, 3, "mixed"], [288, 288, "failed"],
  ] as const) {
    assert.equal(getHistoryBarState({ count, failedCount }), expected);
  }
  assert.equal(getHistoryBarSummary({ count: 0, failedCount: 0 }), "Belum ada pemeriksaan");
  assert.equal(getHistoryBarSummary({ count: 1, failedCount: 1 }), "1 pemeriksaan gagal");
});
