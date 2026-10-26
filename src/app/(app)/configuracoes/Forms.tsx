"use client";

import { useActionState } from "react";
import { DEFAULT_TEXTS, VARIABLES } from "@/lib/messages/templates";
import { addException, saveHours, saveMessaging, saveRules, type FormState } from "./actions";

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

export function MessagingForm({
  settings,
}: {
  settings: {
    whatsappEnabled: boolean;
    salonName: string;
    confirmationEnabled: boolean;
    reminderEnabled: boolean;
    reminderHoursBefore: number;
    birthdayEnabled: boolean;
    birthdayHour: number;
    confirmationText: string;
    reminderText: string;
    birthdayText: string;
  };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMessaging, {});
  return (
    <form action={action} className="stack">
      <Msg state={state} />
      <label className="check">
        <input type="checkbox" name="whatsappEnabled" defaultChecked={settings.whatsappEnabled} />
        <strong>Enviar mensagens de WhatsApp</strong>
      </label>
      <p className="muted small" style={{ margin: 0 }}>
        Só recebem as clientes que autorizaram no cadastro ou no agendamento online.
      </p>
      <div className="grid-2">
        <label className="field">
          <span className="label">Nome do salão nas mensagens</span>
          <input name="salonName" defaultValue={settings.salonName} maxLength={60} required />
        </label>
        <label className="field">
          <span className="label">Lembrete (horas antes do atendimento)</span>
          <input type="number" name="reminderHoursBefore" min={2} max={168} defaultValue={settings.reminderHoursBefore} />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" name="confirmationEnabled" defaultChecked={settings.confirmationEnabled} /> Confirmação ao agendar ou remarcar
      </label>
      <label className="field">
        <span className="label">Texto da confirmação</span>
        <textarea name="confirmationText" rows={4} defaultValue={settings.confirmationText} placeholder={DEFAULT_TEXTS.confirmation} />
      </label>

      <label className="check">
        <input type="checkbox" name="reminderEnabled" defaultChecked={settings.reminderEnabled} /> Lembrete antes do atendimento
      </label>
      <label className="field">
        <span className="label">Texto do lembrete</span>
        <textarea name="reminderText" rows={4} defaultValue={settings.reminderText} placeholder={DEFAULT_TEXTS.reminder} />
      </label>

      <label className="check">
        <input type="checkbox" name="birthdayEnabled" defaultChecked={settings.birthdayEnabled} /> Mensagem de aniversário
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="label">Hora de envio do aniversário</span>
          <select name="birthdayHour" defaultValue={settings.birthdayHour}>
            {Array.from({ length: 12 }, (_, i) => i + 8).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">Texto do aniversário</span>
        <textarea name="birthdayText" rows={3} defaultValue={settings.birthdayText} placeholder={DEFAULT_TEXTS.birthday} />
      </label>

      <p className="muted small" style={{ margin: 0 }}>
        Deixe um texto em branco para usar o padrão (mostrado em cinza). Variáveis: {VARIABLES.map((v) => `{{${v}}}`).join(" ")}. Se uma variável ficar vazia
        (por exemplo, sem link), a linha dela é omitida.
      </p>
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar mensagens"}
        </button>
      </div>
    </form>
  );
}
