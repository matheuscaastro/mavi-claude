import { describe, expect, it } from "vitest";
import { resolvePeriod, summarize } from "./cash";

describe("resolvePeriod", () => {
  it("hoje", () => expect(resolvePeriod("hoje", "2026-10-24")).toEqual({ from: "2026-10-24", to: "2026-10-24" }));
  it("semana começa na segunda (sábado 24/10 → 19 a 25)", () =>
    expect(resolvePeriod("semana", "2026-10-24")).toEqual({ from: "2026-10-19", to: "2026-10-25" }));
  it("semana em uma segunda-feira", () => expect(resolvePeriod("semana", "2026-10-26")).toEqual({ from: "2026-10-26", to: "2026-11-01" }));
  it("mês com 28 dias", () => expect(resolvePeriod("mes", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" }));
  it("mês de dezembro", () => expect(resolvePeriod("mes", "2026-12-05")).toEqual({ from: "2026-12-01", to: "2026-12-31" }));
  it("personalizado válido e inválido", () => {
    expect(resolvePeriod("personalizado", "2026-10-24", "2026-10-01", "2026-10-10")).toEqual({ from: "2026-10-01", to: "2026-10-10" });
    expect(resolvePeriod("personalizado", "2026-10-24", "2026-10-10", "2026-10-01")).toEqual({ from: "2026-10-24", to: "2026-10-24" });
  });
});

describe("summarize", () => {
  it("soma entradas e saídas e ignora estornados", () => {
    const s = summarize([
      { kind: "income", amountCents: 10000, method: "pix", voidedAt: null },
      { kind: "income", amountCents: 5000, method: "cash", voidedAt: null },
      { kind: "income", amountCents: 9999, method: "cash", voidedAt: new Date() },
      { kind: "expense", amountCents: 3000, method: "cash", voidedAt: null },
    ]);
    expect(s).toMatchObject({ income: 15000, expense: 3000, balance: 12000 });
    expect(s.byMethod.pix).toBe(10000);
    expect(s.byMethod.cash).toBe(5000);
  });
});
