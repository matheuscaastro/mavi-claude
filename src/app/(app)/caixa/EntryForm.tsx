"use client";

import { useActionState, useState } from "react";
import { METHOD_LABEL, METHODS } from "@/lib/cash";
import { addEntry, type FormState } from "./actions";

export type CashCategory = { id: number; kind: "income" | "expense"; name: string };

export default function EntryForm({ today, categories, onManageCategories }: { today: string; categories: CashCategory[]; onManageCategories: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addEntry, {});
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const cats = categories.filter((c) => c.kind === kind).map((c) => c.name);
  return (
    <form action={action} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.ok ? <div className="notice ok">Lançamento salvo.</div> : null}
      <div className="pill-group" role="radiogroup" aria-label="Tipo">
        <label className="pill">
          <input type="radio" name="kind" value="expense" checked={kind === "expense"} onChange={() => setKind("expense")} />
          <span>Despesa</span>
        </label>
        <label className="pill">
          <input type="radio" name="kind" value="income" checked={kind === "income"} onChange={() => setKind("income")} />
          <span>Receita avulsa</span>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span className="label">Valor (R$)</span>
          <input name="amount" inputMode="decimal" placeholder="0,00" required />
        </label>
        <label className="field">
          <span className="label">Data</span>
          <input type="date" name="date" defaultValue={today} required />
        </label>
        <label className="field">
          <span className="label">Categoria</span>
          <select name="category" key={kind} required defaultValue="">
            <option value="" disabled>
              Escolha a categoria
            </option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button type="button" className="link-btn small" onClick={onManageCategories}>
            Gerenciar categorias
          </button>
        </label>
        <label className="field">
          <span className="label">Forma</span>
          <select name="method" defaultValue="pix">
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">Descrição</span>
        <input name="description" placeholder="Ex.: conta de luz de outubro" />
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Lançar"}
        </button>
      </div>
    </form>
  );
}
