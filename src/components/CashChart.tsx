import { formatBRL } from "@/lib/money";
import { formatDateShort } from "@/lib/time";
import type { DayPoint } from "@/lib/cash";

const W = 720;
const H = 240;
const PAD = { l: 8, r: 8, t: 16, b: 28 };

/** Entradas e saídas por dia (barras) e saldo acumulado (linha). SVG puro, sem biblioteca. */
export default function CashChart({ series }: { series: DayPoint[] }) {
  const hasData = series.some((p) => p.income > 0 || p.expense > 0);
  if (series.length < 2 || !hasData) {
    return <div className="muted small">Sem movimentação para mostrar no gráfico neste período.</div>;
  }
  const max = Math.max(...series.map((p) => Math.max(p.income, p.expense)), 1);
  const bals = series.map((p) => p.balance);
  const bMin = Math.min(0, ...bals);
  const bMax = Math.max(0, ...bals);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const slot = innerW / series.length;
  const barW = Math.max(2, Math.min(18, slot * 0.36));
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  const yBal = (v: number) => PAD.t + innerH - ((v - bMin) / Math.max(bMax - bMin, 1)) * innerH;
  const cx = (i: number) => PAD.l + slot * i + slot / 2;
  const line = series.map((p, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${yBal(p.balance).toFixed(1)}`).join(" ");
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico do fluxo de caixa: entradas, saídas e saldo acumulado por dia" style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH} y2={PAD.t + innerH} stroke="var(--line)" />
        {series.map((p, i) => (
          <g key={p.date}>
            <title>{`${formatDateShort(p.date)} — Entradas ${formatBRL(p.income)} · Saídas ${formatBRL(p.expense)} · Saldo ${formatBRL(p.balance)}`}</title>
            <rect x={cx(i) - barW - 1} y={y(p.income)} width={barW} height={PAD.t + innerH - y(p.income)} rx={2} fill="var(--green)" />
            <rect x={cx(i) + 1} y={y(p.expense)} width={barW} height={PAD.t + innerH - y(p.expense)} rx={2} fill="var(--sand)" />
            {i % labelEvery === 0 ? (
              <text x={cx(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {p.date.slice(8)}/{p.date.slice(5, 7)}
              </text>
            ) : null}
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--green-dark)" strokeWidth={2} strokeLinejoin="round" />
        {series.length <= 31 ? series.map((p, i) => <circle key={p.date} cx={cx(i)} cy={yBal(p.balance)} r={2.5} fill="var(--green-dark)" />) : null}
      </svg>
      <figcaption className="row small muted" style={{ gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--green)", marginRight: 6 }} />Entradas</span>
        <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--sand)", marginRight: 6 }} />Saídas</span>
        <span><i style={{ display: "inline-block", width: 14, height: 2, background: "var(--green-dark)", marginRight: 6, verticalAlign: "middle" }} />Saldo acumulado</span>
      </figcaption>
    </figure>
  );
}
