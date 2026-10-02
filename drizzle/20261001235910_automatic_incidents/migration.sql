CREATE TABLE "monitor_incident_states" (
	"service_key" text PRIMARY KEY,
	"ok" boolean NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"failed_since" timestamp with time zone,
	"healthy_since" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"counted_at" timestamp with time zone NOT NULL,
	"incident_id" integer
);
--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "automatic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "title_review_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "monitor_incident_states" ADD CONSTRAINT "monitor_incident_states_incident_id_incidents_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id");