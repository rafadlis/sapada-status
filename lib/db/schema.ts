import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const checks = pgTable("checks", {
  id: serial("id").primaryKey(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  ok: boolean("ok").notNull(),
  statusCode: integer("status_code"),
  latencyMs: integer("latency_ms"),
  error: text("error"),
});

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
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
