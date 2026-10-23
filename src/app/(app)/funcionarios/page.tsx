import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@db/index";
import { employees } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { Icon } from "@/components/icons";

export const metadata = { title: "Funcionários" };

export default async function EmployeesPage() {
  await requireUser("employees.manage");
  const rows = await db.select().from(employees).orderBy(sql`(not ${employees.active})`, asc(employees.name));
  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Funcionários</h1>
        <Link className="btn" href="/funcionarios/novo">
          <Icon name="plus" /> Nova funcionária
        </Link>
      </div>
      <div className="people">
        {rows.map((e) => (
          <Link key={e.id} href={`/funcionarios/${e.id}`} className="person" style={e.active ? undefined : { opacity: 0.55 }}>
            <span className="avatar" style={{ background: e.color }} aria-hidden="true">
              {e.name.charAt(0)}
            </span>
            <div>
              <strong>{e.name}</strong>
              <div className="muted small">{e.jobTitle || ROLE_LABEL[e.accessRole]}</div>
              <div className="tiny muted">
                {ROLE_LABEL[e.accessRole]}
                {e.performsServices ? " · atende" : ""}
                {!e.active ? " · inativa" : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
