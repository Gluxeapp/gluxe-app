import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clienti, incaricati, ordini, prodotti, richiesteContatto, righeOrdine, storicoLegamiClienti, storicoStatiOrdine, utenti } from "@/db/schema";
import { parametriCorrenti } from "./catalogo";
import { creaCodice } from "./codici-verifica";
import { formatta, formattaEuro } from "./denaro";
import { prezziProdotto } from "./prezzi";
import { inviaEmail } from "./email";
import { indirizzoApp } from "./indirizzo-app";
import { negozioDi } from "./negozio";
import { ORE_PER_PAGARE } from "./ordini";
import { cifraPassword } from "./sicurezza";

/**
 * Profilo dei clienti del negozio (decisione 32): registrazione, dati, ordini e consulente.
 * I controlli di accesso li fanno le azioni e le pagine (richiediCliente).
 */

export type NuovoCliente = { nome: string; cognome: string; email: string; telefono: string; password: string; codiceNegozio?: string };

/**
 * Registrazione. Email nuova: profilo attivo subito (legato all'incaricata del link, se c'è). Email di un cliente che
 * esiste già (ha comprato come ospite o gli è stato preparato un ordine): il profilo si attiva solo scegliendo la
 * password dal link mandato a quell'email, così nessuno vede ordini e dati altrui scrivendo la sua email.
 */
export async function registraCliente(d: NuovoCliente): Promise<{ esito: "attivo"; utenteId: string } | { esito: "conferma" } | { esito: "esiste" }> {
  const email = d.email.trim().toLowerCase();
  const negozio = d.codiceNegozio ? await negozioDi(d.codiceNegozio) : undefined;
  const legata = negozio?.stato.aperto ? negozio : undefined;
  const hash = await cifraPassword(d.password);

  const esito = await db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`cliente:${email}`}, 0))`);
    const [profilo] = await tx
      .select({ id: utenti.id })
      .from(utenti)
      .where(and(sql`lower(${utenti.email}) = ${email}`, eq(utenti.ruolo, "cliente")));
    if (profilo) return { esito: "esiste" as const };
    const [esistente] = await tx.select().from(clienti).where(eq(clienti.email, email)).for("update");
    const nome = esistente ? `${esistente.nome} ${esistente.cognome}` : `${d.nome} ${d.cognome}`;
    const [utente] = await tx
      .insert(utenti)
      .values({ ruolo: "cliente", email, nome, passwordHash: esistente ? null : hash })
      .returning({ id: utenti.id });
    if (esistente) {
      await tx.update(clienti).set({ utenteId: utente.id }).where(eq(clienti.id, esistente.id));
      return { esito: "conferma" as const, utente: { id: utente.id, email, nome: esistente.nome } };
    }
    const ora = new Date();
    const [cliente] = await tx
      .insert(clienti)
      .values({ incaricatoId: legata?.id ?? null, utenteId: utente.id, email, nome: d.nome, cognome: d.cognome, telefono: d.telefono, privacyAccettataIl: ora })
      .returning({ id: clienti.id });
    if (legata) {
      await tx.insert(storicoLegamiClienti).values({ clienteId: cliente.id, incaricatoId: legata.id, motivo: `Registrazione dal negozio ${legata.codice}` });
    }
    return { esito: "attivo" as const, utenteId: utente.id };
  });

  if (esito.esito === "conferma") {
    const token = await creaCodice(esito.utente.id, "recupero_password");
    await inviaEmail({
      a: esito.utente.email,
      oggetto: "G LUXE: conferma il tuo profilo",
      testo:
        `Ciao ${esito.utente.nome},\n\nhai chiesto di creare il tuo profilo cliente G LUXE. Per attivarlo scegli la password da questo link:\n` +
        `${indirizzoApp()}/reimposta-password?token=${token}\n\nIl link vale un'ora. Se non sei stata tu, ignora questa email.`,
    });
    return { esito: "conferma" };
  }
  return esito;
}

/** Modifica dei dati del profilo: nome, telefono, indirizzo di spedizione e consenso ai contatti (email e legame no). */
export async function aggiornaProfilo(
  clienteId: string,
  d: { nome: string; cognome: string; telefono: string; indirizzo: string; cap: string; citta: string; provincia: string; consensoContatti: boolean },
) {
  const [attuale] = await db().select({ consenso: clienti.consensoContattiIl }).from(clienti).where(eq(clienti.id, clienteId));
  await db()
    .update(clienti)
    .set({
      nome: d.nome,
      cognome: d.cognome,
      telefono: d.telefono,
      indirizzo: d.indirizzo,
      cap: d.cap,
      citta: d.citta,
      provincia: d.provincia,
      consensoContattiIl: d.consensoContatti ? (attuale?.consenso ?? new Date()) : null,
    })
    .where(eq(clienti.id, clienteId));
}

/** La consulente del cliente: nome; telefono ed email solo se lei ha scelto di mostrarli. */
export async function consulenteDi(incaricatoId: string | null) {
  if (!incaricatoId) return null;
  const [c] = await db()
    .select({
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      codice: incaricati.codice,
      telefono: incaricati.telefono,
      email: utenti.email,
      mostra: incaricati.mostraContattiClienti,
    })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .where(eq(incaricati.id, incaricatoId));
  if (!c) return null;
  return { nome: `${c.nome} ${c.cognome}`, codice: c.codice, contatti: c.mostra ? { telefono: c.telefono, email: c.email } : null };
}

/**
 * "Chiedi una consulente": la richiesta arriva all'amministrazione (area sede ed email), che comunica un codice
 * al cliente o lo assegna direttamente. Una richiesta aperta alla volta.
 */
export async function chiediConsulente(cliente: { id: string; nome: string; cognome: string; telefono: string; email: string }, citta: string) {
  const [aperta] = await db()
    .select({ id: richiesteContatto.id })
    .from(richiesteContatto)
    .where(and(eq(richiesteContatto.clienteId, cliente.id), eq(richiesteContatto.tipo, "cliente"), eq(richiesteContatto.stato, "nuova")));
  if (aperta) return false;
  await db().insert(richiesteContatto).values({
    nome: cliente.nome,
    cognome: cliente.cognome,
    telefono: cliente.telefono,
    email: cliente.email,
    citta,
    tipo: "cliente",
    clienteId: cliente.id,
  });
  const amministratori = await db()
    .select({ email: utenti.email })
    .from(utenti)
    .where(and(eq(utenti.ruolo, "amministrazione"), eq(utenti.attivo, true)));
  for (const a of amministratori) {
    await inviaEmail({
      a: a.email,
      oggetto: "G LUXE: un cliente chiede una consulente",
      testo: `Un cliente registrato chiede una consulente per il primo acquisto.\n\nAssegnala o comunicagli un codice da qui:\n${indirizzoApp()}/staff/richieste`,
    });
  }
  return true;
}

/**
 * Contenuti di "Guadagna con G LUXE", già pronti come testi: sconto, provvigione, qualifiche e costi letti dai
 * parametri del piano e dal catalogo di oggi (niente numeri scritti nel codice). Nessuna promessa di guadagno;
 * per pool e bonus auto nessun importo né percentuale.
 */
export async function datiGuadagna() {
  const p = await parametriCorrenti();
  const righe = await db()
    .select({ nome: prodotti.nome, tipo: prodotti.tipo, prezzoListino: prodotti.prezzoListino, puntiOnline: prodotti.puntiOnlineManuali, puntiPersonale: prodotti.puntiPersonaleManuali })
    .from(prodotti)
    .where(eq(prodotti.attivo, true))
    .orderBy(asc(prodotti.ordine), asc(prodotti.nome));
  const esempio = righe.find((r) => r.tipo === "prodotto");
  const startKit = righe.find((r) => r.tipo === "start_kit");
  const licenza = righe.find((r) => r.tipo === "licenza");
  const perc = (pb: bigint) => `${formatta(pb).replace(/,00$/, "")}%`;
  const prezzi = esempio ? prezziProdotto(esempio.prezzoListino, p, { personale: esempio.puntiPersonale, online: esempio.puntiOnline }) : null;
  return {
    sconto: perc(p.scontoIncaricata),
    provvigioneOnline: perc(p.provvigioneOnline),
    esempio:
      esempio && prezzi
        ? {
            nome: esempio.nome,
            listino: formattaEuro(esempio.prezzoListino),
            scontato: formattaEuro(prezzi.incaricata.ivaInclusa),
            provvigione: formattaEuro(prezzi.provvigioneOnline),
          }
        : null,
    qualifiche: p.qualifiche.map((q) => ({ nome: q.nome, soglia: formatta(q.soglia).replace(/,00$/, ""), percentuale: perc(q.percentuale) })),
    // Incentivi delle Leader: senza importi né percentuali (fondatore, 23/11/2026); solo il nome del primo titolo con bonus auto.
    primoTitoloAuto: p.titoli.find((t) => t.bonusAuto > 0n)?.nome ?? null,
    sogliaAttivita: formatta(p.sogliaAttivita).replace(/,00$/, ""),
    startKit: startKit ? formattaEuro(startKit.prezzoListino) : null,
    puntiStartKit: formatta(p.puntiStartKit).replace(/,00$/, ""),
    licenza: licenza ? formattaEuro(licenza.prezzoListino) : null,
    licenzaMesi: p.licenzaMesi,
  };
}

/** C'è già una candidatura della cliente non ancora gestita dalla sede? */
export async function candidaturaAperta(clienteId: string): Promise<boolean> {
  const [aperta] = await db()
    .select({ id: richiesteContatto.id })
    .from(richiesteContatto)
    .where(and(eq(richiesteContatto.clienteId, clienteId), eq(richiesteContatto.tipo, "candidatura"), eq(richiesteContatto.stato, "nuova")));
  return Boolean(aperta);
}

/**
 * "Guadagna con G LUXE" → "Invia la tua candidatura": la richiesta arriva alla sede (Richieste di contatto ed email
 * all'amministrazione), che contatta la cliente. Una candidatura aperta alla volta.
 */
export async function inviaCandidatura(
  cliente: { id: string; nome: string; cognome: string; telefono: string; email: string },
  d: { citta: string; messaggio: string | null },
): Promise<boolean> {
  const inserita = await db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`candidatura:${cliente.id}`}, 0))`);
    const [aperta] = await tx
      .select({ id: richiesteContatto.id })
      .from(richiesteContatto)
      .where(and(eq(richiesteContatto.clienteId, cliente.id), eq(richiesteContatto.tipo, "candidatura"), eq(richiesteContatto.stato, "nuova")));
    if (aperta) return false;
    await tx.insert(richiesteContatto).values({
      nome: cliente.nome,
      cognome: cliente.cognome,
      telefono: cliente.telefono,
      email: cliente.email,
      citta: d.citta,
      messaggio: d.messaggio,
      tipo: "candidatura",
      clienteId: cliente.id,
    });
    return true;
  });
  if (!inserita) return false;
  const amministratori = await db()
    .select({ email: utenti.email })
    .from(utenti)
    .where(and(eq(utenti.ruolo, "amministrazione"), eq(utenti.attivo, true)));
  for (const a of amministratori) {
    await inviaEmail({
      a: a.email,
      oggetto: "G LUXE: una cliente si candida come incaricata",
      testo: `Una cliente con profilo ha inviato la sua candidatura da "Guadagna con G LUXE".\n\nContattala da qui:\n${indirizzoApp()}/staff/richieste`,
    });
  }
  return true;
}

/** Ordini del cliente (tutti i suoi ordini dal negozio, con qualunque consulente). */
export async function ordiniDelProfilo(clienteId: string) {
  return db()
    .select({ id: ordini.id, numero: ordini.numero, stato: ordini.stato, totale: ordini.totale, creatoIl: ordini.creatoIl })
    .from(ordini)
    .where(eq(ordini.clienteId, clienteId))
    .orderBy(desc(ordini.creatoIl))
    .limit(100);
}

/** Un ordine del cliente collegato: prodotti, stato, spedizione e tracciamento. */
export async function ordineDelProfilo(id: string, clienteId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const [ordine] = await db()
    .select()
    .from(ordini)
    .where(and(eq(ordini.id, id), eq(ordini.clienteId, clienteId)))
    .limit(1);
  if (!ordine) return undefined;
  const [righe, storico] = await Promise.all([
    db().select().from(righeOrdine).where(eq(righeOrdine.ordineId, id)).orderBy(asc(righeOrdine.id)),
    db()
      .select({ stato: storicoStatiOrdine.stato, creatoIl: storicoStatiOrdine.creatoIl })
      .from(storicoStatiOrdine)
      .where(eq(storicoStatiOrdine.ordineId, id))
      .orderBy(asc(storicoStatiOrdine.id)),
  ]);
  const scaduto = ordine.stato === "inserito" && Date.now() - ordine.creatoIl.getTime() > ORE_PER_PAGARE * 3_600_000;
  return { ordine, righe, storico, scaduto };
}
