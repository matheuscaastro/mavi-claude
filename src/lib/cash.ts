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
