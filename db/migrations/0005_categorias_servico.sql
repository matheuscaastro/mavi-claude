CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "category_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Preserva os serviços existentes: cada texto de categoria vira uma categoria cadastrada (vazio vira "Geral").
INSERT INTO "service_categories" ("name")
SELECT DISTINCT ON (lower(c)) c
FROM (SELECT coalesce(nullif(trim("category"), ''), 'Geral') AS c FROM "services") t
ORDER BY lower(c), c;--> statement-breakpoint
UPDATE "services" s
SET "category_id" = sc."id"
FROM "service_categories" sc
WHERE lower(sc."name") = lower(coalesce(nullif(trim(s."category"), ''), 'Geral'));
