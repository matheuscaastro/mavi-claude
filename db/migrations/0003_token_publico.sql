ALTER TABLE "appointments" ADD COLUMN "public_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_public_token_key" ON "appointments" USING btree ("public_token");