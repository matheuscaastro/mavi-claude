CREATE TYPE "public"."access_role" AS ENUM('admin', 'reception', 'professional');--> statement-breakpoint
CREATE TYPE "public"."appointment_origin" AS ENUM('counter', 'online');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE "appointment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"employee_id" integer,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"service_name" text NOT NULL,
	"duration_min" integer NOT NULL,
	"price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"origin" "appointment_origin" DEFAULT 'counter' NOT NULL,
	"total_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"birth_date" date,
	"cpf" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"origin" "appointment_origin" DEFAULT 'counter' NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_hours" (
	"employee_id" integer NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	CONSTRAINT "employee_hours_employee_id_weekday_pk" PRIMARY KEY("employee_id","weekday")
);
--> statement-breakpoint
CREATE TABLE "employee_services" (
	"employee_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "employee_services_employee_id_service_id_pk" PRIMARY KEY("employee_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"access_role" "access_role" DEFAULT 'professional' NOT NULL,
	"performs_services" boolean DEFAULT true NOT NULL,
	"color" text DEFAULT '#3D6B62' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_exceptions" (
	"date" date PRIMARY KEY NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"closed" boolean DEFAULT true NOT NULL,
	"open_time" text,
	"close_time" text
);
--> statement-breakpoint
CREATE TABLE "salon_hours" (
	"weekday" integer PRIMARY KEY NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"open_time" text DEFAULT '08:00' NOT NULL,
	"close_time" text DEFAULT '18:00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_notice_hours" integer DEFAULT 2 NOT NULL,
	"max_days_ahead" integer DEFAULT 60 NOT NULL,
	"cancel_deadline_hours" integer DEFAULT 24 NOT NULL,
	"slot_step_min" integer DEFAULT 15 NOT NULL,
	"allow_any_professional" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Podologia' NOT NULL,
	"duration_min" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"buffer_min" integer DEFAULT 0 NOT NULL,
	"public_visible" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_items" ADD CONSTRAINT "appointment_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_hours" ADD CONSTRAINT "employee_hours_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_events_appt_idx" ON "appointment_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "appointments_start_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "appointments_employee_idx" ON "appointments" USING btree ("employee_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_client_idx" ON "appointments" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_phone_key" ON "clients" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_email_key" ON "employees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "schedule_blocks_employee_idx" ON "schedule_blocks" USING btree ("employee_id","starts_at");