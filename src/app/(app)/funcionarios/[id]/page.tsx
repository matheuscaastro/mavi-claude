import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { employeeServices, employees, services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import EmployeeForm from "../EmployeeForm";
import { setEmployeeActive, updateEmployee } from "../actions";

export const metadata = { title: "Funcionária" };

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireUser("employees.manage");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [e] = await db.select().from(employees).where(eq(employees.id, id));
  if (!e) notFound();
  const { erro } = await searchParams;
  const [list, mine] = await Promise.all([
    db.select({ id: services.id, name: services.name }).from(services).where(eq(services.active, true)).orderBy(asc(services.name)),
    db.select({ serviceId: employeeServices.serviceId }).from(employeeServices).where(eq(employeeServices.employeeId, id)),
  ]);

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        {e.name}
      </h1>
      {erro === "voce" ? <div className="notice error">Você não pode inativar o próprio acesso.</div> : null}
      {erro === "admin" ? <div className="notice error">Precisa existir ao menos uma administradora ativa.</div> : null}
      <div className="card" style={{ maxWidth: 680 }}>
        <EmployeeForm
          action={updateEmployee.bind(null, e.id)}
          isNew={false}
          submitLabel="Salvar alterações"
          services={list}
          defaults={{
            name: e.name,
            jobTitle: e.jobTitle,
            phone: e.phone ? formatPhone(e.phone) : "",
            email: e.email,
            accessRole: e.accessRole,
            performsServices: e.performsServices,
            color: e.color,
            serviceIds: mine.map((m) => m.serviceId),
          }}
        />
        <p className="muted small">Inativar remove o acesso e a tira da agenda, mas o histórico de atendimentos continua.</p>
        <form action={setEmployeeActive.bind(null, e.id, !e.active)}>
          <button className="btn secondary" type="submit">
            {e.active ? "Inativar funcionária" : "Reativar funcionária"}
          </button>
        </form>
      </div>
    </>
  );
}
