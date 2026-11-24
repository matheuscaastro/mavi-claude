"use client";

import { useActionState } from "react";
import Select from "@/components/Select";
import { createBlock, type FormState } from "./actions";

export default function BlockForm({ date, staff }: { date: string; staff: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createBlock, {});
  return (
    <form action={action} className="stack">
      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="grid-2">
        <div className="field">
          <span className="label">Profissional</span>
          <Select name="employeeId" required defaultValue={String(staff[0]?.id ?? "")} options={staff.map((s) => ({ value: String(s.id), label: s.name }))} aria-label="Profissional" />
        </div>
        <label className="field">
          <span className="label">Data</span>
          <input type="date" name="date" defaultValue={date} required />
        </label>
        <label className="field">
          <span className="label">Das</span>
          <input type="time" name="start" defaultValue="13:00" required />
        </label>
        <label className="field">
          <span className="label">Até</span>
          <input type="time" name="end" defaultValue="14:00" required />
        </label>
      </div>
      <label className="field">
        <span className="label">Motivo</span>
        <input name="reason" placeholder="Ex.: almoço, folga, curso…" autoComplete="off" />
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Bloquear"}
        </button>
      </div>
    </form>
  );
}
