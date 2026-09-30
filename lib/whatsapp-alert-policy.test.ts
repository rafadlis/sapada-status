import assert from "node:assert/strict";
import test from "node:test";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { buildAlertClaimQuery, buildAlertMaintenanceQuery, buildAlertTransitionQuery } from "./whatsapp-alerts";

// Opt-in PostgreSQL verification. Temporary tables shadow production tables and drop at commit.
const databaseUrl = process.env.ALERT_POLICY_TEST_DATABASE_URL;
const base = new Date("2026-09-30T00:00:00Z");
const at = (minutes: number) => new Date(base.getTime() + minutes * 60_000);

function setup() {
  const db = neon(databaseUrl!);
  const dialect = new PgDialect();
  const query = (value: ReturnType<typeof buildAlertTransitionQuery>) => {
    const compiled = dialect.sqlToQuery(value);
    return db.query(compiled.sql, compiled.params);
  };
  const tables = [
    db.query(`CREATE TEMP TABLE monitor_alert_states (
      service_key text PRIMARY KEY, ok boolean NOT NULL, checked_at timestamptz NOT NULL,
      new_failure boolean DEFAULT false, failed_since timestamptz, healthy_since timestamptz, alerted boolean DEFAULT false
    ) ON COMMIT DROP`),
    db.query(`CREATE TEMP TABLE whatsapp_alert_recipients (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, phone text UNIQUE NOT NULL, enabled boolean DEFAULT true
    ) ON COMMIT DROP`),
    db.query(`CREATE TEMP TABLE whatsapp_alert_deliveries (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, phone text NOT NULL, failures jsonb NOT NULL,
      status text DEFAULT 'pending', attempts integer DEFAULT 0, next_attempt_at timestamptz DEFAULT '2026-09-30T00:00:00Z',
      claimed_at timestamptz, created_at timestamptz DEFAULT '2026-09-30T00:00:00Z', last_error text
    ) ON COMMIT DROP`),
  ];
  return { db, query, tables };
}

test("PostgreSQL: sustained failure, stable recovery, repeated and out-of-order checks", { skip: !databaseUrl }, async () => {
  const { db, query, tables } = setup();
  const observations = [
    [0, false, 0], [1, false, 0], [5, false, 2], [6, false, 2],
    [10, true, 2], [11, false, 2], [12, true, 2], [17, true, 2],
    [18, false, 2], [23, false, 4], [19, true, 4],
  ] as const;
  const statements = [...tables];
  for (const [minute, ok] of observations) {
    statements.push(query(buildAlertTransitionQuery([{ serviceKey: "a", ok, statusCode: ok ? 200 : null }], ["6281234567801", "6281234567802"], at(minute))));
    statements.push(db.query("SELECT count(*)::int AS count FROM whatsapp_alert_deliveries"));
  }
  // A long monitoring gap cannot confirm a continuous failure.
  for (const minute of [0, 30, 35]) {
    statements.push(query(buildAlertTransitionQuery([{ serviceKey: "gap", ok: false, statusCode: 502 }], ["6281234567801"], at(minute))));
    statements.push(db.query("SELECT count(*)::int AS count FROM whatsapp_alert_deliveries"));
  }
  const result = await db.transaction(statements);
  assert.deepEqual(observations.map((_, index) => result[4 + index * 2][0].count), observations.map(([, , count]) => count));
  assert.deepEqual([result[26][0].count, result[28][0].count, result[30][0].count], [4, 4, 5]);
});

test("PostgreSQL: combine failures, cooldown, daily attempts, disabled recipients and stale messages", { skip: !databaseUrl }, async () => {
  const { db, query, tables } = setup();
  const statements = [
    ...tables,
    db.query(`INSERT INTO whatsapp_alert_recipients (phone, enabled) VALUES ('one',true),('cooldown',true),('daily',true),('disabled',false)`),
    db.query(`INSERT INTO monitor_alert_states (service_key,ok,alerted,checked_at) VALUES
      ('a',false,true,'2026-09-30T00:05:00Z'),('b',false,true,'2026-09-30T00:05:00Z'),('recovered',true,true,'2026-09-30T00:05:00Z')`),
    db.query(`INSERT INTO whatsapp_alert_deliveries (phone,failures) VALUES
      ('one','[{"serviceKey":"a","statusCode":502},{"serviceKey":"recovered","statusCode":502}]'),
      ('one','[{"serviceKey":"a","statusCode":503},{"serviceKey":"b","statusCode":null}]'),
      ('cooldown','[{"serviceKey":"a","statusCode":502}]'),
      ('daily','[{"serviceKey":"a","statusCode":502}]'),
      ('disabled','[{"serviceKey":"a","statusCode":502}]'),
      ('one','[{"serviceKey":"recovered","statusCode":502}]')`),
    db.query(`INSERT INTO whatsapp_alert_deliveries (phone,failures,status,attempts,claimed_at,created_at) VALUES
      ('cooldown','[]','accepted',1,'2026-09-30T00:00:00Z','2026-09-30T00:00:00Z'),
      ('daily','[]','failed',3,'2026-09-29T23:00:00Z','2026-09-29T23:00:00Z'),
      ('daily','[]','accepted',3,'2026-09-29T22:00:00Z','2026-09-29T22:00:00Z'),
      ('one','[{"serviceKey":"a","statusCode":502}]','pending',0,NULL,'2026-09-29T22:00:00Z'),
      ('interrupted','[]','sending',1,'2026-09-29T23:00:00Z','2026-09-29T23:00:00Z')`),
    query(buildAlertMaintenanceQuery(at(5))),
    query(buildAlertClaimQuery(at(5))),
    query(buildAlertClaimQuery(at(5))),
    db.query("SELECT phone,status FROM whatsapp_alert_deliveries ORDER BY id"),
    // A fresh queued failure still waits until the cooldown ends.
    db.query(`INSERT INTO whatsapp_alert_deliveries (phone,failures,created_at) VALUES ('one','[{"serviceKey":"a","statusCode":502}]','2026-09-30T00:10:00Z')`),
    query(buildAlertClaimQuery(at(10))),
    db.query(`UPDATE monitor_alert_states SET checked_at = '2026-09-30T00:35:00Z'`),
    query(buildAlertClaimQuery(at(35))),
  ];
  const result = await db.transaction(statements);
  assert.equal(Number(result[7][0].interrupted), 1);
  assert.equal(Number(result[7][0].expired), 2);
  assert.equal(result[8].length, 1);
  assert.equal(result[8][0].phone, "one");
  assert.deepEqual(result[8][0].failures, [{ serviceKey: "a", statusCode: 503 }, { serviceKey: "b", statusCode: null }]);
  assert.equal(result[9].length, 0);
  assert.equal(result[10].filter((row) => row.status === "sending").length, 1);
  assert.equal(result[10].filter((row) => row.status === "needs_review").length, 1);
  assert.equal(result[12].length, 0);
  assert.deepEqual(result[14].map((row) => row.phone).sort(), ["cooldown", "one"]);
});
