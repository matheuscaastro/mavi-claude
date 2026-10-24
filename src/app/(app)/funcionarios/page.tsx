import { asc, eq, sql } from "drizzle-orm";
import { db } from "@db/index";
import { employeeServices, employees, services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import EmployeesManager, { type EmployeeRow } from "./EmployeesManager";

export const metadata = { title: "Funcionários" };

export default async function EmployeesPage() {
  await requireUser("employees.manage");
  const [rows, links, svc] = await Promise.all([
    db.select().from(employees).orderBy(sql`(not ${employees.active})`, asc(employees.name)),
    db.select().from(employeeServices),
    db.select({ id: services.id, name: services.name }).from(services).where(eq(services.active, true)).orderBy(asc(services.name)),
  ]);
  const data: EmployeeRow[] = rows.map((e) => ({
    id: e.id,
    name: e.name,
    jobTitle: e.jobTitle,
    phone: e.phone ? formatPhone(e.phone) : "",
    email: e.email,
    accessRole: e.accessRole,
    performsServices: e.performsServices,
    color: e.color,
    serviceIds: links.filter((l) => l.employeeId === e.id).map((l) => l.serviceId),
    roleLabel: ROLE_LABEL[e.accessRole],
    active: e.active,
  }));
  return <EmployeesManager rows={data} services={svc} />;
}
