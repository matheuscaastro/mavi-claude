import "server-only";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db } from "@db/index";
import {
  appointmentEvents,
  appointmentItems,
  appointments,
  employeeHours,
  employeeServices,
  employees,
  salonExceptions,
  salonHours,
  salonSettings,
  scheduleBlocks,
  services,
} from "@db/schema";
import { isOverlapViolation } from "./db-errors";
import { freeStarts, intersect, pickLeastBusy, resolveDayWindow, type Interval } from "./availability";
import { formatTime, localDateTime, parseTime, weekdayOf } from "./time";

export const DEFAULT_SETTINGS = {
  id: 1,
  minNoticeHours: 2,
  maxDaysAhead: 60,
  cancelDeadlineHours: 24,
  slotStepMin: 15,
  allowAnyProfessional: true,
};

export async function getSettings() {
  const [row] = await db.select().from(salonSettings).where(eq(salonSettings.id, 1));
  return row ?? DEFAULT_SETTINGS;
}

/** Janela de funcionamento do salão no dia (null = fechado). */
export async function getSalonWindow(date: string): Promise<Interval | null> {
  const [hours, exceptions] = await Promise.all([db.select().from(salonHours), db.select().from(salonExceptions).where(eq(salonExceptions.date, date))]);
  return resolveDayWindow(date, weekdayOf(date), hours, exceptions);
}

function dayRange(date: string) {
  return { from: localDateTime(date, "00:00"), to: localDateTime(date, "23:59") };
}

export type SlotOption = { time: string; employeeId: number };

export type AvailabilityInput = {
  date: string;
  serviceIds: number[];
  /** null = qualquer disponível */
  employeeId: number | null;
  /** Ao remarcar, o próprio atendimento não conta como ocupado. */
  ignoreAppointmentId?: number;
  /** Aplica antecedência mínima (uso público). Na recepção, só bloqueia o passado. */
  applyMinNotice?: boolean;
  /** Uso público: só serviços marcados como disponíveis para agendamento online. */
  publicOnly?: boolean;
  now?: Date;
};

export type AvailabilityResult = {
  closed: boolean;
  durationMin: number;
  bufferMin: number;
  totalCents: number;
  /** Um horário por início possível, já com a profissional escolhida. */
  slots: SlotOption[];
  eligible: { id: number; name: string }[];
  /** Por que não há horários (para a tela explicar): ninguém faz esses serviços, ou a escolhida não faz. */
  reason?: "no_staff" | "staff_not_eligible";
};

/**
 * Horários livres para um conjunto de serviços em um dia.
 * Os serviços são feitos em sequência, pela mesma profissional.
 */
export async function getAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
  const now = input.now ?? new Date();
  const empty: AvailabilityResult = { closed: false, durationMin: 0, bufferMin: 0, totalCents: 0, slots: [], eligible: [] };

  const chosen = input.serviceIds.length
    ? await db.select().from(services).where(and(inArray(services.id, input.serviceIds), eq(services.active, true), input.publicOnly ? eq(services.publicVisible, true) : undefined))
    : [];
  if (chosen.length === 0 || chosen.length !== new Set(input.serviceIds).size) return empty;

  const durationMin = chosen.reduce((a, s) => a + s.durationMin, 0);
  const bufferMin = Math.max(...chosen.map((s) => s.bufferMin));
  const totalCents = chosen.reduce((a, s) => a + s.priceCents, 0);
  const base = { ...empty, durationMin, bufferMin, totalCents };

  const [settings, salonWindow] = await Promise.all([getSettings(), getSalonWindow(input.date)]);
  if (!salonWindow) return { ...base, closed: true };

  // Profissionais que atendem e fazem TODOS os serviços escolhidos.
  const staff = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .where(and(eq(employees.active, true), eq(employees.performsServices, true)))
    .orderBy(employees.id);
  const links = await db
    .select()
    .from(employeeServices)
    .where(inArray(employeeServices.serviceId, input.serviceIds));
  const eligible = staff.filter((e) => input.serviceIds.every((sid) => links.some((l) => l.employeeId === e.id && l.serviceId === sid)));
  const candidates = input.employeeId === null ? eligible : eligible.filter((e) => e.id === input.employeeId);
  if (candidates.length === 0) return { ...base, eligible, reason: eligible.length === 0 ? "no_staff" : "staff_not_eligible" };

  const ids = candidates.map((c) => c.id);
  const { from, to } = dayRange(input.date);
  const weekday = weekdayOf(input.date);

  const [ownHours, busyAppts, busyBlocks] = await Promise.all([
    db.select().from(employeeHours).where(and(inArray(employeeHours.employeeId, ids), eq(employeeHours.weekday, weekday))),
    db
      .select()
      .from(appointments)
      .where(
        and(
          inArray(appointments.employeeId, ids),
          lt(appointments.startsAt, to),
          gt(appointments.endsAt, from),
          ne(appointments.status, "cancelled"),
          input.ignoreAppointmentId ? ne(appointments.id, input.ignoreAppointmentId) : undefined,
        ),
      ),
    db
      .select()
      .from(scheduleBlocks)
      .where(and(inArray(scheduleBlocks.employeeId, ids), lt(scheduleBlocks.startsAt, to), gt(scheduleBlocks.endsAt, from))),
  ]);

  const dayStart = localDateTime(input.date, "00:00").getTime();
  const toInterval = (s: Date, e: Date): Interval => ({
    start: Math.round((s.getTime() - dayStart) / 60000),
    end: Math.round((e.getTime() - dayStart) / 60000),
  });

  const minNotice = input.applyMinNotice ? settings.minNoticeHours * 60 : 0;
  const notBeforeMs = now.getTime() + minNotice * 60000;
  const notBefore = Math.ceil((notBeforeMs - dayStart) / 60000);

  const perEmployee = candidates.map((c) => {
    const own = ownHours.find((h) => h.employeeId === c.id);
    const win = own ? intersect(salonWindow, { start: parseTime(own.startTime), end: parseTime(own.endTime) }) : salonWindow;
    const busy = [
      ...busyAppts.filter((a) => a.employeeId === c.id).map((a) => toInterval(a.startsAt, a.endsAt)),
      ...busyBlocks.filter((b) => b.employeeId === c.id).map((b) => toInterval(b.startsAt, b.endsAt)),
    ];
    const starts = win ? freeStarts({ window: win, busy, durationMin, bufferMin, stepMin: settings.slotStepMin, notBefore }) : [];
    return { id: c.id, starts, load: busyAppts.filter((a) => a.employeeId === c.id).length };
  });

  const times = [...new Set(perEmployee.flatMap((p) => p.starts))].sort((a, b) => a - b);
  const slots: SlotOption[] = [];
  for (const t of times) {
    const free = perEmployee.filter((p) => p.starts.includes(t)).map((p) => ({ employeeId: p.id, load: p.load }));
    const pick = pickLeastBusy(free);
    if (pick !== null) slots.push({ time: formatTime(t), employeeId: pick });
  }
  return { ...base, slots, eligible };
}

export type BookInput = {
  clientId: number;
  employeeId: number;
  date: string;
  time: string;
  serviceIds: number[];
  notes?: string;
  origin: "counter" | "online";
  createdBy: number | null;
  /** Código do link "meu agendamento" (só online). */
  publicToken?: string;
};

export type BookResult = { ok: true; id: number } | { ok: false; error: string };

export { isOverlapViolation };

/** Cria o atendimento. A trava do banco (EXCLUDE) garante que ninguém reserva o mesmo horário ao mesmo tempo. */
export async function bookAppointment(input: BookInput): Promise<BookResult> {
  const chosen = await db.select().from(services).where(and(inArray(services.id, input.serviceIds), eq(services.active, true)));
  if (chosen.length === 0 || chosen.length !== new Set(input.serviceIds).size) return { ok: false, error: "Serviço indisponível." };
  const ordered = input.serviceIds.map((id) => chosen.find((s) => s.id === id)!);
  const durationMin = ordered.reduce((a, s) => a + s.durationMin, 0);
  const startsAt = localDateTime(input.date, input.time);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60000);
  const totalCents = ordered.reduce((a, s) => a + s.priceCents, 0);

  try {
    const id = await db.transaction(async (tx) => {
      const [appt] = await tx
        .insert(appointments)
        .values({
          clientId: input.clientId,
          employeeId: input.employeeId,
          startsAt,
          endsAt,
          origin: input.origin,
          totalCents,
          notes: input.notes ?? "",
          createdBy: input.createdBy,
          publicToken: input.publicToken ?? null,
        })
        .returning({ id: appointments.id });
      await tx.insert(appointmentItems).values(
        ordered.map((s) => ({
          appointmentId: appt.id,
          serviceId: s.id,
          serviceName: s.name,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
        })),
      );
      await tx.insert(appointmentEvents).values({
        appointmentId: appt.id,
        employeeId: input.createdBy,
        action: "created",
        details: { origin: input.origin, startsAt: startsAt.toISOString() },
      });
      return appt.id;
    });
    return { ok: true, id };
  } catch (e) {
    if (isOverlapViolation(e)) return { ok: false, error: "Esse horário acabou de ser ocupado. Escolha outro." };
    throw e;
  }
}
