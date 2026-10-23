-- Regras que o Drizzle não descreve no schema: trava de choque de horário e validações.
-- A trava fica no banco para valer mesmo com dois acessos ao mesmo tempo
-- (recepção e cliente online marcando o mesmo horário).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_ends_after_start" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
-- Uma profissional não pode ter dois atendimentos ativos que se sobreponham.
-- Atendimentos cancelados liberam o horário.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "employee_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled');
--> statement-breakpoint
ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_ends_after_start" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "schedule_blocks"
  ADD CONSTRAINT "schedule_blocks_no_overlap"
  EXCLUDE USING gist (
    "employee_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  );
--> statement-breakpoint
ALTER TABLE "salon_hours"
  ADD CONSTRAINT "salon_hours_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6);
--> statement-breakpoint
ALTER TABLE "employee_hours"
  ADD CONSTRAINT "employee_hours_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6);
--> statement-breakpoint
ALTER TABLE "salon_settings"
  ADD CONSTRAINT "salon_settings_single_row" CHECK ("id" = 1);
--> statement-breakpoint
ALTER TABLE "services"
  ADD CONSTRAINT "services_positive" CHECK ("duration_min" > 0 AND "price_cents" >= 0 AND "buffer_min" >= 0);
