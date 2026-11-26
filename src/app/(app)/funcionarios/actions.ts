"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@db/index";
import { employeePhotos, employeeServices, employees } from "@db/schema";
import { hashPassword, isRole, requireUser } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { normalizePhone } from "@/lib/phone";
import { PhotoError, processPhoto, type ProcessedPhoto } from "@/lib/employee-photo";

export type EmployeeFormState = { error?: string; ok?: boolean };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  jobTitle: z.string().trim(),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  accessRole: z.enum(["admin", "reception", "professional"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  commissionPercent: z.coerce.number({ message: "Comissão inválida." }).int("A comissão precisa ser um número inteiro.").min(0, "A comissão não pode ser negativa.").max(100, "A comissão no máximo 100%."),
});

async function read(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    jobTitle: formData.get("jobTitle") ?? "",
    email: formData.get("email") ?? "",
    accessRole: formData.get("accessRole") ?? "",
    color: formData.get("color") ?? "#3D6B62",
    commissionPercent: String(formData.get("commissionPercent") ?? "").trim() || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." } as const;
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  if (phone === null) return { error: "Telefone inválido. Use DDD + número." } as const;
  const password = String(formData.get("password") ?? "");
  if (password && password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." } as const;
  const serviceIds = formData
    .getAll("serviceIds")
    .map(Number)
    .filter((n) => Number.isInteger(n));
  // Foto: confere tudo antes de gravar qualquer coisa, para um erro na foto não deixar o cadastro pela metade.
  let photo: ProcessedPhoto | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    try {
      photo = await processPhoto(file);
    } catch (e) {
      if (e instanceof PhotoError) return { error: e.message } as const;
      throw e;
    }
  }
  return {
    value: { ...parsed.data, phone, performsServices: formData.get("performsServices") === "on" },
    password,
    serviceIds,
    photo,
    removePhoto: formData.get("removePhoto") === "on",
  } as const;
}

/** Grava a foto nova, ou apaga a atual se foi pedido (a foto nova tem prioridade). */
async function applyPhoto(id: number, photo: ProcessedPhoto | null, remove: boolean) {
  if (photo) {
    const now = new Date();
    await db
      .insert(employeePhotos)
      .values({ employeeId: id, data: photo.data, contentType: photo.contentType, updatedAt: now })
      .onConflictDoUpdate({ target: employeePhotos.employeeId, set: { data: photo.data, contentType: photo.contentType, updatedAt: now } });
    await db.update(employees).set({ photoUpdatedAt: now }).where(eq(employees.id, id));
  } else if (remove) {
    await db.delete(employeePhotos).where(eq(employeePhotos.employeeId, id));
    await db.update(employees).set({ photoUpdatedAt: null }).where(eq(employees.id, id));
  }
}


async function saveServices(employeeId: number, serviceIds: number[], performs: boolean) {
  await db.delete(employeeServices).where(eq(employeeServices.employeeId, employeeId));
  if (performs && serviceIds.length) {
    await db.insert(employeeServices).values(serviceIds.map((serviceId) => ({ employeeId, serviceId })));
  }
}

export async function createEmployee(_p: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  await requireUser("employees.manage");
  const r = await read(formData);
  if ("error" in r) return { error: r.error };
  if (!r.password) return { error: "Defina uma senha inicial (mínimo 8 caracteres)." };
  let id: number;
  try {
    const [row] = await db
      .insert(employees)
      .values({ ...r.value, passwordHash: await hashPassword(r.password) })
      .returning({ id: employees.id });
    id = row.id;
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Já existe uma funcionária com esse e-mail." };
    throw e;
  }
  await saveServices(id, r.serviceIds, r.value.performsServices);
  await applyPhoto(id, r.photo, false);
  revalidatePath("/funcionarios");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function updateEmployee(id: number, _p: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  const me = await requireUser("employees.manage");
  const r = await read(formData);
  if ("error" in r) return { error: r.error };

  if (r.value.accessRole !== "admin") {
    const [other] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.accessRole, "admin"), eq(employees.active, true), ne(employees.id, id)))
      .limit(1);
    if (!other) return { error: "Precisa existir ao menos uma administradora ativa." };
  }

  try {
    await db
      .update(employees)
      .set({ ...r.value, ...(r.password ? { passwordHash: await hashPassword(r.password) } : {}) })
      .where(eq(employees.id, id));
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "Já existe outra funcionária com esse e-mail." };
    throw e;
  }
  await saveServices(id, r.serviceIds, r.value.performsServices);
  await applyPhoto(id, r.photo, r.removePhoto);
  revalidatePath("/funcionarios");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function setEmployeeActive(id: number, active: boolean): Promise<EmployeeFormState> {
  const me = await requireUser("employees.manage");
  if (!active) {
    if (me.id === id) return { error: "Você não pode inativar o próprio acesso." };
    const [target] = await db.select().from(employees).where(eq(employees.id, id));
    if (target && isRole(target, "admin")) {
      const [other] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(eq(employees.accessRole, "admin"), eq(employees.active, true), ne(employees.id, id)))
        .limit(1);
      if (!other) return { error: "Precisa existir ao menos uma administradora ativa." };
    }
  }
  await db.update(employees).set({ active }).where(eq(employees.id, id));
  revalidatePath("/funcionarios");
  return { ok: true };
}
