import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { appointments, clientPhotos, clients, employees } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import { formatBRL } from "@/lib/money";
import { formatDateShort, localDate, localTime, todayLocal } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/status";
import ClientForm from "../ClientForm";
import { setClientActive, updateClient } from "../actions";
import { deleteClientPhoto } from "./fotos-actions";
import PhotoForm from "./PhotoForm";

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
  const { salvo } = await searchParams;
  const canEdit = can(user.accessRole, "clients.edit");

  // Cliente e histórico só dependem do id: saem juntos.
  const [[client], history, photos] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, id)),
    db
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
    .limit(20),
    db
      .select({ id: clientPhotos.id, kind: clientPhotos.kind, takenOn: clientPhotos.takenOn, note: clientPhotos.note })
      .from(clientPhotos)
      .where(eq(clientPhotos.clientId, id))
      .orderBy(desc(clientPhotos.takenOn), desc(clientPhotos.id)),
  ]);
  if (!client) notFound();

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title" data-eyebrow="Cadastros">{client.name}</h1>
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

      <div className="card stack" style={{ marginTop: 20 }}>
        <div className="section-title" style={{ margin: 0 }}>
          Fotos antes e depois
        </div>
        {photos.length === 0 ? <div className="muted small">Nenhuma foto registrada.</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {photos.map((ph) => (
            <figure key={ph.id} style={{ margin: 0 }}>
              <a href={`/api/clientes/${client.id}/fotos/${ph.id}`} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/clientes/${client.id}/fotos/${ph.id}`}
                  alt={`${ph.kind === "before" ? "Antes" : "Depois"}${ph.note ? `: ${ph.note}` : ""}, ${formatDateShort(ph.takenOn)}`}
                  loading="lazy"
                  style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line)" }}
                />
              </a>
              <figcaption className="small" style={{ marginTop: 6 }}>
                <span className={`chip ${ph.kind === "before" ? "gray" : "status status-confirmed"}`}>{ph.kind === "before" ? "Antes" : "Depois"}</span>{" "}
                {formatDateShort(ph.takenOn)}
                {ph.note ? <div className="muted tiny">{ph.note}</div> : null}
                {canEdit ? (
                  <form action={deleteClientPhoto.bind(null, client.id, ph.id)}>
                    <button className="link-btn tiny" type="submit">Excluir foto</button>
                  </form>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
        {canEdit ? (
          <details className="disclosure">
            <summary>Adicionar foto</summary>
            <div style={{ paddingTop: 12 }}>
              <PhotoForm clientId={client.id} today={todayLocal()} />
            </div>
          </details>
        ) : null}
      </div>
    </>
  );
}
