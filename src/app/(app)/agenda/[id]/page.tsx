import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { appointmentEvents, appointmentItems, appointments, clients, employees, type AppointmentStatus } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import { formatBRL } from "@/lib/money";
import { formatDateLong, formatDuration, localDate, localTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/status";
import RescheduleForm from "./RescheduleForm";
import { changeStatus } from "../actions";

export const metadata = { title: "Atendimento" };
export const dynamic = "force-dynamic";

const NEXT: Record<AppointmentStatus, { to: AppointmentStatus; label: string; secondary?: boolean }[]> = {
  scheduled: [
    { to: "confirmed", label: "Confirmar" },
    { to: "in_progress", label: "Iniciar atendimento" },
    { to: "no_show", label: "Marcar falta", secondary: true },
    { to: "cancelled", label: "Cancelar", secondary: true },
  ],
  confirmed: [
    { to: "in_progress", label: "Iniciar atendimento" },
    { to: "no_show", label: "Marcar falta", secondary: true },
    { to: "cancelled", label: "Cancelar", secondary: true },
  ],
  in_progress: [{ to: "completed", label: "Concluir atendimento" }],
  completed: [],
  cancelled: [],
  no_show: [],
};

const EVENT_LABEL: Record<string, string> = { created: "Agendado", status: "Status alterado", rescheduled: "Remarcado" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [row] = await db
    .select({ a: appointments, client: clients, employee: employees })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .innerJoin(employees, eq(employees.id, appointments.employeeId))
    .where(eq(appointments.id, id));
  if (!row) notFound();
  const { a, client, employee } = row;

  const canEdit = can(user.accessRole, "agenda.edit");
  const isOwn = a.employeeId === user.id;
  if (!can(user.accessRole, "agenda.viewAll") && !isOwn) notFound();

  const [items, events] = await Promise.all([
    db.select().from(appointmentItems).where(eq(appointmentItems.appointmentId, id)).orderBy(asc(appointmentItems.id)),
    db.select().from(appointmentEvents).where(eq(appointmentEvents.appointmentId, id)).orderBy(asc(appointmentEvents.at)),
  ]);

  const actions = NEXT[a.status].filter((n) => canEdit || (isOwn && can(user.accessRole, "agenda.updateOwnStatus") && (n.to === "in_progress" || n.to === "completed")));
  const canReschedule = canEdit && a.status !== "cancelled" && a.status !== "completed";
  const date = localDate(a.startsAt);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <div className="muted">
            <span className={`chip status status-${a.status}`}>{STATUS_LABEL[a.status]}</span> · {formatPhone(client.phone)}
          </div>
        </div>
        <Link className="btn secondary" href={`/agenda?data=${date}`}>
          Voltar à agenda
        </Link>
      </div>

      <div className="split">
        <div className="stack grow-3">
          <div className="card">
            <dl className="summary">
              <dt>Quando</dt>
              <dd>
                {formatDateLong(date).replace(/^./, (c) => c.toUpperCase())} · {localTime(a.startsAt)}–{localTime(a.endsAt)}
              </dd>
              <dt>Profissional</dt>
              <dd>{employee.name}</dd>
              <dt>Serviços</dt>
              {items.map((i) => (
                <dd key={i.id} style={{ marginBottom: 4 }}>
                  {i.serviceName} · {formatDuration(i.durationMin)} · {formatBRL(i.priceCents)}
                </dd>
              ))}
              <dt style={{ marginTop: 10 }}>Total</dt>
              <dd>{formatBRL(a.totalCents)}</dd>
              {a.notes ? (
                <>
                  <dt>Observações</dt>
                  <dd>{a.notes}</dd>
                </>
              ) : null}
            </dl>
            {actions.length ? (
              <div className="row">
                {actions.map((n) => (
                  <form key={n.to} action={changeStatus.bind(null, a.id, n.to)}>
                    <button className={n.secondary ? "btn secondary" : "btn"} type="submit">
                      {n.label}
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>

          {canReschedule ? (
            <div className="card">
              <div className="section-title">Remarcar</div>
              <RescheduleForm id={a.id} serviceIds={items.map((i) => i.serviceId)} employeeId={a.employeeId} initialDate={date} />
            </div>
          ) : null}
        </div>

        <div className="card grow-2">
          <div className="section-title">Histórico</div>
          <div className="stack small">
            {events.map((e) => (
              <div key={e.id}>
                <strong>{EVENT_LABEL[e.action] ?? e.action}</strong>
                {e.action === "status" ? ` → ${STATUS_LABEL[(e.details as { to: AppointmentStatus }).to] ?? ""}` : ""}
                <div className="muted tiny">{e.at.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
