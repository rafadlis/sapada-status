CREATE TABLE "checks" (
	"id" serial PRIMARY KEY,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"status_code" integer,
	"latency_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"state" text DEFAULT 'investigating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
