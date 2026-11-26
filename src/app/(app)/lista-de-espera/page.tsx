import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@db/index";
import { employees, services, waitlistEntries } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { formatDateShort, localDate, localTime, todayLocal } from "@/lib/time";
import { PERIOD_LABEL, whatsappInvite, type Period } from "@/lib/waitlist-rules";
import WaitlistForm from "./WaitlistForm";
import { setWaitlistStatus } from "./actions";

export const metadata = { title: "Lista de espera" };
export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  await requireUser("agenda.edit");
  const today = todayLocal();
  const [rows, svc, staff] = await Promise.all([
    db
      .select({ w: waitlistEntries, employee: employees.name })
      .from(waitlistEntries)
      .leftJoin(employees, eq(employees.id, waitlistEntries.employeeId))
      .where(inArray(waitlistEntries.status, ["waiting", "contacted"]))
      .orderBy(asc(waitlistEntries.wantedFrom), desc(waitlistEntries.createdAt)),
    db.select({ id: services.id, name: services.name }).from(services).where(eq(services.active, true)).orderBy(asc(services.name)),
    db.select({ id: employees.id, name: employees.name }).from(employees).where(and(eq(employees.active, true), eq(employees.performsServices, true))).orderBy(asc(employees.name)),
  ]);
  const active = rows.filter((r) => r.w.wantedTo >= today);
  const expired = rows.filter((r) => r.w.wantedTo < today);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title" data-eyebrow="Agenda">Lista de espera</h1>
          <div className="muted">Quando um horário cancela e encaixa no pedido, o sino avisa aqui.</div>
        </div>
      </div>
      <div className="split">
        <div className="stack grow-3">
          <div className="card" style={{ padding: 0 }}>
            {active.length === 0 ? <div className="muted small" style={{ padding: 16 }}>Ninguém esperando por enquanto.</div> : null}
            {active.map(({ w, employee }) => (
              <div key={w.id} className="row spread" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {w.name} <span className="muted small">· {formatPhone(w.phone)}</span>
                    {w.origin === "online" ? <span className="chip gray" style={{ marginLeft: 6 }}>Pelo site</span> : null}
                    {w.status === "contacted" ? <span className="chip status status-confirmed" style={{ marginLeft: 6 }}>Já avisada</span> : null}
                  </div>
                  <div className="small">{w.serviceNames}</div>
                  <div className="muted tiny">
                    {w.wantedFrom === w.wantedTo ? formatDateShort(w.wantedFrom) : `${formatDateShort(w.wantedFrom)} a ${formatDateShort(w.wantedTo)}`} · {PERIOD_LABEL[w.period as Period]} · {employee ?? "qualquer profissional"}
                    {" · pedido em "}{formatDateShort(localDate(w.createdAt))} {localTime(w.createdAt)}
                  </div>
                  {w.note ? <div className="muted tiny">{w.note}</div> : null}
                </div>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <a className="btn secondary" href={whatsappInvite(w.name, w.phone)} target="_blank" rel="noopener noreferrer">Avisar no WhatsApp</a>
                  <form action={setWaitlistStatus.bind(null, w.id, "contacted")}><button className="icon-btn" type="submit" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>Marcar como avisada</button></form>
                  <form action={setWaitlistStatus.bind(null, w.id, "booked")}><button className="icon-btn" type="submit" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>Agendou</button></form>
                  <form action={setWaitlistStatus.bind(null, w.id, "removed")}><button className="icon-btn" type="submit" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>Remover</button></form>
                </div>
              </div>
            ))}
          </div>
          {expired.length > 0 ? (
            <div className="card">
              <div className="section-title">Pedidos com período vencido</div>
              <div className="stack small">
                {expired.map(({ w }) => (
                  <div key={w.id} className="row spread">
                    <span>{w.name} · {w.serviceNames} · até {formatDateShort(w.wantedTo)}</span>
                    <form action={setWaitlistStatus.bind(null, w.id, "removed")}><button className="link-btn tiny" type="submit">Remover</button></form>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <p className="muted tiny">Quer agendar quem está na lista? Abra a <Link href="/agenda/novo">agenda</Link> e marque o horário normalmente.</p>
        </div>
        <div className="stack grow-2">
          <div className="card">
            <div className="section-title">Adicionar pedido</div>
            <WaitlistForm services={svc} staff={staff} today={today} />
          </div>
        </div>
      </div>
    </>
  );
}
