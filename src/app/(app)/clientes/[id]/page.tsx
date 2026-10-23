import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { appointments, clients, employees } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import { formatBRL } from "@/lib/money";
import { formatDateShort, localDate, localTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/status";
import ClientForm from "../ClientForm";
import { setClientActive, updateClient } from "../actions";

export const metadata = { title: "Cliente" };

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const user = await requireUser("clients.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();
  const { salvo } = await searchParams;
  const canEdit = can(user.accessRole, "clients.edit");

  const history = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      totalCents: appointments.totalCents,
      employee: employees.name,
    })
    .from(appointments)
    .innerJoin(employees, eq(employees.id, appointments.employeeId))
    .where(eq(appointments.clientId, id))
    .orderBy(desc(appointments.startsAt))
    .limit(20);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <div className="muted">
            {formatPhone(client.phone)} {!client.active ? <span className="chip gray">Inativa</span> : null}
          </div>
        </div>
        {canEdit && client.active ? (
          <Link className="btn" href={`/agenda/novo?cliente=${client.id}`}>
            Agendar
          </Link>
        ) : null}
      </div>
      {salvo ? <div className="notice ok">Dados salvos.</div> : null}

      <div className="split">
        <div className="card grow-3">
          {canEdit ? (
            <ClientForm
              action={updateClient.bind(null, client.id)}
              submitLabel="Salvar alterações"
              defaults={{
                name: client.name,
                phone: formatPhone(client.phone),
                email: client.email,
                birthDate: client.birthDate ?? "",
                cpf: client.cpf,
                notes: client.notes,
                whatsappOptIn: client.whatsappOptIn,
              }}
            />
          ) : (
            <div className="stack">
              <div>E-mail: {client.email || "—"}</div>
              <div>Observações: {client.notes || "—"}</div>
            </div>
          )}
          {canEdit ? (
            <form action={setClientActive.bind(null, client.id, !client.active)} style={{ marginTop: 16 }}>
              <button className="btn secondary" type="submit">
                {client.active ? "Inativar cliente" : "Reativar cliente"}
              </button>
            </form>
          ) : null}
        </div>

        <div className="card grow-2">
          <div className="section-title">Histórico</div>
          {history.length === 0 ? <div className="muted">Nenhum atendimento ainda.</div> : null}
          <div className="stack">
            {history.map((h) => (
              <Link key={h.id} href={`/agenda/${h.id}`} className="small">
                <strong>
                  {formatDateShort(localDate(h.startsAt))} · {localTime(h.startsAt)}
                </strong>
                <div className="muted">
                  {h.employee} · {STATUS_LABEL[h.status]} · {formatBRL(h.totalCents)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
