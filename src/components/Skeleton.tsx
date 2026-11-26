/**
 * Esqueleto de carregamento: aparece na hora, enquanto o servidor monta a tela.
 * As alturas seguem o conteúdo final (título, barra de filtros, cartões e linhas) para nada pular quando os dados chegam.
 */
type Variant = "cards" | "table" | "agenda" | "detail";

function Bar({ w, h = 16, r = 8 }: { w: number | string; h?: number; r?: number }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, display: "block" }} />;
}

function Cards({ n, h }: { n: number; h: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 20 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card" style={{ height: h, boxShadow: "none" }}>
          <div className="stack">
            <Bar w="55%" h={22} />
            <Bar w="85%" />
            <Bar w="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PageSkeleton({ variant = "cards" }: { variant?: Variant }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <span className="sr-only">Carregando…</span>
      <div className="topbar">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Bar w={90} h={12} />
          <Bar w={240} h={40} r={10} />
        </div>
        <Bar w={150} h={44} r={22} />
      </div>

      {variant === "table" ? (
        <>
          <div className="row">
            <Bar w={340} h={44} r={12} />
            <Bar w={90} h={44} r={22} />
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden", boxShadow: "none" }}>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, height: 60, padding: "0 20px", borderBottom: "1px solid var(--line, #ebf0ee)" }}>
                <Bar w="28%" />
                <Bar w="18%" />
                <Bar w="22%" />
                <Bar w="12%" />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {variant === "agenda" ? (
        <>
          <div className="row">
            <Bar w={120} h={44} r={22} />
            <Bar w={200} h={44} r={12} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card" style={{ height: 520, boxShadow: "none" }}>
                <div className="row">
                  <Bar w={36} h={36} r={18} />
                  <Bar w="50%" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {variant === "detail" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 20 }}>
          <div className="card" style={{ height: 360, boxShadow: "none" }}>
            <div className="stack">
              <Bar w="45%" h={24} />
              <Bar w="80%" />
              <Bar w="65%" />
              <Bar w="75%" />
            </div>
          </div>
          <div className="card" style={{ height: 360, boxShadow: "none" }}>
            <div className="stack">
              <Bar w="40%" h={24} />
              <Bar w="90%" />
              <Bar w="60%" />
            </div>
          </div>
        </div>
      ) : null}

      {variant === "cards" ? <Cards n={6} h={200} /> : null}
    </div>
  );
}
