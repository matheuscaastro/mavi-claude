CREATE TYPE "public"."message_kind" AS ENUM('confirmation', 'reminder', 'birthday');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "message_kind" NOT NULL,
	"status" "message_status" DEFAULT 'pending' NOT NULL,
	"client_id" integer NOT NULL,
	"appointment_id" integer,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"vars" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"provider" text DEFAULT '' NOT NULL,
	"provider_message_id" text DEFAULT '' NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "whatsapp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "salon_name" text DEFAULT 'MAVI' NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "confirmation_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "reminder_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "reminder_hours_before" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "birthday_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "birthday_hour" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "confirmation_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "reminder_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_settings" ADD COLUMN "birthday_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "messages_dedupe_key" ON "messages" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "messages_queue_idx" ON "messages" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "messages_appt_idx" ON "messages" USING btree ("appointment_id");