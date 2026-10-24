import { NextResponse } from "next/server";
import { getAvailability, getSettings } from "@/lib/agenda";
import { allow, clientIp } from "@/lib/rate-limit";
import { addDays, isValidDate, todayLocal } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Horários livres para a página pública. Não expõe nomes nem dados de outras clientes. */
export async function GET(req: Request) {
  if (!allow(`slots:${await clientIp()}`, 120, 60_000)) return NextResponse.json({ error: "Muitas consultas. Aguarde um instante." }, { status: 429 });

  const q = new URL(req.url).searchParams;
  const date = q.get("date") ?? "";
  const serviceIds = (q.get("services") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 10);
  const emp = q.get("employee") ?? "any";
  const employeeId = emp === "any" ? null : Number(emp);
  if (!isValidDate(date) || serviceIds.length === 0 || (employeeId !== null && !Number.isInteger(employeeId))) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const settings = await getSettings();
  const today = todayLocal();
  if (date < today || date > addDays(today, settings.maxDaysAhead)) return NextResponse.json({ closed: false, outOfRange: true, slots: [] });
  if (employeeId === null && !settings.allowAnyProfessional) return NextResponse.json({ error: "Escolha uma profissional." }, { status: 400 });

  const r = await getAvailability({ date, serviceIds, employeeId, applyMinNotice: true, publicOnly: true });
  return NextResponse.json({ closed: r.closed, slots: r.slots, durationMin: r.durationMin, totalCents: r.totalCents });
}
