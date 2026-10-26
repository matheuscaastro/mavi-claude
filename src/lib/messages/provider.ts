import "server-only";
import { orderedVars, type MessageKind, type Vars } from "./templates";

export type SendInput = {
  /** Número completo com o 55, só dígitos. */
  to: string;
  body: string;
  kind: MessageKind;
  vars: Vars;
};

export type SendResult =
  | { ok: true; id: string }
  /** `permanent`: não adianta tentar de novo (número inválido, modelo rejeitado…). */
  | { ok: false; error: string; permanent: boolean };

export type Provider = {
  name: string;
  send(input: SendInput): Promise<SendResult>;
};

/** Não envia nada: só registra. Serve para testar tudo antes de ter conta no provedor. */
const logProvider: Provider = {
  name: "log",
  async send(input) {
    console.log(`[whatsapp:simulado] para ${input.to}: ${input.body.replace(/\n/g, " | ")}`);
    return { ok: true, id: `simulado-${Date.now()}` };
  },
};

/**
 * Twilio WhatsApp. Para falar com a cliente fora da janela de 24h, o WhatsApp exige modelo aprovado:
 * defina TWILIO_CONTENT_SID_CONFIRMATION / _REMINDER / _BIRTHDAY e as variáveis seguem a ordem de
 * TEMPLATE_VAR_ORDER. Sem o SID, o texto livre é enviado (só funciona no sandbox ou dentro da janela de 24h).
 */
function twilioProvider(): Provider {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const from = (process.env.TWILIO_WHATSAPP_FROM ?? "").replace(/^whatsapp:/, "").replace(/\s/g, "");
  const contentSids: Record<MessageKind, string | undefined> = {
    confirmation: process.env.TWILIO_CONTENT_SID_CONFIRMATION,
    reminder: process.env.TWILIO_CONTENT_SID_REMINDER,
    birthday: process.env.TWILIO_CONTENT_SID_BIRTHDAY,
  };
  return {
    name: "twilio",
    async send(input) {
      if (!sid || !token || !from) return { ok: false, error: "Twilio não configurado (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM).", permanent: true };
      const form = new URLSearchParams();
      form.set("To", `whatsapp:+${input.to}`);
      form.set("From", `whatsapp:${from.startsWith("+") ? from : `+${from}`}`);
      const contentSid = contentSids[input.kind];
      if (contentSid) {
        form.set("ContentSid", contentSid);
        const vars = Object.fromEntries(orderedVars(input.kind, input.vars).map((v, i) => [String(i + 1), v || "-"]));
        form.set("ContentVariables", JSON.stringify(vars));
      } else {
        form.set("Body", input.body);
      }
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
          signal: AbortSignal.timeout(15_000),
        });
        const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
        if (res.ok && data.sid) return { ok: true, id: data.sid };
        const retryable = res.status === 429 || res.status >= 500;
        return { ok: false, error: `Twilio ${res.status}${data.code ? ` (${data.code})` : ""}: ${data.message ?? "erro"}`, permanent: !retryable };
      } catch (e) {
        return { ok: false, error: `Falha de rede: ${e instanceof Error ? e.message : String(e)}`, permanent: false };
      }
    },
  };
}

export function getProvider(): Provider {
  return (process.env.WHATSAPP_PROVIDER ?? "log").toLowerCase() === "twilio" ? twilioProvider() : logProvider;
}

export function providerStatus(): { name: string; ready: boolean; note: string } {
  const name = (process.env.WHATSAPP_PROVIDER ?? "log").toLowerCase();
  if (name !== "twilio") return { name: "log", ready: true, note: "Modo simulado: as mensagens são registradas, mas não saem pelo WhatsApp." };
  const missing = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"].filter((k) => !process.env[k]);
  if (missing.length) return { name, ready: false, note: `Twilio incompleto: faltam ${missing.join(", ")}.` };
  return { name, ready: true, note: "Twilio configurado." };
}
