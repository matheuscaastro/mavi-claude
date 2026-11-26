import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@db/index";
import { notifications } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { formatDateShort, localDate, localTime } from "@/lib/time";
import { markAllRead, markRead } from "./actions";

export const metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUser("agenda.edit");
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(60);
  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <>
      <div className="topbar">
        <h1 className="page-title" data-eyebrow="Avisos">Notificações</h1>
        {unread > 0 ? (
          <form action={markAllRead}>
            <button className="btn secondary" type="submit">Marcar todas como lidas</button>
          </form>
        ) : null}
      </div>

      <div className="split">
        <div className="stack grow-3">
          <div className="card" style={{ padding: 0 }}>
            {rows.length === 0 ? <div className="muted small" style={{ padding: 16 }}>Nenhum aviso por enquanto. Agendamentos, cancelamentos e remarcações feitos pelas clientes no site aparecem aqui.</div> : null}
            {rows.map((n) => (
              <div key={n.id} className="row spread" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", alignItems: "center", background: n.readAt ? undefined : "var(--green-tint)" }}>
                <div>
                  <div style={{ fontWeight: n.readAt ? 400 : 600 }}>{n.href ? <Link className="name" href={n.href}>{n.title}</Link> : n.title}</div>
                  <div className="muted tiny">{n.body} · {formatDateShort(localDate(n.createdAt))} {localTime(n.createdAt)}</div>
                </div>
                {!n.readAt ? (
                  <form action={markRead.bind(null, n.id)}>
                    <button className="icon-btn" type="submit" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>Marcar como lida</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
