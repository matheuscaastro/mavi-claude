import { describe, expect, it } from "vitest";
import { birthdayMonthDays, inSendWindow, joinServices, orderedVars, renderTemplate, reminderTime, toInternational } from "./templates";
import { localDateTime } from "../time";

describe("renderTemplate", () => {
  it("troca as variáveis", () => {
    expect(renderTemplate("Olá, {{nome}}! {{hora}}", { nome: "Ana", hora: "09:00" })).toBe("Olá, Ana! 09:00");
  });
  it("remove a linha cuja variável está vazia", () => {
    const out = renderTemplate("Olá, {{nome}}!\nLink: {{link}}\nAté logo", { nome: "Ana", link: "" });
    expect(out).toBe("Olá, Ana!\nAté logo");
  });
  it("mantém variável desconhecida visível", () => {
    expect(renderTemplate("Oi {{apelido}}", { nome: "Ana" })).toBe("Oi {{apelido}}");
  });
});

describe("helpers", () => {
  it("junta serviços", () => {
    expect(joinServices(["A"])).toBe("A");
    expect(joinServices(["A", "B"])).toBe("A e B");
    expect(joinServices(["A", "B", "C"])).toBe("A, B e C");
  });
  it("ordena variáveis para o modelo do provedor", () => {
    expect(orderedVars("birthday", { nome: "Ana", salao: "MAVI" })).toEqual(["Ana"]);
    expect(orderedVars("reminder", { nome: "Ana", servicos: "S", data: "D", hora: "H", profissional: "P", link: "L" })).toEqual(["Ana", "S", "D", "H", "P", "L"]);
  });
  it("monta o número internacional", () => {
    expect(toInternational("61988887777")).toBe("5561988887777");
    expect(toInternational("5561988887777")).toBe("5561988887777");
  });
});

describe("reminderTime", () => {
  const now = localDateTime("2026-10-26", "10:00");
  it("sai X horas antes", () => {
    const at = reminderTime(localDateTime("2026-10-28", "15:00"), 24, now);
    expect(at?.toISOString()).toBe(localDateTime("2026-10-27", "15:00").toISOString());
  });
  it("empurra para 08:00 se cair de madrugada", () => {
    const at = reminderTime(localDateTime("2026-10-28", "06:30"), 24, now);
    expect(at?.toISOString()).toBe(localDateTime("2026-10-27", "08:00").toISOString());
  });
  it("antecipa para 20:00 se cair à noite", () => {
    const at = reminderTime(localDateTime("2026-10-28", "22:00"), 24, now);
    expect(at?.toISOString()).toBe(localDateTime("2026-10-27", "20:00").toISOString());
  });
  it("não cria lembrete se o momento já passou", () => {
    expect(reminderTime(localDateTime("2026-10-26", "15:00"), 24, now)).toBeNull();
  });
  it("não cria lembrete com menos de 1h de folga", () => {
    expect(reminderTime(localDateTime("2026-10-26", "10:30"), 0, localDateTime("2026-10-26", "08:00"))).toBeNull();
  });
});

describe("janela de envio e aniversário", () => {
  it("08:00–20:00", () => {
    expect(inSendWindow(localDateTime("2026-10-26", "07:59"))).toBe(false);
    expect(inSendWindow(localDateTime("2026-10-26", "08:00"))).toBe(true);
    expect(inSendWindow(localDateTime("2026-10-26", "20:00"))).toBe(true);
    expect(inSendWindow(localDateTime("2026-10-26", "20:01"))).toBe(false);
  });
  it("29/02 comemora em 28/02 nos anos não bissextos", () => {
    expect(birthdayMonthDays("2027-02-28")).toEqual(["02-28", "02-29"]);
    expect(birthdayMonthDays("2028-02-28")).toEqual(["02-28"]);
    expect(birthdayMonthDays("2026-10-26")).toEqual(["10-26"]);
  });
});
