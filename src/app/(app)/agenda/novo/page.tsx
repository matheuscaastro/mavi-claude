import { and, asc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { clients, employees, services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/agenda";
import { formatPhone } from "@/lib/phone";
import { isValidDate, todayLocal } from "@/lib/time";
import NewAppointmentForm from "./NewAppointmentForm";

export const metadata = { title: "Novo agendamento" };
export const dynamic = "force-dynamic";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ cliente?: string; data?: string }> }) {
  await requireUser("agenda.edit");
  const sp = await searchParams;
  const [svc, staff, cl, settings] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.category), asc(services.name)),
    db
      .select({ id: employees.id, name: employees.name, color: employees.color })
      .from(employees)
      .where(and(eq(employees.active, true), eq(employees.performsServices, true)))
      .orderBy(asc(employees.id)),
    db.select({ id: clients.id, name: clients.name, phone: clients.phone }).from(clients).where(eq(clients.active, true)).orderBy(asc(clients.name)),
    getSettings(),
  ]);
  const clientId = Number(sp.cliente);

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        Novo agendamento
      </h1>
      <NewAppointmentForm
        services={svc.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, priceCents: s.priceCents }))}
        staff={staff}
        clients={cl.map((c) => ({ id: c.id, label: `${c.name} · ${formatPhone(c.phone)}` }))}
        allowAny={settings.allowAnyProfessional}
        initialClientId={Number.isInteger(clientId) && cl.some((c) => c.id === clientId) ? clientId : null}
        initialDate={sp.data && isValidDate(sp.data) ? sp.data : todayLocal()}
      />
    </>
  );
}
