"use client";

import { useActionState } from "react";
import { addException, saveHours, saveRules, type FormState } from "./actions";

const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function Msg({ state }: { state: FormState }) {
  if (state.error)
    return (
      <div className="notice error" role="alert">
        {state.error}
      </div>
    );
  if (state.ok) return <div className="notice ok">Salvo.</div>;
  return null;
}

export function HoursForm({ hours }: { hours: { weekday: number; isOpen: boolean; openTime: string; closeTime: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHours, {});
  return (
    <form action={action} className="stack">
      <Msg state={state} />
      {DAYS.map((name, weekday) => {
        const h = hours.find((x) => x.weekday === weekday) ?? { isOpen: false, openTime: "08:00", closeTime: "18:00" };
        return (
          <div key={weekday} className="hours-row">
            <label className="check">
              <input type="checkbox" name={`open-${weekday}`} defaultChecked={h.isOpen} />
              {name}
            </label>
            <input type="time" name={`from-${weekday}`} defaultValue={h.openTime} aria-label={`${name}: abre`} />
            <span className="muted">às</span>
            <input type="time" name={`to-${weekday}`} defaultValue={h.closeTime} aria-label={`${name}: fecha`} />
          </div>
        );
      })}
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar horários"}
        </button>
      </div>
    </form>
  );
}

export function RulesForm({
  settings,
}: {
  settings: { minNoticeHours: number; maxDaysAhead: number; cancelDeadlineHours: number; slotStepMin: number; allowAnyProfessional: boolean };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRules, {});
  return (
    <form action={action} className="stack">
      <Msg state={state} />
      <div className="grid-2">
        <label className="field">
          <span className="label">Antecedência mínima para agendar (horas)</span>
          <input type="number" name="minNoticeHours" min={0} defaultValue={settings.minNoticeHours} />
        </label>
        <label className="field">
          <span className="label">Agendar com até (dias de antecedência)</span>
          <input type="number" name="maxDaysAhead" min={1} defaultValue={settings.maxDaysAhead} />
        </label>
        <label className="field">
          <span className="label">Prazo para cancelar/remarcar online (horas antes)</span>
          <input type="number" name="cancelDeadlineHours" min={0} defaultValue={settings.cancelDeadlineHours} />
        </label>
        <label className="field">
          <span className="label">Intervalo entre horários oferecidos</span>
          <select name="slotStepMin" defaultValue={settings.slotStepMin}>
            {[5, 10, 15, 20, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="allowAnyProfessional" defaultChecked={settings.allowAnyProfessional} />
        Permitir “qualquer profissional disponível”
      </label>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar regras"}
        </button>
      </div>
    </form>
  );
}

export function ExceptionForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addException, {});
  return (
    <form action={action} className="stack">
      <Msg state={state} />
      <div className="grid-2">
        <label className="field">
          <span className="label">Data</span>
          <input type="date" name="date" required />
        </label>
        <label className="field">
          <span className="label">Descrição</span>
          <input name="label" placeholder="Feriado, recesso…" />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="closed" defaultChecked /> Fechado o dia todo
      </label>
      <div className="row" style={{ alignItems: "center" }}>
        <span className="muted small">Ou horário especial:</span>
        <input type="time" name="from" defaultValue="08:00" aria-label="Abre" />
        <input type="time" name="to" defaultValue="12:00" aria-label="Fecha" />
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Adicionar exceção"}
        </button>
      </div>
    </form>
  );
}
