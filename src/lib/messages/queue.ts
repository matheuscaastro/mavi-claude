import "server-only";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@db/index";
import { appointmentItems, appointments, clients, employees, messages, type Message } from "@db/schema";
import { getSettings } from "../agenda";
import { addDays, localDate, localDateTime, localTime, todayLocal } from "../time";
import { getProvider } from "./provider";
import {
  birthdayMonthDays,
  friendlyDate,
  inSendWindow,
  joinServices,
  orderedVars,
  pickText,
  reminderTime,
  renderTemplate,
  TEMPLATE_VAR_ORDER,
  toInternational,
  type MessageKind,
  type Vars,
} from "./templates";

const MAX_ATTEMPTS = 3;
const RETRY_MIN = 10;

function baseUrl(): string {
  return (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
}

function linkFor(token: string | null): string {
  const base = baseUrl();
  if (!base) return "";
  return token ? `${base}/agendar/meu/${token}` : `${base}/agendar`;
}

async function insertMessage(row: {
  kind: MessageKind;
  clientId: number;
  appointmentId: number | null;
  phone: string;
  text: string;
  vars: Vars;
  scheduledFor: Date;
  dedupeKey: string;
}) {
  await db
    .insert(messages)
    .values({
      kind: row.kind,
      clientId: row.clientId,
      appointmentId: row.appointmentId,
      toPhone: toInternational(row.phone),
      body: renderTemplate(row.text, row.vars),
      vars: orderedVars(row.kind, row.vars),
      scheduledFor: row.scheduledFor,
      dedupeKey: row.dedupeKey,
    })
    .onConflictDoNothing({ target: messages.dedupeKey });
}

/**
 * Deixa a fila de mensagens de um atendimento em dia. Chamar depois de criar, remarcar ou mudar o status.
 *  - Atendimento encerrado/cancelado: tudo que estava pendente é descartado.
 *  - Ativo: confirmação (se `confirm`) e lembrete para o horário atual; lembretes de horários antigos são descartados.
 * Só gera mensagem se o WhatsApp estiver ligado e a cliente tiver autorizado.
 */
export async function syncAppointmentMessages(appointmentId: number, opts: { confirm: boolean }, now: Date = new Date()) {
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
  if (!appt) return;

  const active = appt.status === "scheduled" || appt.status === "confirmed";
  const startKey = appt.startsAt.toISOString();

  // Pendentes que não valem mais (cancelado, ou lembrete/confirmação de um horário antigo).
  const pending = await db
    .select()
    .from(messages)
    .where(and(eq(messages.appointmentId, appointmentId), eq(messages.status, "pending"), inArray(messages.kind, ["confirmation", "reminder"])));
  const stale = pending.filter((m) => !active || !m.dedupeKey.endsWith(`:${startKey}`)).map((m) => m.id);
  if (stale.length) {
    await db.update(messages).set({ status: "skipped", error: "Atendimento alterado ou cancelado." }).where(inArray(messages.id, stale));
  }
  if (!active) return;

  const settings = await getSettings();
  if (!settings.whatsappEnabled) return;
  const [client] = await db.select().from(clients).where(eq(clients.id, appt.clientId));
  if (!client || !client.whatsappOptIn || !client.active) return;
  const [emp] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, appt.employeeId));
  const items = await db.select().from(appointmentItems).where(eq(appointmentItems.appointmentId, appointmentId));

  const date = localDate(appt.startsAt);
  const vars: Vars = {
    nome: client.name.split(" ")[0] ?? client.name,
    salao: settings.salonName,
    servicos: joinServices(items.map((i) => i.serviceName)),
    data: friendlyDate(date),
    hora: localTime(appt.startsAt),
    profissional: emp?.name.split(" ")[0] ?? "",
    link: linkFor(appt.publicToken),
  };

  if (opts.confirm && settings.confirmationEnabled) {
    await insertMessage({
      kind: "confirmation",
      clientId: client.id,
      appointmentId,
      phone: client.phone,
      text: pickText("confirmation", settings.confirmationText),
      vars,
      scheduledFor: now,
      dedupeKey: `confirmation:${appointmentId}:${startKey}`,
    });
  }
  if (settings.reminderEnabled) {
    const at = reminderTime(appt.startsAt, settings.reminderHoursBefore, now);
    if (at) {
      await insertMessage({
        kind: "reminder",
        clientId: client.id,
        appointmentId,
        phone: client.phone,
        text: pickText("reminder", settings.reminderText),
        vars,
        scheduledFor: at,
        dedupeKey: `reminder:${appointmentId}:${startKey}`,
      });
    }
  }
}

/** Para usar nas telas: um erro na fila de mensagens nunca pode derrubar o agendamento. */
export async function safeSync(appointmentId: number, opts: { confirm: boolean }) {
  try {
    await syncAppointmentMessages(appointmentId, opts);
    // Confirmação sai na hora; o que não for urgente espera o agendador.
    void processQueue().catch((e) => console.error("[whatsapp] fila:", e));
  } catch (e) {
    console.error("[whatsapp] não foi possível enfileirar:", e);
  }
}

/** Cria as mensagens de aniversário de hoje (uma por cliente por ano). */
export async function enqueueBirthdays(now: Date = new Date()): Promise<number> {
  const settings = await getSettings();
  if (!settings.whatsappEnabled || !settings.birthdayEnabled) return 0;
  const today = todayLocal(now);
  const year = today.slice(0, 4);
  const mds = birthdayMonthDays(today);
  const rows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.active, true), eq(clients.whatsappOptIn, true), sql`to_char(${clients.birthDate}, 'MM-DD') in (${sql.join(mds.map((m) => sql`${m}`), sql`, `)})`));

  const sendAt = localDateTime(today, `${String(settings.birthdayHour).padStart(2, "0")}:00`);
  let created = 0;
  for (const c of rows) {
    const key = `birthday:${c.id}:${year}`;
    const exists = await db.select({ id: messages.id }).from(messages).where(eq(messages.dedupeKey, key));
    if (exists.length) continue;
    await insertMessage({
      kind: "birthday",
      clientId: c.id,
      appointmentId: null,
      phone: c.phone,
      text: pickText("birthday", settings.birthdayText),
      vars: { nome: c.name.split(" ")[0] ?? c.name, salao: settings.salonName },
      scheduledFor: sendAt,
      dedupeKey: key,
    });
    created++;
  }
  return created;
}

export type QueueReport = { sent: number; failed: number; skipped: number; retried: number; waiting: number };

/** Pega as mensagens vencidas e envia. Pode ser chamada por várias fontes ao mesmo tempo sem duplicar. */
export async function processQueue(now: Date = new Date(), limit = 20): Promise<QueueReport> {
  const report: QueueReport = { sent: 0, failed: 0, skipped: 0, retried: 0, waiting: 0 };
  const settings = await getSettings();
  const provider = getProvider();

  // Reserva um lote: o horário vai 10 min para frente, então outra execução não pega as mesmas.
  const batch: Message[] = await db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(messages)
      .where(and(eq(messages.status, "pending"), lte(messages.scheduledFor, now)))
      .orderBy(messages.scheduledFor)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];
    const lease = new Date(now.getTime() + RETRY_MIN * 60_000);
    const claimed = await tx
      .update(messages)
      .set({ scheduledFor: lease, attempts: sql`${messages.attempts} + 1` })
      .where(inArray(messages.id, due.map((d) => d.id)))
      .returning();
    return claimed;
  });

  const outside = !inSendWindow(now);
  for (const m of batch) {
    const finish = (set: Partial<Message>) => db.update(messages).set(set).where(eq(messages.id, m.id));

    if (!settings.whatsappEnabled) {
      await finish({ status: "skipped", error: "WhatsApp desligado nas configurações." });
      report.skipped++;
      continue;
    }
    // Lembrete e aniversário não saem de madrugada; a confirmação é resposta a uma ação e sai na hora.
    if (outside && m.kind !== "confirmation") {
      await finish({ scheduledFor: nextWindowStart(now), attempts: m.attempts - 1 });
      report.waiting++;
      continue;
    }
    // Antes de enviar, confere se a mensagem ainda faz sentido.
    const [client] = await db.select().from(clients).where(eq(clients.id, m.clientId));
    if (!client || !client.whatsappOptIn || !client.active) {
      await finish({ status: "skipped", error: "Cliente sem autorização de WhatsApp." });
      report.skipped++;
      continue;
    }
    if (m.appointmentId) {
      const [a] = await db.select().from(appointments).where(eq(appointments.id, m.appointmentId));
      const ok = a && (a.status === "scheduled" || a.status === "confirmed") && (m.kind === "confirmation" || a.startsAt.getTime() > now.getTime());
      if (!ok) {
        await finish({ status: "skipped", error: "Atendimento não está mais ativo." });
        report.skipped++;
        continue;
      }
    }

    const vars = varsFromRow(m);
    const res = await provider.send({ to: m.toPhone, body: m.body, kind: m.kind, vars });
    if (res.ok) {
      await finish({ status: "sent", sentAt: new Date(), provider: provider.name, providerMessageId: res.id, error: "" });
      report.sent++;
    } else if (res.permanent || m.attempts >= MAX_ATTEMPTS) {
      await finish({ status: "failed", provider: provider.name, error: res.error });
      report.failed++;
    } else {
      await finish({ provider: provider.name, error: res.error });
      report.retried++;
    }
  }
  return report;
}

/** As variáveis ficam gravadas em ordem; para o provedor basta reconstruir o mapa pela ordem do tipo. */
function varsFromRow(m: Message): Vars {
  const list = Array.isArray(m.vars) ? (m.vars as string[]) : [];
  const out: Vars = {};
  TEMPLATE_VAR_ORDER[m.kind].forEach((name, i) => {
    out[name] = list[i] ?? "";
  });
  return out;
}

/** Próximo 08:00 (hoje, se ainda não chegou; senão amanhã). */
function nextWindowStart(now: Date): Date {
  const today = todayLocal(now);
  const start = localDateTime(today, "08:00");
  return start.getTime() > now.getTime() ? start : localDateTime(addDays(today, 1), "08:00");
}
