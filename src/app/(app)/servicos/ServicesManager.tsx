"use client";

import { useCallback, useState } from "react";
import Modal from "@/components/Modal";
import { Icon } from "@/components/icons";
import ServiceForm from "./ServiceForm";
import { createService, setServiceActive, updateService } from "./actions";

export type ServiceRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  durationMin: number;
  durationLabel: string;
  bufferMin: number;
  price: string;
  priceLabel: string;
  publicVisible: boolean;
  active: boolean;
};

export default function ServicesManager({ rows, canManage }: { rows: ServiceRow[]; canManage: boolean }) {
  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const current = editing && editing !== "new" ? editing : null;

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Serviços</h1>
        {canManage ? (
          <button type="button" className="btn" onClick={() => setEditing("new")}>
            <Icon name="plus" /> Novo serviço
          </button>
        ) : null}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Categoria</th>
              <th>Duração</th>
              <th>Preço</th>
              <th>Online</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} style={s.active ? undefined : { opacity: 0.55 }}>
                <td>
                  {canManage ? (
                    <button type="button" className="link-btn name" onClick={() => setEditing(s)}>
                      {s.name}
                    </button>
                  ) : (
                    <strong>{s.name}</strong>
                  )}{" "}
                  {!s.active ? <span className="chip gray">Inativo</span> : null}
                </td>
                <td>{s.category}</td>
                <td>{s.durationLabel}</td>
                <td>{s.priceLabel}</td>
                <td>{s.publicVisible ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={editing === "new"} onClose={close} title="Novo serviço">
        <ServiceForm
          action={createService}
          submitLabel="Cadastrar"
          onDone={close}
          defaults={{ name: "", description: "", category: "Podologia", durationMin: "45", bufferMin: "0", price: "", publicVisible: true }}
        />
      </Modal>

      <Modal open={current !== null} onClose={close} title={current?.name ?? "Serviço"}>
        {current ? (
          <div className="stack">
            <ServiceForm
              action={updateService.bind(null, current.id)}
              submitLabel="Salvar alterações"
              onDone={close}
              defaults={{
                name: current.name,
                description: current.description,
                category: current.category,
                durationMin: String(current.durationMin),
                bufferMin: String(current.bufferMin),
                price: current.price,
                publicVisible: current.publicVisible,
              }}
            />
            <p className="muted small" style={{ margin: 0 }}>
              Mudanças de preço e duração valem só para novos agendamentos; o histórico não muda.
            </p>
            <form
              action={async () => {
                await setServiceActive(current.id, !current.active);
                close();
              }}
            >
              <button className="btn secondary" type="submit">
                {current.active ? "Inativar serviço" : "Reativar serviço"}
              </button>
            </form>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
