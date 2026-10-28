"use client";

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
        <input name="name" defaultValue={defaults.name} required />
      </label>
      <label className="field">
        <span className="label">Descrição (aparece na página pública)</span>
        <textarea name="description" rows={2} defaultValue={defaults.description} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="label">Categoria</span>
          <select name="categoryId" defaultValue={defaults.categoryId} required>
            <option value="" disabled>
              Escolha a categoria
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
