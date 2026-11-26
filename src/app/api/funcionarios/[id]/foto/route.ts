import { eq } from "drizzle-orm";
import { db } from "@db/index";
import { employeePhotos } from "@db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Entrega a foto da funcionária a quem está logado. A URL leva ?v=<data da troca>, então o navegador guarda em cache. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Não encontrada", { status: 404 });
  const [row] = await db.select().from(employeePhotos).where(eq(employeePhotos.employeeId, id));
  if (!row) return new Response("Não encontrada", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
