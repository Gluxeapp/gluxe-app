import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type Esecutore } from "@/db";
import { clienti, incaricati, ordini, prodotti, righeOrdine, storicoLegamiClienti, storicoStatiOrdine } from "@/db/schema";
import { ErroreOrdine, type Articolo } from "./calcolo-ordine";
import { formattaEuro } from "./denaro";
import { parametriCorrenti, promozioniDiOggi } from "./catalogo";
import { calcolaOrdine } from "./calcolo-ordine";
import { clienteVipOggi, oggiItalia, vipDiOggi } from "./clienti-vip";
import { contaProdotti, messaggioVip, prezzoVip, vipIl } from "./vip";
import { licenzaScaduta } from "./licenze";
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
/** Chiuso anche con la licenza scaduta (decisione 31). */
export function statoNegozio(i: { stato: string; startKitPagato: boolean; licenzaScaduta?: boolean }): StatoNegozio {
  if (i.stato !== "attivo") return { aperto: false, motivo: "account non attivo" };
  if (!i.startKitPagato) return { aperto: false, motivo: "start kit non ancora pagato" };
  if (i.licenzaScaduta) return { aperto: false, motivo: "licenza scaduta" };
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
  const scaduta = i.stato === "attivo" && i.startKitPagato ? await licenzaScaduta(i.id) : false;
  return { id: i.id, codice: i.codice, nome: `${i.nome} ${i.cognome.slice(0, 1)}.`, stato: statoNegozio({ ...i, licenzaScaduta: scaduta }) };
}

/** Catalogo al pubblico: prezzi di listino o in promozione, IVA inclusa. Niente punti né provvigioni. */
export async function catalogoNegozio() {
  const [p, righe, promo] = await Promise.all([
    parametriCorrenti(),
    db()
      .select()
      .from(prodotti)
      .where(and(eq(prodotti.attivo, true), eq(prodotti.tipo, "prodotto")))
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

export type DatiCliente = { nome: string; cognome: string; codiceFiscale: string; email: string; telefono: string };

/**
 * Crea un ordine dal negozio. Il cliente si riconosce dal codice fiscale (decisione 36): se è nuovo si lega all'incaricata del link,
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
  const articoli = await articoliDalCatalogo(dati.richiesti);

  const email = dati.cliente.email.trim().toLowerCase();
  const codice = generaToken();
  const id = await db().transaction(async (tx) => {
    let cliente = await clientePerCodiceFiscale(tx, dati.cliente.codiceFiscale, email);
    const ora = new Date();
    if (!cliente) {
      [cliente] = await tx
        .insert(clienti)
        .values({
          incaricatoId: negozio.id,
          codiceFiscale: dati.cliente.codiceFiscale,
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
      await controllaOrdiniAperti(tx, cliente.id);
      // Nome e telefono si aggiornano con l'ultimo ordine; il consenso segue l'ultima scelta (si può revocare).
      [cliente] = await tx
        .update(clienti)
        .set({
          nome: dati.cliente.nome,
          cognome: dati.cliente.cognome,
          telefono: dati.cliente.telefono,
          consensoContattiIl: dati.consensoContatti ? (cliente.consensoContattiIl ?? ora) : null,
          privacyAccettataIl: cliente.privacyAccettataIl ?? ora,
        })
        .where(eq(clienti.id, cliente.id))
        .returning();
      // Cliente registrato senza consulente: il primo ordine dal link lo lega a questa incaricata (decisione 32).
      if (!cliente.incaricatoId) cliente = await primoLegame(tx, cliente.id, negozio.id, `Primo ordine dal negozio ${negozio.codice}`);
    }
    return inserisciOrdine(tx, {
      incaricatoId: cliente.incaricatoId!,
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

/** Prodotti scelti, con prezzi e promozioni di oggi letti dal database (mai dal browser). */
async function articoliDalCatalogo(richiesti: { prodottoId: string; quantita: number }[]): Promise<Articolo[]> {
  if (richiesti.length === 0) throw new ErroreOrdine("Scegli almeno un prodotto.");
  const ids = richiesti.map((r) => r.prodottoId);
  const [trovati, promo] = await Promise.all([
    db()
      .select()
      .from(prodotti)
      .where(and(inArray(prodotti.id, ids), eq(prodotti.attivo, true), eq(prodotti.tipo, "prodotto"))),
    promozioniDiOggi(),
  ]);
  return richiesti.map((r) => {
    const prodotto = trovati.find((p) => p.id === r.prodottoId);
    if (!prodotto) throw new ErroreOrdine("Un prodotto scelto non è più disponibile: ricarica la pagina.");
    const promozione = promo.get(prodotto.id);
    return { prodotto, quantita: r.quantita, promozione: promozione && { id: promozione.id, prezzoPromo: promozione.prezzoPromo, puntiManuali: promozione.puntiManuali } };
  });
}

/**
 * Il cliente si riconosce dal codice fiscale (decisione 36), bloccato fino alla fine della transazione: due ordini
 * contemporanei non creano due clienti né due legami. Un'email diversa non cambia il cliente (e non sostituisce
 * quella salvata); la stessa email con un altro codice fiscale è un'altra persona.
 * Passaggio per i clienti nati prima del codice fiscale: se nessuno ha quel codice ma c'è un cliente senza codice
 * con la stessa email, è lui: gli si scrive il codice fiscale e resta il suo legame.
 * Ordine dei blocchi sempre codice fiscale → email (anche nella registrazione del profilo), così non si incastrano.
 */
export async function clientePerCodiceFiscale(tx: Esecutore, codiceFiscale: string, email: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`cliente-cf:${codiceFiscale}`}, 0))`);
  const [trovato] = await tx.select().from(clienti).where(eq(clienti.codiceFiscale, codiceFiscale)).for("update");
  if (trovato) return trovato;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`cliente:${email}`}, 0))`);
  const [senzaCodice] = await tx
    .select()
    .from(clienti)
    .where(and(eq(clienti.email, email), isNull(clienti.codiceFiscale)))
    .for("update");
  if (!senzaCodice) return undefined;
  const [aggiornato] = await tx.update(clienti).set({ codiceFiscale }).where(eq(clienti.id, senzaCodice.id)).returning();
  return aggiornato;
}

async function controllaOrdiniAperti(tx: Esecutore, clienteId: string) {
  const [aperti] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(ordini)
    .where(and(eq(ordini.clienteId, clienteId), eq(ordini.stato, "inserito"), sql`${ordini.creatoIl} > now() - make_interval(hours => ${ORE_PER_PAGARE})`));
  if (aperti.n >= MASSIMO_ORDINI_APERTI) {
    throw new ErroreOrdine("Ci sono già diversi ordini in attesa di pagamento per questo cliente: vanno completati o annullati prima di crearne altri.");
  }
}

/** Primo legame di un cliente ancora senza consulente (il database lo permette solo se il legame è vuoto). */
async function primoLegame(tx: Esecutore, clienteId: string, incaricatoId: string, motivo: string) {
  const [legato] = await tx.update(clienti).set({ incaricatoId }).where(and(eq(clienti.id, clienteId), isNull(clienti.incaricatoId))).returning();
  if (!legato) throw new ErroreOrdine("Il cliente è stato appena assegnato a una consulente: riprova.");
  await tx.insert(storicoLegamiClienti).values({ clienteId, incaricatoId, motivo });
  return legato;
}

export const MESSAGGIO_CLIENTE_ALTRUI = "Questo cliente è già seguito da un'altra consulente: non puoi preparare ordini per lui.";

/**
 * "Ordine per un cliente" (decisione 32): lo prepara l'incaricata, il cliente lo paga dal link che riceve.
 * Cliente nuovo o senza consulente: si lega a lei. Cliente di un'altra incaricata: bloccato.
 * I dati scritti dall'incaricata non sostituiscono quelli di un cliente che esiste già; l'informativa la accetta il cliente.
 */
export async function creaOrdinePerCliente(dati: {
  incaricatoId: string;
  codiceIncaricata: string;
  richiesti: { prodottoId: string; quantita: number }[];
  cliente: DatiCliente;
  spedizione: Spedizione;
}): Promise<{ id: string; codice: string; email: string; nome: string }> {
  const negozio = await negozioDi(dati.codiceIncaricata);
  if (!negozio || negozio.id !== dati.incaricatoId || !negozio.stato.aperto) {
    throw new ErroreOrdine("Il tuo negozio non è attivo: non puoi preparare ordini per i clienti.");
  }
  const articoli = await articoliDalCatalogo(dati.richiesti);
  const email = dati.cliente.email.trim().toLowerCase();
  const codice = generaToken();
  const id = await db().transaction(async (tx) => {
    let cliente = await clientePerCodiceFiscale(tx, dati.cliente.codiceFiscale, email);
    if (cliente?.incaricatoId && cliente.incaricatoId !== dati.incaricatoId) throw new ErroreOrdine(MESSAGGIO_CLIENTE_ALTRUI);
    const motivo = `Ordine preparato dalla consulente ${negozio.codice}`;
    if (!cliente) {
      [cliente] = await tx
        .insert(clienti)
        .values({ incaricatoId: dati.incaricatoId, codiceFiscale: dati.cliente.codiceFiscale, email, nome: dati.cliente.nome, cognome: dati.cliente.cognome, telefono: dati.cliente.telefono })
        .returning();
      await tx.insert(storicoLegamiClienti).values({ clienteId: cliente.id, incaricatoId: dati.incaricatoId, motivo });
    } else {
      await controllaOrdiniAperti(tx, cliente.id);
      if (!cliente.incaricatoId) cliente = await primoLegame(tx, cliente.id, dati.incaricatoId, motivo);
    }
    // Cliente VIP: il prezzo VIP vale anche negli ordini preparati dalla sua incaricata (decisione 35).
    const { vip } = await clienteVipOggi(cliente.id, tx);
    return inserisciOrdine(tx, {
      vip,
      incaricatoId: dati.incaricatoId,
      tipo: "online",
      articoli,
      spedizione: dati.spedizione,
      riordinoConfermato: false,
      clienteId: cliente.id,
      accessoClienteImpronta: impronta(codice),
    });
  });
  return { id, codice, email, nome: dati.cliente.nome };
}

/**
 * Ordine dal profilo del cliente (decisione 32). Se non ha ancora una consulente serve il codice di un'incaricata
 * (che il cliente riceve dalla sede): il primo ordine lo lega a lei. Restituisce anche il codice del link dell'ordine.
 */
export async function creaOrdineDaProfilo(dati: {
  clienteId: string;
  richiesti: { prodottoId: string; quantita: number }[];
  spedizione: Spedizione;
  codiceConsulente?: string;
}): Promise<{ id: string; codice: string }> {
  const articoli = await articoliDalCatalogo(dati.richiesti);
  const [attuale] = await db()
    .select({ codiceFiscale: clienti.codiceFiscale, email: clienti.email, incaricatoId: clienti.incaricatoId })
    .from(clienti)
    .where(eq(clienti.id, dati.clienteId));
  if (!attuale) throw new ErroreOrdine("Profilo non trovato.");
  // Profili nati prima del codice fiscale (decisione 36): lo scrivono nel profilo prima di ordinare.
  if (!attuale.codiceFiscale) throw new ErroreOrdine("Per ordinare aggiungi il tuo codice fiscale in \"I tuoi dati\" (Profilo).");
  const codiceFiscale = attuale.codiceFiscale;
  let consulente: { id: string; codice: string } | undefined;
  if (!attuale.incaricatoId) {
    const negozio = dati.codiceConsulente ? await negozioDi(dati.codiceConsulente) : undefined;
    if (!negozio || !negozio.stato.aperto) {
      throw new ErroreOrdine("Per il primo acquisto serve il codice della tua consulente: controlla il codice o chiedilo all'azienda.");
    }
    consulente = negozio;
  }
  const codice = generaToken();
  const id = await db().transaction(async (tx) => {
    let cliente = await clientePerCodiceFiscale(tx, codiceFiscale, attuale.email);
    if (!cliente || cliente.id !== dati.clienteId) throw new ErroreOrdine("Profilo non trovato.");
    await controllaOrdiniAperti(tx, cliente.id);
    if (!cliente.incaricatoId) {
      if (!consulente) throw new ErroreOrdine("Per il primo acquisto serve il codice della tua consulente.");
      cliente = await primoLegame(tx, cliente.id, consulente.id, `Primo ordine dal profilo, codice ${consulente.codice}`);
    }
    // Cliente VIP: dal profilo i prodotti a listino hanno il prezzo VIP (decisione 35).
    const { vip } = await clienteVipOggi(cliente.id, tx);
    return inserisciOrdine(tx, {
      vip,
      incaricatoId: cliente.incaricatoId!,
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
    db()
      .select({ id: clienti.id, email: clienti.email, nome: clienti.nome, privacyAccettataIl: clienti.privacyAccettataIl, consensoContattiIl: clienti.consensoContattiIl })
      .from(clienti)
      .where(eq(clienti.id, ordine.clienteId!)),
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

/**
 * Clienti di un'incaricata: codice fiscale (decisione 36), email e telefono solo con il consenso del cliente,
 * mai l'indirizzo (regola 16).
 */
export async function clientiDellIncaricata(incaricatoId: string) {
  const righe = await db()
    .select({
      id: clienti.id,
      nome: clienti.nome,
      cognome: clienti.cognome,
      codiceFiscale: clienti.codiceFiscale,
      email: clienti.email,
      telefono: clienti.telefono,
      consenso: clienti.consensoContattiIl,
      ordini: sql<number>`(select count(*)::int from app.ordini o where o.cliente_id = ${clienti.id} and o.incaricato_id = ${incaricatoId} and o.pagato_il is not null)`,
      ultimo: sql<string | null>`(select to_char(max(o.pagato_il) at time zone 'Europe/Rome', 'YYYY-MM-DD') from app.ordini o where o.cliente_id = ${clienti.id} and o.incaricato_id = ${incaricatoId})`,
    })
    .from(clienti)
    .where(eq(clienti.incaricatoId, incaricatoId))
    .orderBy(asc(clienti.cognome), asc(clienti.nome));
  // Cliente VIP (decisione 35): l'incaricata vede chi lo è e fino a quando, per ricontattarla prima della scadenza.
  const vip = await vipDiOggi(righe.map((r) => r.id));
  return righe.map(({ consenso, email, telefono, ...r }) => ({ ...r, vipFino: vip.get(r.id) ?? null, contatti: consenso ? { email, telefono } : null }));
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


/**
 * Vetrina già pronta da mostrare: prezzi pieni o in promozione e spedizione, come testi. Per una cliente VIP
 * (solo dal profilo, decisione 35) i prodotti a listino hanno il prezzo VIP con il listino barrato; le promozioni no.
 */
export async function vetrinaProdotti(opzioni: { vip?: boolean } = {}) {
  const [catalogo, p] = await Promise.all([catalogoNegozio(), parametriCorrenti()]);
  return {
    spedizione: formattaEuro(catalogo.speseSpedizione),
    prodotti: catalogo.prodotti.map((prodotto) => {
      const vip = opzioni.vip && !prodotto.promozione;
      const prezzo = vip ? prezzoVip(prodotto.listino, p) : prodotto.prezzo;
      return {
        id: prodotto.id,
        nome: prodotto.nome,
        dettaglio: [prodotto.linea, prodotto.formato].filter(Boolean).join(" · "),
        descrizione: prodotto.descrizione,
        immagineId: prodotto.immagineId,
        prezzo: formattaEuro(prezzo),
        barrato: prodotto.listino > prezzo ? formattaEuro(prodotto.listino) : undefined,
        promozione: prodotto.promozione ?? (vip ? "Prezzo VIP" : undefined),
      };
    }),
  };
}

/**
 * Frase del carrello sul Cliente VIP (decisione 35), calcolata sul server dalle quantità scelte.
 * validaFino: scadenza dello status della cliente collegata (null per chi compra da ospite).
 */
export async function fraseVipDelCarrello(richiesti: { prodottoId: string; quantita: number }[], validaFino: string | null) {
  const [p, oggi] = await Promise.all([parametriCorrenti(), oggiItalia()]);
  const scelti = richiesti.filter((r) => r.quantita > 0);
  let conteggio = { pagati: 0n, aListino: 0n };
  if (scelti.length > 0) {
    const ordine = calcolaOrdine(await articoliDalCatalogo(scelti), "online", p, { vip: vipIl(validaFino, oggi) });
    conteggio = contaProdotti(ordine.righe);
  }
  const frase = messaggioVip({ validaFino, oggi, conteggio, p });
  const base = frase.vip ? conteggio.aListino : conteggio.pagati;
  const avanzamento = frase.raggiunto ? 100 : Number((base * 100n) / (p.vipSoglia === 0n ? 1n : p.vipSoglia));
  return { ...frase, avanzamento: Math.min(100, avanzamento) };
}
