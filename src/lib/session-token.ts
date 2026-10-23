import { jwtVerify, SignJWT } from "jose";
import type { AccessRole } from "@db/schema";

/** Nome do cookie de sessão. */
export const SESSION_COOKIE = "mavi_session";

export type SessionPayload = {
  /** id da funcionária */
  sub: number;
  role: AccessRole;
  name: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres (veja .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, maxAgeSeconds: number): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secretKey());
}

/** Devolve a sessão se o token for válido e não tiver expirado; senão null. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const sub = Number(payload.sub);
    const role = payload.role as AccessRole;
    if (!Number.isInteger(sub) || !["admin", "reception", "professional"].includes(role)) return null;
    return { sub, role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
