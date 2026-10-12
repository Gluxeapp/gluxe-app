import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessioni, utenti } from "@/db/schema";
import { generaToken, impronta } from "./sicurezza";

const COOKIE = "gluxe_sessione";

export const DURATA_INCARICATO_ORE = 24 * 30;
export const DURATA_STAFF_ORE = 8;

/** Crea una sessione e mette il suo codice in un cookie che il browser non può leggere via JavaScript. */
export async function creaSessione(utenteId: string, opzioni: { verificata: boolean; durataOre: number }) {
  const token = generaToken();
  const scadeIl = new Date(Date.now() + opzioni.durataOre * 3_600_000);
  await db().insert(sessioni).values({ impronta: impronta(token), utenteId, verificata: opzioni.verificata, scadeIl });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: scadeIl,
  });
}

/** Legge la sessione del browser corrente; undefined se manca, è scaduta o l'utente è disattivato. */
export async function leggiSessione() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return undefined;
  const [riga] = await db()
    .select({
      impronta: sessioni.impronta,
      verificata: sessioni.verificata,
      utenteId: utenti.id,
      ruolo: utenti.ruolo,
      nome: utenti.nome,
      email: utenti.email,
    })
    .from(sessioni)
    .innerJoin(utenti, eq(utenti.id, sessioni.utenteId))
    .where(and(eq(sessioni.impronta, impronta(token)), gt(sessioni.scadeIl, sql`now()`), eq(utenti.attivo, true)))
    .limit(1);
  return riga;
}

/** Chiude la sessione corrente (esci). */
export async function chiudiSessione() {
  const archivio = await cookies();
  const token = archivio.get(COOKIE)?.value;
  if (token) await db().delete(sessioni).where(eq(sessioni.impronta, impronta(token)));
  archivio.delete(COOKIE);
}

/** Chiude tutte le sessioni di un utente (per esempio dopo un cambio password). */
export async function chiudiTutteLeSessioni(utenteId: string) {
  await db().delete(sessioni).where(eq(sessioni.utenteId, utenteId));
}
