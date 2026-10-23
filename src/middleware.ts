import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

/** Caminhos que qualquer pessoa pode abrir sem login. A página pública de agendamento entra aqui depois. */
const PUBLIC_PREFIXES = ["/login", "/agendar", "/api/public"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, menos arquivos estáticos do Next e a logo.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg).*)"],
};
