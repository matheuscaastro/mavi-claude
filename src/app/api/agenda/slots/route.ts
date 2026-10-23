import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getAvailability } from "@/lib/agenda";
import { isValidDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.accessRole, "agenda.edit")) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const q = new URL(req.url).searchParams;
  const date = q.get("date") ?? "";
  const serviceIds = (q.get("services") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const emp = q.get("employee") ?? "any";
  const ignore = Number(q.get("ignore"));
  if (!isValidDate(date) || serviceIds.length === 0) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

  const result = await getAvailability({
    date,
    serviceIds,
    employeeId: emp === "any" ? null : Number(emp),
    ignoreAppointmentId: Number.isInteger(ignore) && ignore > 0 ? ignore : undefined,
  });
  return NextResponse.json(result);
}
