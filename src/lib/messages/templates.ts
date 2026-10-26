/**
 * Textos e variáveis das mensagens de WhatsApp. Sem acesso a banco: tudo aqui é testável.
 */
import { formatDateLong, localDate, localDateTime, localMinutes, localTime, parseTime } from "../time";

export type MessageKind = "confirmation" | "reminder" | "birthday";

export const DEFAULT_TEXTS: Record<MessageKind, string> = {
  confirmation:
    "Olá, {{nome}}! Seu horário no {{salao}} está confirmado:\n{{servicos}}\n{{data}}, às {{hora}}, com {{profissional}}.\nPara remarcar ou cancelar: {{link}}",
  reminder:
    "Olá, {{nome}}! Lembrete do seu horário no {{salao}}: {{servicos}}, {{data}}, às {{hora}}, com {{profissional}}.\nPara remarcar ou cancelar: {{link}}",
  birthday: "Feliz aniversário, {{nome}}! 🎂 Toda a equipe do {{salao}} deseja um dia muito especial para você.",
};

export const KIND_LABEL: Record<MessageKind, string> = {
  confirmation: "Confirmação",
  reminder: "Lembrete",
  birthday: "Aniversário",
};

/** Variáveis disponíveis nos textos, para mostrar na tela de configuração. */
export const VARIABLES = ["nome", "salao", "servicos", "data", "hora", "profissional", "link"] as const;
export type VarName = (typeof VARIABLES)[number];

/**
 * Ordem das variáveis nos modelos aprovados pelo provedor (Twilio usa {{1}}, {{2}}…).
 * O salão não entra: o nome fica fixo no texto do modelo.
 */
export const TEMPLATE_VAR_ORDER: Record<MessageKind, VarName[]> = {
  confirmation: ["nome", "servicos", "data", "hora", "profissional", "link"],
  reminder: ["nome", "servicos", "data", "hora", "profissional", "link"],
  birthday: ["nome"],
};

export type Vars = Partial<Record<VarName, string>>;

/** Troca {{variavel}} pelo valor. Linha cuja variável ficou vazia é removida (ex.: sem link). */
export function renderTemplate(template: string, vars: Vars): string {
  const lines = template.split("\n").flatMap((line) => {
    let drop = false;
    const out = line.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name: string) => {
      const value = (vars as Record<string, string | undefined>)[name];
      if (value === undefined) return _m; // variável desconhecida: deixa como está para a administradora perceber
      if (value === "") drop = true;
      return value;
    });
    return drop ? [] : [out];
  });
  return lines.join("\n").trim();
}

export function pickText(kind: MessageKind, custom: string | null | undefined): string {
  return custom && custom.trim() ? custom : DEFAULT_TEXTS[kind];
}

/** Valores em ordem, para o provedor preencher o modelo aprovado. */
export function orderedVars(kind: MessageKind, vars: Vars): string[] {
  return TEMPLATE_VAR_ORDER[kind].map((n) => vars[n] ?? "");
}

/** "Podologia completa e Hidratação" */
export function joinServices(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/** "sexta-feira, 23 de outubro" (sem o ano, que o contexto já dá). */
export function friendlyDate(date: string): string {
  return formatDateLong(date).replace(/ de \d{4}$/, "");
}

/** Telefone guardado sem o 55 -> número completo para o provedor. */
export function toInternational(digits: string): string {
  return digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
}

/** Mensagens que não são resposta direta a uma ação da cliente só saem nesta janela do dia. */
export const SEND_WINDOW = { startMin: 8 * 60, endMin: 20 * 60 };

/**
 * Quando o lembrete deve sair: `hoursBefore` antes do atendimento, ajustado para a janela de envio.
 * Devolve null se não sobra um momento razoável antes do atendimento (a confirmação já cobre).
 */
export function reminderTime(startsAt: Date, hoursBefore: number, now: Date): Date | null {
  let at = new Date(startsAt.getTime() - hoursBefore * 3_600_000);
  const day = localDate(at);
  const min = localMinutes(at);
  if (min < SEND_WINDOW.startMin) at = localDateTime(day, "08:00");
  else if (min > SEND_WINDOW.endMin) at = localDateTime(day, "20:00");
  // Precisa sair com pelo menos 1h de folga antes do horário.
  if (at.getTime() > startsAt.getTime() - 3_600_000) return null;
  // Já passou do momento (agendou em cima da hora): a confirmação já avisou.
  if (at.getTime() <= now.getTime()) return null;
  return at;
}

/** Dentro da janela de envio (08:00–20:00 no horário do salão)? */
export function inSendWindow(now: Date): boolean {
  const m = parseTime(localTime(now));
  return m >= SEND_WINDOW.startMin && m <= SEND_WINDOW.endMin;
}

/** Datas (mm-dd) de aniversário a considerar hoje. 29/02 é comemorado em 28/02 nos anos não bissextos. */
export function birthdayMonthDays(today: string): string[] {
  const md = today.slice(5);
  const year = Number(today.slice(0, 4));
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (md === "02-28" && !leap) return ["02-28", "02-29"];
  return [md];
}
