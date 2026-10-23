import { describe, expect, it } from "vitest";
import {
  freeStarts,
  intersect,
  pickLeastBusy,
  resolveDayWindow,
  type SalonHoursRow,
} from "./availability";
import { addDays, formatDuration, formatTime, localDate, localDateTime, localTime, parseTime, weekdayOf } from "./time";
import { formatBRL, parseBRL } from "./money";

const hours: SalonHoursRow[] = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, isOpen: true, openTime: "08:00", closeTime: "18:00" })),
  { weekday: 6, isOpen: true, openTime: "08:00", closeTime: "14:00" },
  { weekday: 0, isOpen: false, openTime: "08:00", closeTime: "14:00" },
];

describe("horário de funcionamento", () => {
  it("usa o horário do dia da semana", () => {
    expect(resolveDayWindow("2026-10-23", 5, hours, [])).toEqual({ start: 480, end: 1080 });
    expect(resolveDayWindow("2026-10-24", 6, hours, [])).toEqual({ start: 480, end: 840 });
  });

  it("devolve null quando o salão está fechado", () => {
    expect(resolveDayWindow("2026-10-25", 0, hours, [])).toBeNull();
  });

  it("feriado fechado vale mais que o horário da semana", () => {
    const ex = [{ date: "2026-12-25", closed: true, openTime: null, closeTime: null }];
    expect(resolveDayWindow("2026-12-25", 5, hours, ex)).toBeNull();
  });

  it("exceção com horário especial", () => {
    const ex = [{ date: "2026-12-31", closed: false, openTime: "08:00", closeTime: "14:00" }];
    expect(resolveDayWindow("2026-12-31", 4, hours, ex)).toEqual({ start: 480, end: 840 });
  });

  it("interseção com a jornada da profissional", () => {
    expect(intersect({ start: 480, end: 1080 }, { start: 540, end: 900 })).toEqual({ start: 540, end: 900 });
    expect(intersect({ start: 480, end: 600 }, { start: 600, end: 900 })).toBeNull();
  });
});

describe("horários livres", () => {
  const window = { start: 480, end: 1080 };

  it("oferece horários de 15 em 15 minutos dentro do expediente", () => {
    const starts = freeStarts({ window, busy: [], durationMin: 60, stepMin: 15 });
    expect(starts[0]).toBe(480);
    expect(starts[starts.length - 1]).toBe(1020); // 17:00 termina às 18:00
    expect(starts).toHaveLength((1020 - 480) / 15 + 1);
  });

  it("não deixa o atendimento terminar depois do fechamento", () => {
    const starts = freeStarts({ window, busy: [], durationMin: 90, stepMin: 30 });
    expect(starts).not.toContain(1020);
    expect(starts[starts.length - 1]).toBe(990); // 16:30 até 18:00
  });

  it("respeita atendimentos e bloqueios", () => {
    const busy = [
      { start: parseTime("09:00"), end: parseTime("10:30") },
      { start: parseTime("13:00"), end: parseTime("14:00") }, // almoço
    ];
    const starts = freeStarts({ window, busy, durationMin: 60, stepMin: 15 });
    expect(starts).toContain(parseTime("08:00")); // 08:00-09:00 encosta, mas não choca
    expect(starts).not.toContain(parseTime("08:15"));
    expect(starts).not.toContain(parseTime("10:00"));
    expect(starts).toContain(parseTime("10:30"));
    expect(starts).not.toContain(parseTime("12:30")); // invade o almoço
    expect(starts).toContain(parseTime("14:00"));
  });

  it("o intervalo de preparo reserva tempo antes do próximo compromisso", () => {
    const busy = [{ start: parseTime("10:00"), end: parseTime("11:00") }];
    const sem = freeStarts({ window, busy, durationMin: 60, stepMin: 15 });
    const com = freeStarts({ window, busy, durationMin: 60, bufferMin: 10, stepMin: 15 });
    expect(sem).toContain(parseTime("09:00"));
    expect(com).not.toContain(parseTime("09:00"));
    expect(com).toContain(parseTime("08:45"));
  });

  it("antecedência mínima corta horários que já passaram", () => {
    const starts = freeStarts({ window, busy: [], durationMin: 30, stepMin: 30, notBefore: parseTime("10:42") });
    expect(starts[0]).toBe(parseTime("11:00"));
  });

  it("sem duração não há horários", () => {
    expect(freeStarts({ window, busy: [], durationMin: 0, stepMin: 15 })).toEqual([]);
  });

  it("qualquer disponível escolhe quem tem menos atendimentos", () => {
    expect(
      pickLeastBusy([
        { employeeId: 1, load: 5 },
        { employeeId: 2, load: 2 },
        { employeeId: 3, load: 2 },
      ]),
    ).toBe(2);
    expect(pickLeastBusy([])).toBeNull();
  });
});

describe("datas no fuso do salão", () => {
  it("converte data e hora local em instante e volta", () => {
    const d = localDateTime("2026-10-23", "08:30");
    expect(d.toISOString()).toBe("2026-10-23T11:30:00.000Z");
    expect(localDate(d)).toBe("2026-10-23");
    expect(localTime(d)).toBe("08:30");
  });

  it("noite do salão ainda é o mesmo dia local", () => {
    const d = localDateTime("2026-10-23", "22:30"); // 01:30 UTC do dia seguinte
    expect(localDate(d)).toBe("2026-10-23");
  });

  it("dia da semana e soma de dias", () => {
    expect(weekdayOf("2026-10-23")).toBe(5);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formata horas e durações", () => {
    expect(formatTime(510)).toBe("08:30");
    expect(formatDuration(90)).toBe("1h30");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2h");
  });
});

describe("dinheiro", () => {
  it("formata e lê valores em reais", () => {
    expect(formatBRL(12000).replace(/\s/g, " ")).toBe("R$ 120,00");
    expect(parseBRL("120,00")).toBe(12000);
    expect(parseBRL("1.234,5")).toBe(123450);
    expect(parseBRL("90")).toBe(9000);
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("-5")).toBeNull();
  });
});
