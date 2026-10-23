import { parseTime } from "./time";

/** Intervalo em minutos desde a meia-noite do dia analisado. */
export type Interval = { start: number; end: number };

export type SalonHoursRow = { weekday: number; isOpen: boolean; openTime: string; closeTime: string };
export type SalonExceptionRow = {
  date: string;
  closed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

/**
 * Janela de funcionamento do salão em um dia, ou null se estiver fechado.
 * Uma exceção (feriado) vale mais que o horário da semana.
 */
export function resolveDayWindow(
  date: string,
  weekday: number,
  hours: SalonHoursRow[],
  exceptions: SalonExceptionRow[],
): Interval | null {
  const exception = exceptions.find((e) => e.date === date);
  if (exception) {
    if (exception.closed) return null;
    if (exception.openTime && exception.closeTime) {
      return { start: parseTime(exception.openTime), end: parseTime(exception.closeTime) };
    }
  }
  const row = hours.find((h) => h.weekday === weekday);
  if (!row || !row.isOpen) return null;
  const start = parseTime(row.openTime);
  const end = parseTime(row.closeTime);
  return end > start ? { start, end } : null;
}

/** Interseção de duas janelas, ou null se não houver. */
export function intersect(a: Interval, b: Interval): Interval | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : null;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

export type FreeStartsInput = {
  /** Janela em que a profissional trabalha no dia. */
  window: Interval;
  /** Atendimentos ativos e bloqueios da profissional no dia. */
  busy: Interval[];
  /** Duração somada dos serviços. */
  durationMin: number;
  /** Intervalo de preparo depois do atendimento (só vale contra o próximo compromisso). */
  bufferMin?: number;
  /** De quanto em quanto tempo os horários são oferecidos. */
  stepMin: number;
  /** Não oferece horários que comecem antes disso (antecedência mínima no dia de hoje). */
  notBefore?: number;
};

/** Horários de início livres, em minutos desde a meia-noite. */
export function freeStarts(input: FreeStartsInput): number[] {
  const { window, busy, durationMin, stepMin } = input;
  const buffer = input.bufferMin ?? 0;
  const out: number[] = [];
  if (durationMin <= 0 || stepMin <= 0) return out;
  for (let start = window.start; start + durationMin <= window.end; start += stepMin) {
    if (input.notBefore !== undefined && start < input.notBefore) continue;
    const occupied: Interval = { start, end: start + durationMin + buffer };
    if (busy.some((b) => overlaps(occupied, b))) continue;
    out.push(start);
  }
  return out;
}

/**
 * Escolhe, entre as profissionais livres naquele horário, a que tem menos
 * atendimentos no dia. Empata pela ordem da lista. Usado em "qualquer disponível".
 */
export function pickLeastBusy(candidates: { employeeId: number; load: number }[]): number | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (const c of candidates) if (c.load < best.load) best = c;
  return best.employeeId;
}
