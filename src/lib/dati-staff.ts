import "server-only";
import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { incaricati, registroModifiche, richiesteContatto, storicoSponsor, utenti } from "@/db/schema";
import { richiediStaff } from "./accesso";

/** Tutte le funzioni qui controllano da sole che chi chiede sia dello staff con il ruolo giusto. */

const sponsor = alias(incaricati, "sponsor");

export async function riepilogo() {
  await richiediStaff();
  const [[totali], [nuovi], [richieste]] = await Promise.all([
    db().select({ n: count() }).from(incaricati).where(eq(incaricati.stato, "attivo")),
    db().select({ n: count() }).from(incaricati).where(gte(incaricati.creatoIl, sql`now() - interval '30 days'`)),
    db().select({ n: count() }).from(richiesteContatto).where(eq(richiesteContatto.stato, "nuova")),
  ]);
  return { incaricatiAttivi: totali.n, nuoviUltimi30Giorni: nuovi.n, richiesteNuove: richieste.n };
}

export const PER_PAGINA = 50;

export async function elencoIncaricati(ricerca: string, pagina: number) {
  await richiediStaff(["amministrazione"]);
  const testo = ricerca.trim();
  const filtro = testo
    ? or(
        ilike(incaricati.codice, `%${testo}%`),
        ilike(incaricati.cognome, `%${testo}%`),
        ilike(incaricati.nome, `%${testo}%`),
        ilike(incaricati.codiceFiscale, `%${testo}%`),
        sql`(${incaricati.nome} || ' ' || ${incaricati.cognome}) ilike ${`%${testo}%`}`,
      )
    : undefined;
  const [righe, [{ totale }]] = await Promise.all([
    db()
      .select({
        id: incaricati.id,
        codice: incaricati.codice,
        nome: incaricati.nome,
        cognome: incaricati.cognome,
        citta: incaricati.citta,
        stato: incaricati.stato,
        creatoIl: incaricati.creatoIl,
        sponsorCodice: sponsor.codice,
      })
      .from(incaricati)
      .leftJoin(sponsor, eq(sponsor.id, incaricati.sponsorId))
      .where(filtro)
      .orderBy(desc(incaricati.creatoIl))
      .limit(PER_PAGINA)
      .offset((pagina - 1) * PER_PAGINA),
    db().select({ totale: count() }).from(incaricati).where(filtro),
  ]);
  return { righe, totale };
}

export async function schedaIncaricato(id: string) {
  await richiediStaff(["amministrazione"]);
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const [scheda] = await db()
    .select({
      incaricato: incaricati,
      email: utenti.email,
      ultimoAccesso: utenti.ultimoAccesso,
      haPassword: sql<boolean>`${utenti.passwordHash} is not null`,
      sponsorNome: sponsor.nome,
      sponsorCognome: sponsor.cognome,
      sponsorCodice: sponsor.codice,
      sponsorId: sponsor.id,
    })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .leftJoin(sponsor, eq(sponsor.id, incaricati.sponsorId))
    .where(eq(incaricati.id, id))
    .limit(1);
  if (!scheda) return undefined;

  const autore = alias(utenti, "autore");
  const vecchioSponsor = alias(incaricati, "vecchio_sponsor");
  const [diretti, storico, modifiche] = await Promise.all([
    db()
      .select({ id: incaricati.id, codice: incaricati.codice, nome: incaricati.nome, cognome: incaricati.cognome, stato: incaricati.stato })
      .from(incaricati)
      .where(eq(incaricati.sponsorId, id))
      .orderBy(incaricati.cognome),
    db()
      .select({ dal: storicoSponsor.dal, motivo: storicoSponsor.motivo, codice: vecchioSponsor.codice, autore: autore.nome })
      .from(storicoSponsor)
      .leftJoin(vecchioSponsor, eq(vecchioSponsor.id, storicoSponsor.sponsorId))
      .leftJoin(autore, eq(autore.id, storicoSponsor.modificatoDa))
      .where(eq(storicoSponsor.incaricatoId, id))
      .orderBy(desc(storicoSponsor.dal)),
    db()
      .select({ creatoIl: registroModifiche.creatoIl, azione: registroModifiche.azione, dopo: registroModifiche.dopo, autore: autore.nome })
      .from(registroModifiche)
      .leftJoin(autore, eq(autore.id, registroModifiche.utenteId))
      .where(and(eq(registroModifiche.entita, "incaricato"), eq(registroModifiche.entitaId, id)))
      .orderBy(desc(registroModifiche.creatoIl))
      .limit(50),
  ]);
  return { ...scheda, diretti, storico, modifiche };
}

export async function elencoRichieste() {
  await richiediStaff(["amministrazione"]);
  const gestore = alias(utenti, "gestore");
  return db()
    .select({ richiesta: richiesteContatto, gestore: gestore.nome })
    .from(richiesteContatto)
    .leftJoin(gestore, eq(gestore.id, richiesteContatto.gestitaDa))
    .orderBy(sql`${richiesteContatto.stato} = 'gestita'`, desc(richiesteContatto.creatoIl))
    .limit(200);
}

export async function ultimeModifiche() {
  await richiediStaff(["amministrazione"]);
  const autore = alias(utenti, "autore");
  return db()
    .select({
      id: registroModifiche.id,
      creatoIl: registroModifiche.creatoIl,
      azione: registroModifiche.azione,
      entita: registroModifiche.entita,
      entitaId: registroModifiche.entitaId,
      prima: registroModifiche.prima,
      dopo: registroModifiche.dopo,
      autore: autore.nome,
    })
    .from(registroModifiche)
    .leftJoin(autore, eq(autore.id, registroModifiche.utenteId))
    .orderBy(desc(registroModifiche.id))
    .limit(200);
}

export const NOMI_AZIONI: Record<string, string> = {
  "incaricato.registrato": "Registrazione",
  "incaricato.inserito": "Inserito dall'amministrazione",
  "incaricato.dati_modificati": "Dati modificati",
  "incaricato.sponsor_cambiato": "Sponsor cambiato",
  "incaricato.stato_cambiato": "Stato cambiato",
  "incaricato.link_password_inviato": "Link password inviato",
  "password.reimpostata": "Password reimpostata",
  "staff.accesso": "Accesso staff",
  "richiesta.gestita": "Richiesta sponsor gestita",
  "staff.creato": "Account staff creato",
  "prodotto.creato": "Prodotto creato",
  "prodotto.modificato": "Prodotto modificato",
  "prodotto.attivato": "Prodotto riattivato",
  "prodotto.disattivato": "Prodotto disattivato",
  "promozione.creata": "Promozione creata",
  "promozione.disattivata": "Promozione disattivata",
};

export function dataOra(d: Date): string {
  return d.toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" });
}
