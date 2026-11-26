CREATE TYPE "public"."client_photo_kind" AS ENUM('before', 'after');--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_by" integer,
	"opening_cents" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" integer,
	"expected_cents" integer,
	"counted_cents" integer,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "cash_sessions_opening_nonneg" CHECK ("cash_sessions"."opening_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "client_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"kind" "client_photo_kind" NOT NULL,
	"taken_on" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_photos" (
	"employee_id" integer PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"service_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"service_names" text DEFAULT '' NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"employee_id" integer,
	"wanted_from" date NOT NULL,
	"wanted_to" date NOT NULL,
	"period" text DEFAULT 'any' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"origin" "appointment_origin" DEFAULT 'counter' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacted_at" timestamp with time zone,
	CONSTRAINT "waitlist_period_valid" CHECK ("waitlist_entries"."period" in ('any', 'morning', 'afternoon')),
	CONSTRAINT "waitlist_status_valid" CHECK ("waitlist_entries"."status" in ('waiting', 'contacted', 'booked', 'removed')),
	CONSTRAINT "waitlist_range_valid" CHECK ("waitlist_entries"."wanted_from" <= "waitlist_entries"."wanted_to")
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "commission_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "photo_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_employees_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_employees_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_photos" ADD CONSTRAINT "employee_photos_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_one_open" ON "cash_sessions" USING btree ((true)) WHERE "cash_sessions"."closed_at" is null;--> statement-breakpoint
CREATE INDEX "client_photos_client_idx" ON "client_photos" USING btree ("client_id","taken_on");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "waitlist_status_idx" ON "waitlist_entries" USING btree ("status","wanted_from");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_commission_range" CHECK ("employees"."commission_percent" between 0 and 100);