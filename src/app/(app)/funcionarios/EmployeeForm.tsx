"use client";

import { useActionState, useEffect } from "react";
import type { EmployeeFormState } from "./actions";

export type EmployeeDefaults = {
  name: string;
  jobTitle: string;
  phone: string;
  email: string;
  accessRole: "admin" | "reception" | "professional";
  performsServices: boolean;
  color: string;
  serviceIds: number[];
};

export const PALETTE = ["#3D6B62", "#B5651D", "#7B5EA7", "#C0516B", "#2F7DA8", "#8A8F2A", "#D08A2E", "#5C6B73"];

export default function EmployeeForm({
  action,
  defaults,
  services,
  isNew,
  submitLabel,
  onDone,
}: {
  action: (state: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  defaults: EmployeeDefaults;
  services: { id: number; name: string }[];
  isNew: boolean;
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
      <div className="grid-2">
        <label className="field">
          <span className="label">Nome</span>
          <input name="name" defaultValue={defaults.name} required />
        </label>
        <label className="field">
          <span className="label">Cargo</span>
          <input name="jobTitle" defaultValue={defaults.jobTitle} placeholder="Podóloga" />
        </label>
        <label className="field">
          <span className="label">Telefone</span>
          <input name="phone" defaultValue={defaults.phone} inputMode="tel" />
        </label>
        <label className="field">
          <span className="label">E-mail (usado no login)</span>
          <input type="email" name="email" defaultValue={defaults.email} required />
        </label>
        <label className="field">
          <span className="label">Perfil de acesso</span>
          <select name="accessRole" defaultValue={defaults.accessRole}>
            <option value="professional">Profissional</option>
            <option value="reception">Recepção</option>
            <option value="admin">Administradora</option>
          </select>
        </label>
        <label className="field">
          <span className="label">{isNew ? "Senha inicial" : "Nova senha (deixe vazio para manter)"}</span>
          <input type="password" name="password" autoComplete="new-password" minLength={8} required={isNew} />
        </label>
      </div>

      <div className="field">
        <span className="label">Cor na agenda</span>
        <div className="swatches">
          {PALETTE.map((c) => (
            <label key={c} className="swatch" title={c}>
              <input type="radio" name="color" value={c} defaultChecked={defaults.color.toLowerCase() === c.toLowerCase()} />
              <span style={{ background: c }} />
            </label>
          ))}
        </div>
      </div>

      <label className="check">
        <input type="checkbox" name="performsServices" defaultChecked={defaults.performsServices} />
        Realiza atendimentos (aparece na agenda e pode ser escolhida pelas clientes)
      </label>

      <div className="field">
        <span className="label">Serviços que realiza</span>
        <div className="stack" style={{ gap: 6 }}>
          {services.map((s) => (
            <label key={s.id} className="check">
              <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={defaults.serviceIds.includes(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
