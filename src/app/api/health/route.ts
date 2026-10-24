import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@db/index";

export const dynamic = "force-dynamic";

/** Usado pela hospedagem para saber se o sistema e o banco estão de pé. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
