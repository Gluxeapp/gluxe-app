import "server-only";
import { and, asc, desc, eq, lte, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { parametriVersioni, prodotti, promozioni } from "@/db/schema";
import { richiediIncaricato, richiediStaff } from "./accesso";
import { parametriDaJson, type Parametri } from "./parametri";
import { prezziProdotto, prezziPromozione, prezziStartKit } from "./prezzi";

/** Data di oggi in Italia, calcolata dal database (vale per promozioni e parametri). */
const OGGI = sql`(now() at time zone 'Europe/Rome')::date`;

/** Parametri del piano validi oggi: l'ultima versione con data di efficacia non futura. */
export async function parametriCorrenti(): Promise<Parametri & { versioneId: bigint; validoDal: string }> {
  const [riga] = await db()
    .select()
    .from(parametriVersioni)
    .where(lte(parametriVersioni.validoDal, OGGI))
    .orderBy(desc(parametriVersioni.validoDal), desc(parametriVersioni.id))
    .limit(1);
  if (!riga) throw new Error("Parametri del piano mancanti: lanciare npm run db:seme-catalogo");
  return { ...parametriDaJson(riga.valori), versioneId: riga.id, validoDal: riga.validoDal };
}

export async function storicoParametri() {
  await richiediStaff(["amministrazione"]);
  return db()
    .select({ id: parametriVersioni.id, validoDal: parametriVersioni.validoDal, note: parametriVersioni.note, creatoIl: parametriVersioni.creatoIl })
    .from(parametriVersioni)
    .orderBy(desc(parametriVersioni.validoDal), desc(parametriVersioni.id));
}

/** Promozione valida oggi per ogni prodotto (se ce n'è più di una vince il prezzo più basso). */
async function promozioniDiOggi() {
  const righe = await db()
    .select()
    .from(promozioni)
    .where(and(eq(promozioni.attiva, true), lte(promozioni.dal, OGGI), gte(promozioni.al, OGGI)))
    .orderBy(asc(promozioni.prezzoPromo));
  const perProdotto = new Map<string, (typeof righe)[number]>();
  for (const r of righe) if (!perProdotto.has(r.prodottoId)) perProdotto.set(r.prodottoId, r);
  return perProdotto;
}

/** Catalogo per le incaricate: prodotti attivi (start kit escluso) con prezzi, punti e promozioni di oggi. */
export async function catalogoIncaricata() {
  await richiediIncaricato();
  const [p, righe, promo] = await Promise.all([
    parametriCorrenti(),
    db()
      .select()
      .from(prodotti)
      .where(and(eq(prodotti.attivo, true), ne(prodotti.tipo, "start_kit")))
      .orderBy(asc(prodotti.ordine), asc(prodotti.nome)),
    promozioniDiOggi(),
  ]);
  return righe.map((prodotto) => {
    const promozione = promo.get(prodotto.id);
    return {
      prodotto,
      listino: prezziProdotto(prodotto.prezzoListino, p),
      promozione: promozione ? { ...promozione, prezzi: prezziPromozione(promozione.prezzoPromo, p) } : undefined,
    };
  });
}

/** Catalogo completo per l'amministrazione, start kit e prodotti disattivati compresi. */
export async function catalogoStaff() {
  await richiediStaff(["amministrazione"]);
  const [p, righe, promo] = await Promise.all([
    parametriCorrenti(),
    db().select().from(prodotti).orderBy(asc(prodotti.ordine), asc(prodotti.nome)),
    promozioniDiOggi(),
  ]);
  return righe.map((prodotto) => ({
    prodotto,
    prezzi: prodotto.tipo === "start_kit" ? undefined : prezziProdotto(prodotto.prezzoListino, p),
    kit: prodotto.tipo === "start_kit" ? prezziStartKit(prodotto.prezzoListino, p) : undefined,
    promozione: promo.get(prodotto.id),
  }));
}

export async function elencoPromozioni() {
  await richiediStaff(["amministrazione"]);
  return db()
    .select({
      promozione: promozioni,
      prodotto: prodotti.nome,
      inCorso: sql<boolean>`${promozioni.attiva} and ${promozioni.dal} <= ${OGGI} and ${promozioni.al} >= ${OGGI}`,
    })
    .from(promozioni)
    .innerJoin(prodotti, eq(prodotti.id, promozioni.prodottoId))
    .orderBy(desc(promozioni.al));
}
