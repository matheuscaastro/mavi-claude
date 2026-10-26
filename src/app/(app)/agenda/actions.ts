"use server";

import { and, eq, gt, lt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@db/index";
import { appointmentEvents, appointments, clients, employees, scheduleBlocks, type AppointmentStatus } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { bookAppointment, getAvailability, isOverlapViolation } from "@/lib/agenda";
import { can } from "@/lib/permissions";
import { safeSync } from "@/lib/messages/queue";
import { isValidDate, isValidTime, localDateTime, parseTime } from "@/lib/time";

export type FormState = { error?: string };

const bookSchema = z.object({
  clientId: z.coerce.number().int().positive("Escolha a cliente."),
  date: z.string().refine(isValidDate, "Data inválida."),
  time: z.string().refine(isValidTime, "Escolha um horário."),
  employeeId: z.coerce.number().int().positive("Escolha um horário."),
  notes: z.string().trim(),
});

export async function createAppointment(_p: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("agenda.edit");
  const serviceIds = formData.getAll("serviceIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (serviceIds.length === 0) return { error: "Escolha ao menos um serviço." };
  const parsed = bookSchema.safeParse({
    clientId: formData.get("clientId"),
    date: formData.get("date"),
    time: formData.get("time"),
    employeeId: formData.get("employeeId"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const v = parsed.data;

  const [client] = await db.select().from(clients).where(and(eq(clients.id, v.clientId), eq(clients.active, true)));
  if (!client) return { error: "Cliente não encontrada." };

  // Confere de novo no servidor: o horário precisa estar livre para essa profissional.
  const av = await getAvailability({ date: v.date, serviceIds, employeeId: v.employeeId });
  if (!av.slots.some((s) => s.time === v.time && s.employeeId === v.employeeId)) {
    return { error: "Esse horário não está mais disponível. Escolha outro." };
  }

  const r = await bookAppointment({ ...v, serviceIds, origin: "counter", createdBy: user.id });
  if (!r.ok) return { error: r.error };
  await safeSync(r.id, { confirm: true });
  revalidatePath("/agenda");
  redirect(`/agenda?data=${v.date}`);
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "in_progress", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export async function changeStatus(id: number, next: AppointmentStatus) {
  const user = await requireUser();
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!appt) redirect("/agenda");

  const isOwn = appt.employeeId === user.id;
  const allowed = can(user.accessRole, "agenda.edit") || (can(user.accessRole, "agenda.updateOwnStatus") && isOwn && (next === "in_progress" || next === "completed"));
  if (!allowed) redirect("/agenda?erro=sem-permissao");
  if (!TRANSITIONS[appt.status].includes(next)) redirect(`/agenda/${id}`);

  await db.transaction(async (tx) => {
    await tx.update(appointments).set({ status: next, updatedAt: new Date() }).where(eq(appointments.id, id));
    await tx.insert(appointmentEvents).values({ appointmentId: id, employeeId: user.id, action: "status", details: { from: appt.status, to: next } });
  });
  await safeSync(id, { confirm: false });
  revalidatePath("/agenda");
  redirect(`/agenda/${id}`);
}

export async function rescheduleAppointment(id: number, _p: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("agenda.edit");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const employeeId = Number(formData.get("employeeId"));
  if (!isValidDate(date) || !isValidTime(time) || !Number.isInteger(employeeId)) return { error: "Escolha data e horário." };

  const [appt] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!appt || appt.status === "cancelled" || appt.status === "completed") return { error: "Esse atendimento não pode ser remarcado." };

  const items = await db.query.appointmentItems.findMany({ where: (t, { eq }) => eq(t.appointmentId, id) });
  const serviceIds = items.map((i) => i.serviceId);
  const av = await getAvailability({ date, serviceIds, employeeId, ignoreAppointmentId: id });
  if (!av.slots.some((s) => s.time === time && s.employeeId === employeeId)) return { error: "Esse horário não está disponível." };

  const duration = Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000);
  const startsAt = localDateTime(date, time);
  const endsAt = new Date(startsAt.getTime() + duration * 60000);
  try {
    await db.transaction(async (tx) => {
      await tx.update(appointments).set({ startsAt, endsAt, employeeId, status: "scheduled", updatedAt: new Date() }).where(eq(appointments.id, id));
      await tx.insert(appointmentEvents).values({
        appointmentId: id,
        employeeId: user.id,
        action: "rescheduled",
        details: { from: appt.startsAt.toISOString(), to: startsAt.toISOString(), fromEmployee: appt.employeeId, toEmployee: employeeId },
      });
    });
  } catch (e) {
    if (isOverlapViolation(e)) return { error: "Esse horário acabou de ser ocupado. Escolha outro." };
    throw e;
  }
  await safeSync(id, { confirm: true });
  revalidatePath("/agenda");
  redirect(`/agenda/${id}`);
}

const blockSchema = z.object({
  employeeId: z.coerce.number().int().positive("Escolha a profissional."),
  date: z.string().refine(isValidDate, "Data inválida."),
  start: z.string().refine(isValidTime, "Horário inicial inválido."),
  end: z.string().refine(isValidTime, "Horário final inválido."),
  reason: z.string().trim(),
});

export async function createBlock(_p: FormState, formData: FormData): Promise<FormState> {
  await requireUser("agenda.edit");
  const parsed = blockSchema.safeParse({
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const v = parsed.data;
  if (parseTime(v.end) <= parseTime(v.start)) return { error: "O horário final precisa ser depois do inicial." };
  const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, v.employeeId));
  if (!emp) return { error: "Profissional não encontrada." };

  const startsAt = localDateTime(v.date, v.start);
  const endsAt = localDateTime(v.date, v.end);
  const clash = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.employeeId, v.employeeId), ne(appointments.status, "cancelled"), lt(appointments.startsAt, endsAt), gt(appointments.endsAt, startsAt)))
    .limit(1);
  if (clash.length) return { error: "Há um atendimento nesse período. Remarque ou cancele antes de bloquear." };

  try {
    await db.insert(scheduleBlocks).values({ employeeId: v.employeeId, startsAt, endsAt, reason: v.reason || "Bloqueado" });
  } catch (e) {
    if (isOverlapViolation(e)) return { error: "Já existe um bloqueio nesse período." };
    throw e;
  }
  revalidatePath("/agenda");
  redirect(`/agenda?data=${v.date}`);
}

export async function deleteBlock(id: number, date: string) {
  await requireUser("agenda.edit");
  await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
  revalidatePath("/agenda");
  redirect(`/agenda?data=${date}`);
}
