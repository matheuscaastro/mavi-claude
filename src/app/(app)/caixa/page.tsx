import Link from "next/link";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@db/index";
import { appointments, cashCategories, cashEntries, clients } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { METHOD_LABEL, METHODS, resolvePeriod, summarize, type PeriodKey } from "@/lib/cash";
import { formatBRL } from "@/lib/money";
import { formatDateShort, isValidDate, todayLocal } from "@/lib/time";
import EntryPanel from "./EntryPanel";
import { voidEntry } from "./actions";

export const metadata = { title: "Caixa" };
export const dynamic = "force-dynamic";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
];

export default async function CashPage({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string }> }) {
  await requireUser("cash.view");
  const sp = await searchParams;
  const today = todayLocal();
  const custom = sp.de && sp.ate && isValidDate(sp.de) && isValidDate(sp.ate);
  const key: PeriodKey = custom ? "personalizado" : PERIODS.some((p) => p.key === sp.periodo) ? (sp.periodo as PeriodKey) : "hoje";
  const range = resolvePeriod(key, today, sp.de, sp.ate);

  const rows = await db
    .select({ e: cashEntries, clientName: clients.name })
    .from(cashEntries)
    .leftJoin(appointments, eq(appointments.id, cashEntries.appointmentId))
    .leftJoin(clients, eq(clients.id, appointments.clientId))
    .where(and(gte(cashEntries.occurredOn, range.from), lte(cashEntries.occurredOn, range.to)))
    .orderBy(desc(cashEntries.occurredOn), desc(cashEntries.id));

  const categories = await db.select().from(cashCategories).orderBy(asc(cashCategories.name));
  const sum = summarize(rows.map((r) => r.e));

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Caixa</h1>
          <div className="muted">
            {range.from === range.to ? formatDateShort(range.from) : `${formatDateShort(range.from)} a ${formatDateShort(range.to)}`}
          </div>
        </div>
        <div className="segmented" role="tablist">
          {PERIODS.map((p) => (
            <Link key={p.key} href={`/caixa?periodo=${p.key}`} className={key === p.key ? "active" : undefined}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <form className="row" style={{ marginBottom: 16, alignItems: "center" }}>
        <span className="muted small">Outro período:</span>
        <input type="date" name="de" defaultValue={range.from} aria-label="De" style={{ width: 170 }} />
        <input type="date" name="ate" defaultValue={range.to} aria-label="Até" style={{ width: 170 }} />
        <button className="btn secondary" type="submit">
          Ver
        </button>
      </form>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="muted small">Entradas</div>
          <div className="page-title" style={{ fontSize: 26 }}>
            {formatBRL(sum.income)}
          </div>
        </div>
        <div className="card">
          <div className="muted small">Saídas</div>
          <div className="page-title" style={{ fontSize: 26 }}>
            {formatBRL(sum.expense)}
          </div>
        </div>
        <div className="card">
          <div className="muted small">Saldo do período</div>
          <div className="page-title" style={{ fontSize: 26, color: sum.balance < 0 ? "var(--danger)" : undefined }}>
            {formatBRL(sum.balance)}
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack grow-3">
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Forma</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, clientName }) => (
                  <tr key={e.id} style={e.voidedAt ? { opacity: 0.5, textDecoration: "line-through" } : undefined}>
                    <td>{formatDateShort(e.occurredOn)}</td>
                    <td>
                      {e.appointmentId ? (
                        <Link className="name" href={`/agenda/${e.appointmentId}`}>
                          {clientName}
                        </Link>
                      ) : (
                        <strong>{e.category}</strong>
                      )}
                      <div className="muted tiny">{e.appointmentId ? "Atendimento" : e.description}</div>
                    </td>
                    <td>{METHOD_LABEL[e.method]}</td>
                    <td className="right" style={{ color: e.kind === "expense" ? "var(--danger)" : undefined, fontWeight: 600 }}>
                      {e.kind === "expense" ? "−" : "+"} {formatBRL(e.amountCents)}
                    </td>
                    <td className="right">
                      {e.voidedAt ? (
                        <span className="chip gray">Estornado</span>
                      ) : (
                        <form action={voidEntry.bind(null, e.id)}>
                          <button className="icon-btn" type="submit" title="Estornar lançamento" aria-label="Estornar lançamento" style={{ width: "auto", padding: "0 10px", fontSize: 12 }}>
                            Estornar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Nenhum lançamento neste período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack grow-2">
          <div className="card">
            <div className="section-title">Entradas por forma de pagamento</div>
            <div className="stack small">
              {METHODS.map((m) => (
                <div key={m} className="row spread">
                  <span>{METHOD_LABEL[m]}</span>
                  <strong>{formatBRL(sum.byMethod[m])}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-title">Novo lançamento</div>
            <EntryPanel today={today} categories={categories.map((c) => ({ id: c.id, kind: c.kind, name: c.name }))} />
          </div>
        </div>
      </div>
    </>
  );
}
