CREATE TABLE "monitor_alert_states" (
	"service_key" text PRIMARY KEY,
	"ok" boolean NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"new_failure" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_alert_deliveries" (
	"id" serial PRIMARY KEY,
	"phone" text NOT NULL,
	"failures" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "whatsapp_alert_deliveries_pending_idx" ON "whatsapp_alert_deliveries" ("status","next_attempt_at");