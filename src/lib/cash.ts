import { addDays, weekdayOf } from "./time";

export const METHOD_LABEL = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  barter: "Permuta",
  other: "Outro",
} as const;
export type Method = keyof typeof METHOD_LABEL;
export const METHODS = Object.keys(METHOD_LABEL) as Method[];

/** Categorias iniciais (usadas pela migração e pelo seed). Depois disso, quem manda é a tabela cash_categories. */
export const DEFAULT_EXPENSE_CATEGORIES = ["Aluguel", "Materiais e insumos", "Salários", "Impostos e taxas", "Água, luz e internet", "Marketing", "Outros"];
export const DEFAULT_INCOME_CATEGORIES = ["Venda de produtos", "Outros"];

export type PeriodKey = "hoje" | "semana" | "mes" | "personalizado";

/** Intervalo de datas (inclusivo) para o filtro da tela de caixa. A semana começa na segunda. */
export function resolvePeriod(key: PeriodKey, today: string, from?: string, to?: string): { from: string; to: string } {
  if (key === "semana") {
    const back = (weekdayOf(today) + 6) % 7;
    const start = addDays(today, -back);
    return { from: start, to: addDays(start, 6) };
  }
  if (key === "mes") {
    const start = `${today.slice(0, 7)}-01`;
    const [y, m] = today.slice(0, 7).split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: start, to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}` };
  }
  if (key === "personalizado" && from && to && from <= to) return { from, to };
  return { from: today, to: today };
}

export type EntryLike = { kind: "income" | "expense"; amountCents: number; method: Method; voidedAt: Date | null };

export function summarize(entries: EntryLike[]) {
  const live = entries.filter((e) => !e.voidedAt);
  const income = live.filter((e) => e.kind === "income").reduce((a, e) => a + e.amountCents, 0);
  const expense = live.filter((e) => e.kind === "expense").reduce((a, e) => a + e.amountCents, 0);
  const byMethod = Object.fromEntries(METHODS.map((m) => [m, 0])) as Record<Method, number>;
  for (const e of live) if (e.kind === "income") byMethod[e.method] += e.amountCents;
  return { income, expense, balance: income - expense, byMethod };
}

export type DayPoint = { date: string; income: number; expense: number; balance: number };

/**
 * Uma linha por dia do intervalo (inclusivo), mesmo sem lançamentos, com o saldo acumulado.
 * Lançamentos estornados não entram.
 */
export function dailySeries(
  entries: { kind: "income" | "expense"; amountCents: number; occurredOn: string; voidedAt: Date | null }[],
  from: string,
  to: string,
): DayPoint[] {
  const days: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  for (let d = from; d <= to && days.length < 400; d = addDays(d, 1)) {
    const p = { date: d, income: 0, expense: 0, balance: 0 };
    days.push(p);
    index.set(d, p);
  }
  for (const e of entries) {
    if (e.voidedAt) continue;
    const p = index.get(e.occurredOn);
    if (!p) continue;
    if (e.kind === "income") p.income += e.amountCents;
    else p.expense += e.amountCents;
  }
  let acc = 0;
  for (const p of days) {
    acc += p.income - p.expense;
    p.balance = acc;
  }
  return days;
}

/** Média por atendimento concluído; 0 se não houve nenhum. */
export function averageTicket(incomeCents: number, completed: number): number {
  return completed > 0 ? Math.round(incomeCents / completed) : 0;
}

/** Dinheiro esperado na gaveta: troco inicial + entradas em dinheiro − saídas em dinheiro (estornos não contam). */
export function expectedCash(openingCents: number, entries: { kind: "income" | "expense"; method: Method; amountCents: number; voidedAt: Date | null }[]): number {
  let total = openingCents;
  for (const e of entries) {
    if (e.voidedAt || e.method !== "cash") continue;
    total += e.kind === "income" ? e.amountCents : -e.amountCents;
  }
  return total;
}

/** Comissão em centavos: base × percentual, arredondado. */
export function commissionOf(baseCents: number, percent: number): number {
  return Math.round((baseCents * percent) / 100);
}
