import Link from "next/link";
import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db } from "@db/index";
import { appointmentItems, appointments, clients, employees, scheduleBlocks } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSalonWindow } from "@/lib/agenda";
import { addDays, formatDateLong, formatTime, isValidDate, localDateTime, localMinutes, parseTime, todayLocal, localTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/status";
import { Icon } from "@/components/icons";
import BlockForm from "./BlockForm";
import { deleteBlock } from "./actions";
import type { CSSProperties } from "react";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const PX_PER_MIN = 1;
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ data?: string; erro?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayLocal();
  const date = sp.data && isValidDate(sp.data) ? sp.data : today;
  const viewAll = can(user.accessRole, "agenda.viewAll");
  const canEdit = can(user.accessRole, "agenda.edit");

  const from = localDateTime(date, "00:00");
  const to = localDateTime(date, "23:59");

  const staff = await db
    .select()
    .from(employees)
    .where(and(eq(employees.active, true), eq(employees.performsServices, true), viewAll ? undefined : eq(employees.id, user.id)))
    .orderBy(asc(employees.id));
  const ids = staff.map((s) => s.id);

  const [appts, blocks, window] = await Promise.all([
    db
      .select({
        id: appointments.id,
        employeeId: appointments.employeeId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        clientName: clients.name,
      })
      .from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .where(and(lt(appointments.startsAt, to), gt(appointments.endsAt, from), ne(appointments.status, "cancelled"))),
    db.select().from(scheduleBlocks).where(and(lt(scheduleBlocks.startsAt, to), gt(scheduleBlocks.endsAt, from))),
    getSalonWindow(date),
  ]);
  const mine = appts.filter((a) => ids.includes(a.employeeId));
  const myBlocks = blocks.filter((b) => ids.includes(b.employeeId));
  const itemRows = mine.length
    ? await db
        .select()
        .from(appointmentItems)
        .where(inArray(appointmentItems.appointmentId, mine.map((a) => a.id)))
        .orderBy(asc(appointmentItems.id))
    : [];
  const servicesOf = new Map<number, string[]>();
  for (const it of itemRows) servicesOf.set(it.appointmentId, [...(servicesOf.get(it.appointmentId) ?? []), it.serviceName]);

  const minutesOf = (d: Date) => Math.round((d.getTime() - from.getTime()) / 60000);
  const starts = [window?.start ?? 8 * 60, ...mine.map((a) => minutesOf(a.startsAt)), ...myBlocks.map((b) => minutesOf(b.startsAt))];
  const ends = [window?.end ?? 18 * 60, ...mine.map((a) => minutesOf(a.endsAt)), ...myBlocks.map((b) => minutesOf(b.endsAt))];
  const startH = Math.max(0, Math.floor(Math.min(...starts) / 60));
  const endH = Math.min(24, Math.ceil(Math.max(...ends) / 60));
  const height = (endH - startH) * 60 * PX_PER_MIN;
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);

  const nowMin = date === today ? localMinutes(new Date()) : null;
  const showNow = nowMin !== null && nowMin >= startH * 60 && nowMin <= endH * 60;
  const dayList = myBlocks.filter((b) => canEdit);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Agenda</h1>
          <div className="muted">{capitalize(formatDateLong(date))}</div>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <Link className="icon-btn" href={`/agenda?data=${addDays(date, -1)}`} aria-label="Dia anterior">
            <Icon name="left" />
          </Link>
          <Link className="btn secondary" href="/agenda">
            Hoje
          </Link>
          <Link className="icon-btn" href={`/agenda?data=${addDays(date, 1)}`} aria-label="Próximo dia">
            <Icon name="right" />
          </Link>
          <form className="date-jump">
            <input type="date" name="data" defaultValue={date} aria-label="Ir para a data" />
            <button className="btn secondary" type="submit">
              Ir
            </button>
          </form>
          {canEdit ? (
            <Link className="btn" href={`/agenda/novo?data=${date}`}>
              <Icon name="plus" /> Novo agendamento
            </Link>
          ) : null}
        </div>
      </div>

      {sp.erro === "sem-permissao" ? <div className="notice error">Você não tem permissão para essa área.</div> : null}
      {!window ? <div className="notice">O salão está fechado neste dia (pelos horários configurados).</div> : null}

      <div className="legend" style={{ marginBottom: 12 }}>
        {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[])
          .filter((s) => s !== "cancelled")
          .map((s) => (
            <span key={s} className={`status-${s}`}>
              <span className="dot" />
              {STATUS_LABEL[s]}
            </span>
          ))}
      </div>

      {staff.length === 0 ? (
        <div className="card muted">Nenhuma profissional ativa na agenda.</div>
      ) : (
        <div className="cal">
          <div className="cal-inner">
            <div className="cal-head" style={{ "--cols": staff.length } as CSSProperties}>
              <div />
              {staff.map((e) => (
                <div key={e.id} className="who">
                  <span className="dot" style={{ background: e.color }} />
                  <strong>{e.name}</strong>
                </div>
              ))}
            </div>
            <div className="cal-body" style={{ "--cols": staff.length, "--height": `${height}px` } as CSSProperties}>
              <div className="cal-hours">
                {hours.map((h) => (
                  <div key={h}>{String(h).padStart(2, "0")}:00</div>
                ))}
              </div>
              {staff.map((e) => (
                <div key={e.id} className="cal-col">
                  {myBlocks
                    .filter((b) => b.employeeId === e.id)
                    .map((b) => {
                      const top = (minutesOf(b.startsAt) - startH * 60) * PX_PER_MIN;
                      const h = (minutesOf(b.endsAt) - minutesOf(b.startsAt)) * PX_PER_MIN;
                      return (
                        <div key={`b${b.id}`} className="block" style={{ top, height: h }}>
                          {b.reason}
                        </div>
                      );
                    })}
                  {mine
                    .filter((a) => a.employeeId === e.id)
                    .map((a) => {
                      const top = (minutesOf(a.startsAt) - startH * 60) * PX_PER_MIN;
                      const h = Math.max(28, (minutesOf(a.endsAt) - minutesOf(a.startsAt)) * PX_PER_MIN - 2);
                      return (
                        <Link
                          key={a.id}
                          href={`/agenda/${a.id}`}
                          className={`appt status-${a.status}${h < 58 ? " compact" : ""}`}
                          style={{ top, height: h, "--who": e.color } as CSSProperties}
                        >
                          <div className="meta">
                            <span>
                              {localTime(a.startsAt)}–{localTime(a.endsAt)}
                            </span>
                            <span className="chip status">{STATUS_LABEL[a.status]}</span>
                          </div>
                          <div className="client">{a.clientName}</div>
                          <div className="svc">{(servicesOf.get(a.id) ?? []).join(" + ")}</div>
                        </Link>
                      );
                    })}
                </div>
              ))}
              {showNow ? (
                <>
                  <div className="now-line" style={{ top: (nowMin - startH * 60) * PX_PER_MIN }} />
                  <div className="now-tag" style={{ top: (nowMin - startH * 60) * PX_PER_MIN - 9 }}>
                    {formatTime(nowMin)}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {canEdit ? (
        <div className="split" style={{ marginTop: 24 }}>
          <div className="card grow-2">
            <div className="section-title">Bloquear horário</div>
            <BlockForm date={date} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
          </div>
          <div className="card grow-2">
            <div className="section-title">Bloqueios do dia</div>
            {dayList.length === 0 ? <div className="muted small">Nenhum bloqueio neste dia.</div> : null}
            <div className="stack">
              {dayList.map((b) => (
                <form key={b.id} action={deleteBlock.bind(null, b.id, date)} className="row spread" style={{ alignItems: "center" }}>
                  <span className="small">
                    <strong>{staff.find((s) => s.id === b.employeeId)?.name}</strong> · {localTime(b.startsAt)}–{localTime(b.endsAt)} · {b.reason}
                  </span>
                  <button className="btn secondary" type="submit">
                    Remover
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
