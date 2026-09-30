import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const checks = pgTable("checks", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull().default("sapada"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  ok: boolean("ok").notNull(),
  statusCode: integer("status_code"),
  latencyMs: integer("latency_ms"),
  error: text("error"),
}, (table) => [index("checks_service_checked_at_idx").on(table.serviceKey, table.checkedAt)]);

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull().default("sapada"),
  affectedComponentKeys: jsonb("affected_component_keys").$type<string[]>(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  kind: text("kind").notNull().default("incident"),
  state: text("state").notNull().default("investigating"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const incidentUpdates = pgTable("incident_updates", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  state: text("state").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monitorAlertStates = pgTable("monitor_alert_states", {
  serviceKey: text("service_key").primaryKey(),
  ok: boolean("ok").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  newFailure: boolean("new_failure").notNull().default(false),
});

export const whatsappAlertDeliveries = pgTable("whatsapp_alert_deliveries", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  failures: jsonb("failures").$type<{ serviceKey: string; statusCode: number | null }[]>().notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("whatsapp_alert_deliveries_pending_idx").on(table.status, table.nextAttemptAt)]);
