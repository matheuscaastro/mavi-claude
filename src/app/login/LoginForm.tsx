"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action}>
      <div>
        <h1 className="page-title">Entrar</h1>
        <div className="muted" style={{ marginTop: 6 }}>
          Acesso da equipe do salão
        </div>
      </div>

      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}

      <label className="field">
        <span className="label">E-mail</span>
        <input type="email" name="email" defaultValue={state.email} autoComplete="username" placeholder="voce@exemplo.com" required />
      </label>
      <label className="field">
        <span className="label">Senha</span>
        <input type="password" name="password" autoComplete="current-password" placeholder="Sua senha" required />
      </label>
      <label className="check small">
        <input type="checkbox" name="remember" />
        Manter conectada neste aparelho
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
