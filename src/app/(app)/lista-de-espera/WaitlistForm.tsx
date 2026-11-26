"use client";

import { useActionState, useEffect, useRef } from "react";
import MaskedInput from "@/components/MaskedInput";
import { addWaitlistEntry, type WaitState } from "./actions";

export default function WaitlistForm({ services, staff, today }: { services: { id: number; name: string }[]; staff: { id: number; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState<WaitState, FormData>(addWaitlistEntry, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={action} ref={ref} className="stack">
      {state.error ? <div className="notice error" role="alert">{state.error}</div> : null}
      {state.ok ? <div className="notice ok">Adicionada à lista.</div> : null}
      <div className="grid-2">
        <label className="field"><span className="label">Nome</span><input name="name" required maxLength={80} /></label>
        <label className="field"><span className="label">WhatsApp</span><MaskedInput kind="phone" name="phone" /></label>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label">Serviços desejados</legend>
        <div className="stack small">
          {services.map((s) => (
            <label key={s.id} className="row" style={{ gap: 8 }}><input type="checkbox" name="serviceIds" value={s.id} /> {s.name}</label>
          ))}
        </div>
      </fieldset>
      <div className="grid-2">
        <label className="field"><span className="label">A partir de</span><input type="date" name="from" defaultValue={today} min={today} required /></label>
        <label className="field"><span className="label">Até</span><input type="date" name="to" defaultValue={today} min={today} required /></label>
        <label className="field">
          <span className="label">Período</span>
          <select name="period" defaultValue="any"><option value="any">Qualquer horário</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option></select>
        </label>
        <label className="field">
          <span className="label">Profissional</span>
          <select name="employeeId" defaultValue=""><option value="">Qualquer uma</option>{staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>
      </div>
      <label className="field"><span className="label">Observação</span><input name="note" maxLength={200} /></label>
      <div className="row"><button className="btn" type="submit" disabled={pending}>{pending ? "Salvando…" : "Adicionar à lista"}</button></div>
    </form>
  );
}
