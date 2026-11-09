import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, type Esecutore } from "@/db";
import {
  datiAzienda,
  distinteBonifici,
  documentiProvvigioni,
  incaricati,
  movimenti,
  parametriVersioni,
  richiestePagamento,
  righeDistinta,
  utenti,
  versamentiF24,
} from "@/db/schema";
import { parametriCorrenti } from "../catalogo";
import { parametriDaJson } from "../parametri";
import { registra } from "../registro";
import { distintaSepaCbi, ErroreDistinta } from "../sepa";
import { ibanValido } from "../validazioni";
import { meseCorrente, meseDopo, ultimoMeseChiuso, giornoDiOggi } from "./dati";
import { importiDocumento } from "./documento";
import { dataPagamento, datiF24, finestraRichiestaAperta, pagamentoRichiedibile } from "./pagamenti";

/**
 * Registro provvigioni, richieste di pagamento, documenti, bonifici e F24 (Fase 6).
 * Il saldo è sempre la somma dei movimenti (CLAUDE.md, regola 9). Le pagine e le azioni
 * controllano prima chi è collegato; qui si fanno i conti e si scrive in transazione.
 */

export class ErrorePagamento extends Error {}

export async function saldo(incaricataId: string, esecutore: Esecutore = db()): Promise<bigint> {
  const [r] = await esecutore
    .select({ totale: sql<string>`coalesce(sum(${movimenti.importo}), 0)::text` })
    .from(movimenti)
    .where(eq(movimenti.incaricatoId, incaricataId));
  return BigInt(r.totale);
}

/**
 * Finestra di richiesta. Fuori dal sito vero si può tenere aperta per le prove
 * (PROVA_FINESTRA_PAGAMENTI_APERTA=1): sul sito vero la variabile non conta.
 */
function finestraForzataPerProve(): boolean {
  return process.env.VERCEL_ENV !== "production" && process.env.PROVA_FINESTRA_PAGAMENTI_APERTA === "1";
}

/** Situazione della richiesta di pagamento per l'incaricata: si può chiedere adesso? */
export async function statoRichiesta(incaricataId: string) {
  const [p, oggi, corrente, ultimo, disponibile] = await Promise.all([
    parametriCorrenti(),
    giornoDiOggi(),
    meseCorrente(),
    ultimoMeseChiuso(),
    saldo(incaricataId),
  ]);
  const meseAppenaChiuso = ultimo !== null && meseDopo(ultimo) === corrente;
  const [gia] = meseAppenaChiuso
    ? await db()
        .select({ id: richiestePagamento.id })
        .from(richiestePagamento)
        .where(and(eq(richiestePagamento.incaricatoId, incaricataId), eq(richiestePagamento.mese, ultimo), sql`${richiestePagamento.stato} <> 'rifiutata'`))
        .limit(1)
    : [];
  const finestra = finestraRichiestaAperta(oggi, p) || finestraForzataPerProve();
  const [anno, mese] = oggi.split("-").map(Number);
  return {
    saldo: disponibile,
    minimo: p.pagamentoMinimo,
    dal: p.richiestaDalGiorno,
    al: p.richiestaAlGiorno,
    finestra,
    meseAppenaChiuso,
    giaRichiesta: Boolean(gia),
    dataPagamento: dataPagamento(anno, mese, p),
    puoRichiedere: finestra && meseAppenaChiuso && !gia && pagamentoRichiedibile(disponibile, p),
  };
}

/** Richiesta di pagamento di tutto il saldo, con l'incaricata bloccata: due richieste insieme non superano il saldo. */
export async function creaRichiesta(incaricataId: string, utenteId: string) {
  const s = await statoRichiesta(incaricataId);
  if (!s.finestra) throw new ErrorePagamento(`Il pagamento si può chiedere dal ${s.dal} al ${s.al} del mese.`);
  if (!s.meseAppenaChiuso) throw new ErrorePagamento("Il mese scorso non è ancora stato chiuso dalla sede: riprova tra poco.");
  const mese = (await ultimoMeseChiuso())!;
  return db().transaction(async (tx) => {
    await tx.select({ id: incaricati.id }).from(incaricati).where(eq(incaricati.id, incaricataId)).for("update");
    const lordo = await saldo(incaricataId, tx);
    if (lordo < s.minimo) throw new ErrorePagamento("Il saldo non raggiunge l'importo minimo.");
    const [r] = await tx
      .insert(richiestePagamento)
      .values({ incaricatoId: incaricataId, mese, lordo, dataPagamento: s.dataPagamento })
      .onConflictDoNothing()
      .returning({ id: richiestePagamento.id });
    if (!r) throw new ErrorePagamento("Hai già chiesto il pagamento per questo mese.");
    await tx.insert(movimenti).values({ incaricatoId: incaricataId, tipo: "richiesta", mese, importo: -lordo, richiestaId: r.id });
    await registra(tx, { utenteId, azione: "pagamenti.richiesta", entita: "richiesta_pagamento", entitaId: r.id, dopo: { lordo: lordo.toString(), mese } });
    return { id: r.id, lordo };
  });
}

/** Dati dell'azienda, con l'elenco di quelli che mancano per documenti e bonifici. */
export async function leggiDatiAzienda() {
  const [a] = await db().select().from(datiAzienda).where(eq(datiAzienda.id, 1));
  const mancanti = [
    ["ragioneSociale", "ragione sociale"],
    ["indirizzo", "indirizzo"],
    ["cap", "CAP"],
    ["citta", "città"],
    ["provincia", "provincia"],
    ["codiceFiscale", "codice fiscale"],
    ["partitaIva", "partita IVA"],
  ].filter(([k]) => !String(a?.[k as keyof typeof a] ?? "").trim()).map(([, e]) => e);
  return { azienda: a, mancanti, perBonifici: [!a?.iban && "IBAN", !a?.cuc && "codice CUC"].filter(Boolean) as string[] };
}

const competenza = (mese: string) => `${mese.slice(5, 7)}/${mese.slice(0, 4)}`;

/** Approvazione: nasce la ricevuta o fattura, con numero progressivo per incaricata e anno. */
export async function approvaRichiesta(richiestaId: string, utenteId: string) {
  const { azienda, mancanti } = await leggiDatiAzienda();
  if (mancanti.length > 0) throw new ErrorePagamento(`Prima completa i dati dell'azienda: ${mancanti.join(", ")}.`);
  const p = await parametriCorrenti();
  return db().transaction(async (tx) => {
    const [r] = await tx.select().from(richiestePagamento).where(eq(richiestePagamento.id, richiestaId)).for("update");
    if (!r || r.stato !== "richiesta") throw new ErrorePagamento("La richiesta non è più da decidere.");
    // Blocca l'incaricata: la numerazione dei suoi documenti non può saltare né ripetersi.
    await tx.select({ id: incaricati.id }).from(incaricati).where(eq(incaricati.id, r.incaricatoId)).for("update");
    const [i] = await tx
      .select({ incaricato: incaricati, email: utenti.email })
      .from(incaricati)
      .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
      .where(eq(incaricati.id, r.incaricatoId));
    const anno = Number(r.dataPagamento.slice(0, 4));
    const [prec] = await tx
      .select({
        numero: sql<number>`coalesce(max(${documentiProvvigioni.numero}), 0)::int`,
        compensi: sql<string>`coalesce(sum(${documentiProvvigioni.imponibile}), 0)::text`,
      })
      .from(documentiProvvigioni)
      .where(and(eq(documentiProvvigioni.incaricatoId, r.incaricatoId), eq(documentiProvvigioni.anno, anno)));
    const importi = importiDocumento(r.lordo, i.incaricato.regimeFiscale, p, BigInt(prec.compensi));
    const inc = i.incaricato;
    const [d] = await tx
      .insert(documentiProvvigioni)
      .values({
        richiestaId: r.id,
        incaricatoId: r.incaricatoId,
        anno,
        numero: prec.numero + 1,
        tipo: importi.tipo,
        data: r.dataPagamento,
        imponibile: importi.imponibile,
        iva: importi.iva,
        aliquotaIva: Number(p.aliquotaIva),
        ritenuta: importi.ritenuta,
        inpsBase: importi.inpsBase,
        inpsIncaricata: importi.inpsIncaricata,
        inpsAzienda: importi.inpsAzienda,
        bollo: importi.bollo,
        totale: importi.totale,
        incaricata: {
          codice: inc.codice,
          nome: inc.nome,
          cognome: inc.cognome,
          indirizzo: inc.indirizzo,
          cap: inc.cap,
          citta: inc.citta,
          provincia: inc.provincia,
          telefono: inc.telefono,
          email: i.email,
          codiceFiscale: inc.codiceFiscale,
          partitaIva: inc.partitaIva,
          iban: inc.iban,
        },
        azienda: {
          ragioneSociale: azienda.ragioneSociale,
          indirizzo: azienda.indirizzo,
          cap: azienda.cap,
          citta: azienda.citta,
          provincia: azienda.provincia,
          codiceFiscale: azienda.codiceFiscale,
          partitaIva: azienda.partitaIva,
          autorizzazioneBollo: azienda.autorizzazioneBollo,
        },
        competenza: competenza(r.mese),
        parametriVersioneId: p.versioneId,
      })
      .returning({ id: documentiProvvigioni.id, numero: documentiProvvigioni.numero });
    await tx.update(richiestePagamento).set({ stato: "approvata", decisaDa: utenteId, decisaIl: new Date() }).where(eq(richiestePagamento.id, r.id));
    await registra(tx, {
      utenteId,
      azione: "pagamenti.approvata",
      entita: "richiesta_pagamento",
      entitaId: r.id,
      prima: { stato: "richiesta" },
      dopo: { stato: "approvata", documento: `${d.numero}/${anno}`, tipo: importi.tipo, totale: importi.totale.toString() },
    });
    return d;
  });
}

/** Rifiuto: l'importo torna nel saldo dell'incaricata con un movimento di restituzione. */
export async function rifiutaRichiesta(richiestaId: string, motivo: string, utenteId: string) {
  await db().transaction(async (tx) => {
    const [r] = await tx.select().from(richiestePagamento).where(eq(richiestePagamento.id, richiestaId)).for("update");
    if (!r || r.stato !== "richiesta") throw new ErrorePagamento("La richiesta non è più da decidere.");
    await tx
      .update(richiestePagamento)
      .set({ stato: "rifiutata", decisaDa: utenteId, decisaIl: new Date(), motivoRifiuto: motivo })
      .where(eq(richiestePagamento.id, r.id));
    await tx.insert(movimenti).values({ incaricatoId: r.incaricatoId, tipo: "richiesta_rifiutata", mese: r.mese, importo: r.lordo, richiestaId: r.id });
    await registra(tx, {
      utenteId,
      azione: "pagamenti.rifiutata",
      entita: "richiesta_pagamento",
      entitaId: r.id,
      prima: { stato: "richiesta" },
      dopo: { stato: "rifiutata", motivo },
    });
  });
}

/** Richieste approvate di una data di pagamento non ancora in un file bonifici valido. */
async function approvateSenzaFile(dataPagamento: string) {
  return db()
    .select({
      richiestaId: richiestePagamento.id,
      codice: incaricati.codice,
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      iban: incaricati.iban,
      totale: documentiProvvigioni.totale,
      numero: documentiProvvigioni.numero,
      anno: documentiProvvigioni.anno,
      tipo: documentiProvvigioni.tipo,
      competenza: documentiProvvigioni.competenza,
    })
    .from(richiestePagamento)
    .innerJoin(documentiProvvigioni, eq(documentiProvvigioni.richiestaId, richiestePagamento.id))
    .innerJoin(incaricati, eq(incaricati.id, richiestePagamento.incaricatoId))
    .where(
      and(
        eq(richiestePagamento.stato, "approvata"),
        eq(richiestePagamento.dataPagamento, dataPagamento),
        sql`not exists (select 1 from app.righe_distinta d where d.richiesta_id = ${richiestePagamento.id} and not d.annullata)`,
      ),
    )
    .orderBy(asc(incaricati.codice));
}

/** Crea il file bonifici SEPA (CBI) di una data di pagamento; le richieste con IBAN non valido restano fuori. */
export async function creaDistinta(dataPagamento: string, utenteId: string) {
  const { azienda, perBonifici, mancanti } = await leggiDatiAzienda();
  if (mancanti.length + perBonifici.length > 0) throw new ErrorePagamento(`Prima completa i dati dell'azienda: ${[...mancanti, ...perBonifici].join(", ")}.`);
  const tutte = await approvateSenzaFile(dataPagamento);
  const scartate = tutte.filter((r) => !ibanValido(r.iban)).map((r) => r.codice);
  const valide = tutte.filter((r) => ibanValido(r.iban));
  if (valide.length === 0) throw new ErrorePagamento("Nessun bonifico da mettere nel file per questa data.");

  const ora = new Date();
  const creatoIl = ora.toLocaleString("sv-SE", { timeZone: "Europe/Rome" }).replace(" ", "T");
  const idMessaggio = `GLUXE-${dataPagamento}-${ora.getTime().toString(36).toUpperCase()}`;
  const tipoTesto = { ricevuta: "ricevuta", fattura_ordinaria: "fattura", fattura_forfettaria: "fattura" } as const;
  let xml: string;
  try {
    xml = distintaSepaCbi({
      idMessaggio,
      creatoIl,
      dataEsecuzione: dataPagamento,
      ordinante: { ragioneSociale: azienda.ragioneSociale, codiceFiscale: azienda.partitaIva || azienda.codiceFiscale, iban: azienda.iban, cuc: azienda.cuc },
      bonifici: valide.map((r) => ({
        riferimento: `GL-${r.codice}-${r.anno}-${r.numero}`,
        beneficiario: `${r.nome} ${r.cognome}`,
        iban: r.iban,
        importo: r.totale,
        causale: `Provvigioni ${r.competenza}, ${tipoTesto[r.tipo]} n. ${r.numero}/${r.anno}`,
      })),
    });
  } catch (e) {
    if (e instanceof ErroreDistinta) throw new ErrorePagamento(e.message);
    throw e;
  }
  const totale = valide.reduce((t, r) => t + r.totale, 0n);
  const id = await db().transaction(async (tx) => {
    const [d] = await tx
      .insert(distinteBonifici)
      .values({ dataPagamento, idMessaggio, numeroBonifici: valide.length, totale, xml, creataDa: utenteId })
      .returning({ id: distinteBonifici.id });
    // L'indice univoco impedisce che una richiesta finisca in due file validi, anche con due clic insieme.
    await tx.insert(righeDistinta).values(valide.map((r) => ({ distintaId: d.id, richiestaId: r.richiestaId })));
    await registra(tx, {
      utenteId,
      azione: "pagamenti.file_bonifici",
      entita: "distinta_bonifici",
      entitaId: d.id,
      dopo: { dataPagamento, bonifici: valide.length, totale: totale.toString(), scartatePerIban: scartate },
    });
    return d.id;
  });
  return { id, scartate };
}

export async function annullaDistinta(distintaId: string, utenteId: string) {
  await db().transaction(async (tx) => {
    const [d] = await tx.select().from(distinteBonifici).where(eq(distinteBonifici.id, distintaId)).for("update");
    if (!d || d.annullataIl) throw new ErrorePagamento("Il file è già annullato.");
    const pagate = await tx
      .select({ id: richiestePagamento.id })
      .from(righeDistinta)
      .innerJoin(richiestePagamento, eq(richiestePagamento.id, righeDistinta.richiestaId))
      .where(and(eq(righeDistinta.distintaId, d.id), eq(richiestePagamento.stato, "pagata")));
    if (pagate.length > 0) throw new ErrorePagamento("I bonifici di questo file sono già segnati come pagati: non si può annullare.");
    await tx.update(distinteBonifici).set({ annullataIl: new Date(), annullataDa: utenteId }).where(eq(distinteBonifici.id, d.id));
    await tx.update(righeDistinta).set({ annullata: true }).where(eq(righeDistinta.distintaId, d.id));
    await registra(tx, { utenteId, azione: "pagamenti.file_annullato", entita: "distinta_bonifici", entitaId: d.id, prima: { annullata: false }, dopo: { annullata: true } });
  });
}

/** Dopo che la banca ha eseguito il file: le richieste del file diventano pagate. */
export async function segnaPagata(distintaId: string, utenteId: string) {
  await db().transaction(async (tx) => {
    const [d] = await tx.select().from(distinteBonifici).where(eq(distinteBonifici.id, distintaId)).for("update");
    if (!d || d.annullataIl) throw new ErrorePagamento("Il file non è valido.");
    const aggiornate = await tx
      .update(richiestePagamento)
      .set({ stato: "pagata", pagataDa: utenteId, pagataIl: new Date() })
      .where(
        and(
          eq(richiestePagamento.stato, "approvata"),
          sql`${richiestePagamento.id} in (select richiesta_id from app.righe_distinta where distinta_id = ${d.id} and not annullata)`,
        ),
      )
      .returning({ id: richiestePagamento.id });
    if (aggiornate.length === 0) throw new ErrorePagamento("Le richieste di questo file sono già segnate come pagate.");
    await registra(tx, { utenteId, azione: "pagamenti.pagati", entita: "distinta_bonifici", entitaId: d.id, dopo: { richieste: aggiornate.length } });
  });
}

/** Documenti con data in un mese ("AAAA-MM"), per F24, report ed export. */
export async function documentiDelPeriodo(periodo: string) {
  return db()
    .select({ documento: documentiProvvigioni, stato: richiestePagamento.stato, regime: incaricati.regimeFiscale })
    .from(documentiProvvigioni)
    .innerJoin(richiestePagamento, eq(richiestePagamento.id, documentiProvvigioni.richiestaId))
    .innerJoin(incaricati, eq(incaricati.id, documentiProvvigioni.incaricatoId))
    .where(sql`to_char(${documentiProvvigioni.data}, 'YYYY-MM') = ${periodo}`)
    .orderBy(asc(documentiProvvigioni.data), asc(incaricati.codice));
}

/** F24 del periodo: codice 1038, importo, scadenza, ed eventuale versamento già registrato. */
export async function f24DelPeriodo(periodo: string) {
  const [docs, [versato]] = await Promise.all([
    documentiDelPeriodo(periodo),
    db().select().from(versamentiF24).where(eq(versamentiF24.periodo, periodo)),
  ]);
  return { ...datiF24(periodo, docs.map((d) => d.documento.ritenuta)), documenti: docs, versato };
}

export async function registraVersamentoF24(periodo: string, versatoIl: string, utenteId: string) {
  const f = await f24DelPeriodo(periodo);
  if (f.importo === 0n) throw new ErrorePagamento("Nessuna ritenuta da versare per questo mese.");
  await db().transaction(async (tx) => {
    const [r] = await tx
      .insert(versamentiF24)
      .values({ periodo, importo: f.importo, versatoIl, registratoDa: utenteId })
      .onConflictDoNothing()
      .returning({ periodo: versamentiF24.periodo });
    if (!r) throw new ErrorePagamento("Il versamento di questo mese è già registrato.");
    await registra(tx, { utenteId, azione: "contabilita.f24_versato", entita: "f24", entitaId: periodo, dopo: { importo: f.importo.toString(), versatoIl } });
  });
}

/** Elenco per la contabilità: richieste da decidere, approvate per data, file bonifici, periodi con documenti. */
export async function quadroContabilita() {
  const [daDecidere, approvate, distinte, periodi] = await Promise.all([
    db()
      .select({ richiesta: richiestePagamento, codice: incaricati.codice, nome: incaricati.nome, cognome: incaricati.cognome, regime: incaricati.regimeFiscale })
      .from(richiestePagamento)
      .innerJoin(incaricati, eq(incaricati.id, richiestePagamento.incaricatoId))
      .where(eq(richiestePagamento.stato, "richiesta"))
      .orderBy(asc(richiestePagamento.creatoIl)),
    db()
      .select({
        dataPagamento: richiestePagamento.dataPagamento,
        numero: sql<number>`count(*)::int`,
        totale: sql<string>`sum(${documentiProvvigioni.totale})::text`,
        senzaFile: sql<number>`count(*) filter (where not exists (select 1 from app.righe_distinta d where d.richiesta_id = ${richiestePagamento.id} and not d.annullata))::int`,
      })
      .from(richiestePagamento)
      .innerJoin(documentiProvvigioni, eq(documentiProvvigioni.richiestaId, richiestePagamento.id))
      .where(eq(richiestePagamento.stato, "approvata"))
      .groupBy(richiestePagamento.dataPagamento)
      .orderBy(asc(richiestePagamento.dataPagamento)),
    db()
      .select({
        distinta: distinteBonifici,
        daPagare: sql<number>`(select count(*) from app.righe_distinta r join app.richieste_pagamento q on q.id = r.richiesta_id
          where r.distinta_id = app.distinte_bonifici.id and not r.annullata and q.stato = 'approvata')::int`,
      })
      .from(distinteBonifici)
      .orderBy(desc(distinteBonifici.creataIl))
      .limit(20),
    db()
      .select({
        periodo: sql<string>`to_char(${documentiProvvigioni.data}, 'YYYY-MM')`,
        documenti: sql<number>`count(*)::int`,
        imponibile: sql<string>`sum(${documentiProvvigioni.imponibile})::text`,
        iva: sql<string>`sum(${documentiProvvigioni.iva})::text`,
        ritenute: sql<string>`sum(${documentiProvvigioni.ritenuta})::text`,
        inpsIncaricate: sql<string>`sum(${documentiProvvigioni.inpsIncaricata})::text`,
        inpsAzienda: sql<string>`sum(${documentiProvvigioni.inpsAzienda})::text`,
        bollo: sql<string>`sum(${documentiProvvigioni.bollo})::text`,
        totale: sql<string>`sum(${documentiProvvigioni.totale})::text`,
      })
      .from(documentiProvvigioni)
      .groupBy(sql`1`)
      .orderBy(sql`1 desc`)
      .limit(24),
  ]);
  const versati = new Map((await db().select().from(versamentiF24)).map((v) => [v.periodo, v]));
  return {
    daDecidere,
    approvate,
    distinte,
    periodi: periodi.map((p) => ({ ...p, ...datiF24(p.periodo, [BigInt(p.ritenute)]), versato: versati.get(p.periodo) })),
  };
}

/** Movimenti e richieste dell'incaricata (solo i suoi), per la pagina Provvigioni. */
export async function contoIncaricata(incaricataId: string) {
  const [elenco, richieste] = await Promise.all([
    db()
      .select()
      .from(movimenti)
      .where(eq(movimenti.incaricatoId, incaricataId))
      .orderBy(desc(movimenti.mese), asc(movimenti.id)),
    db()
      .select({ richiesta: richiestePagamento, documentoId: documentiProvvigioni.id, numero: documentiProvvigioni.numero, anno: documentiProvvigioni.anno, totale: documentiProvvigioni.totale })
      .from(richiestePagamento)
      .leftJoin(documentiProvvigioni, eq(documentiProvvigioni.richiestaId, richiestePagamento.id))
      .where(eq(richiestePagamento.incaricatoId, incaricataId))
      .orderBy(desc(richiestePagamento.creatoIl)),
  ]);
  return { movimenti: elenco, richieste, saldo: elenco.reduce((t, m) => t + m.importo, 0n) };
}

/** Un documento, con il controllo di chi lo può vedere fatto dalla pagina. */
export async function leggiDocumento(id: string) {
  const [d] = await db().select().from(documentiProvvigioni).where(eq(documentiProvvigioni.id, id)).limit(1);
  return d;
}

/** Percentuali della ritenuta con cui è nato il documento (dalla sua versione dei parametri). */
export async function percentualiDelDocumento(versioneId: bigint) {
  const [v] = await db().select().from(parametriVersioni).where(eq(parametriVersioni.id, versioneId));
  const p = parametriDaJson(v.valori);
  return { ritenutaAliquota: p.ritenutaAliquota, ritenutaBase: p.ritenutaBase };
}
