import { sql } from "drizzle-orm";
import { db } from "@db/index";
import { commissionOf } from "./cash";
import { addDays, localDateTime } from "./time";

/** Limites [início, fim) em instantes, para um intervalo de datas do salão (inclusivo). */
function bounds(from: string, to: string) {
  return { start: localDateTime(from, "00:00"), end: localDateTime(addDays(to, 1), "00:00") };
}

export type StatusCounts = { scheduled: number; confirmed: number; in_progress: number; completed: number; cancelled: number; no_show: number };

export async function statusCounts(from: string, to: string): Promise<StatusCounts> {
  const { start, end } = bounds(from, to);
  const res = await db.execute(sql`
    select status, count(*)::int as n from appointments
     where starts_at >= ${start.toISOString()}::timestamptz and starts_at < ${end.toISOString()}::timestamptz
     group by status`);
  const out: StatusCounts = { scheduled: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const r of res.rows as { status: keyof StatusCounts; n: number }[]) out[r.status] = r.n;
  return out;
}

export type RankRow = { name: string; count: number; cents: number };

export async function topServices(from: string, to: string, limit = 6): Promise<RankRow[]> {
  const { start, end } = bounds(from, to);
  const res = await db.execute(sql`
    select i.service_name as name, count(*)::int as count, coalesce(sum(i.price_cents), 0)::int as cents
      from appointment_items i join appointments a on a.id = i.appointment_id
     where a.status = 'completed' and a.starts_at >= ${start.toISOString()}::timestamptz and a.starts_at < ${end.toISOString()}::timestamptz
     group by i.service_name order by count desc, cents desc limit ${limit}`);
  return res.rows as RankRow[];
}

export async function topEmployees(from: string, to: string, limit = 6): Promise<RankRow[]> {
  const { start, end } = bounds(from, to);
  const res = await db.execute(sql`
    select e.name as name, count(*)::int as count, coalesce(sum(a.total_cents - a.discount_cents), 0)::int as cents
      from appointments a join employees e on e.id = a.employee_id
     where a.status = 'completed' and a.starts_at >= ${start.toISOString()}::timestamptz and a.starts_at < ${end.toISOString()}::timestamptz
     group by e.name order by count desc, cents desc limit ${limit}`);
  return res.rows as RankRow[];
}

export async function topClients(from: string, to: string, limit = 6): Promise<RankRow[]> {
  const { start, end } = bounds(from, to);
  const res = await db.execute(sql`
    select c.name as name, count(*)::int as count, coalesce(sum(a.total_cents - a.discount_cents), 0)::int as cents
      from appointments a join clients c on c.id = a.client_id
     where a.status = 'completed' and a.starts_at >= ${start.toISOString()}::timestamptz and a.starts_at < ${end.toISOString()}::timestamptz
     group by c.id, c.name order by count desc, cents desc limit ${limit}`);
  return res.rows as RankRow[];
}

export type Birthday = { id: number; name: string; phone: string; day: string; inDays: number };

/** Aniversariantes dos próximos `days` dias (incluindo hoje), das clientes ativas. */
export async function upcomingBirthdays(today: string, days = 7): Promise<Birthday[]> {
  // 29/02 comemora em 28/02 nos anos que não são bissextos; os demais dias ficam como estão.
  const res = await db.execute(sql`
    with b as (
      select id, name, phone, birth_date,
             extract(month from birth_date)::int as m,
             case when extract(month from birth_date) = 2 and extract(day from birth_date) = 29 then 28 else extract(day from birth_date)::int end as d,
             extract(year from ${today}::date)::int as y
        from clients where active and birth_date is not null
    ), n as (
      select *, make_date(y, m, d) as this_year from b
    )
    select id, name, phone, to_char(birth_date, 'DD/MM') as day,
           (case when this_year >= ${today}::date then this_year else make_date(y + 1, m, d) end - ${today}::date)::int as "inDays"
      from n order by "inDays", name`);
  return (res.rows as Birthday[]).filter((x) => x.inDays < days);
}

export type CommissionRow = { name: string; percent: number; count: number; baseCents: number; commissionCents: number };

/**
 * Comissão por profissional nos atendimentos concluídos do período.
 * Base = valor cobrado nos itens, já com o desconto do atendimento distribuído proporcionalmente.
 */
export async function commissionByEmployee(from: string, to: string): Promise<CommissionRow[]> {
  const { start, end } = bounds(from, to);
  const res = await db.execute(sql`
    select e.name, e.commission_percent as percent, count(distinct a.id)::int as count,
           coalesce(round(sum(i.price_cents * (a.total_cents - a.discount_cents)::numeric / nullif(a.total_cents, 0))), 0)::int as "baseCents"
      from appointments a
      join employees e on e.id = a.employee_id
      join appointment_items i on i.appointment_id = a.id
     where a.status = 'completed' and a.starts_at >= ${start.toISOString()}::timestamptz and a.starts_at < ${end.toISOString()}::timestamptz
     group by e.id, e.name, e.commission_percent
     order by "baseCents" desc, e.name`);
  return (res.rows as Omit<CommissionRow, "commissionCents">[]).map((r) => ({ ...r, commissionCents: commissionOf(r.baseCents, r.percent) }));
}
