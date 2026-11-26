/** Regras puras da lista de espera (sem banco, testáveis). */

export type Period = "any" | "morning" | "afternoon";
export const PERIOD_LABEL: Record<Period, string> = { any: "Qualquer horário", morning: "Manhã", afternoon: "Tarde" };

export type WaitWish = { durationMin: number; employeeId: number | null; wantedFrom: string; wantedTo: string; period: Period };
/** Horário que ficou livre: dia, minuto de início, duração e profissional. */
export type FreedSlot = { date: string; startMin: number; durationMin: number; employeeId: number };

/** O pedido cabe no horário que abriu? Mesmo dia dentro do período desejado, mesma profissional (ou qualquer), manhã/tarde e duração. */
export function wishFitsSlot(w: WaitWish, s: FreedSlot): boolean {
  if (s.date < w.wantedFrom || s.date > w.wantedTo) return false;
  if (w.employeeId !== null && w.employeeId !== s.employeeId) return false;
  if (w.period === "morning" && s.startMin >= 720) return false;
  if (w.period === "afternoon" && s.startMin < 720) return false;
  return w.durationMin <= s.durationMin;
}

/** Mensagem pronta para a equipe mandar pelo WhatsApp. */
export function whatsappInvite(name: string, phoneDigits: string, when?: string): string {
  const first = name.trim().split(/\s+/)[0] || "";
  const text = `Olá, ${first}! Abriu uma vaga no Instituto Andrea Carvalho${when ? ` (${when})` : ""}. Quer que eu agende para você?`;
  return `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(text)}`;
}
