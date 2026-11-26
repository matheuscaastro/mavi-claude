"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@db/index";
import { clientPhotos, clients } from "@db/schema";
import { requireUser } from "@/lib/auth";
import { ClientPhotoError, processClientPhoto } from "@/lib/client-photo";
import { isValidDate } from "@/lib/time";

export type PhotoState = { error?: string; ok?: boolean };

const schema = z.object({
  kind: z.enum(["before", "after"], { message: "Escolha se é foto de antes ou de depois." }),
  takenOn: z.string().refine(isValidDate, "Data inválida."),
  note: z.string().trim().max(120, "A descrição pode ter no máximo 120 letras."),
});

/** Envia uma foto de antes ou depois para a ficha. Só quem registra dados clínicos (administradora e profissionais). */
export async function addClientPhoto(clientId: number, _p: PhotoState, formData: FormData): Promise<PhotoState> {
  const user = await requireUser("clients.edit");
  if (formData.get("consent") !== "on") return { error: "Confirme que a cliente autorizou o registro da foto." };
  const parsed = schema.safeParse({ kind: formData.get("kind"), takenOn: formData.get("takenOn"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha a foto." };
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId));
  if (!client) return { error: "Cliente não encontrada." };
  let photo;
  try {
    photo = await processClientPhoto(file);
  } catch (e) {
    if (e instanceof ClientPhotoError) return { error: e.message };
    throw e;
  }
  await db.insert(clientPhotos).values({ clientId, ...parsed.data, data: photo.data, contentType: photo.contentType, createdBy: user.id });
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

export async function deleteClientPhoto(clientId: number, photoId: number) {
  await requireUser("clients.edit");
  await db.delete(clientPhotos).where(and(eq(clientPhotos.id, photoId), eq(clientPhotos.clientId, clientId)));
  revalidatePath(`/clientes/${clientId}`);
}
