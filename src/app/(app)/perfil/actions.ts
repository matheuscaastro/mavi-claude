"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@db/index";
import { employees } from "@db/schema";
import { hashPassword, requireUser } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";

export type PasswordState = { error?: string; ok?: boolean };

const schema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    next: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres.").max(200, "A nova senha é longa demais."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "A confirmação não é igual à nova senha.", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "A nova senha precisa ser diferente da atual.", path: ["next"] });

/** Cada pessoa troca a própria senha, conferindo a senha atual. */
export async function changeOwnPassword(_p: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser();
  if (!allow(`pwd:${user.id}`, 5, 15 * 60 * 1000)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  const parsed = schema.safeParse({
    current: formData.get("current") ?? "",
    next: formData.get("next") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) return { error: "A senha atual está incorreta." };
  await db.update(employees).set({ passwordHash: await hashPassword(parsed.data.next) }).where(eq(employees.id, user.id));
  return { ok: true };
}
