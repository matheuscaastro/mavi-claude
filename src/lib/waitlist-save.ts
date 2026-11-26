import { and, eq, inArray } from "drizzle-orm";
import { db } from "@db/index";
import { services, waitlistEntries } from "@db/schema";

type NewWish = {
  name: string;
  phone: string;
  serviceIds: number[];
  employeeId: number | null;
  wantedFrom: string;
  wantedTo: string;
  period: "any" | "morning" | "afternoon";
  note: string;
  origin: "counter" | "online";
  publicOnly: boolean;
};

/** Grava o pedido na lista, guardando nomes e duração dos serviços. Evita duplicar o mesmo pedido da mesma pessoa. */
export async function saveWish(w: NewWish): Promise<{ ok: true } | { ok: false; error: string }> {
  const chosen = await db
    .select()
    .from(services)
    .where(and(inArray(services.id, w.serviceIds), eq(services.active, true), w.publicOnly ? eq(services.publicVisible, true) : undefined));
  if (chosen.length === 0 || chosen.length !== new Set(w.serviceIds).size) return { ok: false, error: "Escolha serviços válidos." };

  const open = await db
    .select({ id: waitlistEntries.id, serviceIds: waitlistEntries.serviceIds, wantedFrom: waitlistEntries.wantedFrom, wantedTo: waitlistEntries.wantedTo })
    .from(waitlistEntries)
    .where(and(eq(waitlistEntries.phone, w.phone), eq(waitlistEntries.status, "waiting")));
  const sameKey = [...w.serviceIds].sort().join(",");
  if (open.some((o) => [...o.serviceIds].sort().join(",") === sameKey && o.wantedFrom === w.wantedFrom && o.wantedTo === w.wantedTo)) {
    return { ok: false, error: "Esse pedido já está na lista de espera." };
  }
  if (open.length >= 5) return { ok: false, error: "Já existem pedidos demais em aberto para esse WhatsApp." };

  await db.insert(waitlistEntries).values({
    name: w.name,
    phone: w.phone,
    serviceIds: chosen.map((c) => c.id),
    serviceNames: chosen.map((c) => c.name).join(" + "),
    durationMin: chosen.reduce((a, c) => a + c.durationMin, 0),
    employeeId: w.employeeId,
    wantedFrom: w.wantedFrom,
    wantedTo: w.wantedTo,
    period: w.period,
    note: w.note,
    origin: w.origin,
  });
  return { ok: true };
}
