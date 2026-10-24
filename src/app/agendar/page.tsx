import { and, asc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { employeeServices, employees, services } from "@db/schema";
import { getSettings } from "@/lib/agenda";
import { addDays, todayLocal } from "@/lib/time";
import BookingFlow from "./BookingFlow";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage() {
  const [svc, staff, links, settings] = await Promise.all([
    db.select().from(services).where(and(eq(services.active, true), eq(services.publicVisible, true))).orderBy(asc(services.category), asc(services.name)),
    db
      .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
      .from(employees)
      .where(and(eq(employees.active, true), eq(employees.performsServices, true)))
      .orderBy(asc(employees.id)),
    db.select().from(employeeServices),
    getSettings(),
  ]);
  const staffIds = new Set(staff.map((s) => s.id));
  // Só oferece serviços que alguma profissional ativa realiza.
  const offered = svc.filter((s) => links.some((l) => l.serviceId === s.id && staffIds.has(l.employeeId)));
  const today = todayLocal();

  return (
    <>
      <div>
        <h1 className="page-title">Agende seu horário</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Escolha os serviços, o dia e o horário. Leva menos de um minuto.
        </p>
      </div>
      {offered.length === 0 ? (
        <div className="card">O agendamento online está indisponível no momento. Fale com o salão.</div>
      ) : (
        <BookingFlow
          services={offered.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, priceCents: s.priceCents }))}
          staff={staff.map((s) => ({ id: s.id, name: s.name, jobTitle: s.jobTitle, serviceIds: links.filter((l) => l.employeeId === s.id).map((l) => l.serviceId) }))}
          allowAny={settings.allowAnyProfessional}
          minDate={today}
          maxDate={addDays(today, settings.maxDaysAhead)}
        />
      )}
    </>
  );
}
