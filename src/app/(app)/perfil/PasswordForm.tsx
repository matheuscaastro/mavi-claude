"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordState } from "./actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changeOwnPassword, {});
  return (
    <form action={action} className="stack" style={{ maxWidth: 420 }}>
      {state.error ? <div className="notice error" role="alert">{state.error}</div> : null}
      {state.ok ? <div className="notice ok">Senha alterada.</div> : null}
      <label className="field">
        <span className="label">Senha atual</span>
        <input type="password" name="current" autoComplete="current-password" required />
      </label>
      <label className="field">
        <span className="label">Nova senha</span>
        <input type="password" name="next" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="field">
        <span className="label">Repita a nova senha</span>
        <input type="password" name="confirm" autoComplete="new-password" minLength={8} required />
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Trocar senha"}</button>
      </div>
    </form>
  );
}
