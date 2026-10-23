"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@db/index";
import { salonExceptions, salonHours, salonSettings } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { isValidDate, isValidTime, parseTime } from "@/lib/time";

export type FormState = { error?: string; ok?: boolean };

export async function saveHours(_p: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings.manage");
  const rows: { weekday: number; isOpen: boolean; openTime: string; closeTime: string }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const isOpen = formData.get(`open-${weekday}`) === "on";
    const openTime = String(formData.get(`from-${weekday}`) ?? "");
    const closeTime = String(formData.get(`to-${weekday}`) ?? "");
    if (isOpen) {
      if (!isValidTime(openTime) || !isValidTime(closeTime)) return { error: "Informe horários válidos para os dias abertos." };
      if (parseTime(closeTime) <= parseTime(openTime)) return { error: "O fechamento precisa ser depois da abertura." };
    }
    rows.push({ weekday, isOpen, openTime: isValidTime(openTime) ? openTime : "08:00", closeTime: isValidTime(closeTime) ? closeTime : "18:00" });
  }
  await db.transaction(async (tx) => {
    for (const r of rows) {
      await tx.insert(salonHours).values(r).onConflictDoUpdate({ target: salonHours.weekday, set: r });
    }
  });
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { ok: true };
}

const rulesSchema = z.object({
  minNoticeHours: z.coerce.number().int().min(0).max(168),
  maxDaysAhead: z.coerce.number().int().min(1).max(365),
  cancelDeadlineHours: z.coerce.number().int().min(0).max(168),
  slotStepMin: z.coerce.number().int().refine((n) => [5, 10, 15, 20, 30, 60].includes(n), "Intervalo inválido."),
});

export async function saveRules(_p: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings.manage");
  const parsed = rulesSchema.safeParse({
    minNoticeHours: formData.get("minNoticeHours"),
    maxDaysAhead: formData.get("maxDaysAhead"),
    cancelDeadlineHours: formData.get("cancelDeadlineHours"),
    slotStepMin: formData.get("slotStepMin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Valores inválidos." };
  const values = { ...parsed.data, allowAnyProfessional: formData.get("allowAnyProfessional") === "on" };
  await db.insert(salonSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: salonSettings.id, set: values });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function addException(_p: FormState, formData: FormData): Promise<FormState> {
  await requireUser("settings.manage");
  const date = String(formData.get("date") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const closed = formData.get("closed") === "on";
  const openTime = String(formData.get("from") ?? "");
  const closeTime = String(formData.get("to") ?? "");
  if (!isValidDate(date)) return { error: "Escolha a data." };
  if (!closed) {
    if (!isValidTime(openTime) || !isValidTime(closeTime) || parseTime(closeTime) <= parseTime(openTime)) {
      return { error: "Informe um horário especial válido ou marque “Fechado o dia todo”." };
    }
  }
  const values = { label, closed, openTime: closed ? null : openTime, closeTime: closed ? null : closeTime };
  await db.insert(salonExceptions).values({ date, ...values }).onConflictDoUpdate({ target: salonExceptions.date, set: values });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function removeException(date: string) {
  await requireUser("settings.manage");
  await db.delete(salonExceptions).where(eq(salonExceptions.date, date));
  revalidatePath("/configuracoes");
  redirect("/configuracoes");
}
