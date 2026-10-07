import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { rollupSapadaStatus } from "./status-rollup";
import { services } from "./services";
import { components } from "./components";
import type { PublicStatus, ServiceHistoryBucket, ServiceStatus } from "./status";

function monitor(state: PublicStatus, component?: (typeof components)[number]): ServiceStatus {
  return { service: component ?? services[0], state, latest: null, history: [], uptime: null };
}

describe("SAPADA overall status", () => {
  test("skipped status checks cannot degrade the service or change uptime", () => {
    const skipped: ServiceStatus = { ...monitor("unknown", components[3]), state: "skipped" };
    const result = rollupSapadaStatus(monitor("operational"), [monitor("operational", components[2]), skipped],
      [{ count: 2, failedCount: 0, latestFailure: null }]);
    assert.equal(result.state, "operational");
    assert.equal(result.uptime, 100);
  });
  test("fails when any component fails, even if the website succeeds", () => {
    const result = rollupSapadaStatus(monitor("operational"), [monitor("degraded", components[0]), monitor("operational", components[1])], []);
    assert.equal(result.state, "degraded");
    assert.equal(result.isOverall, true);
  });

  test("stays unknown until every component has a recent result", () => {
    assert.equal(rollupSapadaStatus(monitor("operational"), [monitor("unknown", components[0])], []).state, "unknown");
    assert.equal(rollupSapadaStatus(monitor("operational"), [monitor("operational", components[0])], []).state, "operational");
  });

  test("includes partial monitoring runs and retains their coverage information", () => {
    const history: ServiceHistoryBucket[] = [{ count: 4, failedCount: 1, latestFailure: null, partialCount: 3 }, { count: 0, failedCount: 0, latestFailure: null }];
    const result = rollupSapadaStatus(monitor("operational"), [monitor("operational", components[0])], history);
    assert.equal(result.uptime, 75);
    assert.deepEqual(result.history, history);
  });
});
