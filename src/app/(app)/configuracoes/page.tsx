import { headers } from "next/headers";
import QRCode from "qrcode";
import { asc, gte } from "drizzle-orm";
import { db } from "@db/index";
import { salonExceptions, salonHours } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/agenda";
import { formatDateShort, todayLocal } from "@/lib/time";
import { ExceptionForm, HoursForm, MessagingForm, RulesForm } from "./Forms";
import { removeException } from "./actions";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser("settings.manage");
  const [hours, settings, exceptions] = await Promise.all([
    db.select().from(salonHours).orderBy(asc(salonHours.weekday)),
    getSettings(),
    db.select().from(salonExceptions).where(gte(salonExceptions.date, todayLocal())).orderBy(asc(salonExceptions.date)),
  ]);
  // Endereço público do agendamento: APP_URL se estiver definida; senão, o endereço pelo qual a página foi aberta.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = (process.env.APP_URL || `${proto}://${host}`).replace(/\/+$/, "");
  const bookingUrl = `${base}/agendar`;
  const qrSvg = await QRCode.toString(bookingUrl, { type: "svg", margin: 1, width: 220, color: { dark: "#2B1A17", light: "#FFFFFF" } });
  const qrDownload = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
  return (
    <>
      <h1 className="page-title" data-eyebrow="Sistema" style={{ marginBottom: 16 }}>
        Configurações
      </h1>
      <div className="split">
        <div className="stack grow-3">
          <div className="card">
            <div className="section-title">Horário de funcionamento do salão</div>
            <p className="muted small">É também o expediente das profissionais, salvo jornada própria.</p>
            <HoursForm hours={hours} />
          </div>
          <div className="card">
            <div className="section-title">Regras de agendamento</div>
            <RulesForm settings={settings} />
          </div>
          <div className="card">
            <div className="section-title">Mensagens de WhatsApp</div>
            <MessagingForm settings={settings} />
          </div>
        </div>
        <div className="stack grow-2">
          <div className="card">
            <div className="section-title">Link e QR code de agendamento online</div>
            <p className="muted small">Imprima o QR code e cole no salão: a cliente aponta a câmera e já agenda.</p>
            <div role="img" aria-label="QR code do link de agendamento online" style={{ width: 220, maxWidth: "100%" }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="small" style={{ margin: "10px 0", wordBreak: "break-all" }}>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">{bookingUrl}</a>
            </div>
            <a className="btn secondary" href={qrDownload} download="qr-agendamento-instituto-andrea-carvalho.svg">
              Baixar QR code
            </a>
          </div>
          <div className="card">
            <div className="section-title">Feriados e exceções</div>
            <ExceptionForm />
          </div>
          <div className="card">
            <div className="section-title">Próximas exceções</div>
            {exceptions.length === 0 ? <div className="muted small">Nenhuma cadastrada.</div> : null}
            <div className="stack">
              {exceptions.map((x) => (
                <form key={x.date} action={removeException.bind(null, x.date)} className="row spread" style={{ alignItems: "center" }}>
                  <span className="small">
                    <strong>{formatDateShort(x.date)}</strong> · {x.label || "Exceção"} ·{" "}
                    {x.closed ? "Fechado" : `${x.openTime}–${x.closeTime}`}
                  </span>
                  <button className="btn secondary" type="submit">
                    Remover
                  </button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
