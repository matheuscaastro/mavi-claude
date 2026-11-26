"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@db/index";
import { waitlistEntries } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { isValidDate } from "@/lib/time";
import { saveWish } from "@/lib/waitlist-save";

export type WaitState = { error?: string; ok?: boolean };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80, "Nome muito longo."),
  from: z.string().refine(isValidDate, "Data inicial inválida."),
  to: z.string().refine(isValidDate, "Data final inválida."),
  period: z.enum(["any", "morning", "afternoon"]),
  note: z.string().trim().max(200, "A observação pode ter no máximo 200 letras."),
});

export async function addWaitlistEntry(_p: WaitState, formData: FormData): Promise<WaitState> {
  await requireUser("agenda.edit");
  const parsed = schema.safeParse({ name: formData.get("name"), from: formData.get("from"), to: formData.get("to"), period: formData.get("period"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "WhatsApp inválido. Use DDD + número." };
  if (parsed.data.from > parsed.data.to) return { error: "A data final não pode ser antes da inicial." };
  const serviceIds = formData.getAll("serviceIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (serviceIds.length === 0) return { error: "Escolha ao menos um serviço." };
  const emp = Number(formData.get("employeeId"));
  const r = await saveWish({
    name: parsed.data.name,
    phone,
    serviceIds,
    employeeId: Number.isInteger(emp) && emp > 0 ? emp : null,
    wantedFrom: parsed.data.from,
    wantedTo: parsed.data.to,
    period: parsed.data.period,
    note: parsed.data.note,
    origin: "counter",
    publicOnly: false,
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/lista-de-espera");
  return { ok: true };
}

const STATUSES = ["contacted", "booked", "removed", "waiting"] as const;

export async function setWaitlistStatus(id: number, status: (typeof STATUSES)[number]) {
  await requireUser("agenda.edit");
  if (!STATUSES.includes(status)) return;
  await db.update(waitlistEntries).set({ status, contactedAt: status === "contacted" ? new Date() : null }).where(eq(waitlistEntries.id, id));
  revalidatePath("/lista-de-espera");
}
