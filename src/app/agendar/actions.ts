"use server";

import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@db/index";
import { appointmentEvents, appointmentItems, appointments, clients } from "@db/schema";
import { bookAppointment, getAvailability, getSettings, isOverlapViolation } from "@/lib/agenda";
import { safeSync } from "@/lib/messages/queue";
import { normalizePhone } from "@/lib/phone";
import { allow, clientIp } from "@/lib/rate-limit";
import { addDays, isValidDate, isValidTime, localDateTime, todayLocal } from "@/lib/time";

export type FormState = { error?: string };

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  phone: z.string().trim().min(1, "Informe seu WhatsApp."),
  birthDate: z.string().trim(),
  date: z.string().refine(isValidDate, "Escolha o dia."),
  time: z.string().refine(isValidTime, "Escolha um horário."),
  employeeId: z.coerce.number().int().positive("Escolha um horário."),
});

const MAX_OPEN_ONLINE = 3;

export async function bookPublic(_p: FormState, formData: FormData): Promise<FormState> {
  // Campo escondido que só robôs preenchem.
  if (String(formData.get("website") ?? "") !== "") return { error: "Não foi possível concluir o agendamento." };
  if (!allow(`book:${await clientIp()}`, 8, 60 * 60_000)) return { error: "Muitas tentativas. Tente novamente mais tarde ou fale com o salão." };

  const serviceIds = formData.getAll("serviceIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (serviceIds.length === 0) return { error: "Escolha ao menos um serviço." };
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate") ?? "",
    date: formData.get("date"),
    time: formData.get("time"),
    employeeId: formData.get("employeeId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const v = parsed.data;
  const phone = normalizePhone(v.phone);
  if (!phone) return { error: "WhatsApp inválido. Use DDD + número." };
  if (v.birthDate && !isValidDate(v.birthDate)) return { error: "Data de nascimento inválida." };
  const optIn = formData.get("whatsappOptIn") === "on";

  const settings = await getSettings();
  const today = todayLocal();
  if (v.date < today || v.date > addDays(today, settings.maxDaysAhead)) return { error: "Essa data não está disponível para agendamento." };

  // Confere de novo no servidor: o horário precisa continuar livre para essa profissional.
  const av = await getAvailability({ date: v.date, serviceIds, employeeId: v.employeeId, applyMinNotice: true, publicOnly: true });
  if (!av.slots.some((s) => s.time === v.time && s.employeeId === v.employeeId)) {
    return { error: "Esse horário não está mais disponível. Escolha outro." };
  }

  // Cliente por telefone: reaproveita o cadastro existente sem alterar dados dela.
  let [client] = await db.select().from(clients).where(eq(clients.phone, phone));
  if (!client) {
    await db
      .insert(clients)
      .values({ name: v.name, phone, birthDate: v.birthDate || null, origin: "online", whatsappOptIn: optIn })
      .onConflictDoNothing({ target: clients.phone });
    [client] = await db.select().from(clients).where(eq(clients.phone, phone));
  } else if (optIn && !client.whatsappOptIn) {
    await db.update(clients).set({ whatsappOptIn: true }).where(eq(clients.id, client.id));
  }
  if (!client || !client.active) return { error: "Não foi possível concluir o agendamento online. Fale com o salão." };

  const open = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.clientId, client.id), eq(appointments.origin, "online"), inArray(appointments.status, ["scheduled", "confirmed"]), gt(appointments.startsAt, new Date())));
  if (open.length >= MAX_OPEN_ONLINE) return { error: "Você já tem agendamentos em aberto. Fale com o salão para marcar mais um." };

  const token = randomBytes(16).toString("hex");
  const r = await bookAppointment({ clientId: client.id, employeeId: v.employeeId, date: v.date, time: v.time, serviceIds, origin: "online", createdBy: null, publicToken: token });
  if (!r.ok) return { error: r.error };
  await safeSync(r.id, { confirm: true });
  revalidatePath("/agenda");
  redirect(`/agendar/meu/${token}?novo=1`);
}

async function loadByToken(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const [appt] = await db.select().from(appointments).where(eq(appointments.publicToken, token));
  return appt ?? null;
}

/** Cancelar e remarcar só até o prazo configurado antes do horário. */
async function withinDeadline(startsAt: Date) {
  const { cancelDeadlineHours } = await getSettings();
  return Date.now() <= startsAt.getTime() - cancelDeadlineHours * 3_600_000;
}

export async function cancelPublic(token: string) {
  if (!allow(`manage:${await clientIp()}`, 30, 60 * 60_000)) redirect(`/agendar/meu/${token}`);
  const appt = await loadByToken(token);
  if (!appt) redirect("/agendar");
  if ((appt.status === "scheduled" || appt.status === "confirmed") && (await withinDeadline(appt.startsAt))) {
    await db.transaction(async (tx) => {
      await tx.update(appointments).set({ status: "cancelled", updatedAt: new Date() }).where(eq(appointments.id, appt.id));
      await tx.insert(appointmentEvents).values({ appointmentId: appt.id, employeeId: null, action: "status", details: { from: appt.status, to: "cancelled", by: "client" } });
    });
    await safeSync(appt.id, { confirm: false });
    revalidatePath("/agenda");
  }
  redirect(`/agendar/meu/${token}`);
}

export async function reschedulePublic(token: string, _p: FormState, formData: FormData): Promise<FormState> {
  if (!allow(`manage:${await clientIp()}`, 30, 60 * 60_000)) return { error: "Muitas tentativas. Tente novamente mais tarde." };
  const appt = await loadByToken(token);
  if (!appt) return { error: "Agendamento não encontrado." };
  if (!(appt.status === "scheduled" || appt.status === "confirmed")) return { error: "Este agendamento não pode mais ser alterado." };
  if (!(await withinDeadline(appt.startsAt))) return { error: "O prazo para remarcar online já passou. Fale com o salão." };

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const employeeId = Number(formData.get("employeeId"));
  if (!isValidDate(date) || !isValidTime(time) || !Number.isInteger(employeeId)) return { error: "Escolha dia e horário." };
  const settings = await getSettings();
  const today = todayLocal();
  if (date < today || date > addDays(today, settings.maxDaysAhead)) return { error: "Essa data não está disponível." };

  const items = await db.select().from(appointmentItems).where(eq(appointmentItems.appointmentId, appt.id));
  const av = await getAvailability({ date, serviceIds: items.map((i) => i.serviceId), employeeId, applyMinNotice: true, publicOnly: true, ignoreAppointmentId: appt.id });
  if (!av.slots.some((s) => s.time === time && s.employeeId === employeeId)) return { error: "Esse horário não está disponível." };

  const duration = Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000);
  const startsAt = localDateTime(date, time);
  const endsAt = new Date(startsAt.getTime() + duration * 60000);
  try {
    await db.transaction(async (tx) => {
      await tx.update(appointments).set({ startsAt, endsAt, employeeId, status: "scheduled", updatedAt: new Date() }).where(and(eq(appointments.id, appt.id), ne(appointments.status, "cancelled")));
      await tx.insert(appointmentEvents).values({
        appointmentId: appt.id,
        employeeId: null,
        action: "rescheduled",
        details: { from: appt.startsAt.toISOString(), to: startsAt.toISOString(), by: "client" },
      });
    });
  } catch (e) {
    if (isOverlapViolation(e)) return { error: "Esse horário acabou de ser ocupado. Escolha outro." };
    throw e;
  }
  await safeSync(appt.id, { confirm: true });
  revalidatePath("/agenda");
  redirect(`/agendar/meu/${token}?remarcado=1`);
}

