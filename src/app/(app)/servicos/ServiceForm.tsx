"use client";

import Select from "@/components/Select";
import { useActionState, useEffect } from "react";
import type { ServiceFormState } from "./actions";

export type ServiceDefaults = {
  name: string;
  description: string;
  categoryId: string;
  durationMin: string;
  bufferMin: string;
  price: string;
  publicVisible: boolean;
};

export default function ServiceForm({
  categories,
  action,
  defaults,
  submitLabel,
  onDone,
}: {
  categories: { id: number; name: string }[];
  action: (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  defaults: ServiceDefaults;
  submitLabel: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <label className="field">
        <span className="label">Nome do serviço</span>
        <input name="name" defaultValue={defaults.name} autoComplete="off" required />
      </label>
      <label className="field">
        <span className="label">Descrição (aparece na página pública)</span>
        <textarea name="description" rows={2} defaultValue={defaults.description} autoComplete="off" />
      </label>
      <div className="grid-2">
        <div className="field">
          <span className="label">Categoria</span>
          <Select name="categoryId" required defaultValue={String(defaults.categoryId ?? "")} placeholder="Escolha a categoria" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} aria-label="Categoria" />
        </div>
        <label className="field">
          <span className="label">Preço (R$)</span>
          <input name="price" inputMode="decimal" defaultValue={defaults.price} placeholder="80,00…" autoComplete="off" spellCheck={false} required />
        </label>
        <label className="field">
          <span className="label">Duração (minutos)</span>
          <input name="durationMin" type="number" inputMode="numeric" min={5} step={5} defaultValue={defaults.durationMin} autoComplete="off" required />
        </label>
        <label className="field">
          <span className="label">Intervalo de preparo depois (minutos)</span>
          <input name="bufferMin" type="number" inputMode="numeric" min={0} step={5} defaultValue={defaults.bufferMin} autoComplete="off" />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="publicVisible" defaultChecked={defaults.publicVisible} />
        Disponível para agendamento online
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
