import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { appointmentItems, appointments, clients, employees } from "@db/schema";
import { getSettings } from "@/lib/agenda";
import { formatBRL } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/status";
import { formatDateLong, formatDuration, localDate, localTime } from "@/lib/time";
import RescheduleBox from "./RescheduleBox";
import { cancelPublic } from "../../actions";

export const metadata: Metadata = { title: "Meu agendamento", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MyAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ novo?: string; remarcado?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const [row] = await db
    .select({ a: appointments, client: clients, employee: employees })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .innerJoin(employees, eq(employees.id, appointments.employeeId))
    .where(eq(appointments.publicToken, token));
  if (!row) notFound();
  const { a, client, employee } = row;
  const [items, settings] = await Promise.all([
    db.select().from(appointmentItems).where(eq(appointmentItems.appointmentId, a.id)).orderBy(asc(appointmentItems.id)),
    getSettings(),
  ]);

  const open = a.status === "scheduled" || a.status === "confirmed";
  const deadlineOk = Date.now() <= a.startsAt.getTime() - settings.cancelDeadlineHours * 3_600_000;
  const date = localDate(a.startsAt);
  const when = formatDateLong(date).replace(/^./, (c) => c.toUpperCase());

  return (
    <>
      {sp.novo ? (
        <div className="notice ok">
          <strong>Agendamento confirmado!</strong> Guarde esta página: é por aqui que você cancela ou remarca. Salve o endereço nos favoritos ou tire um print.
        </div>
      ) : null}
      {sp.remarcado ? <div className="notice ok">Agendamento remarcado.</div> : null}

      <div className="card">
        <div className="row spread" style={{ alignItems: "center" }}>
          <h1 className="page-title" style={{ fontSize: 24 }}>
            Olá, {client.name.split(" ")[0]}
          </h1>
          <span className={`chip status status-${a.status}`}>{STATUS_LABEL[a.status]}</span>
        </div>
        <dl className="summary" style={{ marginTop: 16 }}>
          <dt>Quando</dt>
          <dd>
            {when} · {localTime(a.startsAt)}–{localTime(a.endsAt)}
          </dd>
          <dt>Profissional</dt>
          <dd>{employee.name}</dd>
          <dt>Serviços</dt>
          {items.map((i) => (
            <dd key={i.id} style={{ marginBottom: 4 }}>
              {i.serviceName} · {formatDuration(i.durationMin)}
            </dd>
          ))}
          <dt style={{ marginTop: 10 }}>Valor (pago no salão)</dt>
          <dd style={{ marginBottom: 0 }}>{formatBRL(a.totalCents - a.discountCents)}</dd>
        </dl>
      </div>

      {open && deadlineOk ? (
        <>
          <div className="card">
            <div className="section-title">Remarcar</div>
            <RescheduleBox token={token} employeeId={a.employeeId} serviceIds={items.map((i) => i.serviceId)} initialDate={date} />
          </div>
          <div className="card">
            <div className="section-title">Cancelar</div>
            <p className="muted small" style={{ marginTop: 0 }}>
              Você pode cancelar sem custo até {settings.cancelDeadlineHours} horas antes do horário.
            </p>
            <form action={cancelPublic.bind(null, token)}>
              <button className="btn secondary" type="submit">
                Cancelar este agendamento
              </button>
            </form>
          </div>
        </>
      ) : null}
      {open && !deadlineOk ? (
        <div className="notice">
          O prazo para cancelar ou remarcar online (até {settings.cancelDeadlineHours} horas antes) já passou. Entre em contato com o salão.
        </div>
      ) : null}
      {a.status === "cancelled" ? (
        <Link className="btn" href="/agendar" style={{ alignSelf: "flex-start" }}>
          Fazer um novo agendamento
        </Link>
      ) : null}
    </>
  );
}
