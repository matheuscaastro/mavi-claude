import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@db/index";
import { clients } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import ClientsManager, { type ClientRow } from "./ClientsManager";

export const metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; inativas?: string; novo?: string }> }) {
  const user = await requireUser("clients.view");
  const { q = "", inativas, novo } = await searchParams;
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

  const data: ClientRow[] = rows.map((c) => ({
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
    <ClientsManager rows={data} canEdit={can(user.accessRole, "clients.edit")} autoOpenNew={novo === "1"}>
      <form className="row" style={{ marginBottom: 16 }}>
        <input name="q" defaultValue={term} placeholder="Buscar por nome ou telefone" style={{ maxWidth: 340 }} />
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
