"use client";

import { useActionState, useEffect, useState } from "react";
import { reschedulePublic, type FormState } from "../../actions";

type Slot = { time: string; employeeId: number };

export default function RescheduleBox({ token, employeeId, serviceIds, initialDate }: { token: string; employeeId: number; serviceIds: number[]; initialDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reschedulePublic.bind(null, token), {});
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const key = serviceIds.join(",");

  useEffect(() => {
    if (!open) return;
    setSlot(null);
    setSlots(null);
    const ctrl = new AbortController();
    fetch(`/api/public/slots?date=${date}&services=${key}&employee=${employeeId}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSlots(j?.slots ?? []))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [open, date, key, employeeId]);

  if (!open)
    return (
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        Escolher outro horário
      </button>
    );

  return (
    <form action={action} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <label className="field" style={{ maxWidth: 240 }}>
        <span className="label">Novo dia</span>
        <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      {slots && slots.length === 0 ? <div className="muted small">Sem horários livres neste dia com a mesma profissional.</div> : null}
      <div className="slot-grid">
        {(slots ?? []).map((s) => (
          <label key={s.time} className="slot">
            <input type="radio" name="slot" value={s.time} checked={slot?.time === s.time} onChange={() => setSlot(s)} />
            <span>{s.time}</span>
          </label>
        ))}
      </div>
      <input type="hidden" name="time" value={slot?.time ?? ""} />
      <input type="hidden" name="employeeId" value={slot?.employeeId ?? employeeId} />
      <div className="row">
        <button className="btn" type="submit" disabled={pending || !slot}>
          {pending ? "Remarcando…" : "Confirmar novo horário"}
        </button>
        <button className="btn secondary" type="button" onClick={() => setOpen(false)}>
          Voltar
        </button>
      </div>
    </form>
  );
}
