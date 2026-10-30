"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createCashCategory, deleteCashCategory, type CashCategoryState } from "./actions";
import type { CashCategory } from "./EntryForm";

const KINDS = [
  { key: "expense", label: "Despesa" },
  { key: "income", label: "Receita avulsa" },
] as const;

export default function CashCategoriesManager({ categories }: { categories: CashCategory[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [state, action, pending] = useActionState<CashCategoryState, FormData>(async (prev, fd) => {
    const r = await createCashCategory(prev, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});
  const [busy, startTransition] = useTransition();
  const list = categories.filter((c) => c.kind === kind);

  return (
    <div className="stack">
      <div className="pill-group" role="radiogroup" aria-label="Tipo de lançamento">
        {KINDS.map((k) => (
          <label key={k.key} className="pill">
            <input type="radio" name="tab" checked={kind === k.key} onChange={() => setKind(k.key)} />
            <span>{k.label}</span>
          </label>
        ))}
      </div>
      <form ref={formRef} action={action} className="stack">
        <input type="hidden" name="kind" value={kind} />
        {state.error ? (
          <div className="notice error" role="alert">
            {state.error}
          </div>
        ) : null}
        <label className="field">
          <span className="label">Nova categoria de {kind === "expense" ? "despesa" : "receita"}</span>
          <div className="row" style={{ gap: 10 }}>
            <input name="name" placeholder="Ex.: Manutenção" maxLength={40} required style={{ flex: 1 }} />
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </label>
      </form>
      {list.length === 0 ? <div className="muted small">Nenhuma categoria. Cadastre a primeira para poder fazer lançamentos deste tipo.</div> : null}
      <div className="stack" style={{ gap: 0 }}>
        {list.map((c) => (
          <div key={c.id} className="row spread" style={{ alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <strong>{c.name}</strong>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => startTransition(async () => void (await deleteCashCategory(c.id)))}>
              Excluir
            </button>
          </div>
        ))}
      </div>
      <div className="muted small">Excluir uma categoria não altera lançamentos já feitos.</div>
    </div>
  );
}
