"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { bookPublic, type FormState } from "./actions";

type Svc = { id: number; name: string; description: string; durationMin: number; priceCents: number };
type Staff = { id: number; name: string; jobTitle: string; serviceIds: number[] };
type Slot = { time: string; employeeId: number };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
const fmtDate = (d: string) => d.split("-").reverse().join("/");

export default function BookingFlow(props: { services: Svc[]; staff: Staff[]; allowAny: boolean; minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(bookPublic, {});
  const [step, setStep] = useState(1);
  const [ids, setIds] = useState<number[]>([]);
  const [who, setWho] = useState(props.allowAny ? "any" : "");
  const [date, setDate] = useState(props.minDate);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  const chosen = props.services.filter((s) => ids.includes(s.id));
  const totalMin = chosen.reduce((a, s) => a + s.durationMin, 0);
  const totalCents = chosen.reduce((a, s) => a + s.priceCents, 0);
  const eligible = useMemo(() => props.staff.filter((p) => ids.every((id) => p.serviceIds.includes(id))), [props.staff, ids]);

  useEffect(() => {
    if (who !== "any" && who && !eligible.some((p) => String(p.id) === who)) setWho(props.allowAny ? "any" : "");
  }, [eligible, who, props.allowAny]);

  // Mudou serviço, profissional ou dia: o horário escolhido deixa de valer.
  useEffect(() => {
    setSlot(null);
  }, [ids, who, date]);

  useEffect(() => {
    setSlots(null);
    setNote(null);
    if (step !== 2 || ids.length === 0 || !who || !date) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/public/slots?date=${date}&services=${ids.join(",")}&employee=${who}`, { signal: ctrl.signal })
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => {
        if (!ok) return setNote(j.error ?? "Não foi possível buscar os horários.");
        if (j.outOfRange) setNote("Essa data não está disponível para agendamento.");
        else if (j.closed) setNote("O salão não abre neste dia.");
        setSlots(j.slots ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [step, ids, who, date]);

  const toggle = (id: number) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const staffName = slot ? props.staff.find((p) => p.id === slot.employeeId)?.name : undefined;

  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <div className="steps" aria-label="Etapas">
        <span className={step === 1 ? "on" : ""}>1. Serviços</span>›<span className={step === 2 ? "on" : ""}>2. Dia e horário</span>›<span className={step === 3 ? "on" : ""}>3. Seus dados</span>
      </div>

      {state.error ? (
        <div className="notice error" role="alert">
          {state.error}
        </div>
      ) : null}

      {/* Os campos ficam no formulário mesmo quando a etapa está oculta. */}
      {ids.map((id) => (
        <input key={id} type="hidden" name="serviceIds" value={id} />
      ))}
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={slot?.time ?? ""} />
      <input type="hidden" name="employeeId" value={slot?.employeeId ?? ""} />
      <div className="hp" aria-hidden="true">
        <label>
          Não preencha este campo
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {step === 1 ? (
        <div className="card stack">
          <div className="section-title">Quais serviços você quer?</div>
          {props.services.map((s) => (
            <label key={s.id} className="service-pick">
              <input type="checkbox" checked={ids.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="name">
                {s.name}
                {s.description ? <span className="muted small" style={{ display: "block", fontWeight: 400 }}>{s.description}</span> : null}
              </span>
              <span className="muted small" style={{ textAlign: "right" }}>
                {dur(s.durationMin)}
                <br />
                {brl(s.priceCents)}
              </span>
            </label>
          ))}
          <div className="row spread" style={{ alignItems: "center" }}>
            <span className="small">{ids.length ? `${dur(totalMin)} · ${brl(totalCents)}` : "Escolha ao menos um"}</span>
            <button type="button" className="btn" disabled={ids.length === 0} onClick={() => setStep(2)}>
              Continuar
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="card stack">
          <div className="section-title">Com quem e quando?</div>
          <div className="pill-group" role="radiogroup" aria-label="Profissional">
            {props.allowAny ? (
              <label className="pill">
                <input type="radio" name="who" value="any" checked={who === "any"} onChange={() => setWho("any")} />
                <span>Qualquer disponível</span>
              </label>
            ) : null}
            {eligible.map((p) => (
              <label key={p.id} className="pill">
                <input type="radio" name="who" value={p.id} checked={who === String(p.id)} onChange={() => setWho(String(p.id))} />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
          {eligible.length === 0 ? <div className="notice">Nenhuma profissional realiza todos esses serviços juntos. Volte e agende em atendimentos separados.</div> : null}
          <label className="field" style={{ maxWidth: 240 }}>
            <span className="label">Dia</span>
            <input type="date" value={date} min={props.minDate} max={props.maxDate} onChange={(e) => setDate(e.target.value)} />
          </label>
          {loading ? <div className="muted small">Buscando horários…</div> : null}
          {note ? <div className="notice">{note}</div> : null}
          {slots && !loading && !note && slots.length === 0 ? <div className="notice">Sem horários livres neste dia. Tente outra data.</div> : null}
          {slots && slots.length > 0 ? (
            <div className="slot-grid" role="radiogroup" aria-label="Horário">
              {slots.map((s) => (
                <label key={s.time} className="slot">
                  <input type="radio" name="slot" value={s.time} checked={slot?.time === s.time} onChange={() => setSlot(s)} />
                  <span>{s.time}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="row spread">
            <button type="button" className="btn secondary" onClick={() => setStep(1)}>
              Voltar
            </button>
            <button type="button" className="btn" disabled={!slot} onClick={() => setStep(3)}>
              Continuar
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <>
          <div className="card">
            <dl className="summary" style={{ margin: 0 }}>
              <dt>Serviços</dt>
              <dd>{chosen.map((s) => s.name).join(" + ")}</dd>
              <dt>Quando</dt>
              <dd>
                {fmtDate(date)} às {slot?.time} · {dur(totalMin)}
              </dd>
              <dt>Profissional</dt>
              <dd>{staffName}</dd>
              <dt>Valor (pago no salão)</dt>
              <dd style={{ marginBottom: 0 }}>{brl(totalCents)}</dd>
            </dl>
          </div>
          <div className="card stack">
            <div className="section-title">Seus dados</div>
            <label className="field">
              <span className="label">Nome completo</span>
              <input name="name" autoComplete="name" required />
            </label>
            <label className="field">
              <span className="label">WhatsApp (com DDD)</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" required />
            </label>
            <label className="field">
              <span className="label">Data de nascimento (opcional)</span>
              <input name="birthDate" type="date" autoComplete="bday" />
            </label>
            <label className="check small">
              <input type="checkbox" name="whatsappOptIn" defaultChecked />
              Quero receber confirmação e lembrete do agendamento pelo WhatsApp
            </label>
            <div className="row spread">
              <button type="button" className="btn secondary" onClick={() => setStep(2)}>
                Voltar
              </button>
              <button type="submit" className="btn" disabled={pending}>
                {pending ? "Agendando…" : "Confirmar agendamento"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </form>
  );
}
