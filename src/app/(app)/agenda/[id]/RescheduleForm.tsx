"use client";

import { useActionState, useEffect, useState } from "react";
import { rescheduleAppointment, type FormState } from "../actions";

type Slot = { time: string; employeeId: number };

export default function RescheduleForm({
  id,
  serviceIds,
  employeeId,
  initialDate,
}: {
  id: number;
  serviceIds: number[];
  employeeId: number;
  initialDate: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(rescheduleAppointment.bind(null, id), {});
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  useEffect(() => {
    setSlot(null);
    const ctrl = new AbortController();
    fetch(`/api/agenda/slots?date=${date}&services=${serviceIds.join(",")}&employee=${employeeId}&ignore=${id}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSlots(j?.slots ?? []))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [date, id, employeeId, serviceIds]);

  return (
    <form action={action} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <label className="field" style={{ maxWidth: 220 }}>
        <span className="label">Novo dia</span>
        <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      {slots && slots.length === 0 ? <div className="muted small">Sem horários livres neste dia.</div> : null}
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
          {pending ? "Remarcando…" : "Remarcar"}
        </button>
      </div>
    </form>
  );
}
