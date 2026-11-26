import Link from "next/link";
import { and, gte, lte } from "drizzle-orm";
import { db } from "@db/index";
import { cashEntries } from "@db/schema";
import CashChart from "@/components/CashChart";
import { requireUser } from "@/lib/auth";
import { averageTicket, dailySeries, summarize } from "@/lib/cash";
import { formatBRL } from "@/lib/money";
import { commissionByEmployee, statusCounts, topClients, topEmployees, topServices, type RankRow } from "@/lib/reports";
import { addDays, formatDateShort, todayLocal } from "@/lib/time";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

function Ranking({ title, rows, showMoney }: { title: string; rows: RankRow[]; showMoney?: boolean }) {
  return (
    <div className="card">
      <div className="section-title">{title}</div>
      {rows.length === 0 ? (
        <div className="muted small">Sem atendimentos concluídos no período.</div>
      ) : (
        <ol className="stack small" style={{ margin: 0, paddingLeft: 18 }}>
          {rows.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <span className="row spread">
                <span>{r.name}</span>
                <strong>
                  {r.count}
                  {showMoney ? <span className="muted tiny"> · {formatBRL(r.cents)}</span> : null}
                </strong>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requireUser("reports.view");
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const to = todayLocal();
  const from = addDays(to, -(days - 1));

  const [entries, counts, services, staff, clients, commissions] = await Promise.all([
    db.select().from(cashEntries).where(and(gte(cashEntries.occurredOn, from), lte(cashEntries.occurredOn, to))),
    statusCounts(from, to),
    topServices(from, to),
    topEmployees(from, to),
    topClients(from, to),
    commissionByEmployee(from, to),
  ]);
  const sum = summarize(entries);
  const series = dailySeries(entries, from, to);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title" data-eyebrow="Análises">Relatórios</h1>
          <div className="muted">{formatDateShort(from)} a {formatDateShort(to)}</div>
        </div>
        <div className="segmented" role="tablist">
          {RANGES.map((d) => (
            <Link key={d} href={`/relatorios?dias=${d}`} className={days === d ? "active" : undefined}>
              {d} dias
            </Link>
          ))}
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card"><div className="muted small">Faturamento (entradas)</div><div className="page-title" style={{ fontSize: 26 }}>{formatBRL(sum.income)}</div></div>
        <div className="card"><div className="muted small">Ticket médio por atendimento</div><div className="page-title" style={{ fontSize: 26 }}>{formatBRL(averageTicket(sum.income, counts.completed))}</div></div>
        <div className="card"><div className="muted small">Atendimentos concluídos</div><div className="page-title" style={{ fontSize: 26 }}>{counts.completed}</div></div>
        <div className="card"><div className="muted small">Faltas</div><div className="page-title" style={{ fontSize: 26 }}>{counts.no_show}</div></div>
        <div className="card"><div className="muted small">Cancelamentos</div><div className="page-title" style={{ fontSize: 26 }}>{counts.cancelled}</div></div>
        <div className="card"><div className="muted small">Saldo do período</div><div className="page-title" style={{ fontSize: 26, color: sum.balance < 0 ? "var(--danger)" : undefined }}>{formatBRL(sum.balance)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Fluxo de caixa por dia</div>
        <CashChart series={series} />
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 0, overflowX: "auto" }}>
        <div className="section-title" style={{ padding: "16px 16px 0" }}>Comissão por profissional</div>
        <table className="table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th style={{ textAlign: "right" }}>Atendimentos</th>
              <th style={{ textAlign: "right" }}>Base</th>
              <th style={{ textAlign: "right" }}>%</th>
              <th style={{ textAlign: "right" }}>Comissão</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td className="right">{c.count}</td>
                <td className="right">{formatBRL(c.baseCents)}</td>
                <td className="right">{c.percent}%</td>
                <td className="right"><strong>{formatBRL(c.commissionCents)}</strong></td>
              </tr>
            ))}
            {commissions.length === 0 ? (
              <tr><td colSpan={5} className="muted">Sem atendimentos concluídos no período.</td></tr>
            ) : null}
          </tbody>
        </table>
        <p className="muted tiny" style={{ padding: "0 16px 12px", margin: 0 }}>
          Base = valor cobrado nos atendimentos concluídos (com o desconto já aplicado). O percentual de cada profissional é definido em Funcionários.
        </p>
      </div>

      <div className="grid-3">
        <Ranking title="Serviços mais realizados" rows={services} showMoney />
        <Ranking title="Profissionais que mais atendem" rows={staff} showMoney />
        <Ranking title="Clientes mais frequentes" rows={clients} showMoney />
      </div>
    </>
  );
}
