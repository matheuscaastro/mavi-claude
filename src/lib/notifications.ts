import { count, isNull } from "drizzle-orm";
import { db } from "@db/index";
import { notifications } from "@db/schema";

export type NotifyInput = { kind: "online_booking" | "online_cancel" | "online_reschedule" | "waitlist_match"; title: string; body?: string; href?: string };

/** Registra um aviso para a equipe. Nunca derruba a ação principal: se falhar, só registra no log. */
export async function notify(n: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({ kind: n.kind, title: n.title, body: n.body ?? "", href: n.href ?? "" });
  } catch (e) {
    console.error("Falha ao registrar notificação", e);
  }
}

export async function unreadCount(): Promise<number> {
  const [r] = await db.select({ n: count() }).from(notifications).where(isNull(notifications.readAt));
  return r?.n ?? 0;
}
