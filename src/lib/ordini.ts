import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, type Esecutore } from "@/db";
import { incaricati, ordini, prodotti, righeOrdine, storicoStatiOrdine, utenti } from "@/db/schema";
import { calcolaOrdine, ErroreOrdine, type Articolo, type TipoOrdineCalcolabile } from "./calcolo-ordine";
import { parametriCorrenti, promozioniDiOggi } from "./catalogo";

/** Funzioni sugli ordini usate dal server. I controlli di accesso li fanno le azioni e le pagine che le chiamano. */

export type StatoOrdine = (typeof ordini.$inferSelect)["stato"];

export const ETICHETTE_STATO: Record<StatoOrdine, string> = {
  inserito: "In attesa di pagamento",
  pagato: "Pagato",
  in_preparazione: "In preparazione",
  spedito: "Spedito",
  consegnato: "Consegnato",
  annullato: "Annullato",
  reso: "Reso",
};

/** Ore entro cui un ordine inserito va pagato: dopo si annulla (i prezzi potrebbero essere cambiati). */
export const ORE_PER_PAGARE = 24;

export type Spedizione = {
  destinatario: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  telefono: string;
};

/** Indirizzo del profilo, proposto come indirizzo di spedizione. */
export async function indirizzoDelProfilo(incaricatoId: string): Promise<Spedizione> {
  const [i] = await db()
    .select({
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      indirizzo: incaricati.indirizzo,
      cap: incaricati.cap,
      citta: incaricati.citta,
      provincia: incaricati.provincia,
      telefono: incaricati.telefono,
    })
    .from(incaricati)
    .where(eq(incaricati.id, incaricatoId));
  return { destinatario: `${i.nome} ${i.cognome}`, ...i };
}

/**
 * Riordino responsabile: dal secondo acquisto personale l'incaricata conferma di aver venduto o consumato
 * almeno il 70% dell'acquisto precedente (lo start kit non conta).
 */
export async function serveConfermaRiordino(incaricatoId: string): Promise<boolean> {
  const [riga] = await db()
    .select({ id: ordini.id })
    .from(ordini)
    .where(and(eq(ordini.incaricatoId, incaricatoId), eq(ordini.tipo, "personale"), isNotNull(ordini.pagatoIl)))
    .limit(1);
  return Boolean(riga);
}

async function inserisciOrdine(
  tx: Esecutore,
  dati: {
    incaricatoId: string;
    tipo: TipoOrdineCalcolabile;
    articoli: Articolo[];
    spedizione: Spedizione;
    riordinoConfermato: boolean;
  },
) {
  const parametri = await parametriCorrenti();
  const calcolo = calcolaOrdine(dati.articoli, dati.tipo, parametri);
  const [nuovo] = await tx
    .insert(ordini)
    .values({
      incaricatoId: dati.incaricatoId,
      tipo: dati.tipo,
      parametriVersioneId: parametri.versioneId,
      merceIvaInclusa: calcolo.merceIvaInclusa,
      merceIvaEsclusa: calcolo.merceIvaEsclusa,
      punti: calcolo.punti,
      provvigioneAcquisto: calcolo.provvigioneAcquisto,
      speseSpedizione: calcolo.speseSpedizione,
      totale: calcolo.totale,
      ...dati.spedizione,
      riordinoConfermatoIl: dati.riordinoConfermato ? new Date() : null,
    })
    .returning({ id: ordini.id });
  await tx.insert(righeOrdine).values(calcolo.righe.map((r) => ({ ...r, ordineId: nuovo.id })));
  await tx.insert(storicoStatiOrdine).values({ ordineId: nuovo.id, stato: "inserito" });
  return nuovo.id;
}

/** Crea un acquisto personale. Prezzi, promozioni e parametri sono quelli di oggi, letti dal database. */
export async function creaOrdinePersonale(dati: {
  incaricatoId: string;
  richiesti: { prodottoId: string; quantita: number }[];
  spedizione: Spedizione;
  riordinoConfermato: boolean;
}): Promise<string> {
  if (dati.richiesti.length === 0) throw new ErroreOrdine("Scegli almeno un prodotto.");
  if ((await serveConfermaRiordino(dati.incaricatoId)) && !dati.riordinoConfermato) {
    throw new ErroreOrdine("Conferma di aver venduto o consumato almeno il 70% del tuo acquisto precedente.");
  }
  const ids = dati.richiesti.map((r) => r.prodottoId);
  const [trovati, promo] = await Promise.all([
    db()
      .select()
      .from(prodotti)
      .where(and(inArray(prodotti.id, ids), eq(prodotti.attivo, true), eq(prodotti.tipo, "prodotto"))),
    promozioniDiOggi(),
  ]);
  const articoli: Articolo[] = dati.richiesti.map((r) => {
    const prodotto = trovati.find((p) => p.id === r.prodottoId);
    if (!prodotto) throw new ErroreOrdine("Un prodotto scelto non è più disponibile: ricarica la pagina.");
    const promozione = promo.get(prodotto.id);
    return { prodotto, quantita: r.quantita, promozione: promozione && { id: promozione.id, prezzoPromo: promozione.prezzoPromo } };
  });
  return db().transaction((tx) =>
    inserisciOrdine(tx, { ...dati, tipo: "personale", articoli }),
  );
}

/** Ordine dello start kit: riusa quello in attesa di pagamento, se c'è, altrimenti lo crea. */
export async function ordineStartKit(incaricatoId: string, spedizione: Spedizione): Promise<string> {
  const [inAttesa] = await db()
    .select({ id: ordini.id, creatoIl: ordini.creatoIl })
    .from(ordini)
    .where(
      and(
        eq(ordini.incaricatoId, incaricatoId),
        eq(ordini.tipo, "start_kit"),
        eq(ordini.stato, "inserito"),
        sql`${ordini.creatoIl} > now() - make_interval(hours => ${ORE_PER_PAGARE})`,
      ),
    )
    .orderBy(desc(ordini.creatoIl))
    .limit(1);
  if (inAttesa) return inAttesa.id;

  const [kit] = await db()
    .select()
    .from(prodotti)
    .where(and(eq(prodotti.tipo, "start_kit"), eq(prodotti.attivo, true)))
    .limit(1);
  if (!kit) throw new ErroreOrdine("Lo start kit non è disponibile in questo momento: contatta l'azienda.");
  return db().transaction((tx) =>
    inserisciOrdine(tx, { incaricatoId, tipo: "start_kit", articoli: [{ prodotto: kit, quantita: 1 }], spedizione, riordinoConfermato: false }),
  );
}

/** Ordine con righe e storico. Con incaricatoId restituisce solo un ordine di quell'incaricata. */
export async function leggiOrdine(id: string, incaricatoId?: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const [ordine] = await db()
    .select()
    .from(ordini)
    .where(incaricatoId ? and(eq(ordini.id, id), eq(ordini.incaricatoId, incaricatoId)) : eq(ordini.id, id))
    .limit(1);
  if (!ordine) return undefined;
  const [righe, storico] = await Promise.all([
    db().select().from(righeOrdine).where(eq(righeOrdine.ordineId, id)).orderBy(asc(righeOrdine.id)),
    db()
      .select({ stato: storicoStatiOrdine.stato, nota: storicoStatiOrdine.nota, creatoIl: storicoStatiOrdine.creatoIl, da: utenti.nome })
      .from(storicoStatiOrdine)
      .leftJoin(utenti, eq(utenti.id, storicoStatiOrdine.utenteId))
      .where(eq(storicoStatiOrdine.ordineId, id))
      .orderBy(asc(storicoStatiOrdine.id)),
  ]);
  const scaduto =
    ordine.stato === "inserito" && Date.now() - ordine.creatoIl.getTime() > ORE_PER_PAGARE * 3_600_000;
  return { ordine, righe, storico, scaduto };
}

export async function ordiniDellIncaricata(incaricatoId: string) {
  return db()
    .select({
      id: ordini.id,
      numero: ordini.numero,
      tipo: ordini.tipo,
      stato: ordini.stato,
      totale: ordini.totale,
      punti: ordini.punti,
      creatoIl: ordini.creatoIl,
    })
    .from(ordini)
    .where(eq(ordini.incaricatoId, incaricatoId))
    .orderBy(desc(ordini.creatoIl))
    .limit(100);
}

/** Cambia stato registrando lo storico. Da usare dentro una transazione. */
export async function registraStato(
  tx: Esecutore,
  ordineId: string,
  stato: StatoOrdine,
  opzioni: { utenteId?: string | null; nota?: string } = {},
) {
  await tx.update(ordini).set({ stato }).where(eq(ordini.id, ordineId));
  await tx.insert(storicoStatiOrdine).values({ ordineId, stato, utenteId: opzioni.utenteId ?? null, nota: opzioni.nota });
}

export function numeroOrdine(numero: bigint): string {
  return `n. ${numero.toString().padStart(5, "0")}`;
}

export function dataOra(d: Date): string {
  return d.toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Elenco per lo staff, filtrabile per stato. */
export async function elencoOrdiniStaff(stato?: StatoOrdine) {
  return db()
    .select({
      id: ordini.id,
      numero: ordini.numero,
      tipo: ordini.tipo,
      stato: ordini.stato,
      totale: ordini.totale,
      creatoIl: ordini.creatoIl,
      pagatoIl: ordini.pagatoIl,
      codice: incaricati.codice,
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      citta: ordini.citta,
    })
    .from(ordini)
    .innerJoin(incaricati, eq(incaricati.id, ordini.incaricatoId))
    .where(stato ? eq(ordini.stato, stato) : undefined)
    .orderBy(desc(ordini.creatoIl))
    .limit(200);
}

/** Quanti ordini ci sono in ogni stato (per i filtri e il riepilogo dello staff). */
export async function contaOrdiniPerStato(): Promise<Partial<Record<StatoOrdine, number>>> {
  const righe = await db()
    .select({ stato: ordini.stato, n: sql<number>`count(*)::int` })
    .from(ordini)
    .groupBy(ordini.stato);
  return Object.fromEntries(righe.map((r) => [r.stato, r.n]));
}

/** Incaricata di un ordine, per la scheda dello staff. */
export async function incaricataDellOrdine(incaricatoId: string) {
  const [i] = await db()
    .select({ id: incaricati.id, codice: incaricati.codice, nome: incaricati.nome, cognome: incaricati.cognome, email: utenti.email })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .where(eq(incaricati.id, incaricatoId));
  return i;
}
