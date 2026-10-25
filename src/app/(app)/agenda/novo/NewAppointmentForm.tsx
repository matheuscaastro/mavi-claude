"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createAppointment, type FormState } from "../actions";

type Svc = { id: number; name: string; durationMin: number; priceCents: number };
type Staff = { id: number; name: string; color: string };
type Slot = { time: string; employeeId: number };
type Availability = { closed: boolean; slots: Slot[]; durationMin: number; totalCents: number; reason?: "no_staff" | "staff_not_eligible"; eligible?: { id: number }[] };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

export default function NewAppointmentForm(props: {
  services: Svc[];
  staff: Staff[];
  clients: { id: number; label: string }[];
  allowAny: boolean;
  initialClientId: number | null;
  initialDate: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAppointment, {});
  const [filter, setFilter] = useState("");
  const [clientId, setClientId] = useState<number | "">(props.initialClientId ?? "");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [who, setWho] = useState<string>(props.allowAny ? "any" : String(props.staff[0]?.id ?? ""));
  const [date, setDate] = useState(props.initialDate);
  const [av, setAv] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  const visibleClients = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? props.clients.filter((c) => c.label.toLowerCase().includes(f)) : props.clients;
  }, [filter, props.clients]);

  const chosen = props.services.filter((s) => serviceIds.includes(s.id));
  const totalMin = chosen.reduce((a, s) => a + s.durationMin, 0);
  const totalCents = chosen.reduce((a, s) => a + s.priceCents, 0);

  useEffect(() => {
    setSlot(null);
    if (serviceIds.length === 0 || !date || !who) {
      setAv(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/agenda/slots?date=${date}&services=${serviceIds.join(",")}&employee=${who}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAv(j))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [serviceIds, who, date]);

  const toggle = (id: number) => setServiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <form action={action} className="split">
      <div className="stack grow-3">
        {state.error ? (
          <div className="notice error" role="alert">
            {state.error}
          </div>
        ) : null}

        <div className="card stack">
          <div className="section-title">1. Cliente</div>
          <input placeholder="Filtrar por nome ou telefone" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select name="clientId" value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")} required size={1}>
            <option value="">Escolha a cliente…</option>
            {visibleClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <Link href="/clientes?novo=1" className="small">
            Cliente nova? Cadastre primeiro.
          </Link>
        </div>

        <div className="card stack">
          <div className="section-title">2. Serviços</div>
          {props.services.map((s) => (
            <label key={s.id} className="service-pick">
              <input type="checkbox" name="serviceIds" value={s.id} checked={serviceIds.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="name">{s.name}</span>
              <span className="muted small">
                {dur(s.durationMin)} · {brl(s.priceCents)}
              </span>
            </label>
          ))}
        </div>

        <div className="card stack">
          <div className="section-title">3. Profissional, dia e horário</div>
          <div className="pill-group" role="radiogroup" aria-label="Profissional">
            {props.allowAny ? (
              <label className="pill">
                <input type="radio" name="who" value="any" checked={who === "any"} onChange={() => setWho("any")} />
                <span>Qualquer disponível</span>
              </label>
            ) : null}
            {props.staff.map((s) => (
              <label key={s.id} className="pill">
                <input type="radio" name="who" value={s.id} checked={who === String(s.id)} onChange={() => setWho(String(s.id))} />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
          <label className="field" style={{ maxWidth: 220 }}>
            <span className="label">Dia</span>
            <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          {serviceIds.length === 0 ? <div className="muted small">Escolha ao menos um serviço para ver os horários.</div> : null}
          {loading ? <div className="muted small">Buscando horários…</div> : null}
          {av && !loading && av.closed ? <div className="notice">O salão está fechado neste dia.</div> : null}
          {av && !loading && av.reason === "no_staff" ? (
            <div className="notice error">
              Nenhuma profissional ativa realiza {serviceIds.length > 1 ? "todos esses serviços juntos" : "esse serviço"}. Em <Link href="/funcionarios">Funcionários</Link>, abra a profissional e marque o serviço em “Serviços que realiza” (e confira se “Realiza atendimentos” está ligado).
            </div>
          ) : null}
          {av && !loading && av.reason === "staff_not_eligible" ? <div className="notice">A profissional escolhida não realiza {serviceIds.length > 1 ? "todos esses serviços" : "esse serviço"}. Escolha outra ou “Qualquer disponível”.</div> : null}
          {av && !loading && !av.closed && !av.reason && av.slots.length === 0 ? (
            <div className="notice">Nenhum horário livre neste dia para essa combinação. Tente outro dia.</div>
          ) : null}
          {av && !loading && av.slots.length > 0 ? (
            <div className="slot-grid" role="radiogroup" aria-label="Horário">
              {av.slots.map((s) => (
                <label key={s.time} className="slot">
                  <input
                    type="radio"
                    name="slot"
                    value={s.time}
                    checked={slot?.time === s.time}
                    onChange={() => setSlot(s)}
                  />
                  <span>{s.time}</span>
                </label>
              ))}
            </div>
          ) : null}
          <input type="hidden" name="time" value={slot?.time ?? ""} />
          <input type="hidden" name="employeeId" value={slot?.employeeId ?? ""} />
        </div>

        <div className="card stack">
          <div className="section-title">Observações</div>
          <textarea name="notes" rows={2} />
        </div>
      </div>

      <aside className="card grow-2">
        <div className="section-title">Resumo</div>
        <dl className="summary">
          <dt>Serviços</dt>
          <dd>{chosen.length ? chosen.map((s) => s.name).join(" + ") : "—"}</dd>
          <dt>Duração</dt>
          <dd>{totalMin ? dur(totalMin) : "—"}</dd>
          <dt>Profissional</dt>
          <dd>{slot ? (props.staff.find((s) => s.id === slot.employeeId)?.name ?? "—") : "—"}</dd>
          <dt>Quando</dt>
          <dd>{slot ? `${date.split("-").reverse().join("/")} às ${slot.time}` : "—"}</dd>
          <dt>Total</dt>
          <dd>{totalCents ? brl(totalCents) : "—"}</dd>
        </dl>
        <button className="btn" type="submit" disabled={pending || !slot || !clientId} style={{ width: "100%" }}>
          {pending ? "Agendando…" : "Confirmar agendamento"}
        </button>
      </aside>
    </form>
  );
}
