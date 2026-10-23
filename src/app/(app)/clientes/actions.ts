"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@db/index";
import { clients } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { isValidDate } from "@/lib/time";

export type ClientFormState = { error?: string };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da cliente."),
  phone: z.string().trim().min(1, "Informe o telefone."),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido.")]),
  birthDate: z.string().trim(),
  cpf: z.string().trim(),
  notes: z.string().trim(),
});

function read(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    birthDate: formData.get("birthDate") ?? "",
    cpf: formData.get("cpf") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." } as const;
  const v = parsed.data;
  const phone = normalizePhone(v.phone);
  if (!phone) return { error: "Telefone inválido. Use DDD + número." } as const;
  if (v.birthDate && !isValidDate(v.birthDate)) return { error: "Data de nascimento inválida." } as const;
  return {
    value: {
      name: v.name,
      phone,
      email: v.email,
      birthDate: v.birthDate || null,
      cpf: v.cpf.replace(/\D/g, ""),
      notes: v.notes,
      whatsappOptIn: formData.get("whatsappOptIn") === "on",
    },
  } as const;
}

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

export async function createClient(_p: ClientFormState, formData: FormData): Promise<ClientFormState> {
  await requireUser("clients.edit");
  const r = read(formData);
  if ("error" in r) return { error: r.error };
  let id: number;
  try {
    const [row] = await db.insert(clients).values(r.value).returning({ id: clients.id });
    id = row.id;
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Já existe uma cliente com esse telefone." };
    throw e;
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${id}?salvo=1`);
}

export async function updateClient(id: number, _p: ClientFormState, formData: FormData): Promise<ClientFormState> {
  await requireUser("clients.edit");
  const r = read(formData);
  if ("error" in r) return { error: r.error };
  try {
    await db.update(clients).set(r.value).where(eq(clients.id, id));
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Já existe outra cliente com esse telefone." };
    throw e;
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${id}?salvo=1`);
}

export async function setClientActive(id: number, active: boolean) {
  await requireUser("clients.edit");
  await db.update(clients).set({ active }).where(eq(clients.id, id));
  revalidatePath("/clientes");
  redirect(`/clientes/${id}`);
}
