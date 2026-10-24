"use client";

import { useCallback, useState } from "react";
import Modal from "@/components/Modal";
import { Icon } from "@/components/icons";
import EmployeeForm, { type EmployeeDefaults } from "./EmployeeForm";
import { createEmployee, setEmployeeActive, updateEmployee } from "./actions";

export type EmployeeRow = EmployeeDefaults & { id: number; roleLabel: string; active: boolean };

export default function EmployeesManager({ rows, services }: { rows: EmployeeRow[]; services: { id: number; name: string }[] }) {
  const [editing, setEditing] = useState<EmployeeRow | "new" | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const close = useCallback(() => {
    setEditing(null);
    setToggleError(null);
  }, []);
  const current = editing && editing !== "new" ? editing : null;

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Funcionários</h1>
        <button type="button" className="btn" onClick={() => setEditing("new")}>
          <Icon name="plus" /> Nova funcionária
        </button>
      </div>

      <div className="people">
        {rows.map((e) => (
          <button key={e.id} type="button" className="person" style={{ ...(e.active ? {} : { opacity: 0.55 }), flexDirection: "row", alignItems: "center", gap: 12, textAlign: "left", font: "inherit", cursor: "pointer" }} onClick={() => setEditing(e)}>
            <span className="avatar" style={{ background: e.color, color: "#fff" }} aria-hidden="true">
              {e.name.charAt(0)}
            </span>
            <div>
              <strong>{e.name}</strong>
              <div className="muted small">{e.jobTitle || e.roleLabel}</div>
              <div className="tiny muted">
                {e.roleLabel}
                {e.performsServices ? " · atende" : ""}
                {!e.active ? " · inativa" : ""}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Modal open={editing === "new"} onClose={close} title="Nova funcionária">
        <EmployeeForm
          action={createEmployee}
          isNew
          submitLabel="Cadastrar"
          services={services}
          onDone={close}
          defaults={{
            name: "",
            jobTitle: "",
            phone: "",
            email: "",
            accessRole: "professional",
            performsServices: true,
            color: "#3D6B62",
            serviceIds: services.map((s) => s.id),
          }}
        />
      </Modal>

      <Modal open={current !== null} onClose={close} title={current?.name ?? "Funcionária"}>
        {current ? (
          <div className="stack">
            <EmployeeForm action={updateEmployee.bind(null, current.id)} isNew={false} submitLabel="Salvar alterações" services={services} onDone={close} defaults={current} />
            <p className="muted small" style={{ margin: 0 }}>
              Inativar remove o acesso e a tira da agenda, mas o histórico de atendimentos continua.
            </p>
            {toggleError ? (
              <div className="notice error" role="alert">
                {toggleError}
              </div>
            ) : null}
            <form
              action={async () => {
                const r = await setEmployeeActive(current.id, !current.active);
                if (r.error) setToggleError(r.error);
                else close();
              }}
            >
              <button className="btn secondary" type="submit">
                {current.active ? "Inativar funcionária" : "Reativar funcionária"}
              </button>
            </form>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
