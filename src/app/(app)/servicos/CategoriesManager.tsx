"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createCategory, deleteCategory, renameCategory, type CategoryState } from "./actions";

export type CategoryRow = { id: number; name: string; total: number };

export default function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CategoryState, FormData>(async (prev, fd) => {
    const r = await createCategory(prev, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function save(id: number) {
    startTransition(async () => {
      const r = await renameCategory(id, draft);
      if (r.error) setRowError(r.error);
      else {
        setRowError(null);
        setEditing(null);
      }
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      const r = await deleteCategory(id);
      setRowError(r.error ?? null);
    });
  }

  return (
    <div className="stack">
      <form ref={formRef} action={action} className="stack">
        {state.error ? (
          <div className="notice error" role="alert">
            {state.error}
          </div>
        ) : null}
        <label className="field">
          <span className="label">Nova categoria</span>
          <div className="row" style={{ gap: 10 }}>
            <input name="name" placeholder="Ex.: Podologia" maxLength={40} required style={{ flex: 1 }} />
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </label>
      </form>

      {rowError ? (
        <div className="notice error" role="alert">
          {rowError}
        </div>
      ) : null}

      {categories.length === 0 ? <div className="muted small">Nenhuma categoria ainda. Cadastre a primeira para poder criar serviços.</div> : null}
      <div className="stack" style={{ gap: 0 }}>
        {categories.map((c) => (
          <div key={c.id} className="row spread" style={{ alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            {editing === c.id ? (
              <>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} aria-label="Nome da categoria" style={{ flex: 1 }} />
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn" disabled={busy} onClick={() => save(c.id)}>
                    Salvar
                  </button>
                  <button type="button" className="btn secondary" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted small">{c.total === 0 ? "Nenhum serviço" : c.total === 1 ? "1 serviço" : `${c.total} serviços`}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setEditing(c.id);
                      setDraft(c.name);
                      setRowError(null);
                    }}
                  >
                    Renomear
                  </button>
                  <button type="button" className="btn secondary" disabled={busy || c.total > 0} title={c.total > 0 ? "Só é possível excluir categorias sem serviços." : undefined} onClick={() => remove(c.id)}>
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
