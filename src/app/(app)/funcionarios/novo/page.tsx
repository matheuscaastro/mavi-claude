import { asc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { services } from "@db/schema";
import { requireUser } from "@/lib/auth";
import EmployeeForm from "../EmployeeForm";
import { createEmployee } from "../actions";

export const metadata = { title: "Nova funcionária" };

export default async function NewEmployeePage() {
  await requireUser("employees.manage");
  const list = await db.select({ id: services.id, name: services.name }).from(services).where(eq(services.active, true)).orderBy(asc(services.name));
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        Nova funcionária
      </h1>
      <div className="card" style={{ maxWidth: 680 }}>
        <EmployeeForm
          action={createEmployee}
          isNew
          submitLabel="Cadastrar"
          services={list}
          defaults={{
            name: "",
            jobTitle: "",
            phone: "",
            email: "",
            accessRole: "professional",
            performsServices: true,
            color: "#3D6B62",
            serviceIds: list.map((s) => s.id),
          }}
        />
      </div>
    </>
  );
}
