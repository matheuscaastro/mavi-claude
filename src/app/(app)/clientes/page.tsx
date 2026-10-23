import Link from "next/link";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@db/index";
import { clients } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import { Icon } from "@/components/icons";

export const metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; inativas?: string }> }) {
  const user = await requireUser("clients.view");
  const { q = "", inativas } = await searchParams;
  const term = q.trim();
  const digits = term.replace(/\D/g, "");

  const search = term
    ? or(ilike(clients.name, `%${term.replace(/[%_\\]/g, "\\$&")}%`), digits ? ilike(clients.phone, `%${digits}%`) : undefined)
    : undefined;
  const rows = await db
    .select()
    .from(clients)
    .where(and(inativas ? undefined : eq(clients.active, true), search))
    .orderBy(asc(sql`lower(${clients.name})`))
    .limit(200);

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Clientes</h1>
        {can(user.accessRole, "clients.edit") ? (
          <Link className="btn" href="/clientes/novo">
            <Icon name="plus" /> Nova cliente
          </Link>
        ) : null}
      </div>

      <form className="row" style={{ marginBottom: 16 }}>
        <input name="q" defaultValue={term} placeholder="Buscar por nome ou telefone" style={{ maxWidth: 340 }} />
        <label className="check small">
          <input type="checkbox" name="inativas" value="1" defaultChecked={!!inativas} /> Mostrar inativas
        </label>
        <button className="btn secondary" type="submit">
          Buscar
        </button>
      </form>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Aniversário</th>
              <th>WhatsApp</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link className="name" href={`/clientes/${c.id}`}>
                    {c.name}
                  </Link>{" "}
                  {!c.active ? <span className="chip gray">Inativa</span> : null}
                </td>
                <td>{formatPhone(c.phone)}</td>
                <td>{c.birthDate ? c.birthDate.split("-").reverse().slice(0, 2).join("/") : "—"}</td>
                <td>{c.whatsappOptIn ? "Autorizado" : "—"}</td>
                <td className="right">
                  <Link href={`/agenda/novo?cliente=${c.id}`} className="small">
                    Agendar
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhuma cliente encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
