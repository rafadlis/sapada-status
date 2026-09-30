ALTER TABLE "monitor_alert_states" ADD COLUMN "failed_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "monitor_alert_states" ADD COLUMN "healthy_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "monitor_alert_states" ADD COLUMN "alerted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "whatsapp_alert_deliveries_phone_claimed_idx" ON "whatsapp_alert_deliveries" ("phone","claimed_at");--> statement-breakpoint
-- Existing failures have already been announced. Require a confirmed recovery before rearming them.
UPDATE "monitor_alert_states" SET "alerted" = NOT "ok";
