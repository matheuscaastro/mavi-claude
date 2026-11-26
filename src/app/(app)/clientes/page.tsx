import Link from "next/link";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@db/index";
import { clients } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import ClientsManager, { type ClientRow } from "./ClientsManager";

export const metadata = { title: "Clientes" };

const PAGE_SIZE = 50;
const MAX_ROWS = 500;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; inativas?: string; novo?: string; limite?: string }> }) {
  const user = await requireUser("clients.view");
  const { q = "", inativas, novo, limite } = await searchParams;
  // Lista em páginas de 50: "Carregar mais" soma mais 50 (teto de 500). Pede uma linha a mais para saber se ainda há resto.
  const pageSize = Math.min(Math.max(Math.trunc(Number(limite)) || PAGE_SIZE, PAGE_SIZE), MAX_ROWS);
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
    .limit(pageSize + 1);

  const hasMore = rows.length > pageSize;
  const data: ClientRow[] = rows.slice(0, pageSize).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    phoneFmt: formatPhone(c.phone),
    email: c.email,
    birthDate: c.birthDate ?? "",
    birthLabel: c.birthDate ? c.birthDate.split("-").reverse().slice(0, 2).join("/") : "",
    cpf: c.cpf,
    notes: c.notes,
    whatsappOptIn: c.whatsappOptIn,
    active: c.active,
  }));

  return (
    <ClientsManager rows={data} canEdit={can(user.accessRole, "clients.edit")} autoOpenNew={novo === "1"}
      footer={
        hasMore ? (
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <span className="muted small">Mostrando {data.length} clientes.</span>
            {pageSize < MAX_ROWS ? (
              <Link
                className="btn secondary"
                scroll={false}
                href={{ pathname: "/clientes", query: { ...(term ? { q: term } : {}), ...(inativas ? { inativas } : {}), limite: pageSize + PAGE_SIZE } }}
              >
                Carregar mais
              </Link>
            ) : (
              <span className="muted small">Refine a busca para ver os demais.</span>
            )}
          </div>
        ) : null
      }
    >
      <form className="row" style={{ marginBottom: 16 }}>
        <input name="q" defaultValue={term} placeholder="Buscar por nome ou telefone…" aria-label="Buscar cliente por nome ou telefone" autoComplete="off" enterKeyHint="search" spellCheck={false} style={{ maxWidth: 340 }} />
        <label className="check small">
          <input type="checkbox" name="inativas" value="1" defaultChecked={!!inativas} /> Mostrar inativas
        </label>
        <button className="btn secondary" type="submit">
          Buscar
        </button>
      </form>
    </ClientsManager>
  );
}
