ALTER TABLE "checks" ADD COLUMN "service_key" text DEFAULT 'sapada' NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "service_key" text DEFAULT 'sapada' NOT NULL;--> statement-breakpoint
CREATE INDEX "checks_service_checked_at_idx" ON "checks" ("service_key","checked_at");