import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enqueueBirthdays, processQueue } from "@/lib/messages/queue";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean | null {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return null; // não configurado
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : (req.nextUrl.searchParams.get("key") ?? "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Chamada por um agendador externo (a cada 5–15 min): cria aniversários do dia e envia o que está vencido. */
async function run(req: NextRequest) {
  const ok = authorized(req);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET não configurado (mínimo 16 caracteres)." }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const birthdays = await enqueueBirthdays();
  const report = await processQueue();
  return NextResponse.json({ birthdays, ...report });
}

export const GET = run;
export const POST = run;
