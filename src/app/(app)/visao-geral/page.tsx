import Link from "next/link";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@db/index";
import { cashEntries, waitlistEntries } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { summarize } from "@/lib/cash";
import { formatBRL } from "@/lib/money";
import { statusCounts, upcomingBirthdays } from "@/lib/reports";
import { addDays, formatDateLong, todayLocal } from "@/lib/time";

export const metadata = { title: "Visão Geral" };
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireUser("reports.view");
  const today = todayLocal();
  const [counts, entries, birthdays, [waiting]] = await Promise.all([
    statusCounts(today, today),
    db.select().from(cashEntries).where(and(gte(cashEntries.occurredOn, today), lte(cashEntries.occurredOn, today))),
    upcomingBirthdays(today, 7),
    db.select({ n: sql<number>`count(*)::int` }).from(waitlistEntries).where(eq(waitlistEntries.status, "waiting")),
  ]);
  const sum = summarize(entries);
  const total = counts.scheduled + counts.confirmed + counts.in_progress + counts.completed + counts.cancelled + counts.no_show;
  const cards: { label: string; value: string | number; hint?: string }[] = [
    { label: "Atendimentos hoje", value: total, hint: `${counts.completed} concluídos` },
    { label: "Agendados / confirmados", value: counts.scheduled + counts.confirmed, hint: counts.in_progress ? `${counts.in_progress} em atendimento` : undefined },
    { label: "Faltas e cancelamentos", value: counts.no_show + counts.cancelled },
    { label: "Entradas do dia", value: formatBRL(sum.income) },
    { label: "Saídas do dia", value: formatBRL(sum.expense) },
    { label: "Saldo do dia", value: formatBRL(sum.balance) },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title" data-eyebrow="Resumo">Visão Geral</h1>
          <div className="muted">{formatDateLong(today)}</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {cards.map((c) => (
          <div className="card" key={c.label}>
            <div className="muted small">{c.label}</div>
            <div className="page-title" style={{ fontSize: 26 }}>{c.value}</div>
            {c.hint ? <div className="muted tiny">{c.hint}</div> : null}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title">Aniversariantes (próximos 7 dias)</div>
          {birthdays.length === 0 ? (
            <div className="muted small">Nenhuma cliente faz aniversário nesta semana.</div>
          ) : (
            <div className="stack small">
              {birthdays.map((b) => (
                <div key={b.id} className="row spread">
                  <Link className="name" href={`/clientes/${b.id}`}>{b.name}</Link>
                  <span className="muted">{b.inDays === 0 ? "Hoje" : b.inDays === 1 ? "Amanhã" : b.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Lista de espera</div>
          {waiting.n === 0 ? (
            <div className="muted small">Ninguém esperando vaga no momento.</div>
          ) : (
            <div className="stack small">
              <div>
                <strong>{waiting.n}</strong> {waiting.n === 1 ? "pessoa esperando" : "pessoas esperando"} uma vaga.
              </div>
              <Link className="btn secondary" href="/lista-de-espera">Abrir lista de espera</Link>
            </div>
          )}
        </div>
      </div>

      <div className="row" style={{ marginTop: 20, gap: 10, flexWrap: "wrap" }}>
        <Link className="btn" href={`/agenda?data=${today}`}>Ver agenda de hoje</Link>
        <Link className="btn secondary" href="/caixa">Abrir caixa</Link>
        <Link className="btn secondary" href="/relatorios">Relatórios</Link>
      </div>
    </>
  );
}
