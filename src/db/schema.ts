/**
 * Struttura del database G LUXE.
 *
 * Le tabelle stanno nello schema "app" e non in "public": Supabase espone automaticamente
 * le tabelle di "public" su internet tramite la sua API, mentre "app" resta raggiungibile
 * solo dal nostro server.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
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

export const ruolo = app.enum("ruolo", ["incaricato", "amministrazione", "contabilita", "ordini"]);
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

// ── Fase 2: parametri del piano e catalogo ───────────────────────────────────

/** Versioni dei parametri del piano: ogni modifica è una nuova riga con la sua data di efficacia. */
export const parametriVersioni = app.table(
  "parametri_versioni",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    validoDal: date("valido_dal").notNull(),
    valori: jsonb("valori").notNull(),
    note: text("note"),
    creatoDa: uuid("creato_da").references(() => utenti.id),
    creatoIl: creatoIl(),
  },
  (t) => [index("parametri_versioni_dal").on(t.validoDal)],
);

export const tipoProdotto = app.enum("tipo_prodotto", ["prodotto", "start_kit"]);

/** Foto dei prodotti, salvate nel database (pochi prodotti, immagini piccole): niente servizi esterni. */
export const immagini = app.table("immagini", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo").notNull(),
  dati: text("dati").notNull(),
  creatoIl: creatoIl(),
});

export const prodotti = app.table(
  "prodotti",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codice: text("codice").notNull().unique(),
    nome: text("nome").notNull(),
    linea: text("linea"),
    formato: text("formato"),
    descrizione: text("descrizione"),
    tipo: tipoProdotto("tipo").notNull().default("prodotto"),
    /** Prezzo al pubblico IVA inclusa, in centesimi. */
    prezzoListino: bigint("prezzo_listino", { mode: "bigint" }).notNull(),
    immagineId: uuid("immagine_id").references(() => immagini.id),
    attivo: boolean("attivo").notNull().default(true),
    ordine: integer("ordine").notNull().default(0),
    creatoIl: creatoIl(),
  },
  (t) => [index("prodotti_ordine").on(t.attivo, t.ordine)],
);

/** Promozioni: prezzo al pubblico scontato per un periodo. */
export const promozioni = app.table(
  "promozioni",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prodottoId: uuid("prodotto_id")
      .notNull()
      .references(() => prodotti.id),
    titolo: text("titolo").notNull(),
    /** Prezzo al pubblico IVA inclusa durante la promozione, in centesimi. */
    prezzoPromo: bigint("prezzo_promo", { mode: "bigint" }).notNull(),
    dal: date("dal").notNull(),
    al: date("al").notNull(),
    attiva: boolean("attiva").notNull().default(true),
    creatoIl: creatoIl(),
  },
  (t) => [index("promozioni_periodo").on(t.dal, t.al)],
);

// ── Fase 3: ordini e pagamenti Stripe ────────────────────────────────────────

export const tipoOrdine = app.enum("tipo_ordine", ["start_kit", "personale", "online"]);
export const statoOrdine = app.enum("stato_ordine", [
  "inserito",
  "pagato",
  "in_preparazione",
  "spedito",
  "consegnato",
  "annullato",
  "reso",
]);
/** Come è stato calcolato il prezzo di una riga: serve al motore provvigioni (Fase 4). */
export const tipoPrezzoRiga = app.enum("tipo_prezzo_riga", ["listino_scontato", "promozione", "start_kit", "listino_pieno"]);

/** Numeri d'ordine progressivi e leggibili (n. 1, 2, 3…), mai riutilizzati. */
export const sequenzaNumeroOrdine = app.sequence("sequenza_numero_ordine", { startWith: 1 });

/**
 * Ordini. Prezzi, punti e indirizzo sono "fotografati" alla creazione (CLAUDE.md, regola 10):
 * se poi cambiano listino o parametri, l'ordine resta com'era.
 * Lo stato "pagato" lo imposta solo il webhook di Stripe; pagato_il decide il mese di competenza.
 */
export const ordini = app.table(
  "ordini",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    numero: bigint("numero", { mode: "bigint" })
      .notNull()
      .unique()
      .default(sql`nextval('app.sequenza_numero_ordine')`),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    tipo: tipoOrdine("tipo").notNull(),
    stato: statoOrdine("stato").notNull().default("inserito"),
    parametriVersioneId: bigint("parametri_versione_id", { mode: "bigint" })
      .notNull()
      .references(() => parametriVersioni.id),
    // Totali in centesimi: somma delle righe già arrotondate.
    merceIvaInclusa: bigint("merce_iva_inclusa", { mode: "bigint" }).notNull(),
    merceIvaEsclusa: bigint("merce_iva_esclusa", { mode: "bigint" }).notNull(),
    punti: bigint("punti", { mode: "bigint" }).notNull(),
    provvigioneAcquisto: bigint("provvigione_acquisto", { mode: "bigint" }).notNull(),
    speseSpedizione: bigint("spese_spedizione", { mode: "bigint" }).notNull(),
    totale: bigint("totale", { mode: "bigint" }).notNull(),
    // Indirizzo di spedizione
    destinatario: text("destinatario").notNull(),
    indirizzo: text("indirizzo").notNull(),
    cap: text("cap").notNull(),
    citta: text("citta").notNull(),
    provincia: text("provincia").notNull(),
    telefono: text("telefono").notNull(),
    /** Spunta "ho venduto o consumato almeno il 70% dell'acquisto precedente", con data e ora. */
    riordinoConfermatoIl: timestamp("riordino_confermato_il", { withTimezone: true }),
    stripeSessioneId: text("stripe_sessione_id").unique(),
    stripePagamentoId: text("stripe_pagamento_id"),
    pagatoIl: timestamp("pagato_il", { withTimezone: true }),
    corriere: text("corriere"),
    tracciamento: text("tracciamento"),
    creatoIl: creatoIl(),
  },
  (t) => [
    index("ordini_incaricato").on(t.incaricatoId, t.creatoIl),
    index("ordini_stato").on(t.stato, t.creatoIl),
    index("ordini_pagato_il").on(t.pagatoIl),
    index("ordini_stripe_pagamento").on(t.stripePagamentoId),
  ],
);

export const righeOrdine = app.table(
  "righe_ordine",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    ordineId: uuid("ordine_id")
      .notNull()
      .references(() => ordini.id),
    prodottoId: uuid("prodotto_id")
      .notNull()
      .references(() => prodotti.id),
    codice: text("codice").notNull(),
    nome: text("nome").notNull(),
    tipoPrezzo: tipoPrezzoRiga("tipo_prezzo").notNull(),
    promozioneId: uuid("promozione_id").references(() => promozioni.id),
    quantita: integer("quantita").notNull(),
    // Valori di un'unità…
    prezzoUnitarioIvato: bigint("prezzo_unitario_ivato", { mode: "bigint" }).notNull(),
    prezzoUnitarioIvaEsclusa: bigint("prezzo_unitario_iva_esclusa", { mode: "bigint" }).notNull(),
    puntiUnitari: bigint("punti_unitari", { mode: "bigint" }).notNull(),
    provvigioneUnitaria: bigint("provvigione_unitaria", { mode: "bigint" }).notNull(),
    // …e della riga (unità × quantità)
    totaleIvato: bigint("totale_ivato", { mode: "bigint" }).notNull(),
    totaleIvaEsclusa: bigint("totale_iva_esclusa", { mode: "bigint" }).notNull(),
    totalePunti: bigint("totale_punti", { mode: "bigint" }).notNull(),
    totaleProvvigione: bigint("totale_provvigione", { mode: "bigint" }).notNull(),
  },
  (t) => [index("righe_ordine_ordine").on(t.ordineId)],
);

/** Storico degli stati di ogni ordine: chi (staff, oppure nessuno = Stripe/sistema), quando, perché. */
export const storicoStatiOrdine = app.table(
  "storico_stati_ordine",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    ordineId: uuid("ordine_id")
      .notNull()
      .references(() => ordini.id),
    stato: statoOrdine("stato").notNull(),
    utenteId: uuid("utente_id").references(() => utenti.id),
    nota: text("nota"),
    creatoIl: creatoIl(),
  },
  (t) => [index("storico_stati_ordine_ordine").on(t.ordineId)],
);

/** Eventi ricevuti da Stripe: lo stesso evento arrivato due volte si elabora una volta sola. */
export const eventiStripe = app.table("eventi_stripe", {
  id: text("id").primaryKey(),
  tipo: text("tipo").notNull(),
  ricevutoIl: timestamp("ricevuto_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Rimborsi fatti su Stripe: diventeranno rettifiche delle provvigioni (Fase 6). */
export const rimborsi = app.table(
  "rimborsi",
  {
    id: text("id").primaryKey(),
    ordineId: uuid("ordine_id")
      .notNull()
      .references(() => ordini.id),
    importo: bigint("importo", { mode: "bigint" }).notNull(),
    rimborsatoIl: timestamp("rimborsato_il", { withTimezone: true }).notNull(),
    creatoIl: creatoIl(),
  },
  (t) => [index("rimborsi_ordine").on(t.ordineId)],
);
