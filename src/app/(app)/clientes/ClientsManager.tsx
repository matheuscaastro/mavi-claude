"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Icon } from "@/components/icons";
import ClientForm from "./ClientForm";
import { createClient, setClientActive, updateClient } from "./actions";

export type ClientRow = {
  id: number;
  name: string;
  phone: string;
  phoneFmt: string;
  email: string;
  birthDate: string;
  birthLabel: string;
  cpf: string;
  notes: string;
  whatsappOptIn: boolean;
  active: boolean;
};

const EMPTY = { name: "", phone: "", email: "", birthDate: "", cpf: "", notes: "", whatsappOptIn: false };

export default function ClientsManager({ rows, canEdit, autoOpenNew, children }: { rows: ClientRow[]; canEdit: boolean; autoOpenNew: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientRow | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);

  useEffect(() => {
    if (autoOpenNew && canEdit) setEditing("new");
  }, [autoOpenNew, canEdit]);

  const closeAndClean = useCallback(() => {
    setEditing(null);
    if (autoOpenNew) router.replace("/clientes");
  }, [autoOpenNew, router]);

  const current = editing && editing !== "new" ? editing : null;

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Clientes</h1>
        {canEdit ? (
          <button type="button" className="btn" onClick={() => setEditing("new")}>
            <Icon name="plus" /> Nova cliente
          </button>
        ) : null}
      </div>

      {children}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Aniversário</th>
              <th>WhatsApp</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  {canEdit ? (
                    <button type="button" className="link-btn name" onClick={() => setEditing(c)}>
                      {c.name}
                    </button>
                  ) : (
                    <Link className="name" href={`/clientes/${c.id}`}>
                      {c.name}
                    </Link>
                  )}{" "}
                  {!c.active ? <span className="chip gray">Inativa</span> : null}
                </td>
                <td>{c.phoneFmt}</td>
                <td>{c.birthLabel || "—"}</td>
                <td>{c.whatsappOptIn ? "Autorizado" : "—"}</td>
                <td className="right">
                  {canEdit && c.active ? (
                    <Link href={`/agenda/novo?cliente=${c.id}`} className="small">
                      Agendar
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhuma cliente encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={editing === "new"} onClose={closeAndClean} title="Nova cliente">
        <ClientForm action={createClient} submitLabel="Cadastrar" defaults={EMPTY} onDone={closeAndClean} />
      </Modal>

      <Modal open={current !== null} onClose={close} title={current?.name ?? "Cliente"}>
        {current ? (
          <div className="stack">
            <ClientForm
              action={updateClient.bind(null, current.id)}
              submitLabel="Salvar alterações"
              onDone={close}
              defaults={{
                name: current.name,
                phone: current.phoneFmt,
                email: current.email,
                birthDate: current.birthDate,
                cpf: current.cpf,
                notes: current.notes,
                whatsappOptIn: current.whatsappOptIn,
              }}
            />
            <div className="row spread" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <Link href={`/clientes/${current.id}`} className="small">
                Ver histórico de atendimentos
              </Link>
              <form
                action={async () => {
                  await setClientActive(current.id, !current.active);
                  close();
                }}
              >
                <button className="btn secondary" type="submit">
                  {current.active ? "Inativar cliente" : "Reativar cliente"}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
