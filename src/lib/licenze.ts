import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, type Esecutore } from "@/db";
import { avvisiLicenza, clienti, incaricati, licenze, ordini, prodotti, storicoLegamiClienti, storicoSponsor, utenti } from "@/db/schema";
import { ErroreOrdine } from "./calcolo-ordine";
import { parametriCorrenti } from "./catalogo";
import { inviaEmail } from "./email";
import { indirizzoApp } from "./indirizzo-app";
import { avvisoDiOggi, decadeConLaChiusura, fineMese, meseFermo, nuovaValidita, piuGiorni, statoLicenza, validaFinoAttuale, validaFinoDa } from "./licenza";
import { indirizzoDelProfilo, inserisciOrdine, ORE_PER_PAGARE } from "./ordini";
import type { Parametri } from "./parametri";
import { registra } from "./registro";

/**
 * Licenza annuale dell'app (docs/piano-compensi.md, sezione 3a, decisione 31): letture e scritture sul database.
 * Le regole sulle date sono nel modulo puro licenza.ts.
 */

export const CODICE_PRODOTTO_LICENZA = "LICENZA";

export const MESSAGGIO_LICENZA_SCADUTA =
  "La tua licenza è scaduta: l'app è in sola visualizzazione. Rinnovala dalla pagina Licenza per tornare a ordinare.";

/** Prodotto "Licenza annuale" (prezzo modificabile dall'amministrazione nel catalogo): si crea la prima volta che serve. */
export async function prodottoLicenza() {
  await db()
    .insert(prodotti)
    .values({ codice: CODICE_PRODOTTO_LICENZA, nome: "Licenza annuale dell'app", tipo: "licenza", prezzoListino: 2990n, ordine: 999 })
    .onConflictDoNothing({ target: prodotti.codice });
  const [p] = await db().select().from(prodotti).where(eq(prodotti.codice, CODICE_PRODOTTO_LICENZA));
  return p;
}

const oggiItalia = sql`(now() at time zone 'Europe/Rome')::date`;

/**
 * Validità ("valida fino a", compreso) di tutte le incaricate considerando solo i periodi pagati entro un giorno.
 * null = la licenza non scade (esente, oppure senza start kit registrato e senza data di lancio).
 */
async function validitaAl(giorno: string | null, p: Parametri, esecutore: Esecutore = db()) {
  const righe = await esecutore.execute<{ id: string; esente: boolean; valida_fino: string | null }>(sql`
    select i.id, i.licenza_esente as esente,
      (select max(l.valida_fino)::text from app.licenze l
        where l.incaricato_id = i.id and (${giorno}::date is null or l.pagato_il <= ${giorno}::date)) as valida_fino
    from app.incaricati i`);
  return new Map(
    righe.rows.map((r) => [r.id, validaFinoAttuale({ esente: r.esente, rinnovi: r.valida_fino ? [r.valida_fino] : [], lancio: p.dataLancioPiano }, p)]),
  );
}

/** Situazione della licenza di un'incaricata oggi, con i periodi pagati. */
export async function situazioneLicenza(incaricatoId: string) {
  const [p, [{ oggi }], [riga], periodi] = await Promise.all([
    parametriCorrenti(),
    db().execute<{ oggi: string }>(sql`select ${oggiItalia}::text as oggi`).then((r) => r.rows),
    db().select({ esente: incaricati.licenzaEsente }).from(incaricati).where(eq(incaricati.id, incaricatoId)),
    db()
      .select({ pagatoIl: licenze.pagatoIl, dal: licenze.dal, validaFino: licenze.validaFino, ordineId: licenze.ordineId })
      .from(licenze)
      .where(eq(licenze.incaricatoId, incaricatoId))
      .orderBy(asc(licenze.validaFino)),
  ]);
  const esente = riga?.esente ?? false;
  const validaFino = validaFinoAttuale({ esente, rinnovi: periodi.map((x) => x.validaFino), lancio: p.dataLancioPiano }, p);
  return { ...statoLicenza(validaFino, oggi, p), esente, periodi, oggi };
}

/** Vero se la licenza è scaduta (o decaduta): l'app è in sola visualizzazione. */
export async function licenzaScaduta(incaricatoId: string): Promise<boolean> {
  const s = await situazioneLicenza(incaricatoId);
  return s.stato === "scaduta" || s.stato === "decaduta";
}

/** Ordine di rinnovo: riusa quello in attesa di pagamento, se c'è, altrimenti lo crea. Solo quando si può rinnovare. */
export async function ordineLicenza(incaricatoId: string): Promise<string> {
  const situazione = await situazioneLicenza(incaricatoId);
  if (!situazione.rinnovabile) throw new ErroreOrdine("In questo momento la licenza non si può rinnovare.");
  const [inAttesa] = await db()
    .select({ id: ordini.id })
    .from(ordini)
    .where(
      and(
        eq(ordini.incaricatoId, incaricatoId),
        eq(ordini.tipo, "licenza"),
        eq(ordini.stato, "inserito"),
        sql`${ordini.creatoIl} > now() - make_interval(hours => ${ORE_PER_PAGARE})`,
      ),
    )
    .orderBy(desc(ordini.creatoIl))
    .limit(1);
  if (inAttesa) return inAttesa.id;
  const [prodotto, spedizione] = await Promise.all([prodottoLicenza(), indirizzoDelProfilo(incaricatoId)]);
  if (!prodotto.attivo) throw new ErroreOrdine("Il rinnovo non è disponibile in questo momento: contatta l'azienda.");
  // L'ordine di rinnovo non si spedisce: l'indirizzo del profilo resta solo come intestazione.
  return db().transaction((tx) =>
    inserisciOrdine(tx, { incaricatoId, tipo: "licenza", articoli: [{ prodotto, quantita: 1 }], spedizione, riordinoConfermato: false }),
  );
}

/**
 * Registra il periodo di licenza di un ordine appena pagato (dal webhook di Stripe, nella sua transazione).
 * Start kit: 12 mesi dal pagamento. Rinnovo: dalla vecchia scadenza se pagato prima, altrimenti dal pagamento.
 * Idempotente: un ordine vale un solo periodo.
 */
export async function registraPeriodoLicenza(tx: Esecutore, ordine: { id: string; incaricatoId: string; tipo: string }, pagatoIl: Date) {
  if (ordine.tipo !== "start_kit" && ordine.tipo !== "licenza") return;
  const p = await parametriCorrenti();
  // Un rinnovo alla volta per incaricata: la nuova scadenza dipende dalla precedente.
  await tx.select({ id: incaricati.id }).from(incaricati).where(eq(incaricati.id, ordine.incaricatoId)).for("update");
  const {
    rows: [{ giorno }],
  } = await tx.execute<{ giorno: string }>(sql`select (${pagatoIl.toISOString()}::timestamptz at time zone 'Europe/Rome')::date::text as giorno`);
  let dal = giorno;
  let validaFino = validaFinoDa(giorno, p);
  if (ordine.tipo === "licenza") {
    const [riga] = await tx.select({ esente: incaricati.licenzaEsente }).from(incaricati).where(eq(incaricati.id, ordine.incaricatoId));
    const [ultima] = await tx
      .select({ validaFino: sql<string | null>`max(${licenze.validaFino})::text` })
      .from(licenze)
      .where(eq(licenze.incaricatoId, ordine.incaricatoId));
    const attuale = validaFinoAttuale({ esente: riga.esente, rinnovi: ultima?.validaFino ? [ultima.validaFino] : [], lancio: p.dataLancioPiano }, p);
    validaFino = nuovaValidita(attuale, giorno, p);
    dal = attuale && giorno <= attuale ? piuGiorni(attuale, 1) : giorno;
  }
  await tx.insert(licenze).values({ incaricatoId: ordine.incaricatoId, ordineId: ordine.id, pagatoIl: giorno, dal, validaFino }).onConflictDoNothing();
}

/** Incaricate ferme nel mese (licenza scaduta all'ultimo giorno del mese, contando i rinnovi pagati entro quel giorno). */
export async function fermeDelMese(mese: string, p: Parametri): Promise<Set<string>> {
  const fine = fineMese(mese);
  const validita = await validitaAl(fine, p);
  return new Set([...validita].filter(([, v]) => meseFermo(v, mese)).map(([id]) => id));
}

/**
 * Con la chiusura di un mese, le licenze non rinnovate entro la fine del mese dopo la scadenza decadono:
 * dirette e clienti passano alla sponsor, l'incaricata torna cliente (sezione 3a). Nella transazione della chiusura,
 * dopo la fotografia del mese. Restituisce i codici delle incaricate decadute.
 */
export async function applicaDecadenze(tx: Esecutore, mese: string, p: Parametri, utenteId: string): Promise<string[]> {
  const validita = await validitaAl(null, p, tx);
  const persone = await tx
    .select({ id: incaricati.id, codice: incaricati.codice, sponsorId: incaricati.sponsorId, stato: incaricati.stato })
    .from(incaricati);
  const decadute: string[] = [];
  for (const x of persone) {
    if (x.stato === "cliente" || x.stato === "cessato") continue;
    if (!decadeConLaChiusura(validita.get(x.id) ?? null, mese)) continue;
    const motivo = `Licenza non rinnovata: decaduta con la chiusura di ${mese}`;
    // Dirette alla sua sponsor (cambio di sponsor tracciato dalla sede, migrazione 0004).
    const dirette = await tx.select({ id: incaricati.id }).from(incaricati).where(eq(incaricati.sponsorId, x.id));
    if (dirette.length > 0) {
      await tx.execute(sql`select set_config('app.cambio_sponsor', 'tracciato', true)`);
      for (const d of dirette) {
        await tx.update(incaricati).set({ sponsorId: x.sponsorId }).where(eq(incaricati.id, d.id));
        await tx.insert(storicoSponsor).values({ incaricatoId: d.id, sponsorId: x.sponsorId, motivo: `${motivo} (${x.codice})`, modificatoDa: utenteId });
      }
    }
    // Clienti alla sua sponsor (spostamento tracciato, migrazione 0008).
    const suoiClienti = x.sponsorId ? await tx.select({ id: clienti.id }).from(clienti).where(eq(clienti.incaricatoId, x.id)) : [];
    if (suoiClienti.length > 0) {
      await tx.execute(sql`select set_config('app.sposta_cliente', 'tracciato', true)`);
      for (const c of suoiClienti) {
        await tx.update(clienti).set({ incaricatoId: x.sponsorId! }).where(eq(clienti.id, c.id));
        await tx.insert(storicoLegamiClienti).values({ clienteId: c.id, incaricatoId: x.sponsorId!, motivo: `${motivo} (${x.codice})`, modificatoDa: utenteId });
      }
    }
    await tx.update(incaricati).set({ stato: "cliente" }).where(eq(incaricati.id, x.id));
    await registra(tx, {
      utenteId,
      azione: "incaricato.licenza_decaduta",
      entita: "incaricato",
      entitaId: x.id,
      prima: { stato: x.stato },
      dopo: { stato: "cliente", sponsorDelleDirette: x.sponsorId, dirette: dirette.length, clienti: suoiClienti.length, mese },
    });
    decadute.push(x.codice);
  }
  return decadute;
}

/** Avvisi di scadenza del giorno (30 e 7 giorni prima), via email; ogni avviso parte una volta sola. */
export async function inviaAvvisiLicenza(): Promise<number> {
  const p = await parametriCorrenti();
  const {
    rows: [{ oggi }],
  } = await db().execute<{ oggi: string }>(sql`select ${oggiItalia}::text as oggi`);
  const validita = await validitaAl(null, p);
  const persone = await db()
    .select({ id: incaricati.id, nome: incaricati.nome, email: utenti.email, stato: incaricati.stato })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId));
  let inviati = 0;
  for (const x of persone) {
    if (x.stato === "cliente" || x.stato === "cessato") continue;
    const validaFino = validita.get(x.id) ?? null;
    const giorni = avvisoDiOggi(validaFino, oggi, p);
    if (!giorni || !validaFino) continue;
    const [nuovo] = await db()
      .insert(avvisiLicenza)
      .values({ incaricatoId: x.id, validaFino, giorni })
      .onConflictDoNothing()
      .returning({ id: avvisiLicenza.id });
    if (!nuovo) continue;
    const data = validaFino.split("-").reverse().join("/");
    await inviaEmail({
      a: x.email,
      oggetto: `G LUXE: la tua licenza scade tra ${giorni} giorni`,
      testo:
        `Ciao ${x.nome},\n\nla licenza per usare l'app G LUXE è valida fino al ${data}.\n` +
        `Puoi rinnovarla già adesso: i giorni che restano non si perdono.\n\n` +
        `Rinnova qui: ${indirizzoApp()}/area/licenza\n\n` +
        `Senza rinnovo, dal giorno dopo la scadenza l'app resta in sola visualizzazione e i mesi non maturano provvigioni.\n\nG LUXE`,
    });
    inviati++;
  }
  return inviati;
}
