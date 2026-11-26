"use server";

import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@db/index";
import { notifications } from "@db/schema";
import { requireUser } from "@/lib/auth";

export async function markAllRead() {
  await requireUser("agenda.edit");
  await db.update(notifications).set({ readAt: new Date() }).where(isNull(notifications.readAt));
  revalidatePath("/", "layout");
}

export async function markRead(id: number) {
  await requireUser("agenda.edit");
  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  revalidatePath("/", "layout");
}
