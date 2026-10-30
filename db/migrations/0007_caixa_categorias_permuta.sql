ALTER TYPE "public"."payment_method" ADD VALUE 'barter' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "cash_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "cash_kind" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cash_categories_kind_name_key" ON "cash_categories" USING btree ("kind",lower("name"));--> statement-breakpoint
INSERT INTO "cash_categories" ("kind", "name") VALUES
	('expense', 'Aluguel'), ('expense', 'Materiais e insumos'), ('expense', 'Salários'), ('expense', 'Impostos e taxas'),
	('expense', 'Água, luz e internet'), ('expense', 'Marketing'), ('expense', 'Outros'),
	('income', 'Venda de produtos'), ('income', 'Outros')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "cash_categories" ("kind", "name")
SELECT DISTINCT ON (kind, lower(btrim(category))) kind, btrim(category) FROM "cash_entries"
WHERE appointment_id IS NULL AND btrim(category) <> ''
ON CONFLICT DO NOTHING;
