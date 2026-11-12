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
export const regimeFiscale = app.enum("regime_fiscale", ["nessuna_piva", "piva_ordinaria", "piva_forfettaria"]);

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
    /** Regime fiscale per ricevuta o fattura delle provvigioni (decisione 28). */
    regimeFiscale: regimeFiscale("regime_fiscale").notNull().default("nessuna_piva"),
    sponsorId: uuid("sponsor_id").references((): AnyPgColumn => incaricati.id),
    stato: statoIncaricato("stato").notNull().default("attivo"),
    startKitPagato: boolean("start_kit_pagato").notNull().default(false),
    /** Figure speciali (Giovanna Di Lillo): esclusa dal pool e dal bonus auto. */
    esclusaPool: boolean("esclusa_pool").notNull().default(false),
    esclusaBonusAuto: boolean("esclusa_bonus_auto").notNull().default(false),
    /** Esente dalla licenza annuale (solo Giovanna Di Lillo, decisione 31): la licenza non scade. */
    licenzaEsente: boolean("licenza_esente").notNull().default(false),
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

export const tipoProdotto = app.enum("tipo_prodotto", ["prodotto", "start_kit", "licenza"]);

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
    /** Punti per pezzo scritti a mano dalla sede (centesimi di punto); vuoti = 0,80 × prezzo IVA esclusa. */
    puntiPersonaleManuali: bigint("punti_personale_manuali", { mode: "bigint" }),
    puntiOnlineManuali: bigint("punti_online_manuali", { mode: "bigint" }),
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
    /** Punti per pezzo in promozione scritti a mano (acquisto personale e online); vuoti = automatici. */
    puntiManuali: bigint("punti_manuali", { mode: "bigint" }),
    dal: date("dal").notNull(),
    al: date("al").notNull(),
    attiva: boolean("attiva").notNull().default(true),
    creatoIl: creatoIl(),
  },
  (t) => [index("promozioni_periodo").on(t.dal, t.al)],
);

// ── Fase 3: ordini e pagamenti Stripe ────────────────────────────────────────

export const tipoOrdine = app.enum("tipo_ordine", ["start_kit", "personale", "online", "licenza"]);
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
export const tipoPrezzoRiga = app.enum("tipo_prezzo_riga", ["listino_scontato", "promozione", "start_kit", "listino_pieno", "licenza"]);

/** Numeri d'ordine progressivi e leggibili (n. 1, 2, 3…), mai riutilizzati. */
export const sequenzaNumeroOrdine = app.sequence("sequenza_numero_ordine", { startWith: 1 });

/**
 * Clienti del negozio online (decisione 29): comprano come ospiti e si riconoscono dall'email.
 * Al primo ordine si legano per sempre all'incaricata del link; solo la sede li sposta (storico_legami_clienti).
 * Dati personali: li vedono amministrazione e contabilità; l'incaricata nome e cognome dei suoi clienti,
 * email e telefono solo con il consenso (consenso_contatti_il), mai l'indirizzo (CLAUDE.md, regola 16).
 */
export const clienti = app.table(
  "clienti",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    /** Sempre in minuscolo. */
    email: text("email").notNull(),
    nome: text("nome").notNull(),
    cognome: text("cognome").notNull(),
    telefono: text("telefono").notNull(),
    /** Consenso a far vedere email e telefono alla sua incaricata; vuoto = nessun consenso (o revocato). */
    consensoContattiIl: timestamp("consenso_contatti_il", { withTimezone: true }),
    privacyAccettataIl: timestamp("privacy_accettata_il", { withTimezone: true }).notNull(),
    creatoIl: creatoIl(),
  },
  (t) => [uniqueIndex("clienti_email").on(t.email), index("clienti_incaricato").on(t.incaricatoId)],
);

/** Storico dei legami cliente → incaricata: il primo e ogni spostamento fatto dalla sede, con motivo. */
export const storicoLegamiClienti = app.table(
  "storico_legami_clienti",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clienti.id),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    dal: timestamp("dal", { withTimezone: true }).notNull().defaultNow(),
    motivo: text("motivo").notNull(),
    modificatoDa: uuid("modificato_da").references(() => utenti.id),
  },
  (t) => [index("storico_legami_clienti_cliente").on(t.clienteId)],
);

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
    /** Ordini dal negozio online: il cliente (l'ordine è attribuito alla sua incaricata, in incaricato_id). */
    clienteId: uuid("cliente_id").references(() => clienti.id),
    /** Impronta del codice segreto del link che il cliente usa per seguire l'ordine (il codice non si salva). */
    accessoClienteImpronta: text("accesso_cliente_impronta").unique(),
    /** Impronta del metodo di pagamento data da Stripe (carta o conto PayPal): serve al controllo dei clienti fittizi. */
    metodoImpronta: text("metodo_impronta"),
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
    index("ordini_cliente").on(t.clienteId),
    index("ordini_metodo_impronta").on(t.metodoImpronta),
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
    /** Prezzo di listino di un pezzo al momento dell'ordine, per il margine (vuoto negli ordini precedenti alla colonna). */
    listinoUnitarioIvato: bigint("listino_unitario_ivato", { mode: "bigint" }),
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

// ── Fase 4: impostazioni per persona del piano compensi ──────────────────────
// Ogni modifica a queste tabelle passa dall'area sede e va nel registro modifiche.

/** Qualifica bloccata impostata dalla sede (docs/piano-compensi.md, sezione 4). */
export const qualificheBloccate = app.table(
  "qualifiche_bloccate",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    /** Punti base: 20% = 2000. */
    percentuale: integer("percentuale").notNull(),
    dal: date("dal").notNull(),
    /** Vuota = senza scadenza. */
    al: date("al"),
    motivo: text("motivo").notNull(),
    /** Revoca anticipata: la riga resta, si segna solo quando è stata revocata. */
    revocataIl: timestamp("revocata_il", { withTimezone: true }),
    creatoDa: uuid("creato_da").references(() => utenti.id),
    creatoIl: creatoIl(),
  },
  (t) => [index("qualifiche_bloccate_incaricato").on(t.incaricatoId)],
);

/** Programma Leader Fondatori (sezione 5g): una riga per fondatrice. */
export const leaderFondatori = app.table("leader_fondatori", {
  incaricatoId: uuid("incaricato_id")
    .primaryKey()
    .references(() => incaricati.id),
  ingresso: date("ingresso").notNull(),
  /** Primo giorno del mese da cui i privilegi decadono (requisito dei 90 giorni mancato). */
  decadeDal: date("decade_dal"),
  creatoDa: uuid("creato_da").references(() => utenti.id),
  creatoIl: creatoIl(),
});

export const tipoQuotaSpeciale = app.enum("tipo_quota_speciale", ["master_president", "quota_riservata"]);

/** Quote fisse sull'incasso aziendale per persona (sezioni 5e-bis, 5f e 6). */
export const quoteSpeciali = app.table(
  "quote_speciali",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    tipo: tipoQuotaSpeciale("tipo").notNull(),
    /** Punti base sull'incasso: 2% = 200. */
    percentuale: integer("percentuale").notNull(),
    soloSeAttiva: boolean("solo_se_attiva").notNull(),
    dal: date("dal").notNull(),
    al: date("al"),
    creatoDa: uuid("creato_da").references(() => utenti.id),
    creatoIl: creatoIl(),
  },
  (t) => [index("quote_speciali_incaricato").on(t.incaricatoId)],
);

// ── Fase 6: chiusura del mese, registro provvigioni, pagamenti e contabilità ─
// Tabelle solo in aggiunta dove indicato: il database rifiuta modifiche e cancellazioni
// (docs/garanzie-calcolo.md, sezione 3).

/** Mese chiuso e congelato, con la fotografia dei dati in ingresso al motore. Un mese = una chiusura. */
export const mesiChiusi = app.table("mesi_chiusi", {
  mese: text("mese").primaryKey(),
  parametriVersioneId: bigint("parametri_versione_id", { mode: "bigint" })
    .notNull()
    .references(() => parametriVersioni.id),
  fotografia: jsonb("fotografia").notNull(),
  puntiAziendali: bigint("punti_aziendali", { mode: "bigint" }).notNull(),
  incasso: bigint("incasso", { mode: "bigint" }).notNull(),
  totaleCompensi: bigint("totale_compensi", { mode: "bigint" }).notNull(),
  chiusoDa: uuid("chiuso_da").references(() => utenti.id),
  chiusoIl: timestamp("chiuso_il", { withTimezone: true }).notNull().defaultNow(),
});

/** Ogni ordine pagato entra in un solo mese chiuso (chiave primaria): mai contato due volte. */
export const ordiniChiusi = app.table(
  "ordini_chiusi",
  {
    ordineId: uuid("ordine_id")
      .primaryKey()
      .references(() => ordini.id),
    mese: text("mese")
      .notNull()
      .references(() => mesiChiusi.mese),
  },
  (t) => [index("ordini_chiusi_mese").on(t.mese)],
);

/** Rettifica: storno degli ordini resi o annullati dopo la chiusura del loro mese, registrato nel mese che si chiude. */
export const rettifiche = app.table("rettifiche", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  /** Mese chiuso in cui si registra lo storno. */
  mese: text("mese")
    .notNull()
    .references(() => mesiChiusi.mese),
  /** Mese chiuso a cui appartenevano gli ordini. */
  meseOrigine: text("mese_origine")
    .notNull()
    .references(() => mesiChiusi.mese),
  creatoIl: creatoIl(),
});

/** Un ordine reso si storna una volta sola (chiave primaria). */
export const ordiniStornati = app.table("ordini_stornati", {
  ordineId: uuid("ordine_id")
    .primaryKey()
    .references(() => ordiniChiusi.ordineId),
  rettificaId: bigint("rettifica_id", { mode: "bigint" })
    .notNull()
    .references(() => rettifiche.id),
});

export const tipoMovimento = app.enum("tipo_movimento", ["voce", "storno", "richiesta", "richiesta_rifiutata"]);
export const statoRichiestaPagamento = app.enum("stato_richiesta_pagamento", ["richiesta", "approvata", "rifiutata", "pagata"]);

/** Richiesta di pagamento: una per incaricata per mese chiuso (indice univoco nella migrazione). */
export const richiestePagamento = app.table(
  "richieste_pagamento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    /** Mese chiuso dopo il quale si è chiesto il pagamento (finestra dal 3 al 6 del mese dopo). */
    mese: text("mese")
      .notNull()
      .references(() => mesiChiusi.mese),
    lordo: bigint("lordo", { mode: "bigint" }).notNull(),
    stato: statoRichiestaPagamento("stato").notNull().default("richiesta"),
    dataPagamento: date("data_pagamento").notNull(),
    decisaDa: uuid("decisa_da").references(() => utenti.id),
    decisaIl: timestamp("decisa_il", { withTimezone: true }),
    motivoRifiuto: text("motivo_rifiuto"),
    pagataDa: uuid("pagata_da").references(() => utenti.id),
    pagataIl: timestamp("pagata_il", { withTimezone: true }),
    creatoIl: creatoIl(),
  },
  (t) => [index("richieste_pagamento_incaricato").on(t.incaricatoId), index("richieste_pagamento_stato").on(t.stato, t.dataPagamento)],
);

/**
 * Registro provvigioni, solo in aggiunta (CLAUDE.md, regole 8 e 9): il saldo di un'incaricata è la
 * somma dei suoi movimenti. Voci del mese chiuso, storni dei resi, richieste di pagamento (in meno)
 * e richieste rifiutate (restituite).
 */
export const movimenti = app.table(
  "movimenti",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    tipo: tipoMovimento("tipo").notNull(),
    /** Mese chiuso in cui il movimento conta (per le richieste: il mese chiuso della richiesta). */
    mese: text("mese")
      .notNull()
      .references(() => mesiChiusi.mese),
    tipoVoce: text("tipo_voce"),
    base: bigint("base", { mode: "bigint" }),
    percentuale: integer("percentuale"),
    importo: bigint("importo", { mode: "bigint" }).notNull(),
    /** Incaricata da cui vengono i punti (differenze, generazioni, kit). */
    origineId: uuid("origine_id").references(() => incaricati.id),
    rettificaId: bigint("rettifica_id", { mode: "bigint" }).references(() => rettifiche.id),
    richiestaId: uuid("richiesta_id").references(() => richiestePagamento.id),
    creatoIl: creatoIl(),
  },
  (t) => [index("movimenti_incaricato").on(t.incaricatoId, t.mese), index("movimenti_mese").on(t.mese)],
);

export const tipoDocumento = app.enum("tipo_documento", ["ricevuta", "fattura_ordinaria", "fattura_forfettaria"]);

/** Ricevuta o fattura proforma delle provvigioni: nasce all'approvazione, poi non cambia più. */
export const documentiProvvigioni = app.table(
  "documenti_provvigioni",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    richiestaId: uuid("richiesta_id")
      .notNull()
      .unique()
      .references(() => richiestePagamento.id),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    anno: integer("anno").notNull(),
    numero: integer("numero").notNull(),
    tipo: tipoDocumento("tipo").notNull(),
    data: date("data").notNull(),
    imponibile: bigint("imponibile", { mode: "bigint" }).notNull(),
    iva: bigint("iva", { mode: "bigint" }).notNull(),
    aliquotaIva: integer("aliquota_iva").notNull(),
    ritenuta: bigint("ritenuta", { mode: "bigint" }).notNull(),
    inpsBase: bigint("inps_base", { mode: "bigint" }).notNull(),
    inpsIncaricata: bigint("inps_incaricata", { mode: "bigint" }).notNull(),
    inpsAzienda: bigint("inps_azienda", { mode: "bigint" }).notNull(),
    bollo: bigint("bollo", { mode: "bigint" }).notNull(),
    totale: bigint("totale", { mode: "bigint" }).notNull(),
    /** Fotografia dei dati di incaricata e azienda al momento del documento. */
    incaricata: jsonb("incaricata").notNull(),
    azienda: jsonb("azienda").notNull(),
    /** Mese di competenza dei guadagni, per esempio "10/2026". */
    competenza: text("competenza").notNull(),
    parametriVersioneId: bigint("parametri_versione_id", { mode: "bigint" })
      .notNull()
      .references(() => parametriVersioni.id),
    creatoIl: creatoIl(),
  },
  (t) => [uniqueIndex("documenti_numero").on(t.incaricatoId, t.anno, t.numero), index("documenti_data").on(t.data)],
);

/** File dei bonifici SEPA scaricati: chi, quando, quali richieste. */
export const distinteBonifici = app.table("distinte_bonifici", {
  id: uuid("id").primaryKey().defaultRandom(),
  dataPagamento: date("data_pagamento").notNull(),
  idMessaggio: text("id_messaggio").notNull().unique(),
  numeroBonifici: integer("numero_bonifici").notNull(),
  totale: bigint("totale", { mode: "bigint" }).notNull(),
  xml: text("xml").notNull(),
  creataDa: uuid("creata_da").references(() => utenti.id),
  creataIl: timestamp("creata_il", { withTimezone: true }).notNull().defaultNow(),
  annullataDa: uuid("annullata_da").references(() => utenti.id),
  annullataIl: timestamp("annullata_il", { withTimezone: true }),
});

/** Una richiesta sta in un solo file valido alla volta (indice univoco nella migrazione). */
export const righeDistinta = app.table(
  "righe_distinta",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    distintaId: uuid("distinta_id")
      .notNull()
      .references(() => distinteBonifici.id),
    richiestaId: uuid("richiesta_id")
      .notNull()
      .references(() => richiestePagamento.id),
    annullata: boolean("annullata").notNull().default(false),
  },
  (t) => [index("righe_distinta_distinta").on(t.distintaId)],
);

/** F24 delle ritenute segnato come versato (uno per mese dei pagamenti). */
export const versamentiF24 = app.table("versamenti_f24", {
  periodo: text("periodo").primaryKey(),
  importo: bigint("importo", { mode: "bigint" }).notNull(),
  versatoIl: date("versato_il").notNull(),
  registratoDa: uuid("registrato_da").references(() => utenti.id),
  creatoIl: creatoIl(),
});

/** Dati di G LUXE per documenti, F24 e bonifici: una sola riga, modificabile dalla sede con registro. */
export const datiAzienda = app.table("dati_azienda", {
  id: integer("id").primaryKey().default(1),
  ragioneSociale: text("ragione_sociale").notNull().default(""),
  indirizzo: text("indirizzo").notNull().default(""),
  cap: text("cap").notNull().default(""),
  citta: text("citta").notNull().default(""),
  provincia: text("provincia").notNull().default(""),
  codiceFiscale: text("codice_fiscale").notNull().default(""),
  partitaIva: text("partita_iva").notNull().default(""),
  iban: text("iban").notNull().default(""),
  cuc: text("cuc").notNull().default(""),
  /** Dicitura del bollo virtuale, per esempio "Autorizzazione Agenzia delle Entrate di … n. … del …". */
  autorizzazioneBollo: text("autorizzazione_bollo").notNull().default(""),
  modificatoIl: timestamp("modificato_il", { withTimezone: true }).notNull().defaultNow(),
});

// ── Licenza annuale dell'app (decisione 31) ─────────────────────────────────

/**
 * Periodi di licenza: uno per lo start kit pagato e uno per ogni rinnovo, solo in aggiunta.
 * La licenza è valida fino all'ultima data "valida_fino" fra i periodi pagati fino a quel giorno.
 */
export const licenze = app.table(
  "licenze",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    /** Ordine pagato (start kit o rinnovo): un ordine vale un solo periodo. */
    ordineId: uuid("ordine_id")
      .notNull()
      .unique()
      .references(() => ordini.id),
    /** Giorno del pagamento (ora italiana). */
    pagatoIl: date("pagato_il").notNull(),
    dal: date("dal").notNull(),
    validaFino: date("valida_fino").notNull(),
    creatoIl: creatoIl(),
  },
  (t) => [index("licenze_incaricato").on(t.incaricatoId, t.pagatoIl)],
);

/** Avvisi di scadenza già mandati: lo stesso avviso non parte due volte. */
export const avvisiLicenza = app.table(
  "avvisi_licenza",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    incaricatoId: uuid("incaricato_id")
      .notNull()
      .references(() => incaricati.id),
    validaFino: date("valida_fino").notNull(),
    giorni: integer("giorni").notNull(),
    creatoIl: creatoIl(),
  },
  (t) => [uniqueIndex("avvisi_licenza_unico").on(t.incaricatoId, t.validaFino, t.giorni)],
);
