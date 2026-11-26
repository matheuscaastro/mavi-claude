import { describe, expect, it } from "vitest";
import { whatsappInvite, wishFitsSlot, type WaitWish } from "./waitlist-rules";

const wish: WaitWish = { durationMin: 60, employeeId: null, wantedFrom: "2026-12-01", wantedTo: "2026-12-05", period: "any" };
const slot = { date: "2026-12-03", startMin: 600, durationMin: 60, employeeId: 3 };

describe("wishFitsSlot", () => {
  it("encaixa dentro do período, da duração e sem preferência", () => expect(wishFitsSlot(wish, slot)).toBe(true));
  it("fora das datas não encaixa", () => {
    expect(wishFitsSlot(wish, { ...slot, date: "2026-12-06" })).toBe(false);
    expect(wishFitsSlot(wish, { ...slot, date: "2026-11-30" })).toBe(false);
  });
  it("respeita a profissional preferida", () => {
    expect(wishFitsSlot({ ...wish, employeeId: 4 }, slot)).toBe(false);
    expect(wishFitsSlot({ ...wish, employeeId: 3 }, slot)).toBe(true);
  });
  it("manhã e tarde", () => {
    expect(wishFitsSlot({ ...wish, period: "morning" }, { ...slot, startMin: 719 })).toBe(true);
    expect(wishFitsSlot({ ...wish, period: "morning" }, { ...slot, startMin: 720 })).toBe(false);
    expect(wishFitsSlot({ ...wish, period: "afternoon" }, { ...slot, startMin: 720 })).toBe(true);
    expect(wishFitsSlot({ ...wish, period: "afternoon" }, { ...slot, startMin: 600 })).toBe(false);
  });
  it("vaga menor que o atendimento não serve", () => expect(wishFitsSlot(wish, { ...slot, durationMin: 45 })).toBe(false));
});

describe("whatsappInvite", () => {
  it("monta o link com o primeiro nome e o 55", () => {
    const url = whatsappInvite("Ana Souza", "61999998888", "quinta às 10:00");
    expect(url.startsWith("https://wa.me/5561999998888?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Olá, Ana!");
  });
});
