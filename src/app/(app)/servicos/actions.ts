"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@db/index";
import { employeeServices, employees, serviceCategories, services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { parseBRL } from "@/lib/money";

export type ServiceFormState = { error?: string; ok?: boolean };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço."),
  description: z.string().trim(),
  categoryId: z.coerce.number({ error: "Escolha a categoria." }).int("Escolha a categoria.").positive("Escolha a categoria."),
  durationMin: z.coerce.number().int("Duração inválida.").min(5, "Duração mínima de 5 minutos.").max(480, "Duração máxima de 8 horas."),
  bufferMin: z.coerce.number().int().min(0, "Intervalo inválido.").max(120, "Intervalo máximo de 2 horas."),
});

function read(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    durationMin: formData.get("durationMin") ?? "",
    bufferMin: formData.get("bufferMin") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." } as const;
  const priceCents = parseBRL(String(formData.get("price") ?? ""));
  if (priceCents === null || priceCents <= 0) return { error: "Informe um preço válido." } as const;
  return {
    value: { ...parsed.data, priceCents, publicVisible: formData.get("publicVisible") === "on" },
  } as const;
}

async function categoryExists(id: number) {
  const [row] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(eq(serviceCategories.id, id));
  return Boolean(row);
}

export async function createService(_p: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await requireUser("services.manage");
  const r = read(formData);
  if ("error" in r) return { error: r.error };
  if (!(await categoryExists(r.value.categoryId))) return { error: "Escolha uma categoria cadastrada." };
  // Serviço novo já nasce ligado a quem atende, igual ao cadastro de funcionária (todas marcadas por padrão).
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(services).values(r.value).returning({ id: services.id });
    const staff = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.active, true), eq(employees.performsServices, true)));
    if (staff.length) await tx.insert(employeeServices).values(staff.map((e) => ({ employeeId: e.id, serviceId: created.id })));
  });
  revalidatePath("/servicos");
  return { ok: true };
}

export async function updateService(id: number, _p: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await requireUser("services.manage");
  const r = read(formData);
  if ("error" in r) return { error: r.error };
  if (!(await categoryExists(r.value.categoryId))) return { error: "Escolha uma categoria cadastrada." };
  await db.update(services).set(r.value).where(eq(services.id, id));
  revalidatePath("/servicos");
  return { ok: true };
}

export async function setServiceActive(id: number, active: boolean) {
  await requireUser("services.manage");
  await db.update(services).set({ active }).where(eq(services.id, id));
  revalidatePath("/servicos");
}

/* ---------- Categorias (administradora e recepção) ---------- */

export type CategoryState = { error?: string; ok?: boolean };

const nameSchema = z.string().trim().min(2, "O nome precisa ter ao menos 2 letras.").max(40, "O nome pode ter até 40 letras.");

export async function createCategory(_p: CategoryState, formData: FormData): Promise<CategoryState> {
  await requireUser("categories.manage");
  const name = nameSchema.safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0]?.message ?? "Nome inválido." };
  try {
    await db.insert(serviceCategories).values({ name: name.data });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Já existe uma categoria com esse nome." };
    throw e;
  }
  revalidatePath("/servicos");
  return { ok: true };
}

export async function renameCategory(id: number, name: string): Promise<CategoryState> {
  await requireUser("categories.manage");
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  try {
    await db.update(serviceCategories).set({ name: parsed.data }).where(eq(serviceCategories.id, id));
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Já existe uma categoria com esse nome." };
    throw e;
  }
  revalidatePath("/servicos");
  return { ok: true };
}

/** Só exclui categoria sem serviços: o banco também impede (chave estrangeira). */
export async function deleteCategory(id: number): Promise<CategoryState> {
  await requireUser("categories.manage");
  const used = await db.select({ id: services.id }).from(services).where(eq(services.categoryId, id)).limit(1);
  if (used.length) return { error: "Esta categoria tem serviços. Mude a categoria deles antes de excluir." };
  await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
  revalidatePath("/servicos");
  return { ok: true };
}
