"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@db/index";
import { employeeServices, employees, services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { parseBRL } from "@/lib/money";

export type ServiceFormState = { error?: string; ok?: boolean };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço."),
  description: z.string().trim(),
  category: z.string().trim().min(1, "Informe a categoria."),
  durationMin: z.coerce.number().int("Duração inválida.").min(5, "Duração mínima de 5 minutos.").max(480, "Duração máxima de 8 horas."),
  bufferMin: z.coerce.number().int().min(0, "Intervalo inválido.").max(120, "Intervalo máximo de 2 horas."),
});

function read(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
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

export async function createService(_p: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await requireUser("services.manage");
  const r = read(formData);
  if ("error" in r) return { error: r.error };
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
  await db.update(services).set(r.value).where(eq(services.id, id));
  revalidatePath("/servicos");
  return { ok: true };
}

export async function setServiceActive(id: number, active: boolean) {
  await requireUser("services.manage");
  await db.update(services).set({ active }).where(eq(services.id, id));
  revalidatePath("/servicos");
}
