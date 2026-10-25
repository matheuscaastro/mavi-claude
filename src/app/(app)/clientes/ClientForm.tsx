"use client";

import { useActionState, useEffect } from "react";
import MaskedInput from "@/components/MaskedInput";
import type { ClientFormState } from "./actions";

export type ClientDefaults = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  cpf: string;
  notes: string;
  whatsappOptIn: boolean;
};

export default function ClientForm({
  action,
  defaults,
  submitLabel,
  onDone,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaults: ClientDefaults;
  submitLabel: string;
  /** Chamado quando salvou com sucesso (ex.: fechar o modal). Sem ele, mostra "Dados salvos". */
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);
  return (
    <form action={formAction} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.ok && !onDone ? <div className="notice ok">Dados salvos.</div> : null}
      <label className="field">
        <span className="label">Nome completo</span>
        <input name="name" defaultValue={defaults.name} required />
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="label">Telefone (WhatsApp)</span>
          <MaskedInput kind="phone" name="phone" defaultValue={defaults.phone} required />
        </label>
        <label className="field">
          <span className="label">Data de nascimento</span>
          <input type="date" name="birthDate" defaultValue={defaults.birthDate} />
        </label>
        <label className="field">
          <span className="label">E-mail</span>
          <input type="email" name="email" defaultValue={defaults.email} />
        </label>
        <label className="field">
          <span className="label">CPF</span>
          <MaskedInput kind="cpf" name="cpf" defaultValue={defaults.cpf} />
        </label>
      </div>
      <label className="field">
        <span className="label">Observações</span>
        <textarea name="notes" rows={3} defaultValue={defaults.notes} />
      </label>
      <label className="check">
        <input type="checkbox" name="whatsappOptIn" defaultChecked={defaults.whatsappOptIn} />
        Autoriza receber mensagens por WhatsApp (confirmação, lembrete e aniversário)
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
