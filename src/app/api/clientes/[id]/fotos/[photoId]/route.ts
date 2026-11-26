import { and, eq } from "drizzle-orm";
import { db } from "@db/index";
import { clientPhotos } from "@db/schema";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Entrega a foto da cliente só a quem está logada e pode ver clientes. Nunca fica em cache compartilhado. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  if (!can(user.accessRole, "clients.view")) return new Response("Sem permissão", { status: 403 });
  const { id, photoId } = await ctx.params;
  const clientId = Number(id);
  const pid = Number(photoId);
  if (!Number.isInteger(clientId) || !Number.isInteger(pid)) return new Response("Não encontrada", { status: 404 });
  const [row] = await db.select().from(clientPhotos).where(and(eq(clientPhotos.id, pid), eq(clientPhotos.clientId, clientId)));
  if (!row) return new Response("Não encontrada", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
