import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "./index";

/**
 * Cria (ou redefine a senha de) a administradora e garante horário e regras iniciais do salão.
 * Uso: ADMIN_NAME="Maria" ADMIN_EMAIL=maria@exemplo.com ADMIN_PASSWORD='senha-longa' npm run db:create-admin
 * É seguro rodar mais de uma vez. Com ONLY_IF_EMPTY=1 só cria se ainda não houver nenhuma funcionária.
 */
async function main() {
  // Modo de implantação: roda a cada deploy, mas só cria a primeira administradora (nunca troca senha).
  if (process.env.ONLY_IF_EMPTY === "1") {
    if (!process.env.ADMIN_EMAIL) {
      console.log("ADMIN_EMAIL não definido: pulando criação da administradora.");
      await pool.end();
      return;
    }
    const existing = await db.select({ id: schema.employees.id }).from(schema.employees).limit(1);
    if (existing.length > 0) {
      console.log("Já existem usuárias: pulando criação da administradora.");
      await pool.end();
      return;
    }
  }
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!name || !email || !email.includes("@")) throw new Error("Defina ADMIN_NAME e ADMIN_EMAIL.");
  if (password.length < 10) throw new Error("ADMIN_PASSWORD precisa ter pelo menos 10 caracteres.");

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select().from(schema.employees).where(eq(schema.employees.email, email));
  if (existing) {
    await db.update(schema.employees).set({ name, passwordHash, accessRole: "admin", active: true }).where(eq(schema.employees.id, existing.id));
    console.log(`Administradora ${email} atualizada.`);
  } else {
    await db.insert(schema.employees).values({ name, email, passwordHash, accessRole: "admin", jobTitle: "Administradora", performsServices: false });
    console.log(`Administradora ${email} criada.`);
  }

  const hours = await db.select().from(schema.salonHours);
  if (hours.length === 0) {
    await db.insert(schema.salonHours).values([
      { weekday: 0, isOpen: false, openTime: "08:00", closeTime: "18:00" },
      ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, isOpen: true, openTime: "08:00", closeTime: "18:00" })),
      { weekday: 6, isOpen: true, openTime: "08:00", closeTime: "14:00" },
    ]);
    console.log("Horário inicial do salão criado (ajuste em Configurações).");
  }
  await db.insert(schema.salonSettings).values({ id: 1 }).onConflictDoNothing();
  await pool.end();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
