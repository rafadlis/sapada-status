CREATE TABLE "incident_updates" (
	"id" serial PRIMARY KEY,
	"incident_id" integer NOT NULL,
	"state" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "kind" text DEFAULT 'incident' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_incidents_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE;
--> statement-breakpoint
INSERT INTO "incident_updates" ("incident_id", "state", "message", "created_at")
SELECT "id", CASE WHEN "state" = 'resolved' THEN 'investigating' ELSE "state" END, "message", "created_at"
FROM "incidents";
--> statement-breakpoint
INSERT INTO "incident_updates" ("incident_id", "state", "message", "created_at")
SELECT "id", 'resolved', '', "resolved_at"
FROM "incidents"
WHERE "state" = 'resolved' AND "resolved_at" IS NOT NULL;
