/**
 * Datas e horas do salão. Tudo é interpretado no fuso de Brasília.
 * O Brasil não usa horário de verão desde 2019, então o deslocamento é fixo (-03:00).
 */
export const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parts(d: Date) {
  const out: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** "08:30" -> 510 */
export function parseTime(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`Horário inválido: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 510 -> "08:30" */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00${OFFSET}`);
  return !Number.isNaN(d.getTime()) && localDate(d) === date;
}

export function isValidTime(hhmm: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm);
}

/** Data (aaaa-mm-dd) + hora (hh:mm) no horário do salão -> instante. */
export function localDateTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00${OFFSET}`);
}

/** Data do salão (aaaa-mm-dd) de um instante. */
export function localDate(d: Date): string {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora do salão (hh:mm) de um instante. */
export function localTime(d: Date): string {
  const p = parts(d);
  return `${p.hour}:${p.minute}`;
}

/** Minutos desde a meia-noite, no horário do salão. */
export function localMinutes(d: Date): number {
  return parseTime(localTime(d));
}

/** Dia da semana de uma data (0 = domingo). */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function todayLocal(now: Date = new Date()): string {
  return localDate(now);
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "";
}

/** "sexta-feira, 23 de outubro de 2026" */
export function formatDateLong(date: string): string {
  const d = new Date(`${date}T12:00:00${OFFSET}`);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "23/10/2026" */
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** "1h30", "45 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
