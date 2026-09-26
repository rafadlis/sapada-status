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
  state: text("state").notNull().default("investigating"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
