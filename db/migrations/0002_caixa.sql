CREATE TYPE "public"."cash_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'pix', 'debit', 'credit', 'other');--> statement-breakpoint
CREATE TABLE "cash_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "cash_kind" NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"occurred_on" date NOT NULL,
	"appointment_id" integer,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" integer,
	CONSTRAINT "cash_entries_amount_positive" CHECK ("cash_entries"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_voided_by_employees_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_entries_day_idx" ON "cash_entries" USING btree ("occurred_on");--> statement-breakpoint
CREATE INDEX "cash_entries_appt_idx" ON "cash_entries" USING btree ("appointment_id");