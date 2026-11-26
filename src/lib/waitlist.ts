import { and, eq, inArray } from "drizzle-orm";
import { db } from "@db/index";
import { appointments, waitlistEntries } from "@db/schema";
import { notify } from "./notifications";
import { formatDateShort, localDate, localMinutes, localTime } from "./time";
import { wishFitsSlot, whatsappInvite, type Period } from "./waitlist-rules";

/**
 * Chamada quando um atendimento é cancelado: avisa a equipe (sino) de quem está na lista e cabe no horário que abriu.
 * Nunca derruba a ação principal.
 */
export async function notifyWaitlistForFreedSlot(appointmentId: number): Promise<void> {
  try {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
    if (!appt) return;
    if (appt.startsAt.getTime() <= Date.now()) return; // horário que já passou não volta
    const slot = {
      date: localDate(appt.startsAt),
      startMin: localMinutes(appt.startsAt),
      durationMin: Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000),
      employeeId: appt.employeeId,
    };
    const waiting = await db.select().from(waitlistEntries).where(and(inArray(waitlistEntries.status, ["waiting"])));
    const matches = waiting.filter((w) => wishFitsSlot({ durationMin: w.durationMin, employeeId: w.employeeId, wantedFrom: w.wantedFrom, wantedTo: w.wantedTo, period: w.period as Period }, slot));
    const when = `${formatDateShort(slot.date)} às ${localTime(appt.startsAt)}`;
    for (const w of matches.slice(0, 5)) {
      await notify({ kind: "waitlist_match", title: `Vaga aberta para ${w.name} (lista de espera)`, body: `${when} · ${w.serviceNames}`, href: "/lista-de-espera" });
    }
  } catch (e) {
    console.error("Falha ao conferir a lista de espera", e);
  }
}

export { whatsappInvite };
