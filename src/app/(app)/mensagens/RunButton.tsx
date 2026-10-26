"use client";

import { useActionState } from "react";
import { runQueueNow, type RunState } from "./actions";

export default function RunButton() {
  const [state, action, pending] = useActionState<RunState, FormData>(runQueueNow, {});
  return (
    <form action={action} className="row" style={{ alignItems: "center", gap: 12 }}>
      <button className="btn secondary" type="submit" disabled={pending}>
        {pending ? "Processando…" : "Processar fila agora"}
      </button>
      {state.message ? <span className="small">{state.message}</span> : null}
      {state.error ? <span className="small" style={{ color: "var(--danger)" }}>{state.error}</span> : null}
    </form>
  );
}
