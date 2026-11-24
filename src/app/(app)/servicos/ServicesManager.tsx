"use client";

import { useCallback, useState, useTransition } from "react";
import Modal from "@/components/Modal";
import { Icon } from "@/components/icons";
import CategoriesManager, { type CategoryRow } from "./CategoriesManager";
import ServiceForm from "./ServiceForm";
import { createService, setServiceActive, updateService } from "./actions";

export type ServiceRow = {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  categoryName: string;
  durationMin: number;
  durationLabel: string;
  bufferMin: number;
  price: string;
  priceLabel: string;
  publicVisible: boolean;
  active: boolean;
};

function Switch({ on, label, disabled, onToggle }: { on: boolean; label: string; disabled?: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" disabled={disabled} onClick={onToggle}>
      <span />
    </button>
  );
}

export default function ServicesManager({
  rows,
  categories,
  canManage,
  canManageCategories,
}: {
  rows: ServiceRow[];
  categories: CategoryRow[];
  canManage: boolean;
  canManageCategories: boolean;
}) {
  const [showCategories, setShowCategories] = useState(false);
  const closeCategories = useCallback(() => setShowCategories(false), []);
  // "newIn" abre o cadastro já com a categoria do card em que se clicou.
  const [editing, setEditing] = useState<ServiceRow | { newIn: number | "" } | null>(null);
  const [busy, startTransition] = useTransition();
  const close = useCallback(() => setEditing(null), []);
  const current = editing && "id" in editing ? editing : null;
  const created = editing && "newIn" in editing ? editing : null;

  return (
    <>
      <div className="topbar">
        <h1 className="page-title" data-eyebrow="Cadastros">Serviços</h1>
        <div className="row" style={{ gap: 10 }}>
          {canManageCategories ? (
            <button type="button" className="btn secondary" onClick={() => setShowCategories(true)}>
              Categorias
            </button>
          ) : null}
          {canManage ? (
            <button type="button" className="btn" onClick={() => setEditing({ newIn: "" })}>
              <Icon name="plus" /> Novo serviço
            </button>
          ) : null}
        </div>
      </div>

      {categories.length === 0 ? <div className="card muted">Nenhuma categoria ainda. Cadastre a primeira em “Categorias” para começar.</div> : null}

      <div className="cat-grid">
        {categories.map((c) => {
          const svcs = rows.filter((s) => s.categoryId === c.id);
          return (
            <section key={c.id} className="cat-card" aria-label={c.name}>
              <header className="cat-head">
                <h2>{c.name}</h2>
                <span>{svcs.length === 1 ? "1 serviço" : `${svcs.length} serviços`}</span>
              </header>
              <div className="cat-body">
                {svcs.length === 0 ? (
                  <div className="muted small" style={{ padding: "14px 0" }}>
                    Nenhum serviço nesta categoria.
                  </div>
                ) : null}
                {svcs.map((s) => (
                  <div key={s.id} className="svc-row" style={s.active ? undefined : { opacity: 0.55 }}>
                    <div className="svc-main">
                      {canManage ? (
                        <button type="button" className="link-btn name" onClick={() => setEditing(s)}>
                          {s.name}
                        </button>
                      ) : (
                        <strong>{s.name}</strong>
                      )}
                      <span className="muted small">
                        {s.durationLabel}
                        {!s.publicVisible ? " · só interno" : ""}
                        {!s.active ? " · inativo" : ""}
                      </span>
                    </div>
                    <strong className="svc-price">{s.priceLabel}</strong>
                    {canManage ? <Switch on={s.active} label={`${s.name}: ${s.active ? "ativo" : "inativo"}`} disabled={busy} onToggle={() => startTransition(() => setServiceActive(s.id, !s.active))} /> : null}
                  </div>
                ))}
                {canManage ? (
                  <div style={{ paddingTop: 14 }}>
                    <button type="button" className="btn secondary" onClick={() => setEditing({ newIn: c.id })}>
                      <Icon name="plus" /> Adicionar serviço
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <Modal open={created !== null} onClose={close} title="Novo serviço">
        {categories.length === 0 ? (
          <div className="stack">
            <div className="notice error" role="alert">
              Cadastre ao menos uma categoria antes de criar um serviço.
            </div>
            {canManageCategories ? (
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    close();
                    setShowCategories(true);
                  }}
                >
                  Cadastrar categoria
                </button>
              </div>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                Peça à recepção ou à administradora para cadastrar uma categoria.
              </p>
            )}
          </div>
        ) : (
          <ServiceForm
            key={String(created?.newIn)}
            categories={categories}
            action={createService}
            submitLabel="Cadastrar serviço"
            onDone={close}
            defaults={{ name: "", description: "", categoryId: String(created?.newIn ?? ""), durationMin: "45", bufferMin: "0", price: "", publicVisible: true }}
          />
        )}
      </Modal>

      <Modal open={showCategories} onClose={closeCategories} title="Categorias de serviço">
        <CategoriesManager categories={categories} />
      </Modal>

      <Modal open={current !== null} onClose={close} title={current?.name ?? "Serviço"}>
        {current ? (
          <div className="stack">
            <ServiceForm
              categories={categories}
              action={updateService.bind(null, current.id)}
              submitLabel="Salvar alterações"
              onDone={close}
              defaults={{
                name: current.name,
                description: current.description,
                categoryId: String(current.categoryId),
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
