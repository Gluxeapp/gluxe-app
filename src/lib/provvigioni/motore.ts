/**
 * Motore provvigioni del Piano Compensi G LUXE (docs/piano-compensi.md, rev. 6).
 *
 * Modulo PURO (CLAUDE.md, regola 4): riceve gli ordini pagati del mese, la rete e le impostazioni,
 * restituisce le voci. Niente database, niente orologio, niente casualità: stessi dati → stesso
 * risultato al centesimo, in qualunque ordine arrivino ordini e incaricate (docs/garanzie-calcolo.md).
 *
 * Nessun contatore: tutto si ricalcola da zero dagli ordini. Ogni voce dice da dove viene
 * (beneficiaria, tipo, origine), così un doppio conteggio si vedrebbe subito.
 * Importi e punti in centesimi (bigint), percentuali in punti base. Si arrotonda solo con denaro.ts.
 */
import { CENTO_PER_CENTO, dividiArrotondando, percentuale, type Centesimi, type PuntiBase } from "../denaro";
import type { Parametri } from "../parametri";

export type TipoVoce =
  | "online"
  | "promozione"
  | "kit"
  | "qualifica"
  | "differenza"
  | "generazione"
  | "fondatore"
  | "pool"
  | "quota_riservata"
  | "master_president"
  | "bonus_auto";

/** Ordine fisso delle voci nei risultati e nei report. */
export const TIPI_VOCE: TipoVoce[] = [
  "online",
  "promozione",
  "kit",
  "qualifica",
  "differenza",
  "generazione",
  "fondatore",
  "pool",
  "quota_riservata",
  "master_president",
  "bonus_auto",
];

/** Voci che i resi non stornano (sezione 9). */
export const VOCI_NON_STORNABILI: TipoVoce[] = ["pool", "quota_riservata", "master_president", "bonus_auto"];

export type OrdineMese = {
  id: string;
  incaricataId: string;
  tipo: "start_kit" | "personale" | "online";
  /** Punti totali dell'ordine (fotografati sulle righe). */
  punti: Centesimi;
  /** Di cui da righe in promozione (solo acquisti personali): punti PR. */
  puntiPromo: Centesimi;
  /** Merce IVA esclusa, spedizione esclusa: entra nell'incasso aziendale. */
  imponibile: Centesimi;
};

/** sospesa: inattiva (solo provvigione online). ferma: mese fermo per licenza scaduta, non matura nulla (sezione 3a). */
export type IncaricataRete = { id: string; sponsorId: string | null; sospesa?: boolean; ferma?: boolean };

export type QuotaSpeciale = {
  incaricataId: string;
  tipo: "master_president" | "quota_riservata";
  /** Percentuale dell'incasso aziendale. */
  percentuale: PuntiBase;
  soloSeAttiva: boolean;
};

export type Fondatore = {
  incaricataId: string;
  /** Data di ingresso nel programma, "AAAA-MM-GG". */
  ingresso: string;
  /** Primo mese senza privilegi perché il requisito dei 90 giorni è mancato, "AAAA-MM". */
  decadeDal: string | null;
};

export type DatiMese = {
  /** "AAAA-MM" */
  mese: string;
  parametri: Parametri;
  incaricate: IncaricataRete[];
  /** Ordini pagati nel mese, non annullati né resi. */
  ordini: OrdineMese[];
  /** Qualifiche bloccate valide nel mese. */
  bloccate?: { incaricataId: string; percentuale: PuntiBase }[];
  fondatori?: Fondatore[];
  quoteSpeciali?: QuotaSpeciale[];
  esclusiPool?: string[];
  esclusiBonusAuto?: string[];
};

export type Voce = {
  beneficiariaId: string;
  tipo: TipoVoce;
  /** Punti (o incasso, per Master President e quota riservata) su cui si calcola la voce. */
  base: Centesimi;
  percentuale: PuntiBase | null;
  importo: Centesimi;
  /** Incaricata da cui vengono i punti (differenze, generazioni, kit), se c'è. */
  origine: string | null;
};

export type Situazione = {
  id: string;
  ap: Centesimi;
  pr: Centesimi;
  on: Centesimi;
  kit: Centesimi;
  ks: Centesimi;
  pp: Centesimi;
  ppq: Centesimi;
  pgq: Centesimi;
  pgr: Centesimi;
  attiva: boolean;
  qualificaReale: string | null;
  percentualeReale: PuntiBase;
  percentualeApplicata: PuntiBase;
  leader: boolean;
  lineeForti: number;
  titolo: string | null;
  fondatoreAttivo: boolean;
};

export type Controllo = { nome: string; ok: boolean; dettaglio?: string };

export type EsitoMese = {
  mese: string;
  situazioni: Situazione[];
  voci: Voce[];
  puntiAziendali: Centesimi;
  incasso: Centesimi;
  totaleCompensi: Centesimi;
  controlli: Controllo[];
  /** Falso se un controllo non torna: l'anteprima si vede, ma il mese non si può chiudere. */
  ok: boolean;
};

/** Stato del mese originale tenuto fermo negli storni. */
type StatoFisso = Pick<Situazione, "attiva" | "percentualeApplicata" | "leader" | "lineeForti" | "titolo">;

const confronta = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const indiceMese = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
const minimo = (a: bigint, b: bigint) => (a < b ? a : b);

/** Controlli sui dati in ingresso: se uno fallisce il calcolo non si fa. */
function controlliStrutturali(d: DatiMese): Controllo[] {
  const ids = new Set<string>();
  const doppie: string[] = [];
  for (const i of d.incaricate) {
    if (ids.has(i.id)) doppie.push(i.id);
    ids.add(i.id);
  }

  const sponsorMancanti = d.incaricate.filter((i) => i.sponsorId !== null && !ids.has(i.sponsorId)).length;

  // Cicli: risalendo gli sponsor non si può incontrare due volte la stessa incaricata.
  const sponsor = new Map(d.incaricate.map((i) => [i.id, i.sponsorId]));
  let cicli = 0;
  for (const i of d.incaricate) {
    const viste = new Set<string>();
    let u: string | null | undefined = i.id;
    while (u && sponsor.has(u)) {
      if (viste.has(u)) {
        cicli++;
        break;
      }
      viste.add(u);
      u = sponsor.get(u);
    }
  }

  const ordiniVisti = new Set<string>();
  let ordiniDoppi = 0;
  let ordiniSenzaIncaricata = 0;
  let valoriNonValidi = 0;
  for (const o of d.ordini) {
    if (ordiniVisti.has(o.id)) ordiniDoppi++;
    ordiniVisti.add(o.id);
    if (!ids.has(o.incaricataId)) ordiniSenzaIncaricata++;
    if (o.punti < 0n || o.puntiPromo < 0n || o.puntiPromo > o.punti || o.imponibile < 0n) valoriNonValidi++;
    if (o.tipo !== "personale" && o.puntiPromo !== 0n) valoriNonValidi++;
  }
  const impostazioniSenzaIncaricata = [
    ...(d.bloccate ?? []).map((b) => b.incaricataId),
    ...(d.fondatori ?? []).map((f) => f.incaricataId),
    ...(d.quoteSpeciali ?? []).map((q) => q.incaricataId),
  ].filter((id) => !ids.has(id)).length;

  return [
    { nome: "incaricate uniche", ok: doppie.length === 0, dettaglio: doppie.length ? `${doppie.length} incaricate ripetute` : undefined },
    {
      nome: "genealogia",
      ok: sponsorMancanti === 0 && cicli === 0,
      dettaglio: sponsorMancanti || cicli ? `${sponsorMancanti} sponsor inesistenti, ${cicli} incaricate in un ciclo` : undefined,
    },
    {
      nome: "ordini contati una volta",
      ok: ordiniDoppi === 0 && ordiniSenzaIncaricata === 0,
      dettaglio: ordiniDoppi || ordiniSenzaIncaricata ? `${ordiniDoppi} ordini ripetuti, ${ordiniSenzaIncaricata} senza incaricata` : undefined,
    },
    { nome: "valori degli ordini", ok: valoriNonValidi === 0, dettaglio: valoriNonValidi ? `${valoriNonValidi} ordini con punti o importi non validi` : undefined },
    {
      nome: "impostazioni",
      ok: impostazioniSenzaIncaricata === 0,
      dettaglio: impostazioniSenzaIncaricata ? `${impostazioniSenzaIncaricata} impostazioni per incaricate inesistenti` : undefined,
    },
  ];
}

function calcola(d: DatiMese, fisso?: Map<string, StatoFisso>): EsitoMese {
  const p = d.parametri;
  const strutturali = controlliStrutturali(d);
  if (strutturali.some((c) => !c.ok)) {
    return { mese: d.mese, situazioni: [], voci: [], puntiAziendali: 0n, incasso: 0n, totaleCompensi: 0n, controlli: strutturali, ok: false };
  }

  // Ordine fisso di lavoro: per codice, così il risultato non dipende dall'ordine di arrivo.
  const incaricate = [...d.incaricate].sort((a, b) => confronta(a.id, b.id));
  const ordini = [...d.ordini].sort((a, b) => confronta(a.id, b.id));
  const sponsor = new Map(incaricate.map((i) => [i.id, i.sponsorId]));
  const figli = new Map<string, string[]>(incaricate.map((i) => [i.id, []]));
  for (const i of incaricate) if (i.sponsorId) figli.get(i.sponsorId)!.push(i.id);

  // 2. Punti personali del mese.
  const s = new Map<string, Situazione>();
  for (const i of incaricate) {
    s.set(i.id, {
      id: i.id, ap: 0n, pr: 0n, on: 0n, kit: 0n, ks: 0n, pp: 0n, ppq: 0n, pgq: 0n, pgr: 0n,
      attiva: false, qualificaReale: null, percentualeReale: 0n, percentualeApplicata: 0n,
      leader: false, lineeForti: 0, titolo: null, fondatoreAttivo: false,
    });
  }
  let puntiAziendali = 0n;
  let incasso = 0n;
  for (const o of ordini) {
    const x = s.get(o.incaricataId)!;
    puntiAziendali += o.punti;
    incasso += o.imponibile;
    if (o.tipo === "online") x.on += o.punti;
    else if (o.tipo === "start_kit") {
      x.kit += o.punti;
      const sp = sponsor.get(o.incaricataId);
      if (sp) s.get(sp)!.ks += o.punti;
    } else {
      x.pr += o.puntiPromo;
      x.ap += o.punti - o.puntiPromo;
    }
  }
  // Le incaricate ferme per licenza scaduta (sezione 3a) sono inattive e non maturano nulla.
  const sospese = new Set(incaricate.filter((i) => i.sospesa || i.ferma).map((i) => i.id));
  for (const x of s.values()) {
    x.pp = x.ap + x.pr + x.on + x.kit;
    x.ppq = x.on + minimo(x.ap + x.pr, p.tettoAcquistiQualifica) + x.kit;
    x.attiva = !sospese.has(x.id) && x.pp + x.ks >= p.sogliaAttivita;
  }

  // 3. Punti di gruppo dal basso verso l'alto: prima le più profonde.
  const profondita = new Map<string, number>();
  const profonditaDi = (id: string): number => {
    const nota = profondita.get(id);
    if (nota !== undefined) return nota;
    const sp = sponsor.get(id);
    const valore = sp ? profonditaDi(sp) + 1 : 0;
    profondita.set(id, valore);
    return valore;
  };
  const dalBasso = [...incaricate].map((i) => i.id).sort((a, b) => profonditaDi(b) - profonditaDi(a) || confronta(a, b));
  for (const id of dalBasso) {
    const x = s.get(id)!;
    x.pgq += x.ppq;
    x.pgr += x.pp;
    const sp = sponsor.get(id);
    if (sp) {
      s.get(sp)!.pgq += x.pgq;
      s.get(sp)!.pgr += x.pgr;
    }
  }

  // 4. Qualifiche, percentuale applicata, Leader del mese.
  const qualifiche = [...p.qualifiche].sort((a, b) => (a.soglia < b.soglia ? -1 : a.soglia > b.soglia ? 1 : 0));
  const percentualeMassima = qualifiche.reduce((m, q) => (q.percentuale > m ? q.percentuale : m), 0n);
  const bloccate = new Map<string, PuntiBase>();
  for (const b of d.bloccate ?? []) {
    if (b.percentuale > (bloccate.get(b.incaricataId) ?? 0n)) bloccate.set(b.incaricataId, b.percentuale);
  }
  const meseCorrente = indiceMese(d.mese);
  for (const f of d.fondatori ?? []) {
    const inizio = indiceMese(f.ingresso);
    const dentro = meseCorrente >= inizio && meseCorrente < inizio + p.fondatoriDurataMesi;
    const decaduto = f.decadeDal !== null && meseCorrente >= indiceMese(f.decadeDal);
    if (dentro && !decaduto) {
      s.get(f.incaricataId)!.fondatoreAttivo = true;
      if (p.fondatoriPercentualeBloccata > (bloccate.get(f.incaricataId) ?? 0n)) {
        bloccate.set(f.incaricataId, p.fondatoriPercentualeBloccata);
      }
    }
  }
  for (const x of s.values()) {
    const reale = qualifiche.filter((q) => x.pgq >= q.soglia).at(-1);
    x.qualificaReale = reale?.nome ?? null;
    x.percentualeReale = reale?.percentuale ?? 0n;
    const bloccata = bloccate.get(x.id) ?? 0n;
    x.percentualeApplicata = bloccata > x.percentualeReale ? bloccata : x.percentualeReale;
  }

  // 5. Linee forti e titoli manager.
  const titoli = [...p.titoli].sort((a, b) => b.linee - a.linee);
  for (const x of s.values()) {
    x.leader = x.attiva && x.percentualeApplicata >= percentualeMassima;
    x.lineeForti = figli.get(x.id)!.filter((f) => s.get(f)!.pgq >= p.sogliaLineaForte).length;
    x.titolo = x.leader ? (titoli.find((t) => x.lineeForti >= t.linee)?.nome ?? null) : null;
  }
  // Negli storni restano fermi attività, percentuali, Leader e titoli del mese originale.
  if (fisso) {
    for (const x of s.values()) {
      const f = fisso.get(x.id);
      if (f) Object.assign(x, f);
    }
  }
  const titoloDi = (id: string) => p.titoli.find((t) => t.nome === s.get(id)!.titolo);

  const voci: Voce[] = [];
  const ferme = new Set(incaricate.filter((i) => i.ferma).map((i) => i.id));
  const aggiungi = (beneficiariaId: string, tipo: TipoVoce, base: Centesimi, perc: PuntiBase | null, importo: Centesimi, origine: string | null = null) => {
    // Mese fermo per licenza scaduta: nessuna voce, nemmeno la provvigione online (la quota resta all'azienda).
    if (importo !== 0n && !ferme.has(beneficiariaId)) voci.push({ beneficiariaId, tipo, base, percentuale: perc, importo, origine });
  };

  // 6. Provvigioni personali e qualifica.
  for (const x of s.values()) {
    aggiungi(x.id, "online", x.on, p.provvigioneOnline, percentuale(x.on, p.provvigioneOnline));
    if (!x.attiva) continue;
    aggiungi(x.id, "promozione", x.pr, p.provvigioneOnline, percentuale(x.pr, p.provvigioneOnline));
    aggiungi(x.id, "kit", x.ks, p.provvigioneKitSponsor, percentuale(x.ks, p.provvigioneKitSponsor));
    const base = x.ap + x.pr + x.on;
    aggiungi(x.id, "qualifica", base, x.percentualeApplicata, percentuale(base, x.percentualeApplicata));
  }

  // 7. Differenze: per i punti di ogni incaricata si risale la catena degli sponsor.
  for (const x of s.values()) {
    if (x.pp === 0n) continue;
    let pagata = x.percentualeApplicata;
    let u = sponsor.get(x.id) ?? null;
    while (u && pagata < percentualeMassima) {
      const su = s.get(u)!;
      if (su.percentualeApplicata > pagata) {
        if (su.attiva) {
          const diff = su.percentualeApplicata - pagata;
          aggiungi(u, "differenza", x.pp, diff, percentuale(x.pp, diff), x.id);
        }
        pagata = su.percentualeApplicata;
      }
      u = sponsor.get(u) ?? null;
    }
  }

  // 8. Team delle Leader del mese (le Leader inattive sono saltate) e generazioni.
  const leaderSopraOSe = new Map<string, string | null>();
  for (const id of [...dalBasso].reverse()) {
    const sp = sponsor.get(id);
    leaderSopraOSe.set(id, s.get(id)!.leader ? id : sp ? leaderSopraOSe.get(sp)! : null);
  }
  const team = new Map<string, Centesimi>();
  for (const x of s.values()) {
    const l = leaderSopraOSe.get(x.id);
    if (l) team.set(l, (team.get(l) ?? 0n) + x.pp);
  }
  const generazioniMassime = p.titoli.reduce((m, t) => Math.max(m, t.generazioni.length), 0);
  for (const [l, punti] of [...team.entries()].sort((a, b) => confronta(a[0], b[0]))) {
    let n = 0;
    let u = sponsor.get(l) ?? null;
    while (u && n < generazioniMassime) {
      if (s.get(u)!.leader) {
        const perc = titoloDi(u)?.generazioni[n];
        if (perc) aggiungi(u, "generazione", punti, perc, percentuale(punti, perc), l);
        n++;
      }
      u = sponsor.get(u) ?? null;
    }
  }

  // 10. Bonus Leader Fondatori (sui punti di gruppo reali, se attiva).
  for (const x of s.values()) {
    if (x.fondatoreAttivo && x.attiva) aggiungi(x.id, "fondatore", x.pgr, p.fondatoriBonus, percentuale(x.pgr, p.fondatoriBonus));
  }

  // 9-10. Pool, quote speciali e bonus auto: non si stornano, quindi non si ricalcolano negli storni.
  if (!fisso) {
    const esclusiPool = new Set(d.esclusiPool ?? []);
    const conQuote = [...s.values()]
      .filter((x) => x.leader && !esclusiPool.has(x.id))
      .map((x) => ({ id: x.id, quote: BigInt(titoloDi(x.id)?.quotePool ?? 0) }))
      .filter((x) => x.quote > 0n);
    const quoteTotali = conQuote.reduce((t, x) => t + x.quote, 0n);
    for (const x of conQuote) {
      // Calcolo esatto, arrotondato solo alla fine.
      const importo = dividiArrotondando(puntiAziendali * p.poolPercentuale * x.quote, CENTO_PER_CENTO * quoteTotali);
      aggiungi(x.id, "pool", puntiAziendali, p.poolPercentuale, importo);
    }
    for (const q of [...(d.quoteSpeciali ?? [])].sort((a, b) => confronta(a.incaricataId + a.tipo, b.incaricataId + b.tipo))) {
      if (q.soloSeAttiva && !s.get(q.incaricataId)!.attiva) continue;
      aggiungi(q.incaricataId, q.tipo, incasso, q.percentuale, percentuale(incasso, q.percentuale));
    }
    const esclusiAuto = new Set(d.esclusiBonusAuto ?? []);
    for (const x of s.values()) {
      const bonus = x.leader && !esclusiAuto.has(x.id) ? (titoloDi(x.id)?.bonusAuto ?? 0n) : 0n;
      aggiungi(x.id, "bonus_auto", 0n, null, bonus);
    }
  }

  const posizione = (t: TipoVoce) => TIPI_VOCE.indexOf(t);
  voci.sort(
    (a, b) =>
      confronta(a.beneficiariaId, b.beneficiariaId) ||
      posizione(a.tipo) - posizione(b.tipo) ||
      confronta(a.origine ?? "", b.origine ?? ""),
  );

  // 11. Controlli di quadratura.
  const situazioni = [...s.values()];
  const totaleCompensi = voci.reduce((t, v) => t + v.importo, 0n);
  const sommaPunti = situazioni.reduce((t, x) => t + x.pp, 0n);
  const compensiNelLimite = voci.filter((v) => v.tipo !== "bonus_auto").reduce((t, v) => t + v.importo, 0n);
  const limite = percentuale(puntiAziendali, p.limiteCompensiSuPunti);
  const controlli: Controllo[] = [
    ...strutturali,
    { nome: "quadratura punti", ok: sommaPunti === puntiAziendali },
    { nome: "voci non negative", ok: fisso !== undefined || voci.every((v) => v.importo > 0n) },
    {
      nome: "limite compensi",
      ok: compensiNelLimite <= limite,
      dettaglio: compensiNelLimite > limite ? `compensi ${compensiNelLimite} oltre il limite ${limite} (centesimi)` : undefined,
    },
  ];
  return { mese: d.mese, situazioni, voci, puntiAziendali, incasso, totaleCompensi, controlli, ok: controlli.every((c) => c.ok) };
}

/** Calcolo (o anteprima) del mese. */
export function calcolaMese(d: DatiMese): EsitoMese {
  return calcola(d);
}

/**
 * Storni per ordini resi o rimborsati dopo la chiusura del loro mese (sezione 9): per ogni
 * beneficiaria e voce, importo ricalcolato senza quegli ordini − importo originale, tenendo fermi
 * attività, percentuali, Leader e titoli del mese originale. Pool e quote fisse non si stornano.
 */
export function calcolaStorno(meseOriginale: DatiMese, ordiniResi: string[]): Voce[] {
  const originale = calcola(meseOriginale);
  if (originale.situazioni.length === 0) throw new Error("Il mese originale non supera i controlli: storno impossibile");
  const fisso = new Map<string, StatoFisso>(
    originale.situazioni.map((x) => [
      x.id,
      { attiva: x.attiva, percentualeApplicata: x.percentualeApplicata, leader: x.leader, lineeForti: x.lineeForti, titolo: x.titolo },
    ]),
  );
  const resi = new Set(ordiniResi);
  const ricalcolato = calcola({ ...meseOriginale, ordini: meseOriginale.ordini.filter((o) => !resi.has(o.id)) }, fisso);

  const chiave = (v: Voce) => `${v.beneficiariaId}\u0000${v.tipo}\u0000${v.origine ?? ""}`;
  const prima = new Map(originale.voci.filter((v) => !VOCI_NON_STORNABILI.includes(v.tipo)).map((v) => [chiave(v), v]));
  const dopo = new Map(ricalcolato.voci.map((v) => [chiave(v), v]));
  const storni: Voce[] = [];
  for (const k of [...new Set([...prima.keys(), ...dopo.keys()])].sort(confronta)) {
    const a = prima.get(k);
    const b = dopo.get(k);
    const importo = (b?.importo ?? 0n) - (a?.importo ?? 0n);
    if (importo === 0n) continue;
    const v = (a ?? b)!;
    storni.push({ ...v, base: (b?.base ?? 0n) - (a?.base ?? 0n), importo });
  }
  return storni;
}
