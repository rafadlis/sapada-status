import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStatusFeed, statusFeedMonitorKeys } from "./status-feed";

const now = new Date("2026-10-01T04:00:00Z");
const healthy = () =>
  statusFeedMonitorKeys.map((serviceKey) => ({
    serviceKey,
    checkedAt: now,
    ok: true,
  }));

test("feed reports all five monitors and rolls up payment failures", () => {
  const checks = healthy();
  assert.equal(buildStatusFeed(checks, [], now).service.state, "operational");
  checks.find((item) => item.serviceKey === "sapada-payment")!.ok = false;
  assert.equal(buildStatusFeed(checks, [], now).service.state, "degraded");
});

test("missing, stale and future checks are unknown and source failure clears incidents", () => {
  assert.equal(buildStatusFeed([], [], now).service.state, "unknown");
  const checks = healthy();
  checks[0].checkedAt = new Date(now.getTime() - 20 * 60_000);
  assert.equal(buildStatusFeed(checks, [], now).components[0].state, "unknown");
  checks[0].checkedAt = new Date(now.getTime() + 120_000);
  assert.equal(buildStatusFeed(checks, [], now).components[0].state, "unknown");
  const feed = buildStatusFeed(healthy(), [], now, false);
  assert.equal(feed.available, false);
  assert.equal(feed.service.state, "unknown");
});

test("public projection excludes probe details and resolved updates", () => {
  const checks = healthy().map((item) => ({
    ...item,
    error: "private provider URL",
    statusCode: 500,
  }));
  const incident = {
    id: 1,
    title: "Gangguan pembayaran",
    message: "Pembaruan terbaru",
    state: "identified",
    kind: "incident",
    updatedAt: now,
    affectedComponentKeys: ["sapada-payment"],
    serviceKey: "sapada",
  };
  const feed = buildStatusFeed(
    checks,
    [incident, { ...incident, id: 2, state: "resolved" }],
    now,
  );
  assert.equal(feed.incidents.length, 1);
  assert.equal(feed.incidents[0].message, "Pembaruan terbaru");
  assert.doesNotMatch(
    JSON.stringify(feed),
    /private provider|statusCode|serviceKey/,
  );
});
