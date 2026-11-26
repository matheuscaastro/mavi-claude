import { describe, expect, it } from "vitest";
import { averageTicket, dailySeries, commissionOf, expectedCash, resolvePeriod, summarize } from "./cash";

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

describe("dailySeries", () => {
  it("preenche dias sem lançamento, acumula o saldo e ignora estornos", () => {
    const s = dailySeries(
      [
        { kind: "income", amountCents: 10000, occurredOn: "2026-11-01", voidedAt: null },
        { kind: "expense", amountCents: 4000, occurredOn: "2026-11-03", voidedAt: null },
        { kind: "income", amountCents: 999, occurredOn: "2026-11-02", voidedAt: new Date() },
        { kind: "income", amountCents: 500, occurredOn: "2026-12-01", voidedAt: null },
      ],
      "2026-11-01",
      "2026-11-03",
    );
    expect(s.map((p) => p.date)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(s.map((p) => p.balance)).toEqual([10000, 10000, 6000]);
    expect(s[2]).toMatchObject({ income: 0, expense: 4000 });
  });
});


describe("averageTicket", () => {
  it("divide a receita pelos atendimentos concluídos", () => expect(averageTicket(30000, 4)).toBe(7500));
  it("sem atendimentos, zero", () => expect(averageTicket(1000, 0)).toBe(0));
});

describe("expectedCash", () => {
  it("soma troco e dinheiro, ignora outras formas e estornos", () => {
    expect(
      expectedCash(5000, [
        { kind: "income", method: "cash", amountCents: 10000, voidedAt: null },
        { kind: "income", method: "pix", amountCents: 7000, voidedAt: null },
        { kind: "expense", method: "cash", amountCents: 2500, voidedAt: null },
        { kind: "income", method: "cash", amountCents: 999, voidedAt: new Date() },
      ]),
    ).toBe(12500);
  });
});

describe("commissionOf", () => {
  it("aplica o percentual e arredonda", () => {
    expect(commissionOf(10000, 30)).toBe(3000);
    expect(commissionOf(3333, 10)).toBe(333);
    expect(commissionOf(5000, 0)).toBe(0);
  });
});
