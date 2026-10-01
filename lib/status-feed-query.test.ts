import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { activeStatusIncidentsQuery } from "./status-feed-query";

test("the status feed uses each incident's own latest update", async () => {
  const client = new PGlite();
  try {
    await client.exec(`
      CREATE TABLE incidents (id integer primary key, service_key text, title text, message text, kind text, state text, updated_at timestamptz, affected_component_keys jsonb);
      CREATE TABLE incident_updates (id integer primary key, incident_id integer references incidents(id), state text, message text, created_at timestamptz);
      INSERT INTO incidents VALUES
        (1, 'sapada', 'Pemeliharaan server', 'UPS rusak', 'maintenance', 'resolved', '2026-10-01T06:00:00Z', null),
        (2, 'sapada', 'Gangguan jaringan', 'Koneksi BJB terganggu', 'incident', 'identified', '2026-10-01T01:54:24Z', '["sapada-payment"]'),
        (3, 'sapada', 'Gangguan dokumen', 'Pesan awal dokumen', 'incident', 'investigating', '2026-10-01T01:00:00Z', '["sapada-storage"]'),
        (4, 'other', 'Layanan lain', 'Pesan layanan lain', 'incident', 'identified', '2026-10-01T03:00:00Z', null),
        (5, 'all', 'Gangguan umum', 'Pesan awal umum', 'incident', 'investigating', '2026-10-01T00:00:00Z', null);
      INSERT INTO incident_updates VALUES
        (1, 1, 'resolved', 'Server dimatikan karena UPS rusak', '2026-10-01T06:00:00Z'),
        (2, 2, 'investigating', 'Koneksi BJB terganggu', '2026-09-30T07:26:00Z'),
        (5, 2, 'identified', 'Kabel jaringan putus', '2026-10-01T01:54:24Z'),
        (6, 2, 'identified', 'Kabel Feeder Fiber Optik 288 Core putus; pemulihan pukul 13:00', '2026-10-01T01:54:24Z'),
        (7, 3, 'investigating', '', '2026-10-01T01:00:00Z');
    `);
    const rows = await activeStatusIncidentsQuery(drizzle({ client }));
    assert.deepEqual(
      rows.map((row) => row.id),
      [2, 3, 5],
    );
    assert.equal(
      rows[0].message,
      "Kabel Feeder Fiber Optik 288 Core putus; pemulihan pukul 13:00",
    );
    assert.equal(rows[1].message, "Pesan awal dokumen");
    assert.equal(rows[2].message, "Pesan awal umum");

    await client.exec(`
      INSERT INTO incident_updates VALUES
        (8, 2, 'identified', 'Provider jaringan payment, Indihome, masih memperbaiki kabel putus', '2026-10-01T09:49:18.238Z');
    `);
    const updatedRows = await activeStatusIncidentsQuery(drizzle({ client }));
    assert.equal(
      updatedRows[0].message,
      "Provider jaringan payment, Indihome, masih memperbaiki kabel putus",
    );
  } finally {
    await client.close();
  }
});
