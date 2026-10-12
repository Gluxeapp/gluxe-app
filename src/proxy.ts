import { NextResponse, type NextRequest } from "next/server";

/**
 * Primo filtro veloce: senza cookie di sessione non si entra nelle aree riservate.
 * È solo un controllo "ottimistico": la verifica vera (sessione valida, ruolo, codice staff)
 * la fanno sempre le pagine e le azioni sul server.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("gluxe_sessione")) return NextResponse.next();
  const percorso = request.nextUrl.pathname;
  const destinazione = percorso.startsWith("/staff") ? "/staff/accesso" : "/";
  return NextResponse.redirect(new URL(destinazione, request.url));
}

export const config = {
  matcher: ["/area/:path*", "/staff", "/staff/((?!accesso).*)"],
};
