"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { enqueueBirthdays, processQueue } from "@/lib/messages/queue";

export type RunState = { message?: string; error?: string };

/** Botão "Processar agora": útil enquanto não há um agendador automático. */
export async function runQueueNow(_p: RunState): Promise<RunState> {
  await requireUser("settings.manage");
  try {
    const birthdays = await enqueueBirthdays();
    const r = await processQueue(new Date(), 50);
    revalidatePath("/mensagens");
    const parts = [`${r.sent} enviada(s)`, `${r.failed} com falha`, `${r.skipped} descartada(s)`];
    if (r.retried) parts.push(`${r.retried} para tentar de novo`);
    if (r.waiting) parts.push(`${r.waiting} aguardando o horário permitido`);
    if (birthdays) parts.push(`${birthdays} aniversário(s) de hoje`);
    return { message: parts.join(" · ") + "." };
  } catch (e) {
    console.error("[whatsapp] processar agora:", e);
    return { error: "Não foi possível processar a fila agora." };
  }
}
