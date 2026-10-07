import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryChart } from "../components/history-chart";
import { getStatusData } from "./status";

test("a disabled check stays skipped even without a database and has no uptime or check links", async (context) => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  context.after(() => {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  });
  const now = new Date("2026-10-07T08:00:00Z");
  const data = await getStatusData(undefined, now);
  const check = data.components.find((item) => item.service.key === "sapada-qris-check")!;
  assert.equal(check.state, "skipped");
  assert.equal(check.latest, null);
  assert.equal(check.uptime, null);
  assert.ok(check.history.every((bucket) => bucket.count === 0));
  const html = renderToStaticMarkup(<HistoryChart services={data.services} components={data.components} selectedRange="60m" now={now} />);
  assert.match(html, /Generate QRIS/);
  assert.match(html, /Cek Status QRIS: Dilewati/);
  assert.match(html, /Pemeriksaan status QRIS sementara dilewati/);
  assert.doesNotMatch(html, /service=sapada-qris-check/);
});
