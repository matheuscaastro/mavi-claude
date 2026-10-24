"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@db/index";
import { appointments, cashEntries } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { METHODS } from "@/lib/cash";
import { parseBRL } from "@/lib/money";
import { isValidDate, todayLocal } from "@/lib/time";

export type FormState = { error?: string; ok?: boolean };

const methodSchema = z.enum(METHODS as [string, ...string[]], { message: "Escolha a forma de pagamento." });

/** Registra pagamento (total ou parcial) de um atendimento. */
export async function registerPayment(appointmentId: number, _p: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("cash.register");
  const method = methodSchema.safeParse(formData.get("method"));
  if (!method.success) return { error: method.error.issues[0].message };
  const cents = parseBRL(String(formData.get("amount") ?? ""));
  if (cents === null || cents <= 0) return { error: "Informe um valor válido." };

  const result = await db.transaction(async (tx) => {
    // Trava a linha do atendimento para duas recepcionistas não pagarem a mesma coisa ao mesmo tempo.
    const [appt] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).for("update");
    if (!appt) return { error: "Atendimento não encontrado." };
    if (appt.status === "cancelled") return { error: "Atendimento cancelado não recebe pagamento." };
    const [{ paid }] = await tx
      .select({ paid: sql<number>`coalesce(sum(${cashEntries.amountCents}), 0)::int` })
      .from(cashEntries)
      .where(and(eq(cashEntries.appointmentId, appointmentId), eq(cashEntries.kind, "income"), isNull(cashEntries.voidedAt)));
    const due = appt.totalCents - appt.discountCents - paid;
    if (cents > due) return { error: "O valor é maior que o saldo a receber deste atendimento." };
    await tx.insert(cashEntries).values({
      kind: "income",
      method: method.data as (typeof METHODS)[number],
      amountCents: cents,
      category: "Atendimento",
      description: "",
      occurredOn: todayLocal(),
      appointmentId,
      createdBy: user.id,
    });
    return { ok: true as const };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/caixa");
  redirect(`/agenda/${appointmentId}?pago=1`);
}

const entrySchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().trim().min(1, "Escolha a categoria."),
  description: z.string().trim(),
  date: z.string().refine(isValidDate, "Data inválida."),
});

/** Receita ou despesa avulsa (aluguel, materiais…). */
export async function addEntry(_p: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("cash.view");
  const parsed = entrySchema.safeParse({
    kind: formData.get("kind"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    date: formData.get("date"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const method = methodSchema.safeParse(formData.get("method"));
  if (!method.success) return { error: method.error.issues[0].message };
  const cents = parseBRL(String(formData.get("amount") ?? ""));
  if (cents === null || cents <= 0) return { error: "Informe um valor válido." };

  await db.insert(cashEntries).values({
    ...parsed.data,
    method: method.data as (typeof METHODS)[number],
    amountCents: cents,
    occurredOn: parsed.data.date,
    createdBy: user.id,
  });
  revalidatePath("/caixa");
  return { ok: true };
}

/** Estorna um lançamento (não apaga: fica registrado quem estornou e quando). */
export async function voidEntry(id: number) {
  const user = await requireUser("cash.view");
  await db
    .update(cashEntries)
    .set({ voidedAt: new Date(), voidedBy: user.id })
    .where(and(eq(cashEntries.id, id), isNull(cashEntries.voidedAt)));
  revalidatePath("/caixa");
  redirect("/caixa");
}
