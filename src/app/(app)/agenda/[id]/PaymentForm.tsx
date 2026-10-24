"use client";

import { useActionState } from "react";
import { METHOD_LABEL, METHODS } from "@/lib/cash";
import { registerPayment, type FormState } from "../../caixa/actions";

export default function PaymentForm({ appointmentId, dueInput }: { appointmentId: number; dueInput: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(registerPayment.bind(null, appointmentId), {});
  return (
    <form action={action} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="grid-2">
        <label className="field">
          <span className="label">Valor recebido (R$)</span>
          <input name="amount" inputMode="decimal" defaultValue={dueInput} required />
        </label>
        <label className="field">
          <span className="label">Forma de pagamento</span>
          <select name="method" defaultValue="pix">
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Registrando…" : "Registrar pagamento"}
        </button>
      </div>
    </form>
  );
}
