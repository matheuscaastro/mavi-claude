"use client";

import { useActionState, useState } from "react";
import Select from "@/components/Select";
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
          <input name="amount" inputMode="decimal" placeholder="0,00…" autoComplete="off" spellCheck={false} required />
        </label>
        <label className="field">
          <span className="label">Data</span>
          <input type="date" name="date" defaultValue={today} required />
        </label>
        <div className="field">
          <span className="label">Categoria</span>
          <Select key={kind} name="category" required placeholder="Escolha a categoria" options={cats.map((c) => ({ value: c, label: c }))} aria-label="Categoria" />
          <button type="button" className="link-btn small" onClick={onManageCategories}>
            Gerenciar categorias
          </button>
        </div>
        <div className="field">
          <span className="label">Forma</span>
          <Select name="method" defaultValue="pix" options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))} aria-label="Forma de pagamento" />
        </div>
      </div>
      <label className="field">
        <span className="label">Descrição</span>
        <input name="description" placeholder="Ex.: conta de luz de outubro…" autoComplete="off" />
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Lançar no caixa"}
        </button>
      </div>
    </form>
  );
}
