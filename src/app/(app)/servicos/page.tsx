import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@db/index";
import { services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { Icon } from "@/components/icons";

export const metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const user = await requireUser("services.view");
  const canManage = can(user.accessRole, "services.manage");
  const rows = await db.select().from(services).orderBy(asc(services.category), asc(services.name));

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Serviços</h1>
        {canManage ? (
          <Link className="btn" href="/servicos/novo">
            <Icon name="plus" /> Novo serviço
          </Link>
        ) : null}
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Categoria</th>
              <th>Duração</th>
              <th>Preço</th>
              <th>Online</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} style={s.active ? undefined : { opacity: 0.55 }}>
                <td>
                  {canManage ? (
                    <Link className="name" href={`/servicos/${s.id}`}>
                      {s.name}
                    </Link>
                  ) : (
                    <strong>{s.name}</strong>
                  )}{" "}
                  {!s.active ? <span className="chip gray">Inativo</span> : null}
                </td>
                <td>{s.category}</td>
                <td>{formatDuration(s.durationMin)}</td>
                <td>{formatBRL(s.priceCents)}</td>
                <td>{s.publicVisible ? "Sim" : "Não"}</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
