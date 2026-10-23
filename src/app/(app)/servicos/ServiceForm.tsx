"use client";

import { useActionState } from "react";
import type { ServiceFormState } from "./actions";

export type ServiceDefaults = {
  name: string;
  description: string;
  category: string;
  durationMin: string;
  bufferMin: string;
  price: string;
  publicVisible: boolean;
};

export default function ServiceForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  defaults: ServiceDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <label className="field">
        <span className="label">Nome do serviço</span>
        <input name="name" defaultValue={defaults.name} required />
      </label>
      <label className="field">
        <span className="label">Descrição (aparece na página pública)</span>
        <textarea name="description" rows={2} defaultValue={defaults.description} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="label">Categoria</span>
          <input name="category" defaultValue={defaults.category} required />
        </label>
        <label className="field">
          <span className="label">Preço (R$)</span>
          <input name="price" inputMode="decimal" defaultValue={defaults.price} placeholder="80,00" required />
        </label>
        <label className="field">
          <span className="label">Duração (minutos)</span>
          <input name="durationMin" type="number" min={5} step={5} defaultValue={defaults.durationMin} required />
        </label>
        <label className="field">
          <span className="label">Intervalo de preparo depois (minutos)</span>
          <input name="bufferMin" type="number" min={0} step={5} defaultValue={defaults.bufferMin} />
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
