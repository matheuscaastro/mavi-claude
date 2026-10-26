import { desc, eq } from "drizzle-orm";
import { db } from "@db/index";
import { clients, messages } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/agenda";
import { KIND_LABEL } from "@/lib/messages/templates";
import { providerStatus } from "@/lib/messages/provider";
import { formatPhone } from "@/lib/phone";
import { localDate, localTime, formatDateShort } from "@/lib/time";
import RunButton from "./RunButton";

export const metadata = { title: "Mensagens" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = { pending: "Na fila", sent: "Enviada", failed: "Falhou", skipped: "Descartada" } as const;

function when(d: Date) {
  return `${formatDateShort(localDate(d))} ${localTime(d)}`;
}

export default async function MessagesPage() {
  await requireUser("settings.manage");
  const [settings, rows] = await Promise.all([
    getSettings(),
    db
      .select({ m: messages, clientName: clients.name })
      .from(messages)
      .innerJoin(clients, eq(clients.id, messages.clientId))
      .orderBy(desc(messages.createdAt))
      .limit(100),
  ]);
  const provider = providerStatus();
  const cronReady = (process.env.CRON_SECRET ?? "").length >= 16;

  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 16 }}>
        Mensagens
      </h1>
      <div className="stack">
        <div className="card stack">
          <div className="row spread" style={{ alignItems: "center" }}>
            <div>
              <strong>{settings.whatsappEnabled ? "WhatsApp ligado" : "WhatsApp desligado"}</strong>
              <div className="muted small">{provider.note}</div>
              <div className="muted small">
                {cronReady ? "Agendador automático configurado (CRON_SECRET)." : "Sem agendador automático: lembretes e aniversários só saem ao clicar em “Processar fila agora”."}
              </div>
              {!settings.whatsappEnabled ? <div className="muted small">Ligue em Configurações → Mensagens de WhatsApp.</div> : null}
            </div>
            <RunButton />
          </div>
        </div>

        <div className="section-title" style={{ marginBottom: 0 }}>
          Últimas mensagens
        </div>
        <div className="card" style={{ padding: rows.length ? 0 : undefined, overflowX: "auto" }}>
          {rows.length === 0 ? <div className="muted small">Nenhuma mensagem ainda.</div> : null}
          {rows.length ? (
            <div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Situação</th>
                    <th>Texto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ m, clientName }) => (
                    <tr key={m.id}>
                      <td>{when(m.status === "sent" && m.sentAt ? m.sentAt : m.scheduledFor)}</td>
                      <td>{KIND_LABEL[m.kind]}</td>
                      <td>{clientName}</td>
                      <td>{formatPhone(m.toPhone.replace(/^55/, ""))}</td>
                      <td title={m.error || undefined}>
                        {STATUS_LABEL[m.status]}
                        {m.error ? <div className="muted small">{m.error}</div> : null}
                      </td>
                      <td className="small" style={{ whiteSpace: "pre-wrap", maxWidth: 360 }}>
                        {m.body}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
