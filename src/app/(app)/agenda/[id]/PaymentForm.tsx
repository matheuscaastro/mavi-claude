"use client";

import { useActionState } from "react";
import Select from "@/components/Select";
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
          <input name="amount" inputMode="decimal" defaultValue={dueInput} autoComplete="off" spellCheck={false} required />
        </label>
        <div className="field">
          <span className="label">Forma de pagamento</span>
          <Select name="method" defaultValue="pix" options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))} aria-label="Forma de pagamento" />
        </div>
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Registrando…" : "Registrar pagamento"}
        </button>
      </div>
    </form>
  );
}
