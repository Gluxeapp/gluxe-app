/**
 * Struttura del database G LUXE.
 *
 * Le tabelle stanno nello schema "app" e non in "public": Supabase espone automaticamente
 * le tabelle di "public" su internet tramite la sua API, mentre "app" resta raggiungibile
 * solo dal nostro server.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const app = pgSchema("app");

export const ruolo = app.enum("ruolo", ["incaricato", "amministrazione", "contabilita"]);
export const statoIncaricato = app.enum("stato_incaricato", ["attivo", "sospeso", "cessato", "cliente"]);
export const scopoCodice = app.enum("scopo_codice", ["accesso_staff", "recupero_password"]);
export const statoRichiesta = app.enum("stato_richiesta", ["nuova", "gestita"]);

/** Sequenza dei codici incaricato: GL000001, GL000002… I numeri non si riutilizzano mai. */
export const sequenzaCodiceIncaricato = app.sequence("sequenza_codice_incaricato", { startWith: 1 });

const creatoIl = () => timestamp("creato_il", { withTimezone: true }).notNull().defaultNow();

export const utenti = app.table(
  "utenti",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruolo: ruolo("ruolo").notNull(),
    email: text("email").notNull(),
    nome: text("nome").notNull(),
    passwordHash: text("password_hash"),
    attivo: boolean("attivo").notNull().default(true),
    tentativiFalliti: integer("tentativi_falliti").notNull().default(0),
    bloccatoFino: timestamp("bloccato_fino", { withTimezone: true }),
    ultimoAccesso: timestamp("ultimo_accesso", { withTimezone: true }),
    creatoIl: creatoIl(),
  },
  (t) => [
    // La stessa persona può essere sia incaricata sia staff, ma non due incaricati con la stessa email.
    uniqueIndex("utenti_email_staff").on(sql`lower(${t.email})`).where(sql`${t.ruolo} <> 'incaricato'`),
    uniqueIndex("utenti_email_incaricati").on(sql`lower(${t.email})`).where(sql`${t.ruolo} = 'incaricato'`),
  ],
);

export const incaricati = app.table(
  "incaricati",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utenteId: uuid("utente_id")
      .notNull()
      .unique()
      .references(() => utenti.id),
    codice: text("codice").notNull().unique(),
    nome: text("nome").notNull(),
    cognome: text("cognome").notNull(),
    codiceFiscale: text("codice_fiscale").notNull().unique(),
    dataNascita: date("data_nascita").notNull(),
    indirizzo: text("indirizzo").notNull(),
    cap: text("cap").notNull(),
    citta: text("citta").notNull(),
    provincia: text("provincia").notNull(),
    telefono: text("telefono").notNull(),
    iban: text("iban").notNull(),
    partitaIva: text("partita_iva"),
    sponsorId: uuid("sponsor_id").references((): AnyPgColumn => incaricati.id),
    stato: statoIncaricato("stato").notNull().default("attivo"),
    startKitPagato: boolean("start_kit_pagato").notNull().default(false),
    privacyAccettataIl: timestamp("privacy_accettata_il", { withTimezone: true }).notNull(),
    creatoIl: creatoIl(),
  },
  (t) => [index("incaricati_sponsor").on(t.sponsorId), index("incaricati_cognome").on(t.cognome)],
);

/** Storico degli sponsor: ogni cambio di sponsor lascia una riga, il passato non si riscrive. */
export const storicoSponsor = app.table(
  "storico_sponsor",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    sponsorId: uuid("sponsor_id").references(() => incaricati.id),
    dal: timestamp("dal", { withTimezone: true }).notNull().defaultNow(),
    motivo: text("motivo").notNull(),
    modificatoDa: uuid("modificato_da").references(() => utenti.id),
  },
  (t) => [index("storico_sponsor_incaricato").on(t.incaricatoId)],
);

export const richiesteContatto = app.table("richieste_contatto", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  cognome: text("cognome").notNull(),
  telefono: text("telefono").notNull(),
  email: text("email").notNull(),
  citta: text("citta").notNull(),
  stato: statoRichiesta("stato").notNull().default("nuova"),
  note: text("note"),
  gestitaDa: uuid("gestita_da").references(() => utenti.id),
  gestitaIl: timestamp("gestita_il", { withTimezone: true }),
  creatoIl: creatoIl(),
});

/** Sessioni di accesso. Nel cookie c'è un codice casuale; qui ne salviamo solo l'impronta (hash). */
export const sessioni = app.table(
  "sessioni",
  {
    impronta: text("impronta").primaryKey(),
    utenteId: uuid("utente_id")
      .notNull()
      .references(() => utenti.id, { onDelete: "cascade" }),
    verificata: boolean("verificata").notNull(),
    scadeIl: timestamp("scade_il", { withTimezone: true }).notNull(),
    creatoIl: creatoIl(),
  },
  (t) => [index("sessioni_utente").on(t.utenteId)],
);

/** Codici monouso: codice di 6 cifre per l'accesso staff, link per reimpostare la password. */
export const codiciVerifica = app.table(
  "codici_verifica",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utenteId: uuid("utente_id")
      .notNull()
      .references(() => utenti.id, { onDelete: "cascade" }),
    scopo: scopoCodice("scopo").notNull(),
    impronta: text("impronta").notNull(),
    tentativi: integer("tentativi").notNull().default(0),
    scadeIl: timestamp("scade_il", { withTimezone: true }).notNull(),
    usatoIl: timestamp("usato_il", { withTimezone: true }),
    creatoIl: creatoIl(),
  },
  (t) => [index("codici_verifica_utente").on(t.utenteId, t.scopo)],
);

/** Registro modifiche: chi ha fatto cosa, quando, con il valore prima e dopo. Solo in aggiunta. */
export const registroModifiche = app.table(
  "registro_modifiche",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    utenteId: uuid("utente_id").references(() => utenti.id),
    azione: text("azione").notNull(),
    entita: text("entita").notNull(),
    entitaId: text("entita_id"),
    prima: jsonb("prima"),
    dopo: jsonb("dopo"),
    creatoIl: creatoIl(),
  },
  (t) => [index("registro_modifiche_entita").on(t.entita, t.entitaId), index("registro_modifiche_data").on(t.creatoIl)],
);

/** Email inviate (o da inviare): utile per controllare cosa è partito e ritentare gli errori. */
export const emailInUscita = app.table("email_in_uscita", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinatario: text("destinatario").notNull(),
  oggetto: text("oggetto").notNull(),
  inviataIl: timestamp("inviata_il", { withTimezone: true }),
  errore: text("errore"),
  creatoIl: creatoIl(),
});
