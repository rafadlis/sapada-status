CREATE TABLE "whatsapp_alert_recipients" (
	"id" serial PRIMARY KEY,
	"phone" text NOT NULL UNIQUE,
	"name" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
