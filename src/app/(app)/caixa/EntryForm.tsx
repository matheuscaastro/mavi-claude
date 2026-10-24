"use client";

import { useActionState, useState } from "react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHOD_LABEL, METHODS } from "@/lib/cash";
import { addEntry, type FormState } from "./actions";

export default function EntryForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addEntry, {});
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const cats = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
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
          <select name="category" key={kind} required>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
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
