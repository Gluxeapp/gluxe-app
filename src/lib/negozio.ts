import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { clienti, incaricati, ordini, prodotti, righeOrdine, storicoLegamiClienti, storicoStatiOrdine } from "@/db/schema";
import { ErroreOrdine, type Articolo } from "./calcolo-ordine";
import { parametriCorrenti, promozioniDiOggi } from "./catalogo";
import { inserisciOrdine, ORE_PER_PAGARE, type Spedizione } from "./ordini";
import { prezziProdotto, prezziPromozione } from "./prezzi";
import { generaToken, impronta, improntaUguale } from "./sicurezza";

/**
 * Negozio personale online di ogni incaricata (Fase 7, decisione 29): pagina pubblica /negozio/GL000123.
 * Il cliente compra come ospite; al primo ordine si lega per sempre all'incaricata del link.
 */

/** Ordini non pagati che uno stesso cliente può avere aperti nelle ultime 24 ore (contro gli abusi). */
const MASSIMO_ORDINI_APERTI = 5;

export type StatoNegozio = { aperto: true } | { aperto: false; motivo: string };

/** Il negozio è chiuso se l'incaricata è sospesa, cessata, tornata cliente o non ha pagato lo start kit. */
export function statoNegozio(i: { stato: string; startKitPagato: boolean }): StatoNegozio {
  if (i.stato !== "attivo") return { aperto: false, motivo: "account non attivo" };
  if (!i.startKitPagato) return { aperto: false, motivo: "start kit non ancora pagato" };
  return { aperto: true };
}

/** Dati pubblici del negozio: solo nome e iniziale del cognome dell'incaricata. */
export async function negozioDi(codice: string) {
  if (!/^GL\d{6}$/.test(codice)) return undefined;
  const [i] = await db()
    .select({ id: incaricati.id, codice: incaricati.codice, nome: incaricati.nome, cognome: incaricati.cognome, stato: incaricati.stato, startKitPagato: incaricati.startKitPagato })
    .from(incaricati)
    .where(eq(incaricati.codice, codice));
  if (!i) return undefined;
  return { id: i.id, codice: i.codice, nome: `${i.nome} ${i.cognome.slice(0, 1)}.`, stato: statoNegozio(i) };
}

/** Catalogo al pubblico: prezzi di listino o in promozione, IVA inclusa. Niente punti né provvigioni. */
export async function catalogoNegozio() {
  const [p, righe, promo] = await Promise.all([
    parametriCorrenti(),
    db()
      .select()
      .from(prodotti)
      .where(and(eq(prodotti.attivo, true), ne(prodotti.tipo, "start_kit")))
      .orderBy(asc(prodotti.ordine), asc(prodotti.nome)),
    promozioniDiOggi(),
  ]);
  return {
    speseSpedizione: p.speseSpedizione,
    prodotti: righe.map((prodotto) => {
      const promozione = promo.get(prodotto.id);
      return {
        id: prodotto.id,
        nome: prodotto.nome,
        linea: prodotto.linea,
        formato: prodotto.formato,
        descrizione: prodotto.descrizione,
        immagineId: prodotto.immagineId,
        prezzo: promozione ? prezziPromozione(promozione.prezzoPromo, p).pubblico.ivaInclusa : prezziProdotto(prodotto.prezzoListino, p).pubblico.ivaInclusa,
        listino: prodotto.prezzoListino,
        promozione: promozione?.titolo,
      };
    }),
  };
}

export type DatiCliente = { nome: string; cognome: string; email: string; telefono: string };

/**
 * Crea un ordine dal negozio. Il cliente si riconosce dall'email: se è nuovo si lega all'incaricata del link,
 * altrimenti l'ordine va all'incaricata a cui è già legato (decisione 29). Restituisce il codice segreto del link
 * con cui il cliente segue e paga l'ordine (nel database se ne salva solo l'impronta).
 */
export async function creaOrdineOnline(dati: {
  codiceNegozio: string;
  richiesti: { prodottoId: string; quantita: number }[];
  cliente: DatiCliente;
  spedizione: Spedizione;
  consensoContatti: boolean;
}): Promise<{ id: string; codice: string }> {
  const negozio = await negozioDi(dati.codiceNegozio);
  if (!negozio || !negozio.stato.aperto) throw new ErroreOrdine("Questo negozio non è disponibile.");
  if (dati.richiesti.length === 0) throw new ErroreOrdine("Scegli almeno un prodotto.");

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
    return { prodotto, quantita: r.quantita, promozione: promozione && { id: promozione.id, prezzoPromo: promozione.prezzoPromo, puntiManuali: promozione.puntiManuali } };
  });

  const email = dati.cliente.email.trim().toLowerCase();
  const codice = generaToken();
  const id = await db().transaction(async (tx) => {
    // Un ordine alla volta per la stessa email: due ordini contemporanei non creano due clienti né due legami.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`cliente:${email}`}, 0))`);
    const [esistente] = await tx.select().from(clienti).where(eq(clienti.email, email)).for("update");
    let cliente = esistente;
    const ora = new Date();
    if (!cliente) {
      [cliente] = await tx
        .insert(clienti)
        .values({
          incaricatoId: negozio.id,
          email,
          nome: dati.cliente.nome,
          cognome: dati.cliente.cognome,
          telefono: dati.cliente.telefono,
          consensoContattiIl: dati.consensoContatti ? ora : null,
          privacyAccettataIl: ora,
        })
        .returning();
      await tx.insert(storicoLegamiClienti).values({ clienteId: cliente.id, incaricatoId: negozio.id, motivo: `Primo ordine dal negozio ${negozio.codice}` });
    } else {
      const [aperti] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(ordini)
        .where(and(eq(ordini.clienteId, cliente.id), eq(ordini.stato, "inserito"), sql`${ordini.creatoIl} > now() - make_interval(hours => ${ORE_PER_PAGARE})`));
      if (aperti.n >= MASSIMO_ORDINI_APERTI) {
        throw new ErroreOrdine("Hai già diversi ordini in attesa di pagamento: completa o annulla quelli prima di crearne altri.");
      }
      // Nome e telefono si aggiornano con l'ultimo ordine; il consenso segue l'ultima scelta (si può revocare).
      [cliente] = await tx
        .update(clienti)
        .set({
          nome: dati.cliente.nome,
          cognome: dati.cliente.cognome,
          telefono: dati.cliente.telefono,
          consensoContattiIl: dati.consensoContatti ? (cliente.consensoContattiIl ?? ora) : null,
        })
        .where(eq(clienti.id, cliente.id))
        .returning();
    }
    return inserisciOrdine(tx, {
      incaricatoId: cliente.incaricatoId,
      tipo: "online",
      articoli,
      spedizione: dati.spedizione,
      riordinoConfermato: false,
      clienteId: cliente.id,
      accessoClienteImpronta: impronta(codice),
    });
  });
  return { id, codice };
}

/** Ordine visto dal cliente con il link segreto. Undefined se il codice non corrisponde. */
export async function ordineDelCliente(id: string, codice: string) {
  if (!/^[0-9a-f-]{36}$/.test(id) || !codice || codice.length > 100) return undefined;
  const [ordine] = await db().select().from(ordini).where(and(eq(ordini.id, id), eq(ordini.tipo, "online"))).limit(1);
  if (!ordine?.accessoClienteImpronta || !improntaUguale(ordine.accessoClienteImpronta, impronta(codice))) return undefined;
  const [righe, [cliente], [incaricata], storico] = await Promise.all([
    db().select().from(righeOrdine).where(eq(righeOrdine.ordineId, id)).orderBy(asc(righeOrdine.id)),
    db().select({ email: clienti.email, nome: clienti.nome }).from(clienti).where(eq(clienti.id, ordine.clienteId!)),
    db().select({ nome: incaricati.nome, cognome: incaricati.cognome, codice: incaricati.codice }).from(incaricati).where(eq(incaricati.id, ordine.incaricatoId)),
    db()
      .select({ stato: storicoStatiOrdine.stato, creatoIl: storicoStatiOrdine.creatoIl })
      .from(storicoStatiOrdine)
      .where(eq(storicoStatiOrdine.ordineId, id))
      .orderBy(asc(storicoStatiOrdine.id)),
  ]);
  const scaduto = ordine.stato === "inserito" && Date.now() - ordine.creatoIl.getTime() > ORE_PER_PAGARE * 3_600_000;
  return {
    ordine,
    righe,
    storico,
    scaduto,
    cliente,
    consulente: { nome: `${incaricata.nome} ${incaricata.cognome.slice(0, 1)}.`, codice: incaricata.codice },
  };
}

/** Clienti di un'incaricata: email e telefono solo con il consenso del cliente, mai l'indirizzo (regola 16). */
export async function clientiDellIncaricata(incaricatoId: string) {
  const righe = await db()
    .select({
      id: clienti.id,
      nome: clienti.nome,
      cognome: clienti.cognome,
      email: clienti.email,
      telefono: clienti.telefono,
      consenso: clienti.consensoContattiIl,
      ordini: sql<number>`(select count(*)::int from app.ordini o where o.cliente_id = ${clienti.id} and o.incaricato_id = ${incaricatoId} and o.pagato_il is not null)`,
      ultimo: sql<string | null>`(select to_char(max(o.pagato_il) at time zone 'Europe/Rome', 'YYYY-MM-DD') from app.ordini o where o.cliente_id = ${clienti.id} and o.incaricato_id = ${incaricatoId})`,
    })
    .from(clienti)
    .where(eq(clienti.incaricatoId, incaricatoId))
    .orderBy(asc(clienti.cognome), asc(clienti.nome));
  return righe.map(({ consenso, email, telefono, ...r }) => ({ ...r, contatti: consenso ? { email, telefono } : null }));
}

/** Ordini dei clienti attribuiti all'incaricata, senza indirizzi. */
export async function ordiniDelNegozio(incaricatoId: string) {
  return db()
    .select({
      id: ordini.id,
      numero: ordini.numero,
      stato: ordini.stato,
      totale: ordini.totale,
      punti: ordini.punti,
      provvigione: ordini.provvigioneAcquisto,
      creatoIl: ordini.creatoIl,
      pagatoIl: ordini.pagatoIl,
      cliente: sql<string>`${clienti.nome} || ' ' || ${clienti.cognome}`,
    })
    .from(ordini)
    .innerJoin(clienti, eq(clienti.id, ordini.clienteId))
    .where(and(eq(ordini.incaricatoId, incaricatoId), eq(ordini.tipo, "online")))
    .orderBy(desc(ordini.creatoIl))
    .limit(100);
}

/** Un ordine del negozio visto dall'incaricata: prodotti, punti, provvigione e stato. Niente indirizzo. */
export async function ordineDelNegozio(id: string, incaricatoId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const [riga] = await db()
    .select({
      id: ordini.id,
      numero: ordini.numero,
      stato: ordini.stato,
      totale: ordini.totale,
      speseSpedizione: ordini.speseSpedizione,
      punti: ordini.punti,
      provvigione: ordini.provvigioneAcquisto,
      creatoIl: ordini.creatoIl,
      pagatoIl: ordini.pagatoIl,
      corriere: ordini.corriere,
      tracciamento: ordini.tracciamento,
      cliente: sql<string>`${clienti.nome} || ' ' || ${clienti.cognome}`,
    })
    .from(ordini)
    .innerJoin(clienti, eq(clienti.id, ordini.clienteId))
    .where(and(eq(ordini.id, id), eq(ordini.incaricatoId, incaricatoId), eq(ordini.tipo, "online")));
  if (!riga) return undefined;
  const [righe, storico] = await Promise.all([
    db().select().from(righeOrdine).where(eq(righeOrdine.ordineId, id)).orderBy(asc(righeOrdine.id)),
    db()
      .select({ stato: storicoStatiOrdine.stato, creatoIl: storicoStatiOrdine.creatoIl })
      .from(storicoStatiOrdine)
      .where(eq(storicoStatiOrdine.ordineId, id))
      .orderBy(asc(storicoStatiOrdine.id)),
  ]);
  return { ordine: riga, righe, storico };
}

