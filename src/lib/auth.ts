import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@db/index";
import type { AccessRole, Employee } from "@db/schema";
import { can, type Permission } from "./permissions";
import { SESSION_COOKIE, signSession, verifySession } from "./session-token";

const SHORT_SESSION = 60 * 60 * 12; // 12 horas
const LONG_SESSION = 60 * 60 * 24 * 30; // 30 dias ("manter conectada")

/** Hash fixo para gastar o mesmo tempo quando o e-mail não existe. */
const DUMMY_HASH = "$2b$10$BUjUhlmRXyHHdaSheRX78eRdqB2KJDEkBsMltofgHBrJIKGdEEUvC";

// Limite simples de tentativas por e-mail. Vale para uma instância só;
// com várias instâncias, troque por um contador no banco ou no Redis.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(email: string, password: string, remember: boolean): Promise<LoginResult> {
  const key = email.trim().toLowerCase();
  if (tooManyAttempts(key)) {
    return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.email, key)).limit(1);
  const valid = await bcrypt.compare(password, employee?.passwordHash ?? DUMMY_HASH);
  if (!employee || !valid || !employee.active) {
    registerFailure(key);
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  attempts.delete(key);
  const maxAge = remember ? LONG_SESSION : SHORT_SESSION;
  const token = await signSession({ sub: employee.id, role: employee.accessRole, name: employee.name }, maxAge);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Funcionária logada (confere no banco se ainda está ativa), ou null. */
export async function getCurrentUser(): Promise<Employee | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.id, session.sub)).limit(1);
  if (!employee || !employee.active) return null;
  return employee;
}

/** Exige login e, opcionalmente, uma permissão. Sem login vai para /login; sem permissão para a agenda. */
export async function requireUser(permission?: Permission): Promise<Employee> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (permission && !can(user.accessRole, permission)) redirect("/agenda?erro=sem-permissao");
  return user;
}

export function isRole(user: Pick<Employee, "accessRole">, ...roles: AccessRole[]): boolean {
  return roles.includes(user.accessRole);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
