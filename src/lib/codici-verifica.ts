import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { codiciVerifica } from "@/db/schema";
import { generaCodiceSeiCifre, generaToken, impronta, improntaUguale } from "./sicurezza";

type Scopo = "accesso_staff" | "recupero_password";

const DURATA_MINUTI: Record<Scopo, number> = { accesso_staff: 10, recupero_password: 60 };
const TENTATIVI_MASSIMI = 5;

/** Crea un codice monouso e invalida quelli precedenti dello stesso tipo. Restituisce il codice in chiaro (da inviare via email). */
export async function creaCodice(utenteId: string, scopo: Scopo): Promise<string> {
  const valore = scopo === "accesso_staff" ? generaCodiceSeiCifre() : generaToken();
  const scadeIl = new Date(Date.now() + DURATA_MINUTI[scopo] * 60_000);
  await db().transaction(async (tx) => {
    await tx
      .update(codiciVerifica)
      .set({ usatoIl: new Date() })
      .where(and(eq(codiciVerifica.utenteId, utenteId), eq(codiciVerifica.scopo, scopo), isNull(codiciVerifica.usatoIl)));
    await tx.insert(codiciVerifica).values({ utenteId, scopo, impronta: impronta(valore), scadeIl });
  });
  return valore;
}

/** Codice di 6 cifre dello staff: massimo 5 tentativi, poi serve un codice nuovo. */
export async function verificaCodiceStaff(utenteId: string, codice: string): Promise<boolean> {
  const [riga] = await db()
    .select()
    .from(codiciVerifica)
    .where(
      and(
        eq(codiciVerifica.utenteId, utenteId),
        eq(codiciVerifica.scopo, "accesso_staff"),
        isNull(codiciVerifica.usatoIl),
        gt(codiciVerifica.scadeIl, new Date()),
      ),
    )
    .orderBy(desc(codiciVerifica.creatoIl))
    .limit(1);
  if (!riga || riga.tentativi >= TENTATIVI_MASSIMI) return false;

  if (!improntaUguale(riga.impronta, impronta(codice.trim()))) {
    await db()
      .update(codiciVerifica)
      .set({ tentativi: sql`${codiciVerifica.tentativi} + 1` })
      .where(eq(codiciVerifica.id, riga.id));
    return false;
  }
  await db().update(codiciVerifica).set({ usatoIl: new Date() }).where(eq(codiciVerifica.id, riga.id));
  return true;
}

/** Link di recupero password: se valido lo consuma e restituisce l'utente a cui appartiene. */
export async function consumaTokenRecupero(token: string): Promise<string | undefined> {
  const [riga] = await db()
    .update(codiciVerifica)
    .set({ usatoIl: new Date() })
    .where(
      and(
        eq(codiciVerifica.impronta, impronta(token)),
        eq(codiciVerifica.scopo, "recupero_password"),
        isNull(codiciVerifica.usatoIl),
        gt(codiciVerifica.scadeIl, new Date()),
      ),
    )
    .returning({ utenteId: codiciVerifica.utenteId });
  return riga?.utenteId;
}

/** Controlla un link di recupero senza consumarlo (per mostrare o no il modulo). */
export async function tokenRecuperoValido(token: string): Promise<boolean> {
  const [riga] = await db()
    .select({ id: codiciVerifica.id })
    .from(codiciVerifica)
    .where(
      and(
        eq(codiciVerifica.impronta, impronta(token)),
        eq(codiciVerifica.scopo, "recupero_password"),
        isNull(codiciVerifica.usatoIl),
        gt(codiciVerifica.scadeIl, sql`now()`),
      ),
    )
    .limit(1);
  return Boolean(riga);
}
